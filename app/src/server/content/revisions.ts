/**
 * YOR WORLD Milestone A4: Server-side Project Revisions & Draft State
 *
 * Implements structured project draft editing, optimistic concurrency control,
 * revision incrementing, and private draft storage.
 */

import {
  type ProjectId,
  type PublishedProject,
  PublishedProjectSchema,
} from "@/contracts/content";
import type { OwnerContext } from "../auth/types";
import { approvedPublication } from "@/content/approved-publication";
import { getPlatformDb, hasPlatformDatabase, isTestRuntime } from "../database";
import type { QueryableDb } from "../contact/quota";

export class RevisionConflictError extends Error {
  readonly status = 409;
  readonly code = "STALE_REVISION_CONFLICT";

  constructor(message: string) {
    super(message);
    this.name = "RevisionConflictError";
  }
}

export class ContentValidationError extends Error {
  readonly status = 422;
  readonly code = "INVALID_CONTENT";

  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

export interface DraftRecord {
  projectId: ProjectId;
  draftRevision: number;
  project: PublishedProject;
  updatedAt: string;
  updatedBy: string;
}

// In-memory test draft registry initialized with approved publication projects
let testDraftRegistry: Map<ProjectId, DraftRecord> | null = null;

function initializeDefaultDrafts(): Map<ProjectId, DraftRecord> {
  const map = new Map<ProjectId, DraftRecord>();
  const now = new Date().toISOString();

  for (const proj of approvedPublication.projects) {
    map.set(proj.id, {
      projectId: proj.id,
      draftRevision: proj.revision,
      project: { ...proj },
      updatedAt: now,
      updatedBy: "system-seed",
    });
  }

  // Also include candidatex as an unpublished draft (revision 1)
  map.set("candidatex", {
    projectId: "candidatex",
    draftRevision: 1,
    project: {
      id: "candidatex",
      slug: "candidatex",
      title: "CandidateX (Draft)",
      summary: "Draft recruitment analytics platform.",
      contribution: "Sole architect and full-stack engineer.",
      sections: [
        {
          id: "overview",
          heading: "Overview",
          blocks: [{ type: "paragraph", text: "Draft analytics platform documentation." }],
        },
      ],
      links: [{ label: "Repository", url: "https://github.com/yorayriniwnl/candidatex", checkedAt: now }],
      evidence: [
        {
          id: "ev-cx-repo",
          kind: "repository",
          url: "https://github.com/yorayriniwnl/candidatex",
          checkedAt: now,
          status: "verified",
          note: "Private repository code review.",
        },
      ],
      revision: 1,
    },
    updatedAt: now,
    updatedBy: "system-seed",
  });

  return map;
}

export function setTestDraftRegistry(registry: Map<ProjectId, DraftRecord> | null) {
  if (!isTestRuntime()) throw new Error("Draft registry injection is test-only.");
  testDraftRegistry = registry;
}

export function getTestDraftRegistry(): Map<ProjectId, DraftRecord> {
  if (!testDraftRegistry) {
    testDraftRegistry = initializeDefaultDrafts();
  }
  return testDraftRegistry;
}

/**
 * Validates project draft content integrity.
 * Throws ContentValidationError (422) if invalid URLs or malformed blocks are encountered.
 */
export function validateDraftContent(data: unknown): PublishedProject {
  const result = PublishedProjectSchema.safeParse(data);
  if (!result.success) {
    throw new ContentValidationError(
      `Content validation failed: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  const project = result.data;

  // Enforce HTTPS URLs
  for (const link of project.links) {
    try {
      const url = new URL(link.url);
      if (url.protocol !== "https:") {
        throw new ContentValidationError(
          `Invalid link URL '${link.url}': protocol must be https://`
        );
      }
    } catch (err) {
      if (err instanceof ContentValidationError) throw err;
      throw new ContentValidationError(`Malformed link URL '${link.url}'`);
    }
  }

  for (const ev of project.evidence) {
    if (ev.url) {
      try {
        const url = new URL(ev.url);
        if (url.protocol !== "https:") {
          throw new ContentValidationError(
            `Invalid evidence URL '${ev.url}': protocol must be https://`
          );
        }
      } catch (err) {
        if (err instanceof ContentValidationError) throw err;
        throw new ContentValidationError(`Malformed evidence URL '${ev.url}'`);
      }
    }
  }

  // Validate sections and blocks
  for (const section of project.sections) {
    if (!section.heading || section.heading.trim().length === 0) {
      throw new ContentValidationError(`Section '${section.id}' has empty heading`);
    }
    if (section.blocks.length === 0) {
      throw new ContentValidationError(`Section '${section.id}' must contain at least one content block`);
    }
  }

  const sectionIds = project.sections.map((section) => section.id);
  if (new Set(sectionIds).size !== sectionIds.length) {
    throw new ContentValidationError("Section IDs must be unique within a project.");
  }
  if (project.sections.some((section) => section.blocks.some((block) =>
      block.type === "list" && (block.items.length === 0 || block.items.some((item) => !item.trim()))))) {
    throw new ContentValidationError("List blocks must contain non-empty items.");
  }
  return project;
}

function validateImageReferences(projectId: ProjectId, project: PublishedProject): void {
  const baseline = approvedPublication.projects.find((item) => item.id === projectId);
  project.sections.forEach((section, sectionIndex) => section.blocks.forEach((block, blockIndex) => {
    if (block.type !== "image" || !block.mediaId.startsWith("missing-")) return;
    const accepted = baseline?.sections[sectionIndex]?.blocks[blockIndex];
    if (accepted?.type !== "image" || JSON.stringify(accepted) !== JSON.stringify(block)) {
      throw new ContentValidationError("Image is not an accepted baseline placeholder.");
    }
  }));
}

async function validateDraftMedia(project: PublishedProject, transaction?: QueryableDb): Promise<void> {
  const { collectDraftMediaReferences, readReviewedMedia } = await import("../media/manifest");
  const references = collectDraftMediaReferences([project]);
  if (!references.ids.length) return;
  const checked = await readReviewedMedia(references.ids, transaction);
  const failed = references.ids.filter((id) => !checked.bytesById.has(id) || checked.issues.has(id));
  if (failed.length) {
    const { MediaValidationError } = await import("../media/validate-upload");
    throw new MediaValidationError("Image references must resolve to approved, byte-verified media: " + failed.join(", "));
  }
}

/**
 * Retrieves project draft record. Private: requires owner authorization.
 */
export async function getProjectDraft(
  projectId: ProjectId,
  _actor: OwnerContext
): Promise<DraftRecord | null> {
  void _actor;
  if (!isDraftTestRegistryEnabled()) {
    return (await listProjectDrafts(_actor)).find((draft) => draft.projectId === projectId) ?? null;
  }
  const registry = getTestDraftRegistry();
  const record = registry.get(projectId);
  if (record) {
    return { ...record, project: JSON.parse(JSON.stringify(record.project)) };
  }
  return null;
}

/**
 * Lists all project drafts for owner review.
 */
export async function listProjectDrafts(
  _actor: OwnerContext
): Promise<DraftRecord[]> {
  void _actor;
  if (!isDraftTestRegistryEnabled()) {
    const db = await getPlatformDb();
    return readDurableDrafts(db);
  }
  const registry = getTestDraftRegistry();
  return Array.from(registry.values()).map((r) => ({
    ...r,
    project: JSON.parse(JSON.stringify(r.project)),
  }));
}

/**
 * Saves a modified draft revision using optimistic concurrency control.
 * Stale expectedRevision returns 409 Conflict.
 * Invalid content returns 422 Unprocessable Entity.
 */
export async function saveProjectDraft(
  input: {
    projectId: ProjectId;
    expectedRevision: number;
    project: Omit<PublishedProject, "revision">;
  },
  actor: OwnerContext
): Promise<{ draftRevision: number; project: PublishedProject }> {
  if (input.project.id !== input.projectId || input.project.slug !== input.projectId) {
    throw new ContentValidationError("Draft identity does not match requested project.");
  }
  if (!isDraftTestRegistryEnabled()) return saveDurableDraft(input, actor);
  const registry = getTestDraftRegistry();
  const existing = registry.get(input.projectId);

  const currentRevision = existing ? existing.draftRevision : 0;

  // Optimistic concurrency check
  if (currentRevision !== input.expectedRevision) {
    throw new RevisionConflictError(
      `Stale revision conflict on project '${input.projectId}': expected revision ${input.expectedRevision}, but current revision is ${currentRevision}. Refresh before saving.`
    );
  }

  const nextRevision = currentRevision + 1;
  const projectWithRev: PublishedProject = {
    ...input.project,
    revision: nextRevision,
  };

  // Content validation (throws 422 if invalid)
  const validatedProject = validateDraftContent(projectWithRev);
  validateImageReferences(input.projectId, validatedProject);
  await validateDraftMedia(validatedProject);

  const updatedRecord: DraftRecord = {
    projectId: input.projectId,
    draftRevision: nextRevision,
    project: validatedProject,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.userId,
  };

  registry.set(input.projectId, updatedRecord);

  return {
    draftRevision: nextRevision,
    project: validatedProject,
  };
}

export function isDraftTestRegistryEnabled(): boolean {
  return isTestRuntime() && !hasPlatformDatabase();
}

export async function readDurableDrafts(db: QueryableDb): Promise<DraftRecord[]> {
  const result = await db.query(`SELECT p.slug, p.draft_revision, r.payload, r.created_at, r.created_by
    FROM public.projects p JOIN public.project_revisions r
      ON r.project_id=p.id AND r.revision=p.draft_revision WHERE p.archived_at IS NULL`);
  const drafts = new Map<ProjectId, DraftRecord>();
  for (const project of approvedPublication.projects) {
    drafts.set(project.id, { projectId: project.id, draftRevision: project.revision, project,
      updatedAt: approvedPublication.publishedAt, updatedBy: "accepted-static-baseline" });
  }
  const privateSeed = initializeDefaultDrafts().get("candidatex");
  if (privateSeed) drafts.set("candidatex", privateSeed);
  for (const row of result.rows) {
    const project = validateDraftContent(row["payload"]);
    drafts.set(project.id, { projectId: project.id, draftRevision: Number(row["draft_revision"]), project,
      updatedAt: new Date(String(row["created_at"])).toISOString(), updatedBy: String(row["created_by"]) });
  }
  return [...drafts.values()].sort((left, right) => left.projectId < right.projectId ? -1 : left.projectId > right.projectId ? 1 : 0);
}

async function saveDurableDraft(input: {
  projectId: ProjectId; expectedRevision: number; project: Omit<PublishedProject, "revision">;
}, actor: OwnerContext): Promise<{ draftRevision: number; project: PublishedProject }> {
  const db = await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required.");
  return db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`yor-draft-${input.projectId}`]);
    const rows = await tx.query("SELECT id,draft_revision FROM public.projects WHERE slug=$1 FOR UPDATE", [input.projectId]);
    let row = rows.rows[0];
    const baseline = approvedPublication.projects.find((project) => project.id === input.projectId);
    const privateSeed = input.projectId === "candidatex" ? initializeDefaultDrafts().get("candidatex") : undefined;
    const currentRevision = row ? Number(row["draft_revision"]) : (baseline?.revision ?? privateSeed?.draftRevision ?? 0);
    if (currentRevision !== input.expectedRevision) throw new RevisionConflictError("Draft changed. Refresh before saving.");
    const nextRevision = currentRevision + 1;
    const project = validateDraftContent({ ...input.project, revision: nextRevision });
    validateImageReferences(input.projectId, project);
    await validateDraftMedia(project, tx);
    if (!row) {
      row = (await tx.query("INSERT INTO public.projects(slug,title,draft_revision) VALUES($1,$2,$3) RETURNING id", [input.projectId, project.title, nextRevision])).rows[0]!;
    } else {
      await tx.query("UPDATE public.projects SET title=$1,draft_revision=$2 WHERE id=$3", [project.title,nextRevision,row["id"]]);
    }
    await tx.query("INSERT INTO public.project_revisions(project_id,revision,payload,created_by) VALUES($1,$2,$3,$4)", [row["id"],nextRevision,JSON.stringify(project),actor.userId]);
    await tx.query("INSERT INTO public.audit_events(actor,action,entity_type,entity_id,payload) VALUES($1,'draft_saved','project',$2,$3)", [actor.userId,input.projectId,JSON.stringify({ revision: nextRevision })]);
    return { draftRevision: nextRevision, project };
  });
}

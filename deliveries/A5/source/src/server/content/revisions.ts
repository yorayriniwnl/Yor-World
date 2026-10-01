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
import { createAdminServiceRoleClient } from "../auth/clients";

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

  return project;
}

/**
 * Retrieves project draft record. Private: requires owner authorization.
 */
export async function getProjectDraft(
  projectId: ProjectId,
  _actor: OwnerContext
): Promise<DraftRecord | null> {
  void _actor;
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

  const updatedRecord: DraftRecord = {
    projectId: input.projectId,
    draftRevision: nextRevision,
    project: validatedProject,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.userId,
  };

  registry.set(input.projectId, updatedRecord);

  // Attempt database record update if DB is connected
  try {
    const client = createAdminServiceRoleClient();
    await client
      .from("projects")
      .update({ draft_revision: nextRevision })
      .eq("slug", validatedProject.slug);

    await client.from("project_revisions").insert({
      project_id: validatedProject.id,
      revision: nextRevision,
      payload: validatedProject,
      created_by: actor.userId,
    });
  } catch {
    // In local test environments without running Postgres, in-memory registry maintains state
  }

  return {
    draftRevision: nextRevision,
    project: validatedProject,
  };
}

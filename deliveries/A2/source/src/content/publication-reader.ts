import {
  PublicationSchema,
  type Publication,
  type PublishedProject,
} from "@/contracts/content";
import { approvedPublication } from "./approved-publication";

export class PublicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationValidationError";
  }
}

/**
 * Validates a publication snapshot structurally and enforces content integrity rules.
 * Throws PublicationValidationError if unsupported claims, unverified evidence,
 * duplicate slugs, or invalid links are encountered.
 */
export function validatePublication(data: unknown): Publication {
  const result = PublicationSchema.safeParse(data);
  if (!result.success) {
    throw new PublicationValidationError(
      `Structural publication schema error: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  const publication = result.data;
  const seenSlugs = new Set<string>();
  const seenIds = new Set<string>();

  for (const project of publication.projects) {
    if (seenSlugs.has(project.slug)) {
      throw new PublicationValidationError(
        `Duplicate project slug detected: '${project.slug}'. Each published project must have a unique slug.`
      );
    }
    seenSlugs.add(project.slug);

    if (seenIds.has(project.id)) {
      throw new PublicationValidationError(
        `Duplicate project ID detected: '${project.id}'. Each published project must have a unique ID.`
      );
    }
    seenIds.add(project.id);

    // Rule: Every published project must have verified evidence
    const verifiedEvidence = project.evidence.filter((e) => e.status === "verified");
    if (verifiedEvidence.length === 0) {
      throw new PublicationValidationError(
        `Project '${project.slug}' has no verified evidence. Projects cannot be published without verifiable owner evidence.`
      );
    }

    // Rule: Unsupported claim rejection — an active publication cannot contain unverified claims
    for (const evidence of project.evidence) {
      if (evidence.status === "unknown") {
        throw new PublicationValidationError(
          `Project '${project.slug}' contains unverified claim '${evidence.id}' with status 'unknown'. Unsupported claims cannot enter public publication.`
        );
      }
      if (!evidence.note || evidence.note.trim().length === 0) {
        throw new PublicationValidationError(
          `Project '${project.slug}' evidence '${evidence.id}' is missing descriptive verification note.`
        );
      }
    }

    // Rule: Safe external links — all links must strictly be HTTPS
    for (const link of project.links) {
      try {
        const parsed = new URL(link.url);
        if (parsed.protocol !== "https:") {
          throw new PublicationValidationError(
            `Project '${project.slug}' has insecure link URL '${link.url}'. Only https:// URLs are allowed.`
          );
        }
      } catch (err) {
        if (err instanceof PublicationValidationError) throw err;
        throw new PublicationValidationError(
          `Project '${project.slug}' contains malformed link URL '${link.url}'.`
        );
      }
    }
  }

  return publication;
}

/**
 * Reads and returns the approved publication snapshot.
 * If a custom snapshot is passed (e.g. in tests or CMS preview), it validates that snapshot.
 */
export async function readPublication(customSnapshot?: unknown): Promise<Publication> {
  if (customSnapshot !== undefined) {
    return validatePublication(customSnapshot);
  }
  return validatePublication(approvedPublication);
}

/**
 * Finds a published project by slug from a validated publication snapshot.
 * Returns null if the slug does not exist or refers to an unpublished/candidate project.
 */
export function findPublishedProject(
  publication: Publication,
  slug: string
): PublishedProject | null {
  if (!publication || !Array.isArray(publication.projects)) {
    return null;
  }
  const match = publication.projects.find((p) => p.slug === slug);
  return match || null;
}

import "server-only";

import type { Publication } from "@/contracts/content";
import { readPublicPublication } from "@/server/content/publish";
import { readApprovedPublishedMediaUrls } from "@/server/media/manifest";
import { approvedPublication } from "./approved-publication";
import { validatePublication } from "./publication-reader";

/** Read only the approved, durable public snapshot; never consult draft state.
 * A backend outage leaves the accepted static portfolio usable on every route.
 */
export async function readServerPublication(): Promise<Publication> {
  try {
    const snapshot = await readPublicPublication();
    if (snapshot) return validatePublication(snapshot);
  } catch {
    // Invalid/unavailable backend content must not replace the verified baseline.
  }
  return validatePublication(approvedPublication);
}

export async function readServerPublicationMedia(publication: Publication): Promise<Record<string, string>> {
  try {
    return await readApprovedPublishedMediaUrls(publication);
  } catch {
    return {};
  }
}

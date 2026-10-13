import { beforeEach, describe, expect, it } from "vitest";
import {
  ContentValidationError,
  getProjectDraft,
  saveProjectDraft,
  setTestDraftRegistry,
} from "@/server/content/revisions";
import type { OwnerContext } from "@/server/auth/types";

const actor: OwnerContext = {
  userId: "11111111-1111-1111-1111-111111111111",
  email: "owner@fixture.test",
  role: "owner",
  active: true,
  assurance: "aal2",
};

describe("A1 write-time structured content requirements", () => {
  beforeEach(() => setTestDraftRegistry(null));

  it("rejects duplicate stable section IDs before advancing the draft", async () => {
    const draft = await getProjectDraft("helios", actor);
    expect(draft).not.toBeNull();
    const first = draft!.project.sections[0]!;
    const project = {
      ...draft!.project,
      sections: [...draft!.project.sections, { ...first, heading: "Duplicate identity" }],
    };

    await expect(
      saveProjectDraft(
        { projectId: "helios", expectedRevision: draft!.draftRevision, project },
        actor
      )
    ).rejects.toBeInstanceOf(ContentValidationError);
    expect((await getProjectDraft("helios", actor))?.draftRevision).toBe(draft!.draftRevision);
  });

  it("rejects empty list content before advancing the draft", async () => {
    const draft = await getProjectDraft("helios", actor);
    expect(draft).not.toBeNull();
    const project = {
      ...draft!.project,
      sections: [
        ...draft!.project.sections,
        { id: "empty-list", heading: "Empty list", blocks: [{ type: "list" as const, items: [] }] },
      ],
    };

    await expect(
      saveProjectDraft(
        { projectId: "helios", expectedRevision: draft!.draftRevision, project },
        actor
      )
    ).rejects.toBeInstanceOf(ContentValidationError);
    expect((await getProjectDraft("helios", actor))?.draftRevision).toBe(draft!.draftRevision);
  });
});

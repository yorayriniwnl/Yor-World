import type { ExperienceController } from "../experience/controller";

export interface RuntimeReplayOwner {
  replayEntrance(): Promise<void>;
}

/** Route every runtime replay control through the runtime's single lifecycle owner. */
export function requestRuntimeReplayEntrance(
  runtime: RuntimeReplayOwner | null | undefined,
): Promise<void> {
  return runtime?.replayEntrance() ?? Promise.resolve();
}

/** Close a controller-owned dialog before replay starts its runtime entrance. */
export async function replayRuntimeAfterControllerEscape(
  controller: Pick<ExperienceController, "send">,
  runtime: RuntimeReplayOwner | null | undefined,
): Promise<void> {
  await controller.send({ type: "ESCAPE" });
  await requestRuntimeReplayEntrance(runtime);
}

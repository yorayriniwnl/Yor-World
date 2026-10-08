"use client";

import React from "react";
import Link from "next/link";
import type { ExperienceController } from "../experience/controller";
import type { ExperienceSnapshot } from "../../contracts/experience";
import { ModalDialog } from "@/ui/ModalDialog";
import styles from "./room-controls.module.css";

export interface RoomControlsProps {
  controller: ExperienceController;
  snapshot?: ExperienceSnapshot;
  onClose?: () => void;
  onSoundChange?: ((enabled: boolean) => void | Promise<void>) | undefined;
}

export function RoomControls({ controller, snapshot: initialSnapshot, onClose, onSoundChange }: RoomControlsProps) {
  const [snapshot, setSnapshot] = React.useState<ExperienceSnapshot>(
    () => initialSnapshot ?? controller.getSnapshot()
  );

  React.useEffect(() => {
    return controller.subscribe((snap) => {
      setSnapshot(snap);
    });
  }, [controller]);

  const { world, preferences, characterAction, paintingAngleDeg } = snapshot;

  return (
    <ModalDialog
      label="Studio Room Controls"
      className={styles.container}
      testId="room-controls-panel"
      onClose={() => onClose?.()}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>Room controls</h2>
        {onClose && (
          <button
            type="button"
            autoFocus
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close room controls panel"
          >
            ✕
          </button>
        )}
      </header>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Character & Avatar</h3>
        <button
          type="button"
          className={styles.actionBtn}
          data-testid="control-greet-creator"
          onClick={() => controller.send({ type: "GREET" })}
        >
          Greet Creator ({characterAction})
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          data-testid="control-adjust-chair"
          onClick={() => controller.send({ type: "GREET" })}
        >
          Adjust Chair Posture
        </button>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Workstation & Display</h3>
        <button
          type="button"
          className={styles.actionBtn}
          data-testid="control-open-launcher"
          onClick={() => controller.send({ type: "OPEN_PANEL", panel: "launcher" })}
        >
          Open Studio Launcher (Monitor / Keyboard / Mouse)
        </button>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Artwork & Discoveries</h3>
        <button
          type="button"
          className={styles.actionBtn}
          data-testid="control-inspect-painting"
          onClick={() => controller.painting.triggerPresetTilt()}
        >
          Inspect Wall Painting (Tilt: {paintingAngleDeg.toFixed(1)}°)
        </button>
        <div className={styles.statusItem} data-testid="detail-found-status">
          Hidden Signature: <strong>{world.detailFound ? "Discovered" : "Hidden"}</strong>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Environment & Lighting</h3>
        <label className={styles.switchLabel}>
          <input
            type="checkbox"
            checked={world.lampOn}
            data-testid="control-toggle-lamp"
            onChange={(e) => controller.send({ type: "SET_LAMP", enabled: e.target.checked })}
          />
          Desk Task Lamp ({world.lampOn ? "ON" : "OFF"})
        </label>

        <label className={styles.switchLabel}>
          <input
            type="checkbox"
            checked={world.blindsOpen}
            data-testid="control-toggle-blinds"
            onChange={(e) => controller.send({ type: "SET_BLINDS", open: e.target.checked })}
          />
          Window Blinds ({world.blindsOpen ? "OPEN" : "CLOSED"})
        </label>

        <label className={styles.switchLabel}>
          <input
            type="checkbox"
            checked={preferences.clock24h}
            data-testid="control-toggle-clock"
            onChange={(e) => controller.send({ type: "SET_CLOCK_FORMAT", clock24h: e.target.checked })}
          />
          Clock Format ({preferences.clock24h ? "24-Hour" : "12-Hour"})
        </label>

        <label className={styles.switchLabel}>
          <input
            type="checkbox"
            checked={preferences.soundEnabled}
            data-testid="control-toggle-sound"
            onChange={(e) => {
              if (onSoundChange) void onSoundChange(e.target.checked);
              else void controller.send({ type: "SET_SOUND", enabled: e.target.checked });
            }}
          />
          Studio Sound Effects ({preferences.soundEnabled ? "ENABLED" : "MUTED"})
        </label>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Desk Decoration</h3>
        <button
          type="button"
          className={styles.actionBtn}
          data-testid="control-nudge-plant"
          onClick={() => controller.send({ type: "SET_PAUSED", paused: false })}
        >
          Nudge Plant Leaves
        </button>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Direct Project Navigation (Accessible Rail)</h3>
        <nav aria-label="Direct Project Destinations" className={styles.projectRail}>
          <Link
            href="/projects/candidatex"
            className={styles.projectLink}
            data-testid="rail-candidatex"
            onClick={(e) => {
              e.preventDefault();
              controller.send({ type: "OPEN_PROJECT", projectId: "candidatex", source: "dom" });
            }}
          >
            CandidateX
          </Link>
          <Link
            href="/projects/helios"
            className={styles.projectLink}
            data-testid="rail-helios"
            onClick={(e) => {
              e.preventDefault();
              controller.send({ type: "OPEN_PROJECT", projectId: "helios", source: "dom" });
            }}
          >
            Helios Kernel
          </Link>
          <Link
            href="/projects/zenith"
            className={styles.projectLink}
            data-testid="rail-zenith"
            onClick={(e) => {
              e.preventDefault();
              controller.send({ type: "OPEN_PROJECT", projectId: "zenith", source: "dom" });
            }}
          >
            Zenith Energy
          </Link>
          <Link
            href="/projects/ai-camera"
            className={styles.projectLink}
            data-testid="rail-ai-camera"
            onClick={(e) => {
              e.preventDefault();
              controller.send({ type: "OPEN_PROJECT", projectId: "ai-vs-real", source: "dom" });
            }}
          >
            AI Scanner
          </Link>
          <Link
            href="/projects/yor-talks"
            className={styles.projectLink}
            data-testid="rail-talks"
            onClick={(e) => {
              e.preventDefault();
              controller.send({ type: "OPEN_PROJECT", projectId: "talks", source: "dom" });
            }}
          >
            Yor Talks
          </Link>
        </nav>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Studio Exit & Replay</h3>
        <button
          type="button"
          className={styles.actionBtn}
          data-testid="control-replay-entrance"
          onClick={() => controller.send({ type: "ENTER", replay: true })}
        >
          Replay Entrance (Interior Door)
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          data-testid="control-exit-studio"
          onClick={() => controller.send({ type: "ESCAPE" })}
        >
          Reset View / Escape to Explore (Escape Key)
        </button>
      </div>
    </dialog>
  );
}

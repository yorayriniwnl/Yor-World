"use client";

/**
 * YOR WORLD Milestone A4: Structured Project Editor
 *
 * Provides owner-managed structured content editing for projects, sections,
 * evidence records, and media attachments with optimistic concurrency control.
 */

import { useState } from "react";
import type {
  ProjectId,
  PublishedProject,
  ContentSection,
  EvidenceRef,
  EvidenceStatus,
} from "@/contracts/content";
import styles from "@/app/admin/admin.module.css";

interface ProjectEditorProps {
  initialProjects: PublishedProject[];
}

export function ProjectEditor({ initialProjects }: ProjectEditorProps) {
  const [projects, setProjects] = useState<PublishedProject[]>(initialProjects);
  const [selectedId, setSelectedId] = useState<ProjectId>(
    initialProjects[0]?.id || "ai-vs-real"
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const currentProject = projects.find((p) => p.id === selectedId) ?? projects[0];
  const [expectedRevision, setExpectedRevision] = useState<number>(
    currentProject?.revision ?? 1
  );

  function handleProjectChange(id: ProjectId) {
    setSelectedId(id);
    const target = projects.find((p) => p.id === id);
    if (target) {
      setExpectedRevision(target.revision);
    }
    setFeedback(null);
  }

  function updateField<K extends keyof PublishedProject>(field: K, value: PublishedProject[K]) {
    setProjects((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, [field]: value } : p))
    );
  }

  // Section modifiers
  function addSection() {
    if (!currentProject) return;
    const newSection: ContentSection = {
      id: `sec-${Date.now()}`,
      heading: "New Section",
      blocks: [{ type: "paragraph", text: "New section content." }],
    };
    updateField("sections", [...currentProject.sections, newSection]);
  }

  function updateSectionHeading(sectionIndex: number, heading: string) {
    if (!currentProject) return;
    const updated = [...currentProject.sections];
    const prev = updated[sectionIndex];
    if (prev) {
      updated[sectionIndex] = { ...prev, heading };
      updateField("sections", updated);
    }
  }

  function removeSection(sectionIndex: number) {
    if (!currentProject) return;
    const updated = currentProject.sections.filter((_, idx) => idx !== sectionIndex);
    updateField("sections", updated);
  }

  // Link modifiers
  function addLink() {
    if (!currentProject) return;
    const newLink = {
      label: "Documentation",
      url: "https://example.com/docs",
      checkedAt: new Date().toISOString(),
    };
    updateField("links", [...currentProject.links, newLink]);
  }

  function updateLink(index: number, label: string, url: string) {
    if (!currentProject) return;
    const updated = [...currentProject.links];
    const prev = updated[index];
    if (prev) {
      updated[index] = { ...prev, label, url };
      updateField("links", updated);
    }
  }

  function removeLink(index: number) {
    if (!currentProject) return;
    const updated = currentProject.links.filter((_, idx) => idx !== index);
    updateField("links", updated);
  }

  // Evidence modifiers
  function addEvidence() {
    if (!currentProject) return;
    const newEvidence: EvidenceRef = {
      id: `ev-${Date.now()}`,
      kind: "document",
      url: "https://example.com/evidence",
      checkedAt: new Date().toISOString(),
      status: "verified",
      note: "Verified documentation record.",
    };
    updateField("evidence", [...currentProject.evidence, newEvidence]);
  }

  function updateEvidence<K extends keyof EvidenceRef>(index: number, field: K, val: EvidenceRef[K]) {
    if (!currentProject) return;
    const updated = [...currentProject.evidence];
    const prev = updated[index];
    if (prev) {
      updated[index] = { ...prev, [field]: val };
      updateField("evidence", updated);
    }
  }

  function removeEvidence(index: number) {
    if (!currentProject) return;
    const updated = currentProject.evidence.filter((_, idx) => idx !== index);
    updateField("evidence", updated);
  }

  async function handleSaveDraft() {
    if (!currentProject) return;
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          expectedRevision,
          project: currentProject,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setFeedback({
          type: "error",
          message: `Revision Conflict (409): ${data.error || "Draft revision mismatch. Another session modified this draft."}`,
        });
      } else if (response.status === 422) {
        setFeedback({
          type: "error",
          message: `Validation Error (422): ${data.error || "Invalid content or unverified evidence."}`,
        });
      } else if (!response.ok) {
        setFeedback({
          type: "error",
          message: `Save failed (${response.status}): ${data.error || "Unknown server error."}`,
        });
      } else {
        const newRev = data.draftRevision;
        setExpectedRevision(newRev);
        setProjects((prev) =>
          prev.map((p) => (p.id === currentProject.id ? { ...p, revision: newRev } : p))
        );
        setFeedback({
          type: "success",
          message: `Draft saved successfully! Updated draft revision: ${newRev}`,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error saving draft",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!currentProject) {
    return <div>No projects available for editing.</div>;
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Project selector & revision header */}
      <div className={styles.sectionBox} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <label htmlFor="project-select" className={styles.label} style={{ marginRight: "0.5rem" }}>
            Select Project:
          </label>
          <select
            id="project-select"
            value={selectedId}
            onChange={(e) => handleProjectChange(e.target.value as ProjectId)}
            className={styles.input}
            style={{ width: "auto", display: "inline-block" }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.id})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            Current Draft Revision: {currentProject.revision}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label htmlFor="expected-rev" className={styles.label}>
              Expected Rev:
            </label>
            <input
              id="expected-rev"
              type="number"
              value={expectedRevision}
              onChange={(e) => setExpectedRevision(Number(e.target.value))}
              className={styles.input}
              style={{ width: "80px", padding: "0.3rem 0.5rem" }}
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`${styles.feedbackBox} ${
            feedback.type === "success"
              ? styles.feedbackSuccess
              : feedback.type === "warning"
              ? styles.feedbackWarning
              : styles.feedbackError
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Basic metadata */}
      <div className={styles.sectionBox}>
        <h3 style={{ marginBottom: "1rem" }}>Project Overview & Summary</h3>
        <div className={styles.field} style={{ marginBottom: "1rem" }}>
          <label htmlFor="proj-title" className={styles.label}>
            Title
          </label>
          <input
            id="proj-title"
            className={styles.input}
            value={currentProject.title}
            onChange={(e) => updateField("title", e.target.value)}
          />
        </div>

        <div className={styles.field} style={{ marginBottom: "1rem" }}>
          <label htmlFor="proj-summary" className={styles.label}>
            Summary
          </label>
          <textarea
            id="proj-summary"
            className={styles.input}
            rows={3}
            value={currentProject.summary}
            onChange={(e) => updateField("summary", e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="proj-contrib" className={styles.label}>
            Contribution
          </label>
          <textarea
            id="proj-contrib"
            className={styles.input}
            rows={3}
            value={currentProject.contribution}
            onChange={(e) => updateField("contribution", e.target.value)}
          />
        </div>
      </div>

      {/* Content Sections */}
      <div className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>Structured Content Sections ({currentProject.sections.length})</h3>
          <button type="button" onClick={addSection} className={styles.buttonSecondary}>
            + Add Section
          </button>
        </div>

        {currentProject.sections.map((sec, secIdx) => (
          <div key={sec.id || secIdx} style={{ border: "1px solid var(--color-line)", padding: "1rem", borderRadius: "6px", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <input
                aria-label={`Section ${secIdx + 1} Heading`}
                value={sec.heading}
                onChange={(e) => updateSectionHeading(secIdx, e.target.value)}
                className={styles.input}
                style={{ fontWeight: 600, maxWidth: "400px" }}
              />
              <button
                type="button"
                onClick={() => removeSection(secIdx)}
                className={styles.buttonDanger}
              >
                Delete Section
              </button>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
              {sec.blocks.map((b, bIdx) => (
                <div key={bIdx} style={{ padding: "0.35rem 0" }}>
                  Block {bIdx + 1} ({b.type}): {b.type === "paragraph" || b.type === "code" ? b.text.slice(0, 60) + "..." : b.type === "image" ? `Image ID: ${b.mediaId}` : `List (${b.items.length} items)`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* External Links */}
      <div className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>External Links ({currentProject.links.length})</h3>
          <button type="button" onClick={addLink} className={styles.buttonSecondary}>
            + Add Link
          </button>
        </div>

        {currentProject.links.map((link, idx) => (
          <div key={idx} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <input
              placeholder="Label"
              value={link.label}
              onChange={(e) => updateLink(idx, e.target.value, link.url)}
              className={styles.input}
              style={{ flex: "1" }}
            />
            <input
              placeholder="https://..."
              value={link.url}
              onChange={(e) => updateLink(idx, link.label, e.target.value)}
              className={styles.input}
              style={{ flex: "2" }}
            />
            <button type="button" onClick={() => removeLink(idx)} className={styles.buttonDanger}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Evidence Records */}
      <div className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>Evidence Records ({currentProject.evidence.length})</h3>
          <button type="button" onClick={addEvidence} className={styles.buttonSecondary}>
            + Add Evidence
          </button>
        </div>

        {currentProject.evidence.map((ev, idx) => (
          <div key={idx} style={{ border: "1px solid var(--color-line)", padding: "0.75rem", borderRadius: "6px", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                placeholder="Evidence ID"
                value={ev.id}
                onChange={(e) => updateEvidence(idx, "id", e.target.value)}
                className={styles.input}
                style={{ flex: "1" }}
              />
              <select
                value={ev.status}
                onChange={(e) => updateEvidence(idx, "status", e.target.value as EvidenceStatus)}
                className={styles.input}
                style={{ width: "160px" }}
              >
                <option value="verified">verified</option>
                <option value="unknown">unknown</option>
                <option value="not-measured">not-measured</option>
                <option value="not-applicable">not-applicable</option>
              </select>
              <button type="button" onClick={() => removeEvidence(idx)} className={styles.buttonDanger}>
                Remove
              </button>
            </div>
            <input
              placeholder="Evidence note..."
              value={ev.note}
              onChange={(e) => updateEvidence(idx, "note", e.target.value)}
              className={styles.input}
            />
          </div>
        ))}
      </div>

      {/* Save Draft Action */}
      <div className={styles.actionRow}>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className={styles.button}
          style={{ width: "auto", minWidth: "200px" }}
        >
          {saving ? "Saving Draft..." : "Save Draft Revision"}
        </button>
      </div>
    </div>
  );
}

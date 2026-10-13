"use client";

/**
 * YOR WORLD Milestone A1 / Milestone A4: Structured Project Editor
 *
 * Provides owner-managed structured content editing for projects, sections,
 * evidence records, and media attachments with optimistic concurrency control,
 * section/block reordering, unsaved buffer retention, and direct draft preview links.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type {
  ProjectId,
  PublishedProject,
  ContentSection,
  EvidenceRef,
} from "@/contracts/content";
import {
  StructuredBlockEditor,
  type ContentBlock,
  type ApprovedMediaOption,
} from "./structured-block-editor";
import styles from "@/app/admin/admin.module.css";

interface ProjectEditorProps {
  initialProjects: PublishedProject[];
  initialDraftRevisions?: Record<string, number>;
  approvedMedia?: ApprovedMediaOption[];
}

const EMPTY_APPROVED_MEDIA: ApprovedMediaOption[] = [];

export function ProjectEditor({
  initialProjects,
  initialDraftRevisions = {},
  approvedMedia = EMPTY_APPROVED_MEDIA,
}: ProjectEditorProps) {
  const [projects, setProjects] = useState<PublishedProject[]>(initialProjects);
  const [savedSnapshot, setSavedSnapshot] = useState<PublishedProject[]>(initialProjects);
  const [selectedId, setSelectedId] = useState<ProjectId>(
    initialProjects[0]?.id || "ai-vs-real"
  );
  const [draftRevisions, setDraftRevisions] = useState<Record<string, number>>(() => Object.fromEntries(
    initialProjects.map((project) => [project.id,initialDraftRevisions[project.id] ?? project.revision]),
  ));
  const [approvedMediaList, setApprovedMediaList] = useState<ApprovedMediaOption[]>(approvedMedia);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const pendingSectionFocus = useRef<number | null>(null);

  useEffect(() => {
    const index = pendingSectionFocus.current;
    if (index === null) return;
    editorRef.current?.querySelector<HTMLElement>(`[data-section-index="${index}"] input`)?.focus();
    pendingSectionFocus.current = null;
  }, [projects]);

  // Fetch approved media list if not provided via props
  useEffect(() => {
    if (approvedMedia.length === 0) {
      fetch("/api/admin/media")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.assets)) {
            setApprovedMediaList(data.assets.filter((asset: ApprovedMediaOption) =>
              asset.approvalStatus === "approved" && asset.mime?.startsWith("image/") && isUuid(asset.id),
            ));
          }
        })
        .catch(() => {
          /* Fallback remains empty or prop-provided list */
        });
    }
  }, [approvedMedia]);

  const currentProject = projects.find((p) => p.id === selectedId) ?? projects[0];
  const [expectedRevision, setExpectedRevision] = useState<number>(
    currentProject ? initialDraftRevisions[currentProject.id] ?? currentProject.revision : 1
  );

  function handleProjectChange(id: ProjectId) {
    setSelectedId(id);
    const target = projects.find((p) => p.id === id);
    if (target) {
      setExpectedRevision(draftRevisions[id] ?? target.revision);
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
    pendingSectionFocus.current = currentProject.sections.length;
    const newSection: ContentSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      heading: "",
      blocks: [{ type: "paragraph", text: "" }],
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

  function updateSectionBlocks(sectionIndex: number, blocks: ContentBlock[]) {
    if (!currentProject) return;
    const updated = [...currentProject.sections];
    const prev = updated[sectionIndex];
    if (prev) {
      updated[sectionIndex] = { ...prev, blocks };
      updateField("sections", updated);
    }
  }

  function moveSection(fromIdx: number, toIdx: number) {
    if (!currentProject) return;
    if (toIdx < 0 || toIdx >= currentProject.sections.length) return;
    pendingSectionFocus.current = toIdx;
    const updated = [...currentProject.sections];
    const item = updated.splice(fromIdx, 1)[0]!;
    updated.splice(toIdx, 0, item);
    updateField("sections", updated);
  }

  function removeSection(sectionIndex: number) {
    if (!currentProject) return;
    if (currentProject.sections.length <= 1) return;
    pendingSectionFocus.current = Math.min(sectionIndex,currentProject.sections.length - 2);
    const updated = currentProject.sections.filter((_, idx) => idx !== sectionIndex);
    updateField("sections", updated);
  }

  // Link modifiers
  function addLink() {
    if (!currentProject) return;
    const newLink = {
      label: "",
      url: "",
      checkedAt: "",
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

  function updateLinkCheckedAt(index: number, value: string) {
    if (!currentProject) return;
    const updated = [...currentProject.links];
    const previous = updated[index];
    if (previous) {
      updated[index] = { ...previous, checkedAt: fromLocalDateTime(value) ?? "" };
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
      id: "",
      kind: "document",
      url: null,
      checkedAt: null,
      status: "unknown",
      note: "",
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

  // Cancel unsaved edits
  function handleCancelEdits() {
    if (!currentProject) return;
    const original = savedSnapshot.find((p) => p.id === selectedId);
    if (original) {
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedId ? JSON.parse(JSON.stringify(original)) : p))
      );
      setExpectedRevision(draftRevisions[selectedId] ?? original.revision);
      setFeedback({
        type: "warning",
        message: `Edits discarded. Reverted to last saved draft revision ${original.revision}.`,
      });
    }
  }

  // Save modified draft
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
        setDraftRevisions((prev) => ({ ...prev,[currentProject.id]: newRev }));
        setProjects((prev) =>
          prev.map((p) => (p.id === currentProject.id ? { ...p, revision: newRev } : p))
        );
        setSavedSnapshot((prev) =>
          prev.map((p) => (p.id === currentProject.id ? { ...currentProject, revision: newRev } : p))
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
    <div ref={editorRef} style={{ marginTop: "1.5rem" }}>
      {/* Project selector & revision header */}
      <div
        className={styles.sectionBox}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
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

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            Current Draft Revision: {draftRevisions[currentProject.id] ?? currentProject.revision}
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

          <Link
            href={`/admin/preview/${currentProject.slug}`}
            className={styles.buttonSecondary}
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem", width: "auto" }}
          >
            Preview Draft ↗
          </Link>
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

      {/* Structured Content Sections with Full Block Editing */}
      <div className={styles.sectionBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h3>Structured Content Sections ({currentProject.sections.length})</h3>
          <button type="button" onClick={addSection} className={styles.buttonSecondary} style={{ width: "auto" }}>
            + Add Section
          </button>
        </div>

        {currentProject.sections.map((sec, secIdx) => (
          <div
            key={sec.id || secIdx}
            data-section-index={secIdx}
            style={{
              border: "1px solid var(--color-line)",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              background: "#ffffff",
            }}
          >
            {/* Section heading & ordering toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                <span className={styles.badge}>Section {secIdx + 1}</span>
                <input
                  aria-label={`Section ${secIdx + 1} Heading`}
                  value={sec.heading}
                  onChange={(e) => updateSectionHeading(secIdx, e.target.value)}
                  className={styles.input}
                  style={{ fontWeight: 600, maxWidth: "420px" }}
                  placeholder="Section heading..."
                />
              </div>

              <div style={{ display: "flex", gap: "0.35rem" }}>
                <button
                  type="button"
                  onClick={() => moveSection(secIdx, secIdx - 1)}
                  disabled={secIdx === 0}
                  aria-label={`Move Section ${secIdx + 1} Up`}
                  style={{
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.8rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-line)",
                    background: secIdx === 0 ? "#f1f5f9" : "#ffffff",
                    cursor: secIdx === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ↑ Section Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(secIdx, secIdx + 1)}
                  disabled={secIdx === currentProject.sections.length - 1}
                  aria-label={`Move Section ${secIdx + 1} Down`}
                  style={{
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.8rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-line)",
                    background: secIdx === currentProject.sections.length - 1 ? "#f1f5f9" : "#ffffff",
                    cursor: secIdx === currentProject.sections.length - 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ↓ Section Down
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(secIdx)}
                  disabled={currentProject.sections.length <= 1}
                  className={styles.buttonDanger}
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                  aria-label={`Delete Section ${secIdx + 1}`}
                >
                  Delete Section
                </button>
              </div>
            </div>

            {/* Embedded block editor */}
            <StructuredBlockEditor
              blocks={sec.blocks as ContentBlock[]}
              sectionIndex={secIdx}
              approvedMediaList={approvedMediaList}
              onChange={(updatedBlocks) => updateSectionBlocks(secIdx, updatedBlocks)}
            />
          </div>
        ))}
      </div>

      {/* External Links */}
      <div className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>External Links ({currentProject.links.length})</h3>
          <button type="button" onClick={addLink} className={styles.buttonSecondary} style={{ width: "auto" }}>
            + Add Link
          </button>
        </div>

        {currentProject.links.map((link, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "0.5rem", alignItems: "end" }}>
            <input
              aria-label={`Link ${idx + 1} Label`}
              placeholder="Link label"
              value={link.label}
              onChange={(e) => updateLink(idx, e.target.value, link.url)}
              className={styles.input}
            />
            <input
              aria-label={`Link ${idx + 1} HTTPS URL`}
              placeholder="https://..."
              value={link.url}
              onChange={(e) => updateLink(idx, link.label, e.target.value)}
              className={styles.input}
            />
            <label className={styles.field}>
              <span className={styles.label}>Last checked</span>
              <input
                aria-label={`Link ${idx + 1} checked time`}
                type="datetime-local"
                value={toLocalDateTime(link.checkedAt)}
                onChange={(e) => updateLinkCheckedAt(idx, e.target.value)}
                className={styles.input}
              />
            </label>
            <button
              type="button"
              onClick={() => removeLink(idx)}
              aria-label={`Remove Link ${idx + 1}`}
              className={styles.buttonDanger}
              style={{ padding: "0.4rem 0.8rem", width: "auto" }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Evidence Register */}
      <div className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>Verifiable Evidence Records ({currentProject.evidence.length})</h3>
          <button type="button" onClick={addEvidence} className={styles.buttonSecondary} style={{ width: "auto" }}>
            + Add Evidence Record
          </button>
        </div>

        {currentProject.evidence.map((ev, idx) => (
          <div
            key={ev.id || idx}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
              marginBottom: "0.75rem",
              alignItems: "end",
            }}
          >
            <input
              aria-label={`Evidence ${idx + 1} ID`}
              placeholder="Evidence ID"
              value={ev.id}
              onChange={(e) => updateEvidence(idx, "id", e.target.value)}
              className={styles.input}
            />
            <select
              aria-label={`Evidence ${idx + 1} kind`}
              value={ev.kind}
              onChange={(e) => updateEvidence(idx, "kind", e.target.value as EvidenceRef["kind"])}
              className={styles.input}
            >
              <option value="repository">repository</option>
              <option value="deployment">deployment</option>
              <option value="measurement">measurement</option>
              <option value="document">document</option>
            </select>
            <select
              aria-label={`Evidence ${idx + 1} status`}
              value={ev.status}
              onChange={(e) => updateEvidence(idx, "status", e.target.value as EvidenceRef["status"])}
              className={styles.input}
            >
              <option value="verified">verified</option>
              <option value="unknown">unknown</option>
              <option value="not-measured">not-measured</option>
              <option value="not-applicable">not-applicable</option>
            </select>
            <input
              aria-label={`Evidence ${idx + 1} HTTPS URL`}
              type="url"
              placeholder="Optional https:// source"
              value={ev.url ?? ""}
              onChange={(e) => updateEvidence(idx, "url", e.target.value || null)}
              className={styles.input}
            />
            <label className={styles.field}>
              <span className={styles.label}>Last checked</span>
              <input
                aria-label={`Evidence ${idx + 1} checked time`}
                type="datetime-local"
                value={toLocalDateTime(ev.checkedAt)}
                onChange={(e) => updateEvidence(idx, "checkedAt", fromLocalDateTime(e.target.value))}
                className={styles.input}
              />
            </label>
            <textarea
              aria-label={`Evidence ${idx + 1} note`}
              placeholder="What does this record verify?"
              value={ev.note}
              onChange={(e) => updateEvidence(idx, "note", e.target.value)}
              className={styles.input}
              rows={2}
            />
            <button
              type="button"
              onClick={() => removeEvidence(idx)}
              aria-label={`Remove Evidence ${idx + 1}`}
              className={styles.buttonDanger}
              style={{ padding: "0.4rem 0.8rem", width: "auto" }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Save & Cancel Toolbar */}
      <div
        className={styles.sectionBox}
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleCancelEdits}
          disabled={saving}
          className={styles.buttonSecondary}
          style={{ width: "auto", minWidth: "140px", marginTop: 0 }}
        >
          Cancel Edits
        </button>

        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className={styles.button}
          style={{ width: "auto", minWidth: "220px", marginTop: 0 }}
        >
          {saving ? "Saving Draft..." : `Save Draft (Rev ${expectedRevision})`}
        </button>
      </div>
    </div>
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

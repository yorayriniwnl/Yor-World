"use client";

import { useEffect, useState } from "react";
import type {
  ContentSection,
  EvidenceRef,
  EvidenceStatus,
  ProjectId,
  PublishedProject,
} from "@/contracts/content";
import { StructuredBlockEditor, type MediaOption } from "./structured-block-editor";
import styles from "@/app/admin/admin.module.css";

interface ProjectEditorProps {
  initialProjects: PublishedProject[];
}

type Feedback = { type: "success" | "error" | "warning"; message: string } | null;

export function ProjectEditor({ initialProjects }: ProjectEditorProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [savedProjects, setSavedProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState<ProjectId>(initialProjects[0]?.id ?? "ai-vs-real");
  const [expectedRevision, setExpectedRevision] = useState(initialProjects[0]?.revision ?? 1);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaOption[]>([]);

  const currentProject = projects.find((project) => project.id === selectedId) ?? projects[0];

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/media", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Approved image list is unavailable.");
        if (active) setMediaAssets(Array.isArray(data.assets) ? data.assets : []);
      })
      .catch((error: unknown) => {
        if (active) setFeedback({ type: "warning", message: error instanceof Error ? error.message : "Approved image list is unavailable." });
      });
    return () => { active = false; };
  }, []);

  function updateProject<K extends keyof PublishedProject>(field: K, value: PublishedProject[K]) {
    setProjects((previous) => previous.map((project) => project.id === selectedId ? { ...project, [field]: value } : project));
  }

  function selectProject(value: string) {
    const target = projects.find((project) => project.id === value);
    if (!target) return;
    setSelectedId(target.id);
    setExpectedRevision(target.revision);
    setFeedback(null);
  }

  function addSection() {
    if (!currentProject) return;
    const next: ContentSection = {
      id: "section-" + crypto.randomUUID(),
      heading: "",
      blocks: [{ type: "paragraph", text: "" }],
    };
    updateProject("sections", [...currentProject.sections, next]);
    const index = currentProject.sections.length;
    window.setTimeout(() => {
      const selector = '[data-section-index="' + index + '"] input[aria-label]';
      (document.querySelector(selector) as HTMLElement | null)?.focus();
    }, 0);
  }

  function changeSection(index: number, next: ContentSection) {
    if (!currentProject) return;
    const sections = currentProject.sections.slice();
    sections[index] = next;
    updateProject("sections", sections);
  }

  function removeSection(index: number) {
    if (!currentProject) return;
    updateProject("sections", currentProject.sections.filter((_section, item) => item !== index));
  }

  function moveSection(from: number, to: number) {
    if (!currentProject || to < 0 || to >= currentProject.sections.length) return;
    const sections = currentProject.sections.slice();
    const [section] = sections.splice(from, 1);
    if (!section) return;
    sections.splice(to, 0, section);
    updateProject("sections", sections);
    window.setTimeout(() => {
      const selector = '[data-section-index="' + to + '"] input[aria-label]';
      (document.querySelector(selector) as HTMLElement | null)?.focus();
    }, 0);
  }

  function addLink() {
    if (!currentProject) return;
    updateProject("links", [...currentProject.links, {
      label: "",
      url: "https://example.invalid/",
      checkedAt: new Date().toISOString(),
    }]);
  }

  function updateLink(index: number, field: "label" | "url", value: string) {
    if (!currentProject) return;
    const links = currentProject.links.slice();
    const link = links[index];
    if (!link) return;
    links[index] = { ...link, [field]: value };
    updateProject("links", links);
  }

  function addEvidence() {
    if (!currentProject) return;
    const item: EvidenceRef = {
      id: "",
      kind: "document",
      url: null,
      checkedAt: null,
      status: "unknown",
      note: "",
    };
    updateProject("evidence", [...currentProject.evidence, item]);
  }

  function updateEvidence<K extends keyof EvidenceRef>(index: number, field: K, value: EvidenceRef[K]) {
    if (!currentProject) return;
    const evidence = currentProject.evidence.slice();
    const item = evidence[index];
    if (!item) return;
    evidence[index] = { ...item, [field]: value };
    updateProject("evidence", evidence);
  }

  async function saveDraft() {
    if (!currentProject) return;
    setSaving(true);
    setFeedback(null);
    try {
      const { revision: _revision, ...content } = currentProject;
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ projectId: currentProject.id, expectedRevision, project: content }),
      });
      const data = await response.json();
      if (response.status === 409) {
        setFeedback({ type: "error", message: "Revision Conflict (409): " + (data.error || "Draft changed. Your unsaved edits are still here.") });
      } else if (response.status === 422) {
        setFeedback({ type: "error", message: "Validation Error (422): " + (data.error || "Update the highlighted draft content and try again.") });
      } else if (!response.ok) {
        setFeedback({ type: "error", message: "Save failed (" + response.status + "): " + (data.error || "Private storage is unavailable.") });
      } else {
        const saved = data.project as PublishedProject;
        setExpectedRevision(data.draftRevision);
        setProjects((previous) => previous.map((project) => project.id === saved.id ? saved : project));
        setSavedProjects((previous) => previous.map((project) => project.id === saved.id ? saved : project));
        setFeedback({ type: "success", message: "Draft saved successfully! Updated draft revision: " + data.draftRevision });
      }
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Network error saving draft." });
    } finally {
      setSaving(false);
    }
  }

  function cancelEdits() {
    const saved = savedProjects.find((project) => project.id === selectedId);
    if (!saved) return;
    setProjects((previous) => previous.map((project) => project.id === selectedId ? saved : project));
    setExpectedRevision(saved.revision);
    setFeedback({ type: "success", message: "Unsaved edits were discarded. The saved draft is restored." });
  }

  if (!currentProject) return <p>No project drafts are available.</p>;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div className={styles.sectionBox} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <label htmlFor="project-select" className={styles.label} style={{ marginRight: "0.5rem" }}>Select Project:</label>
          <select id="project-select" value={selectedId} onChange={(event) => selectProject(event.target.value)} className={styles.input} style={{ width: "auto", display: "inline-block" }}>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title} ({project.id})</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <span className={styles.badge}>Current Draft Revision: {currentProject.revision}</span>
          <label htmlFor="expected-rev" className={styles.label}>Expected Rev:</label>
          <input id="expected-rev" type="number" min={1} value={expectedRevision} onChange={(event) => setExpectedRevision(Number(event.target.value))} className={styles.input} style={{ width: "90px" }} />
        </div>
      </div>

      {feedback && <div role="alert" className={styles.feedbackBox}>{feedback.message}</div>}

      <section className={styles.sectionBox} aria-label="Project overview">
        <h2>Project Overview &amp; Summary</h2>
        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input className={styles.input} value={currentProject.title} onChange={(event) => updateProject("title", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Summary</span>
          <textarea className={styles.input} rows={3} value={currentProject.summary} onChange={(event) => updateProject("summary", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Contribution</span>
          <textarea className={styles.input} rows={3} value={currentProject.contribution} onChange={(event) => updateProject("contribution", event.target.value)} />
        </label>
      </section>

      <section className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h2>Structured Content Sections ({currentProject.sections.length})</h2>
          <button type="button" className={styles.buttonSecondary} onClick={addSection}>+ Add Section</button>
        </div>
        {currentProject.sections.map((section, sectionIndex) => (
          <section key={section.id} data-section-index={sectionIndex} style={{ border: "1px solid var(--color-line)", borderRadius: "8px", margin: "1rem 0", padding: "1rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
              <label className={styles.field} style={{ flex: "1 1 18rem" }}>
                <span className={styles.label}>Section {sectionIndex + 1} Heading</span>
                <input className={styles.input} aria-label={"Section " + (sectionIndex + 1) + " Heading"} value={section.heading}
                  onChange={(event) => changeSection(sectionIndex, { ...section, heading: event.target.value })} />
              </label>
              <button type="button" className={styles.buttonSecondary} disabled={sectionIndex === 0}
                onClick={() => moveSection(sectionIndex, sectionIndex - 1)}>Move Section {sectionIndex + 1} Up</button>
              <button type="button" className={styles.buttonSecondary} disabled={sectionIndex === currentProject.sections.length - 1}
                onClick={() => moveSection(sectionIndex, sectionIndex + 1)}>Move Section {sectionIndex + 1} Down</button>
              <button type="button" className={styles.buttonDanger} onClick={() => removeSection(sectionIndex)}>Delete Section</button>
            </div>
            <StructuredBlockEditor section={section} sectionIndex={sectionIndex} mediaAssets={mediaAssets}
              onChange={(next) => changeSection(sectionIndex, next)} />
          </section>
        ))}
      </section>

      <section className={styles.sectionBox} aria-label="External links">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>External Links ({currentProject.links.length})</h2>
          <button type="button" className={styles.buttonSecondary} onClick={addLink}>+ Add Link</button>
        </div>
        {currentProject.links.map((link, index) => (
          <div key={index} className={styles.field} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.5rem" }}>
            <label className={styles.label}>Link {index + 1} Label
              <input className={styles.input} value={link.label} onChange={(event) => updateLink(index, "label", event.target.value)} />
            </label>
            <label className={styles.label}>Link {index + 1} URL
              <input className={styles.input} value={link.url} onChange={(event) => updateLink(index, "url", event.target.value)} />
            </label>
            <button type="button" className={styles.buttonDanger} onClick={() => updateProject("links", currentProject.links.filter((_item, itemIndex) => itemIndex !== index))}>Remove Link {index + 1}</button>
          </div>
        ))}
      </section>

      <section className={styles.sectionBox} aria-label="Evidence records">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Evidence Records ({currentProject.evidence.length})</h2>
          <button type="button" className={styles.buttonSecondary} onClick={addEvidence}>+ Add Evidence</button>
        </div>
        <p className={styles.subtitle}>New evidence starts as unknown. Add a source and retained receipt before claiming verification.</p>
        {currentProject.evidence.map((item, index) => (
          <div key={index} className={styles.field} style={{ border: "1px solid var(--color-line)", padding: "0.75rem", margin: "0.75rem 0" }}>
            <label className={styles.label}>Evidence {index + 1} ID
              <input className={styles.input} value={item.id} onChange={(event) => updateEvidence(index, "id", event.target.value)} />
            </label>
            <label className={styles.label}>Evidence {index + 1} Note
              <textarea className={styles.input} value={item.note} onChange={(event) => updateEvidence(index, "note", event.target.value)} />
            </label>
            <label className={styles.label}>Evidence {index + 1} Status
              <select className={styles.input} value={item.status} onChange={(event) => updateEvidence(index, "status", event.target.value as EvidenceStatus)}>
                <option value="unknown">unknown</option>
                <option value="verified">verified</option>
                <option value="not-measured">not-measured</option>
                <option value="not-applicable">not-applicable</option>
              </select>
            </label>
            <label className={styles.label}>Evidence {index + 1} HTTPS source URL
              <input className={styles.input} value={item.url ?? ""} onChange={(event) => updateEvidence(index, "url", event.target.value || null)} />
            </label>
          </div>
        ))}
      </section>

      <div className={styles.actionRow}>
        <button type="button" onClick={() => void saveDraft()} disabled={saving} className={styles.button} style={{ width: "auto", minWidth: "200px" }}>
          {saving ? "Saving Draft..." : "Save Draft"}
        </button>
        <button type="button" onClick={cancelEdits} disabled={saving} className={styles.buttonSecondary}>Cancel Edits</button>
        <a href={"/admin/preview/" + encodeURIComponent(currentProject.slug)} className={styles.buttonSecondary}>Open private preview</a>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProjectId, PublishedProject, ContentSection, EvidenceRef, EvidenceStatus } from "@/contracts/content";
import { StructuredBlockEditor, type MediaChoice } from "./structured-block-editor";
import styles from "@/app/admin/admin.module.css";

interface ProjectEditorProps { initialProjects: PublishedProject[]; }

export function createEmptySection(id: string): ContentSection {
  return { id, heading: "", blocks: [{ type: "paragraph", text: "" }] };
}

export function createEmptyLink(): PublishedProject["links"][number] {
  return { label: "", url: "", checkedAt: "" };
}

export function ProjectEditor({ initialProjects }: ProjectEditorProps) {
  const [projects, setProjects] = useState<PublishedProject[]>(initialProjects);
  const [savedProjects, setSavedProjects] = useState<PublishedProject[]>(initialProjects);
  const [selectedId, setSelectedId] = useState<ProjectId>(initialProjects[0]?.id ?? "ai-vs-real");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expectedRevision, setExpectedRevision] = useState(initialProjects[0]?.revision ?? 1);
  const [mediaAssets, setMediaAssets] = useState<MediaChoice[]>([]);
  const [mediaMessage, setMediaMessage] = useState("Loading approved media…");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/media", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as { assets?: unknown[]; error?: string } | null;
        if (!response.ok || !Array.isArray(data?.assets)) throw new Error(data?.error || "Approved media is temporarily unavailable.");
        const assets = data.assets.filter((item): item is MediaChoice => {
          if (!item || typeof item !== "object") return false;
          const asset = item as Record<string, unknown>;
          return typeof asset.id === "string" && typeof asset.mime === "string" && typeof asset.bytes === "number" &&
            ["pending", "approved", "rejected"].includes(String(asset.approvalStatus));
        });
        if (!active) return;
        setMediaAssets(assets);
        const approvedCount = assets.filter((asset) => asset.approvalStatus === "approved").length;
        setMediaMessage(approvedCount ? `${approvedCount} approved media asset${approvedCount === 1 ? "" : "s"} available.` : "No approved media assets are available.");
      })
      .catch((error: unknown) => { if (active) setMediaMessage(error instanceof Error ? error.message : "Could not load approved media."); });
    return () => { active = false; };
  }, []);

  const currentProject = projects.find((project) => project.id === selectedId) ?? projects[0];

  function selectProject(id: ProjectId) {
    setSelectedId(id);
    const target = projects.find((project) => project.id === id);
    if (target) setExpectedRevision(target.revision);
    setFeedback(null);
  }

  function updateProject<K extends keyof PublishedProject>(field: K, value: PublishedProject[K]) {
    setProjects((previous) => previous.map((project) => project.id === selectedId ? { ...project, [field]: value } : project));
  }

  function addSection() {
    if (!currentProject) return;
    const section = createEmptySection(`section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    updateProject("sections", [...currentProject.sections, section]);
  }

  function changeSection(index: number, section: ContentSection) {
    if (!currentProject) return;
    updateProject("sections", currentProject.sections.map((item, itemIndex) => itemIndex === index ? section : item));
  }

  function moveSection(index: number, delta: -1 | 1) {
    if (!currentProject) return;
    const target = index + delta;
    if (target < 0 || target >= currentProject.sections.length) return;
    const sections = [...currentProject.sections];
    [sections[index], sections[target]] = [sections[target]!, sections[index]!];
    updateProject("sections", sections);
    requestAnimationFrame(() => document.getElementById(`section-heading-${sections[target]!.id}`)?.focus());
  }

  function deleteSection(index: number) {
    if (!currentProject) return;
    const sections = currentProject.sections.filter((_, itemIndex) => itemIndex !== index);
    updateProject("sections", sections);
    const target = sections[Math.min(index, sections.length - 1)];
    requestAnimationFrame(() => {
      const focusTarget = target ? document.getElementById(`section-heading-${target.id}`) : document.getElementById("add-section");
      focusTarget?.focus();
    });
  }

  function updateLink(index: number, field: "label" | "url", value: string) {
    if (!currentProject) return;
    updateProject("links", currentProject.links.map((link, linkIndex) => linkIndex === index
      ? { ...link, [field]: value, ...(field === "url" ? { checkedAt: "" } : {}) }
      : link));
  }

  function addLink() {
    if (!currentProject) return;
    updateProject("links", [...currentProject.links, createEmptyLink()]);
  }

  function updateEvidence(index: number, field: keyof EvidenceRef, value: string | EvidenceStatus | null) {
    if (!currentProject) return;
    updateProject("evidence", currentProject.evidence.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function addEvidence() {
    if (!currentProject) return;
    const evidence: EvidenceRef = { id: `ev-${Date.now()}`, kind: "document", url: null, checkedAt: null, status: "unknown", note: "" };
    updateProject("evidence", [...currentProject.evidence, evidence]);
  }

  function discardUnsavedChanges() {
    if (!currentProject) return;
    const saved = savedProjects.find((project) => project.id === currentProject.id);
    if (!saved) return;
    setProjects((previous) => previous.map((project) => project.id === saved.id ? saved : project));
    setExpectedRevision(saved.revision);
    setFeedback({ type: "success", message: "Unsaved changes discarded; the saved draft remains unchanged." });
  }

  async function saveDraft() {
    if (!currentProject) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProject.id, expectedRevision, project: currentProject }),
      });
      const data = await response.json().catch(() => null) as {
        error?: string;
        draftRevision?: number;
        project?: PublishedProject;
        currentDraft?: { draftRevision: number; project: PublishedProject };
      } | null;
      if (!response.ok) {
        const current = data?.currentDraft;
        const handoff = response.status === 409 && current
          ? ` The saved draft is now revision ${current.draftRevision}; its current title is “${current.project.title}”.`
          : "";
        const detail = data?.error || "The draft could not be saved.";
        setFeedback({ type: "error", message: `Save failed (${response.status}): ${detail}.${handoff} Your unsaved edits remain in this editor.` });
        return;
      }
      const saved = data?.project;
      const nextRevision = data?.draftRevision;
      if (!saved || typeof nextRevision !== "number") throw new Error("The save response was incomplete. Your editor buffer is still available.");
      setProjects((previous) => previous.map((project) => project.id === currentProject.id ? saved : project));
      setSavedProjects((previous) => previous.map((project) => project.id === currentProject.id ? saved : project));
      setExpectedRevision(nextRevision);
      setFeedback({ type: "success", message: `Draft saved as revision ${nextRevision}.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Network error saving draft. Your unsaved edits remain in this editor." });
    } finally {
      setSaving(false);
    }
  }

  if (!currentProject) return <p>No projects available for editing.</p>;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div className={styles.sectionBox} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <label htmlFor="project-select" className={styles.label} style={{ marginRight: "0.5rem" }}>Select project:</label>
          <select id="project-select" value={selectedId} onChange={(event) => selectProject(event.target.value as ProjectId)} className={styles.input}>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title} ({project.id}){project.id === "candidatex" ? " — private draft" : ""}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>Draft revision: {currentProject.revision}</span>
          <label htmlFor="expected-rev" className={styles.label}>Expected revision</label>
          <input id="expected-rev" type="number" min={1} value={expectedRevision} onChange={(event) => setExpectedRevision(Number(event.target.value))} className={styles.input} style={{ width: 90 }} />
          <Link href={`/admin/preview/${encodeURIComponent(currentProject.id)}`} className={styles.buttonSecondary}>Preview saved draft</Link>
        </div>
      </div>

      {feedback && <div role="status" className={`${styles.feedbackBox} ${feedback.type === "success" ? styles.feedbackSuccess : styles.feedbackError}`}>{feedback.message}</div>}

      <div className={styles.sectionBox}>
        <h2>Project overview</h2>
        <label className={styles.label} htmlFor="proj-title">Title</label>
        <input id="proj-title" className={styles.input} value={currentProject.title} onChange={(event) => updateProject("title", event.target.value)} />
        <label className={styles.label} htmlFor="proj-summary">Summary</label>
        <textarea id="proj-summary" className={styles.input} rows={3} value={currentProject.summary} onChange={(event) => updateProject("summary", event.target.value)} />
        <label className={styles.label} htmlFor="proj-contrib">Contribution</label>
        <textarea id="proj-contrib" className={styles.input} rows={3} value={currentProject.contribution} onChange={(event) => updateProject("contribution", event.target.value)} />
      </div>

      <div className={styles.sectionBox}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <h2>Structured content ({currentProject.sections.length} sections)</h2>
          <button id="add-section" type="button" className={styles.buttonSecondary} onClick={addSection}>Add section</button>
        </div>
        {currentProject.sections.map((section, index) => <div key={section.id} style={{ marginTop: "1rem" }}>
          <StructuredBlockEditor section={section} sectionIndex={index} mediaAssets={mediaAssets} onChange={(next) => changeSection(index, next)} onMoveSection={(delta) => moveSection(index, delta)} canMoveUp={index > 0} canMoveDown={index < currentProject.sections.length - 1} />
          <button type="button" className={styles.buttonDanger} onClick={() => deleteSection(index)}>Delete section</button>
        </div>)}
        <p className={styles.subtitle} role="status">{mediaMessage}</p>
      </div>

      <div className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2>External links ({currentProject.links.length})</h2><button type="button" onClick={addLink} className={styles.buttonSecondary}>Add link</button></div>
        {currentProject.links.map((link, index) => <div key={`${index}-${link.label}`} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <input aria-label={`Link ${index + 1} label`} value={link.label} onChange={(event) => updateLink(index, "label", event.target.value)} className={styles.input} />
          <input aria-label={`Link ${index + 1} URL`} type="url" value={link.url} onChange={(event) => updateLink(index, "url", event.target.value)} className={styles.input} />
          <button type="button" onClick={() => updateProject("links", currentProject.links.filter((_, itemIndex) => itemIndex !== index))} className={styles.buttonDanger}>Remove</button>
        </div>)}
      </div>

      <div className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2>Evidence records ({currentProject.evidence.length})</h2><button type="button" onClick={addEvidence} className={styles.buttonSecondary}>Add evidence</button></div>
        {currentProject.evidence.map((item, index) => <div key={`${index}-${item.id}`} style={{ display: "grid", gap: "0.5rem", border: "1px solid var(--color-line)", padding: "0.75rem", borderRadius: 6, marginBottom: "0.75rem" }}>
          <input aria-label={`Evidence ${index + 1} ID`} value={item.id} onChange={(event) => updateEvidence(index, "id", event.target.value)} className={styles.input} />
          <select aria-label={`Evidence ${index + 1} kind`} value={item.kind} onChange={(event) => updateEvidence(index, "kind", event.target.value as EvidenceRef["kind"])} className={styles.input}>
            <option value="repository">repository</option><option value="deployment">deployment</option><option value="measurement">measurement</option><option value="document">document</option>
          </select>
          <input aria-label={`Evidence ${index + 1} URL`} type="url" placeholder="https://…" value={item.url ?? ""} onChange={(event) => updateEvidence(index, "url", event.target.value || null)} className={styles.input} />
          <select aria-label={`Evidence ${index + 1} status`} value={item.status} onChange={(event) => updateEvidence(index, "status", event.target.value as EvidenceStatus)} className={styles.input}>
            <option value="unknown">unknown</option><option value="verified">verified</option><option value="not-measured">not-measured</option><option value="not-applicable">not-applicable</option>
          </select>
          <textarea aria-label={`Evidence ${index + 1} note`} placeholder="Evidence note" value={item.note} onChange={(event) => updateEvidence(index, "note", event.target.value)} className={styles.input} rows={2} />
          <button type="button" onClick={() => updateProject("evidence", currentProject.evidence.filter((_, itemIndex) => itemIndex !== index))} className={styles.buttonDanger}>Remove evidence</button>
        </div>)}
      </div>

      <div className={styles.actionRow}>
        <button type="button" onClick={discardUnsavedChanges} disabled={saving} className={styles.buttonSecondary}>Discard unsaved changes</button>
        <button type="button" onClick={saveDraft} disabled={saving} className={styles.button} style={{ width: "auto", minWidth: 200 }}>{saving ? "Saving draft…" : "Save draft revision"}</button>
      </div>
    </div>
  );
}

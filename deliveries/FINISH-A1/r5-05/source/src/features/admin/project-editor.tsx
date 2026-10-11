"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentSection, EvidenceRef, ProjectId, PublishedProject } from "@/contracts/content";
import { StructuredBlockEditor } from "./structured-block-editor";
import styles from "@/app/admin/admin.module.css";

type Block = ContentSection["blocks"][number];
type MediaAsset = { id: string; mime: string; approvalStatus: string };
type Feedback = { type: "success" | "error"; message: string } | null;

function newSection(): ContentSection {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? `section-${crypto.randomUUID()}` : `section-${Date.now()}`;
  return { id, heading: "", blocks: [{ type: "paragraph", text: "" }] };
}

export function ProjectEditor({ initialProjects }: { initialProjects: PublishedProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [savedProjects, setSavedProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState<ProjectId>(initialProjects[0]?.id ?? "ai-vs-real");
  const [expectedRevision, setExpectedRevision] = useState(initialProjects[0]?.revision ?? 0);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const current = useMemo(() => projects.find((project) => project.id === selectedId) ?? projects[0], [projects, selectedId]);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/media", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Approved media could not be loaded.");
      return response.json() as Promise<{ assets?: MediaAsset[] }>;
    }).then((data) => { if (active) setAssets((data.assets ?? []).filter((asset) => asset.approvalStatus === "approved")); })
      .catch(() => { if (active) setAssets([]); });
    return () => { active = false; };
  }, []);

  function updateCurrent(update: (project: PublishedProject) => PublishedProject) {
    if (!current) return;
    setProjects((previous) => previous.map((project) => project.id === current.id ? update(project) : project));
    setFeedback(null);
  }

  function updateSection(sectionIndex: number, update: (section: ContentSection) => ContentSection) {
    updateCurrent((project) => ({ ...project, sections: project.sections.map((section, index) => index === sectionIndex ? update(section) : section) }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    if (!current) return;
    const target = index + direction;
    if (target < 0 || target >= current.sections.length) return;
    const sections = [...current.sections];
    [sections[index], sections[target]] = [sections[target]!, sections[index]!];
    updateCurrent((project) => ({ ...project, sections }));
    setTimeout(() => document.getElementById(`section-heading-${sections[target]!.id}`)?.focus(), 0);
  }

  function removeSection(index: number) {
    if (!current || current.sections.length <= 1) return;
    const sections = current.sections.filter((_, sectionIndex) => sectionIndex !== index);
    updateCurrent((project) => ({ ...project, sections }));
    const target = sections[Math.min(index, sections.length - 1)]!;
    setTimeout(() => document.getElementById(`section-heading-${target.id}`)?.focus(), 0);
  }
  function updateBlock(sectionIndex: number, blockIndex: number, block: Block) {
    updateSection(sectionIndex, (section) => ({ ...section, blocks: section.blocks.map((item, index) => index === blockIndex ? block : item) }));
  }

  function moveBlock(sectionIndex: number, blockIndex: number, direction: -1 | 1) {
    if (!current) return;
    const section = current.sections[sectionIndex];
    if (!section) return;
    const target = blockIndex + direction;
    if (target < 0 || target >= section.blocks.length) return;
    const blocks = [...section.blocks];
    [blocks[blockIndex], blocks[target]] = [blocks[target]!, blocks[blockIndex]!];
    updateSection(sectionIndex, (value) => ({ ...value, blocks }));
    setTimeout(() => document.getElementById(`block-heading-${section.id}-${target}`)?.focus(), 0);
  }

  function removeBlock(sectionIndex: number, blockIndex: number) {
    if (!current) return;
    const section = current.sections[sectionIndex];
    if (!section || section.blocks.length <= 1) return;
    const blocks = section.blocks.filter((_, index) => index !== blockIndex);
    updateSection(sectionIndex, (value) => ({ ...value, blocks }));
    const target = Math.min(blockIndex, blocks.length - 1);
    setTimeout(() => document.getElementById(`block-heading-${section.id}-${target}`)?.focus(), 0);
  }
  function moveListItem(sectionIndex: number, blockIndex: number, itemIndex: number, direction: -1 | 1) {
    if (!current) return;
    const block = current.sections[sectionIndex]?.blocks[blockIndex];
    if (!block || block.type !== "list") return;
    const target = itemIndex + direction;
    if (target < 0 || target >= block.items.length) return;
    const items = [...block.items];
    [items[itemIndex], items[target]] = [items[target]!, items[itemIndex]!];
    updateBlock(sectionIndex, blockIndex, { ...block, items });
    const section = current.sections[sectionIndex]!;
    setTimeout(() => {
      const label = `Section ${section.id}, block ${blockIndex + 1} list item ${target + 1}`;
      [...document.querySelectorAll<HTMLInputElement>("input[aria-label]")].find((input) => input.getAttribute("aria-label") === label)?.focus();
    }, 0);
  }

  function removeListItem(sectionIndex: number, blockIndex: number, itemIndex: number) {
    if (!current) return;
    const block = current.sections[sectionIndex]?.blocks[blockIndex];
    if (!block || block.type !== "list" || block.items.length <= 1) return;
    const items = block.items.filter((_, index) => index !== itemIndex);
    updateBlock(sectionIndex, blockIndex, { ...block, items });
    const section = current.sections[sectionIndex]!;
    const target = Math.min(itemIndex, items.length - 1);
    setTimeout(() => {
      const label = `Section ${section.id}, block ${blockIndex + 1} list item ${target + 1}`;
      [...document.querySelectorAll<HTMLInputElement>("input[aria-label]")].find((input) => input.getAttribute("aria-label") === label)?.focus();
    }, 0);
  }
  async function saveDraft() {
    if (!current) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: current.id, expectedRevision, project: current }),
      });
      const data = await response.json() as { error?: string; draftRevision?: number; project?: PublishedProject };
      if (response.status === 409) throw new Error(`Draft changed in another session. Reload before saving. ${data.error ?? ""}`.trim());
      if (!response.ok || !data.project || typeof data.draftRevision !== "number") throw new Error(data.error ?? `Draft save failed (${response.status}).`);
      const saved = { ...data.project, revision: data.draftRevision };
      setProjects((previous) => previous.map((project) => project.id === current.id ? saved : project));
      setSavedProjects((previous) => previous.map((project) => project.id === current.id ? saved : project));
      setExpectedRevision(data.draftRevision);
      setFeedback({ type: "success", message: `Draft revision ${data.draftRevision} saved.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Draft save failed." });
    } finally {
      setSaving(false);
    }
  }

  function cancelChanges() {
    if (!current) return;
    const saved = savedProjects.find((project) => project.id === current.id);
    if (!saved) return;
    setProjects((previous) => previous.map((project) => project.id === saved.id ? saved : project));
    setExpectedRevision(saved.revision);
    setFeedback({ type: "success", message: "Unsaved changes were discarded." });
  }

  function updateEvidence(index: number, field: keyof EvidenceRef, value: string | null) {
    updateCurrent((project) => ({ ...project, evidence: project.evidence.map((item, currentIndex) => currentIndex === index ? { ...item, [field]: value, ...(field === "url" ? { checkedAt: null } : {}) } as EvidenceRef : item) }));
  }

  if (!current) return <p>No editable public drafts are available.</p>;

  return (
    <section aria-label="Structured project editor">
      <label>
        Project draft
        <select aria-label="Project draft" value={current.id} onChange={(event) => {
          const id = event.currentTarget.value as ProjectId;
          const next = projects.find((project) => project.id === id);
          if (next) { setSelectedId(id); setExpectedRevision(next.revision); setFeedback(null); }
        }}>
          {projects.filter((project) => project.id !== "candidatex").map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </label>

      <p>Draft revision {current.revision}. Editing is private until a separate reviewed publish action succeeds.</p>
      <label>Title<input aria-label="Project title" value={current.title} onChange={(event) => { const title = event.currentTarget.value; updateCurrent((project) => ({ ...project, title })); }} /></label>
      <label>Summary<textarea aria-label="Project summary" value={current.summary} onChange={(event) => { const summary = event.currentTarget.value; updateCurrent((project) => ({ ...project, summary })); }} /></label>
      <label>Contribution<textarea aria-label="Project contribution" value={current.contribution} onChange={(event) => { const contribution = event.currentTarget.value; updateCurrent((project) => ({ ...project, contribution })); }} /></label>

      <section aria-labelledby="sections-heading">
        <h2 id="sections-heading">Content sections</h2>
        {current.sections.map((section, sectionIndex) => (
          <fieldset key={section.id}>
            <legend><span id={`section-heading-${section.id}`} tabIndex={-1}>Section {sectionIndex + 1}</span></legend>
            <label>Section ID<input aria-label={`Section ${sectionIndex + 1} ID`} value={section.id} onChange={(event) => { const id = event.currentTarget.value; updateSection(sectionIndex, (value) => ({ ...value, id })); }} /></label>
            <label>Section heading<input aria-label={`Section ${sectionIndex + 1} heading`} value={section.heading} onChange={(event) => { const heading = event.currentTarget.value; updateSection(sectionIndex, (value) => ({ ...value, heading })); }} /></label>
            <div>
              {section.blocks.map((block, blockIndex) => (
                <StructuredBlockEditor key={`${section.id}-${blockIndex}`} block={block} sectionId={section.id} index={blockIndex} count={section.blocks.length} mediaAssets={assets}
                  onChange={(next) => updateBlock(sectionIndex, blockIndex, next)}
                  onMove={(direction) => moveBlock(sectionIndex, blockIndex, direction)}
                  onMoveListItem={(itemIndex, direction) => moveListItem(sectionIndex, blockIndex, itemIndex, direction)}
                  onRemove={() => removeBlock(sectionIndex, blockIndex)} onRemoveListItem={(itemIndex) => removeListItem(sectionIndex, blockIndex, itemIndex)} />
              ))}
              <button type="button" onClick={() => updateSection(sectionIndex, (value) => ({ ...value, blocks: [...value.blocks, { type: "paragraph", text: "" }] }))}>Add content block</button>
            </div>
            <div>
              <button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0}>Move section up</button>
              <button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === current.sections.length - 1}>Move section down</button>
              <button type="button" onClick={() => removeSection(sectionIndex)} disabled={current.sections.length <= 1}>Remove section</button>
            </div>
          </fieldset>
        ))}
        <button type="button" onClick={() => updateCurrent((project) => ({ ...project, sections: [...project.sections, newSection()] }))}>Add section</button>
      </section>

      <section aria-labelledby="links-heading">
        <h2 id="links-heading">Project links</h2>
        {current.links.map((link, index) => (
          <fieldset key={`${index}-${link.label}`}>
            <legend>Link {index + 1}</legend>
            <label>Label<input aria-label={`Link ${index + 1} label`} value={link.label} onChange={(event) => { const label = event.currentTarget.value; updateCurrent((project) => ({ ...project, links: project.links.map((item, itemIndex) => itemIndex === index ? { ...item, label } : item) })); }} /></label>
            <label>HTTPS URL<input aria-label={`Link ${index + 1} URL`} value={link.url} onChange={(event) => { const url = event.currentTarget.value; updateCurrent((project) => ({ ...project, links: project.links.map((item, itemIndex) => itemIndex === index ? { ...item, url, checkedAt: "" } : item) })); }} /></label>
            <label>Recorded URL check time<input aria-label={`Link ${index + 1} recorded check time`} value={link.checkedAt} placeholder="Set only after actually checking this URL" onChange={(event) => { const checkedAt = event.currentTarget.value; updateCurrent((project) => ({ ...project, links: project.links.map((item, itemIndex) => itemIndex === index ? { ...item, checkedAt } : item) })); }} /></label>
            <button type="button" onClick={() => updateCurrent((project) => ({ ...project, links: project.links.filter((_, itemIndex) => itemIndex !== index) }))}>Remove link {index + 1}</button>
          </fieldset>
        ))}
        <button type="button" onClick={() => updateCurrent((project) => ({ ...project, links: [...project.links, { label: "", url: "", checkedAt: "" }] }))}>Add link</button>
      </section>

      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading">Evidence records</h2>
        {current.evidence.map((item, index) => (
          <fieldset key={item.id}>
            <legend>{item.kind} · {item.id}</legend>
            <label>Evidence note<input aria-label={`Evidence ${index + 1} note`} value={item.note} onChange={(event) => updateEvidence(index, "note", event.currentTarget.value)} /></label>
            <label>Evidence URL<input aria-label={`Evidence ${index + 1} URL`} value={item.url ?? ""} onChange={(event) => updateEvidence(index, "url", event.currentTarget.value || null)} /></label>
            <label>Recorded check time<input aria-label={`Evidence ${index + 1} recorded check time`} value={item.checkedAt ?? ""} placeholder="Leave blank until actually checked" onChange={(event) => updateEvidence(index, "checkedAt", event.currentTarget.value || null)} /></label>
            <label>Status<select aria-label={`Evidence ${index + 1} status`} value={item.status} onChange={(event) => updateEvidence(index, "status", event.currentTarget.value)}>
              <option value="verified">Verified</option><option value="unknown">Unknown</option><option value="not-measured">Not measured</option><option value="not-applicable">Not applicable</option>
            </select></label>
            <button type="button" onClick={() => updateCurrent((project) => ({ ...project, evidence: project.evidence.filter((_, itemIndex) => itemIndex !== index) }))}>Remove evidence {index + 1}</button>
          </fieldset>
        ))}
        <button type="button" onClick={() => updateCurrent((project) => ({ ...project, evidence: [...project.evidence, { id: `evidence-${crypto.randomUUID()}`, kind: "document", url: null, checkedAt: null, status: "unknown", note: "" }] }))}>Add evidence (starts unknown)</button>
      </section>

      {feedback && <p role="status" aria-live="polite" className={feedback.type === "error" ? styles.error : styles.success}>{feedback.message}</p>}
      <div>
        <button type="button" onClick={() => void saveDraft()} disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
        <button type="button" onClick={cancelChanges} disabled={saving}>Discard unsaved changes</button>
        <a href={`/admin/preview/${encodeURIComponent(current.id)}`}>Open private saved preview</a>
      </div>
    </section>
  );
}

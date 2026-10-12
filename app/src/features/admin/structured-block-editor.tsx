"use client";

import type { ContentSection } from "@/contracts/content";
import styles from "@/app/admin/admin.module.css";

type ContentBlock = ContentSection["blocks"][number];
export interface MediaChoice {
  id: string;
  mime: string;
  bytes: number;
  approvalStatus: "pending" | "approved" | "rejected";
}

interface StructuredBlockEditorProps {
  section: ContentSection;
  sectionIndex: number;
  mediaAssets: MediaChoice[];
  onChange: (section: ContentSection) => void;
  onMoveSection: (delta: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function blockLabel(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph": case "code": return block.text.slice(0, 70);
    case "list": return `${block.items.length} list items`;
    case "image": return `Image ${block.mediaId}`;
  }
}

export function StructuredBlockEditor({ section, sectionIndex, mediaAssets, onChange, onMoveSection, canMoveUp, canMoveDown }: StructuredBlockEditorProps) {
  const approvedAssets = mediaAssets.filter((asset) => asset.approvalStatus === "approved");
  const setBlocks = (blocks: ContentBlock[]) => onChange({ ...section, blocks });

  function updateBlock(index: number, block: ContentBlock) {
    setBlocks(section.blocks.map((current, currentIndex) => currentIndex === index ? block : current));
  }

  function addBlock(type: ContentBlock["type"]) {
    let block: ContentBlock;
    switch (type) {
      case "paragraph": block = { type, text: "" }; break;
      case "list": block = { type, items: [] }; break;
      case "code": block = { type, language: "", text: "" }; break;
      case "image": {
        const asset = approvedAssets[0];
        if (!asset) return;
        block = { type, mediaId: asset.id, alt: "", caption: "" };
        break;
      }
    }
    setBlocks([...section.blocks, block]);
  }

  function moveBlock(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= section.blocks.length) return;
    const next = [...section.blocks];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setBlocks(next);
    requestAnimationFrame(() => document.getElementById(`section-${section.id}-block-${target}`)?.focus());
  }

  function removeBlock(index: number) {
    if (section.blocks.length === 1) return;
    const next = section.blocks.filter((_, itemIndex) => itemIndex !== index);
    setBlocks(next);
    const focusIndex = Math.min(index, next.length - 1);
    requestAnimationFrame(() => {
      const target = document.getElementById(`section-${section.id}-block-${focusIndex}`) ?? document.getElementById(`section-heading-${section.id}`);
      target?.focus();
    });
  }

  function updateListItem(blockIndex: number, itemIndex: number, value: string) {
    const block = section.blocks[blockIndex];
    if (block?.type !== "list") return;
    updateBlock(blockIndex, { ...block, items: block.items.map((item, index) => index === itemIndex ? value : item) });
  }

  function moveListItem(blockIndex: number, itemIndex: number, delta: -1 | 1) {
    const block = section.blocks[blockIndex];
    if (block?.type !== "list") return;
    const targetIndex = itemIndex + delta;
    if (targetIndex < 0 || targetIndex >= block.items.length) return;
    const items = [...block.items];
    [items[itemIndex], items[targetIndex]] = [items[targetIndex]!, items[itemIndex]!];
    updateBlock(blockIndex, { ...block, items });
    requestAnimationFrame(() => document.getElementById(`list-item-${section.id}-${blockIndex}-${targetIndex}`)?.focus());
  }

  function removeListItem(blockIndex: number, itemIndex: number) {
    const block = section.blocks[blockIndex];
    if (block?.type !== "list" || block.items.length === 1) return;
    const items = block.items.filter((_, index) => index !== itemIndex);
    updateBlock(blockIndex, { ...block, items });
    const focusIndex = Math.min(itemIndex, items.length - 1);
    requestAnimationFrame(() => document.getElementById(`list-item-${section.id}-${blockIndex}-${focusIndex}`)?.focus());
  }

  function addListItem(blockIndex: number) {
    const block = section.blocks[blockIndex];
    if (block?.type !== "list") return;
    updateBlock(blockIndex, { ...block, items: [...block.items, ""] });
    requestAnimationFrame(() => document.getElementById(`list-item-${section.id}-${blockIndex}-${block.items.length}`)?.focus());
  }

  return (
    <section className={styles.sectionBox} aria-label={`Section ${sectionIndex + 1} content`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <label className={styles.label} htmlFor={`section-heading-${section.id}`}>Section {sectionIndex + 1}</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className={styles.buttonSecondary} disabled={!canMoveUp} onClick={() => onMoveSection(-1)} aria-label={`Move section ${sectionIndex + 1} up`}>Move up</button>
          <button type="button" className={styles.buttonSecondary} disabled={!canMoveDown} onClick={() => onMoveSection(1)} aria-label={`Move section ${sectionIndex + 1} down`}>Move down</button>
        </div>
      </div>
      <input id={`section-heading-${section.id}`} aria-label={`Section ${sectionIndex + 1} heading`} className={styles.input} value={section.heading} onChange={(event) => onChange({ ...section, heading: event.target.value })} />

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
        {section.blocks.map((block, index) => (
          <article id={`section-${section.id}-block-${index}`} key={`${section.id}-${index}`} tabIndex={-1} style={{ border: "1px solid var(--color-line)", borderRadius: 6, padding: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <strong>Block {index + 1}: {block.type}</strong>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button type="button" className={styles.buttonSecondary} disabled={index === 0} onClick={() => moveBlock(index, -1)} aria-label={`Move block ${index + 1} up`}>Up</button>
                <button type="button" className={styles.buttonSecondary} disabled={index === section.blocks.length - 1} onClick={() => moveBlock(index, 1)} aria-label={`Move block ${index + 1} down`}>Down</button>
                <button type="button" className={styles.buttonDanger} disabled={section.blocks.length === 1} onClick={() => removeBlock(index)} aria-label={`Remove block ${index + 1}`}>Remove</button>
              </div>
            </div>
            <p className={styles.subtitle}>{blockLabel(block)}</p>
            {block.type === "paragraph" && <textarea className={styles.input} aria-label={`Paragraph block ${index + 1}`} rows={4} value={block.text} onChange={(event) => updateBlock(index, { ...block, text: event.target.value })} />}
            {block.type === "code" && <>
              <input className={styles.input} aria-label={`Code language block ${index + 1}`} value={block.language} onChange={(event) => updateBlock(index, { ...block, language: event.target.value })} />
              <textarea className={styles.input} aria-label={`Code text block ${index + 1}`} rows={6} value={block.text} onChange={(event) => updateBlock(index, { ...block, text: event.target.value })} />
            </>}
            {block.type === "list" && <div style={{ display: "grid", gap: "0.5rem" }}>
              {block.items.map((item, itemIndex) => <div key={`${section.id}-${index}-${itemIndex}`} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <input id={`list-item-${section.id}-${index}-${itemIndex}`} className={styles.input} aria-label={`List block ${index + 1} item ${itemIndex + 1}`} value={item} onChange={(event) => updateListItem(index, itemIndex, event.target.value)} />
                <button type="button" className={styles.buttonSecondary} disabled={itemIndex === 0} onClick={() => moveListItem(index, itemIndex, -1)} aria-label={`Move list item ${itemIndex + 1} up`}>Up</button>
                <button type="button" className={styles.buttonSecondary} disabled={itemIndex === block.items.length - 1} onClick={() => moveListItem(index, itemIndex, 1)} aria-label={`Move list item ${itemIndex + 1} down`}>Down</button>
                <button type="button" className={styles.buttonDanger} disabled={block.items.length === 1} onClick={() => removeListItem(index, itemIndex)} aria-label={`Remove list item ${itemIndex + 1}`}>Remove item</button>
              </div>)}
              <button type="button" className={styles.buttonSecondary} onClick={() => addListItem(index)}>Add list item to block {index + 1}</button>
            </div>}
            {block.type === "image" && <div style={{ display: "grid", gap: "0.5rem" }}>
              <label className={styles.label} htmlFor={`media-${section.id}-${index}`}>Approved media</label>
              <select id={`media-${section.id}-${index}`} className={styles.input} value={block.mediaId} onChange={(event) => updateBlock(index, { ...block, mediaId: event.target.value })}>
                {!approvedAssets.some((asset) => asset.id === block.mediaId) && <option value={block.mediaId} disabled>Current media is not approved or unavailable</option>}
                {approvedAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id}{asset.id === "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" ? " · synthetic local browser fixture; not provider approval" : ""} ({asset.mime}, {asset.bytes} bytes)</option>)}
              </select>
              <input className={styles.input} aria-label={`Image alt text block ${index + 1}`} placeholder="Alternative text" value={block.alt} onChange={(event) => updateBlock(index, { ...block, alt: event.target.value })} />
              <input className={styles.input} aria-label={`Image caption block ${index + 1}`} placeholder="Caption" value={block.caption} onChange={(event) => updateBlock(index, { ...block, caption: event.target.value })} />
            </div>}
          </article>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        <button type="button" className={styles.buttonSecondary} onClick={() => addBlock("paragraph")}>Add paragraph</button>
        <button type="button" className={styles.buttonSecondary} onClick={() => addBlock("list")}>Add list</button>
        <button type="button" className={styles.buttonSecondary} onClick={() => addBlock("code")}>Add code</button>
        <button type="button" className={styles.buttonSecondary} disabled={approvedAssets.length === 0} onClick={() => addBlock("image")}>Add approved image</button>
      </div>
    </section>
  );
}

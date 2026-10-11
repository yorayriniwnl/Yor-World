"use client";

/**
 * YOR WORLD Milestone A1: Structured Block Editor
 *
 * Implements accessible, keyboard-operable editing for all four ContentSectionSchema
 * variants: paragraph, image, list, and code, with item/block reordering,
 * approved media selection, and input validation.
 */

import React, { useEffect, useRef } from "react";
import styles from "@/app/admin/admin.module.css";

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; mediaId: string; alt: string; caption: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; text: string };

export interface ApprovedMediaOption {
  id: string;
  objectKey?: string;
  mime?: string;
  approvalStatus: string;
}

interface StructuredBlockEditorProps {
  blocks: ContentBlock[];
  sectionIndex: number;
  approvedMediaList?: ApprovedMediaOption[];
  onChange: (blocks: ContentBlock[]) => void;
}

export function StructuredBlockEditor({
  blocks,
  sectionIndex,
  approvedMediaList = [],
  onChange,
}: StructuredBlockEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<{ block: number; listItem?: number } | null>(null);
  const selectableMedia = approvedMediaList.filter((asset) =>
    asset.approvalStatus === "approved" && asset.mime?.startsWith("image/") &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(asset.id),
  );

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const selector = target.listItem === undefined
      ? `[data-block-index="${target.block}"] input, [data-block-index="${target.block}"] textarea, [data-block-index="${target.block}"] select`
      : `[data-block-index="${target.block}"] [data-list-item-index="${target.listItem}"]`;
    (rootRef.current?.querySelector(selector) as HTMLElement | null)?.focus();
    pendingFocus.current = null;
  }, [blocks]);

  function updateBlock(idx: number, updated: ContentBlock) {
    const next = [...blocks];
    next[idx] = updated;
    onChange(next);
  }

  function removeBlock(idx: number) {
    if (blocks.length <= 1) return;
    pendingFocus.current = { block: Math.min(idx, blocks.length - 2) };
    onChange(blocks.filter((_, i) => i !== idx));
  }

  function moveBlock(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= blocks.length) return;
    pendingFocus.current = { block: toIdx };
    const next = [...blocks];
    const item = next.splice(fromIdx, 1)[0]!;
    next.splice(toIdx, 0, item);
    onChange(next);
  }

  function addBlock(type: ContentBlock["type"]) {
    let newBlock: ContentBlock;
    switch (type) {
      case "paragraph":
        newBlock = { type: "paragraph", text: "" };
        break;
      case "image":
        newBlock = {
          type: "image",
          mediaId: "",
          alt: "",
          caption: "",
        };
        break;
      case "list":
        newBlock = { type: "list", items: [""] };
        break;
      case "code":
        newBlock = { type: "code", language: "", text: "" };
        break;
    }
    pendingFocus.current = { block: blocks.length };
    onChange([...blocks, newBlock]);
  }

  // List item modifiers
  function updateListItem(blockIdx: number, itemIdx: number, value: string) {
    const block = blocks[blockIdx];
    if (block?.type !== "list") return;
    const nextItems = [...block.items];
    nextItems[itemIdx] = value;
    updateBlock(blockIdx, { ...block, items: nextItems });
  }

  function addListItem(blockIdx: number) {
    const block = blocks[blockIdx];
    if (block?.type !== "list") return;
    pendingFocus.current = { block: blockIdx,listItem: block.items.length };
    updateBlock(blockIdx, { ...block, items: [...block.items, ""] });
  }

  function removeListItem(blockIdx: number, itemIdx: number) {
    const block = blocks[blockIdx];
    if (block?.type !== "list") return;
    const nextItems = block.items.filter((_, idx) => idx !== itemIdx);
    pendingFocus.current = { block: blockIdx,listItem: Math.min(itemIdx,nextItems.length - 1) };
    updateBlock(blockIdx, { ...block, items: nextItems.length ? nextItems : [""] });
  }

  function moveListItem(blockIdx: number, fromIdx: number, toIdx: number) {
    const block = blocks[blockIdx];
    if (block?.type !== "list") return;
    if (toIdx < 0 || toIdx >= block.items.length) return;
    pendingFocus.current = { block: blockIdx,listItem: toIdx };
    const nextItems = [...block.items];
    const item = nextItems.splice(fromIdx, 1)[0]!;
    nextItems.splice(toIdx, 0, item);
    updateBlock(blockIdx, { ...block, items: nextItems });
  }

  return (
    <div ref={rootRef} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-ink)" }}>
        Content Blocks ({blocks.length})
      </div>

      {blocks.map((block, bIdx) => (
        <div
          key={bIdx}
          style={{
            background: "#f8fafc",
            border: "1px solid var(--color-line)",
            borderRadius: "6px",
            padding: "0.75rem",
          }}
          data-testid={`section-${sectionIndex}-block-${bIdx}`}
          data-block-index={bIdx}
        >
          {/* Header controls for block */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className={styles.badge}>
                Block {bIdx + 1}: {block.type.toUpperCase()}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                onClick={() => moveBlock(bIdx, bIdx - 1)}
                disabled={bIdx === 0}
                aria-label={`Move Block ${bIdx + 1} Up`}
                style={{
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid var(--color-line)",
                  background: bIdx === 0 ? "#f1f5f9" : "#ffffff",
                  cursor: bIdx === 0 ? "not-allowed" : "pointer",
                }}
              >
                ↑ Up
              </button>
              <button
                type="button"
                onClick={() => moveBlock(bIdx, bIdx + 1)}
                disabled={bIdx === blocks.length - 1}
                aria-label={`Move Block ${bIdx + 1} Down`}
                style={{
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid var(--color-line)",
                  background: bIdx === blocks.length - 1 ? "#f1f5f9" : "#ffffff",
                  cursor: bIdx === blocks.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                ↓ Down
              </button>
              <button
                type="button"
                onClick={() => removeBlock(bIdx)}
                disabled={blocks.length <= 1}
                aria-label={`Delete Block ${bIdx + 1}`}
                style={{
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Block-specific form fields */}
          {block.type === "paragraph" && (
            <div className={styles.field}>
              <label htmlFor={`sec-${sectionIndex}-b-${bIdx}-p`} className={styles.label}>
                Paragraph Text
              </label>
              <textarea
                id={`sec-${sectionIndex}-b-${bIdx}-p`}
                className={styles.input}
                rows={3}
                placeholder="Enter paragraph text (preserves newlines and Unicode)..."
                value={block.text}
                onChange={(e) => updateBlock(bIdx, { ...block, text: e.target.value })}
              />
            </div>
          )}

          {block.type === "code" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className={styles.field}>
                <label htmlFor={`sec-${sectionIndex}-b-${bIdx}-lang`} className={styles.label}>
                  Language
                </label>
                <input
                  id={`sec-${sectionIndex}-b-${bIdx}-lang`}
                  className={styles.input}
                  placeholder="e.g. typescript, python, sql, bash"
                  value={block.language}
                  onChange={(e) => updateBlock(bIdx, { ...block, language: e.target.value })}
                  style={{ maxWidth: "250px" }}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`sec-${sectionIndex}-b-${bIdx}-code`} className={styles.label}>
                  Code Snippet
                </label>
                <textarea
                  id={`sec-${sectionIndex}-b-${bIdx}-code`}
                  className={styles.input}
                  rows={4}
                  style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                  placeholder="Enter code snippet..."
                  value={block.text}
                  onChange={(e) => updateBlock(bIdx, { ...block, text: e.target.value })}
                />
              </div>
            </div>
          )}

          {block.type === "image" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className={styles.field}>
                <label htmlFor={`sec-${sectionIndex}-b-${bIdx}-media`} className={styles.label}>
                  Approved Media Asset ID
                </label>
                <select
                  id={`sec-${sectionIndex}-b-${bIdx}-media`}
                  className={styles.input}
                  value={block.mediaId}
                  onChange={(e) => updateBlock(bIdx, { ...block, mediaId: e.target.value })}
                >
                  <option value="">{selectableMedia.length ? "Select an approved image" : "No approved images available"}</option>
                  {selectableMedia.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} ({m.objectKey || m.mime || m.approvalStatus})
                    </option>
                  ))}
                  {block.mediaId && !selectableMedia.some((m) => m.id === block.mediaId) && (
                    <option value={block.mediaId}>{block.mediaId} (current; not in approved picker)</option>
                  )}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor={`sec-${sectionIndex}-b-${bIdx}-alt`} className={styles.label}>
                  Alt Text (Accessible Description)
                </label>
                <input
                  id={`sec-${sectionIndex}-b-${bIdx}-alt`}
                  className={styles.input}
                  placeholder="Describe the image content..."
                  value={block.alt}
                  onChange={(e) => updateBlock(bIdx, { ...block, alt: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`sec-${sectionIndex}-b-${bIdx}-caption`} className={styles.label}>
                  Caption
                </label>
                <input
                  id={`sec-${sectionIndex}-b-${bIdx}-caption`}
                  className={styles.input}
                  placeholder="Optional figure caption..."
                  value={block.caption}
                  onChange={(e) => updateBlock(bIdx, { ...block, caption: e.target.value })}
                />
              </div>
            </div>
          )}

          {block.type === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className={styles.label}>List Items ({block.items.length})</legend>
              {block.items.map((item, itemIdx) => (
                <div key={itemIdx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    className={styles.input}
                    placeholder={`Item ${itemIdx + 1}`}
                    data-list-item-index={itemIdx}
                    value={item}
                    onChange={(e) => updateListItem(bIdx, itemIdx, e.target.value)}
                    aria-label={`Section ${sectionIndex + 1} Block ${bIdx + 1} Item ${itemIdx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => moveListItem(bIdx, itemIdx, itemIdx - 1)}
                    disabled={itemIdx === 0}
                    aria-label={`Move Item ${itemIdx + 1} Up`}
                    style={{
                      padding: "0.3rem 0.5rem",
                      fontSize: "0.75rem",
                      border: "1px solid var(--color-line)",
                      borderRadius: "4px",
                      background: itemIdx === 0 ? "#f1f5f9" : "#ffffff",
                      cursor: itemIdx === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveListItem(bIdx, itemIdx, itemIdx + 1)}
                    disabled={itemIdx === block.items.length - 1}
                    aria-label={`Move Item ${itemIdx + 1} Down`}
                    style={{
                      padding: "0.3rem 0.5rem",
                      fontSize: "0.75rem",
                      border: "1px solid var(--color-line)",
                      borderRadius: "4px",
                      background: itemIdx === block.items.length - 1 ? "#f1f5f9" : "#ffffff",
                      cursor: itemIdx === block.items.length - 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeListItem(bIdx, itemIdx)}
                    disabled={block.items.length <= 1}
                    aria-label={`Delete Item ${itemIdx + 1}`}
                    style={{
                      padding: "0.3rem 0.5rem",
                      fontSize: "0.75rem",
                      border: "1px solid #fecaca",
                      borderRadius: "4px",
                      background: "#fef2f2",
                      color: "#991b1b",
                      cursor: block.items.length <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={() => addListItem(bIdx)}
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.8rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-line)",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  + Add List Item
                </button>
              </div>
              </fieldset>
            </div>
          )}
        </div>
      ))}

      {/* Add new block button group */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          padding: "0.5rem 0",
          borderTop: "1px dashed var(--color-line)",
        }}
      >
        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", alignSelf: "center", marginRight: "0.25rem" }}>
          Add block:
        </span>
        <button
          type="button"
          onClick={() => addBlock("paragraph")}
          className={styles.buttonSecondary}
          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
        >
          + Paragraph
        </button>
        <button
          type="button"
          onClick={() => addBlock("code")}
          className={styles.buttonSecondary}
          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
        >
          + Code
        </button>
        <button
          type="button"
          onClick={() => addBlock("list")}
          className={styles.buttonSecondary}
          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
        >
          + List
        </button>
        <button
          type="button"
          onClick={() => addBlock("image")}
          className={styles.buttonSecondary}
          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", width: "auto" }}
        >
          + Image
        </button>
      </div>
    </div>
  );
}

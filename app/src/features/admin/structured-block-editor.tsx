"use client";

import type { ContentSection } from "@/contracts/content";
import styles from "@/app/admin/admin.module.css";

type Block = ContentSection["blocks"][number];
type MediaOption = {
  id: string;
  approvalStatus: string;
  mime: string;
  bytes: number;
  dimensions: { width: number; height: number } | null;
  fixtureLabel?: string;
};

export function StructuredBlockEditor({
  section,
  sectionIndex,
  mediaAssets,
  onChange,
}: {
  section: ContentSection;
  sectionIndex: number;
  mediaAssets: MediaOption[];
  onChange: (section: ContentSection) => void;
}) {
  function changeBlock(blockIndex: number, block: Block) {
    const blocks = section.blocks.slice();
    blocks[blockIndex] = block;
    onChange({ ...section, blocks });
  }

  function addBlock(type: Block["type"]) {
    const block: Block = type === "paragraph"
      ? { type, text: "" }
      : type === "code"
        ? { type, language: "", text: "" }
        : type === "list"
          ? { type, items: [""] }
          : { type, mediaId: "", alt: "", caption: "" };
    onChange({ ...section, blocks: [...section.blocks, block] });
    window.setTimeout(() => {
      const targetIndex = section.blocks.length;
      const selector = '[data-section-index="' + sectionIndex + '"] [data-block-index="' + targetIndex + '"]';
      const target = document.querySelector(selector);
      (target?.querySelector("textarea,input,select") as HTMLElement | null)?.focus();
    }, 0);
  }

  function moveBlock(from: number, to: number) {
    if (to < 0 || to >= section.blocks.length) return;
    const blocks = section.blocks.slice();
    const [block] = blocks.splice(from, 1);
    if (!block) return;
    blocks.splice(to, 0, block);
    onChange({ ...section, blocks });
    window.setTimeout(() => {
      const selector = '[data-section-index="' + sectionIndex + '"] [data-block-index="' + to + '"]';
      const target = document.querySelector(selector);
      (target?.querySelector("input,textarea,select") as HTMLElement | null)?.focus();
    }, 0);
  }

  function moveListItem(blockIndex: number, from: number, to: number, items: string[]) {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    const block = section.blocks[blockIndex];
    if (block?.type !== "list") return;
    changeBlock(blockIndex, { ...block, items: next });
    window.setTimeout(() => {
      const selector = '[data-section-index="' + sectionIndex + '"] [data-block-index="' + blockIndex + '"] [data-list-item-index="' + to + '"]';
      (document.querySelector(selector) as HTMLElement | null)?.focus();
    }, 0);
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "0.75rem 0" }}>
        <button type="button" className={styles.buttonSecondary} onClick={() => addBlock("paragraph")}>+ Paragraph</button>
        <button type="button" className={styles.buttonSecondary} onClick={() => addBlock("code")}>+ Code</button>
        <button type="button" className={styles.buttonSecondary} onClick={() => addBlock("list")}>+ List</button>
        <button type="button" className={styles.buttonSecondary} onClick={() => addBlock("image")}>+ Image</button>
      </div>
      {section.blocks.map((block, blockIndex) => (
        <fieldset
          key={blockIndex}
          data-block-index={blockIndex}
          style={{ border: "1px solid var(--color-line)", borderRadius: "6px", margin: "0.75rem 0", padding: "0.75rem" }}
        >
          <legend>Block {blockIndex + 1} · {block.type}</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
            <button type="button" className={styles.buttonSecondary} disabled={blockIndex === 0}
              aria-label={"Move Block " + (blockIndex + 1) + " Up"} onClick={() => moveBlock(blockIndex, blockIndex - 1)}>
              Move Block {blockIndex + 1} Up
            </button>
            <button type="button" className={styles.buttonSecondary} disabled={blockIndex === section.blocks.length - 1}
              aria-label={"Move Block " + (blockIndex + 1) + " Down"} onClick={() => moveBlock(blockIndex, blockIndex + 1)}>
              Move Block {blockIndex + 1} Down
            </button>
            <button type="button" className={styles.buttonDanger}
              onClick={() => onChange({ ...section, blocks: section.blocks.filter((_item, index) => index !== blockIndex) })}>
              Delete Block {blockIndex + 1}
            </button>
          </div>
          {block.type === "paragraph" && (
            <label className={styles.field}>
              <span className={styles.label}>Section {sectionIndex + 1} Block {blockIndex + 1} Paragraph</span>
              <textarea className={styles.input} rows={4} value={block.text}
                onChange={(event) => changeBlock(blockIndex, { ...block, text: event.target.value })} />
            </label>
          )}
          {block.type === "code" && (
            <div className={styles.field}>
              <label className={styles.label}>
                Language
                <input className={styles.input} value={block.language}
                  onChange={(event) => changeBlock(blockIndex, { ...block, language: event.target.value })} />
              </label>
              <label className={styles.label}>
                Code Snippet
                <textarea className={styles.input} rows={5} value={block.text}
                  onChange={(event) => changeBlock(blockIndex, { ...block, text: event.target.value })} />
              </label>
            </div>
          )}
          {block.type === "list" && (
            <div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "0.5rem 0" }}>
                    <input
                      className={styles.input}
                      aria-label={"Section " + (sectionIndex + 1) + " Block " + (blockIndex + 1) + " Item " + (itemIndex + 1)}
                      data-list-item-index={itemIndex}
                      value={item}
                      onChange={(event) => {
                        const items = block.items.slice();
                        items[itemIndex] = event.target.value;
                        changeBlock(blockIndex, { ...block, items });
                      }}
                    />
                    <button type="button" className={styles.buttonSecondary} disabled={itemIndex === 0}
                      onClick={() => moveListItem(blockIndex, itemIndex, itemIndex - 1, block.items)}>
                      Move Item {itemIndex + 1} Up
                    </button>
                    <button type="button" className={styles.buttonSecondary} disabled={itemIndex === block.items.length - 1}
                      onClick={() => moveListItem(blockIndex, itemIndex, itemIndex + 1, block.items)}>
                      Move Item {itemIndex + 1} Down
                    </button>
                    <button type="button" className={styles.buttonDanger}
                      onClick={() => changeBlock(blockIndex, { ...block, items: block.items.filter((_value, index) => index !== itemIndex) })}>
                      Remove Item {itemIndex + 1}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className={styles.buttonSecondary}
                onClick={() => changeBlock(blockIndex, { ...block, items: [...block.items, ""] })}>
                + Add List Item
              </button>
            </div>
          )}
          {block.type === "image" && (
            <div className={styles.field}>
              <label className={styles.label}>
                Approved Media Asset ID
                <select className={styles.input} value={block.mediaId}
                  onChange={(event) => changeBlock(blockIndex, { ...block, mediaId: event.target.value })}>
                  <option value="">Choose an approved image</option>
                  {mediaAssets.filter((asset) => asset.approvalStatus === "approved" && asset.mime.startsWith("image/")).map((asset) => (
                    <option value={asset.id} key={asset.id}>
                      {asset.fixtureLabel ? asset.fixtureLabel + " — " + asset.id : asset.id + " · " + asset.mime}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Alt Text (Accessible Description)
                <input className={styles.input} value={block.alt}
                  onChange={(event) => changeBlock(blockIndex, { ...block, alt: event.target.value })} />
              </label>
              <label className={styles.label}>
                Caption
                <input className={styles.input} value={block.caption}
                  onChange={(event) => changeBlock(blockIndex, { ...block, caption: event.target.value })} />
              </label>
              <p className={styles.subtitle}>The private preview reads approved bytes through the owner-guarded preview route.</p>
            </div>
          )}
        </fieldset>
      ))}
      {section.blocks.length === 0 && <p role="status">Add a content block before saving this section.</p>}
    </div>
  );
}

export type { MediaOption };

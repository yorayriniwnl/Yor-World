import type { ContentSection } from "@/contracts/content";

type ContentBlock = ContentSection["blocks"][number];
type MediaOption = { id: string; mime: string; approvalStatus: string };

export function StructuredBlockEditor({
  block,
  sectionId,
  index,
  count,
  mediaAssets,
  onChange,
  onMove,
  onMoveListItem,
  onRemoveListItem,
  onRemove,
}: {
  block: ContentBlock;
  sectionId: string;
  index: number;
  count: number;
  mediaAssets: MediaOption[];
  onChange: (next: ContentBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onMoveListItem: (itemIndex: number, direction: -1 | 1) => void;
  onRemoveListItem: (itemIndex: number) => void;
  onRemove: () => void;
}) {
  const label = `Section ${sectionId}, block ${index + 1}`;
  const focusId = `block-heading-${sectionId}-${index}`;
  const changeKind = (type: ContentBlock["type"]) => {
    if (type === "paragraph") onChange({ type, text: "" });
    else if (type === "image") onChange({ type, mediaId: "", alt: "", caption: "" });
    else if (type === "list") onChange({ type, items: [""] });
    else onChange({ type, language: "text", text: "" });
  };

  return (
    <fieldset>
      <legend id={focusId} tabIndex={-1}>{label}: {block.type}</legend>
      <label>
        Block type
        <select aria-label={`${label} type`} value={block.type} onChange={(event) => changeKind(event.currentTarget.value as ContentBlock["type"])}>
          <option value="paragraph">Paragraph</option>
          <option value="image">Image</option>
          <option value="list">List</option>
          <option value="code">Code</option>
        </select>
      </label>

      {block.type === "paragraph" && (
        <label>
          Paragraph text
          <textarea aria-label={`${label} paragraph text`} value={block.text} onChange={(event) => onChange({ ...block, text: event.currentTarget.value })} />
        </label>
      )}

      {block.type === "image" && (
        <>
          <label>
            Approved image
            <select aria-label={`${label} approved image`} value={block.mediaId} onChange={(event) => onChange({ ...block, mediaId: event.currentTarget.value })}>
              <option value="">Select an approved image</option>
              {block.mediaId && !mediaAssets.some((asset) => asset.id === block.mediaId) && <option value={block.mediaId} disabled>Current image unavailable: {block.mediaId}</option>}
              {mediaAssets.filter((asset) => asset.approvalStatus === "approved").map((asset) => <option key={asset.id} value={asset.id}>{asset.id} · {asset.mime}</option>)}
            </select>
          </label>
          <label>Alternative text<input aria-label={`${label} image alternative text`} value={block.alt} onChange={(event) => onChange({ ...block, alt: event.currentTarget.value })} /></label>
          <label>Caption<input aria-label={`${label} image caption`} value={block.caption} onChange={(event) => onChange({ ...block, caption: event.currentTarget.value })} /></label>
          <p>Only approved image assets appear in the picker. Save the draft before opening its guarded private preview.</p>
        </>
      )}

      {block.type === "list" && (
        <fieldset>
          <legend>{label} list items</legend>
          {block.items.map((item, itemIndex) => (
            <div key={`${sectionId}-${index}-item-${itemIndex}`}>
              <label>Item {itemIndex + 1}<input aria-label={`${label} list item ${itemIndex + 1}`} value={item} onChange={(event) => onChange({ ...block, items: block.items.map((old, current) => current === itemIndex ? event.currentTarget.value : old) })} /></label>
              <button type="button" onClick={() => onMoveListItem(itemIndex, -1)} disabled={itemIndex === 0}>Move item up</button>
              <button type="button" onClick={() => onMoveListItem(itemIndex, 1)} disabled={itemIndex === block.items.length - 1}>Move item down</button>
              <button type="button" onClick={() => onRemoveListItem(itemIndex)} disabled={block.items.length <= 1}>Remove item {itemIndex + 1}</button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...block, items: [...block.items, ""] })}>Add list item</button>
        </fieldset>
      )}

      {block.type === "code" && (
        <>
          <label>Language<input aria-label={`${label} code language`} value={block.language} onChange={(event) => onChange({ ...block, language: event.currentTarget.value })} /></label>
          <label>Code text<textarea aria-label={`${label} code text`} value={block.text} onChange={(event) => onChange({ ...block, text: event.currentTarget.value })} /></label>
        </>
      )}

      <div>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${label} up`}>Move up</button>
        <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${label} down`}>Move down</button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} disabled={count <= 1}>Remove block</button>
      </div>
    </fieldset>
  );
}
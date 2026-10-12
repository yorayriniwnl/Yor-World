"""Write the offline matched R5/R6 plus reference comparison page."""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
DEST = OUT / "evidence" / "comparisons" / "index.html"
DEST.parent.mkdir(parents=True, exist_ok=True)
views = [
    ("desktop-home", "1920 × 1080 · exact desktop-home camera"),
    ("mobile-home", "720 × 1280 · exact mobile-home camera"),
]
sections = []
for key, label in views:
    rows = [
        ("Main reference", "../../inputs/r5/FINISH-B1-R5/inputs/references/main-reference.png"),
        ("Committed R5 capture", f"../../inputs/r5/FINISH-B1-R5/captures/R5/{key}/webgl-canvas.png"),
        ("Fresh matched R5 capture", f"../../captures/R5/{key}/webgl-canvas.png"),
        ("FINISH-B1-R6 candidate", f"../../captures/R6/{key}/webgl-canvas.png"),
    ]
    cards = "\n".join(f'<figure><figcaption>{title}</figcaption><img src="{src}" alt="{title}, {key}"></figure>' for title,src in rows)
    sections.append(f'<section><h2>{key}</h2><p>{label}</p><div class="grid">{cards}</div></section>')
html = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FINISH-B1-R6 matched visual comparison</title><style>
body{margin:0;padding:24px;background:#11131a;color:#f1eff7;font:16px/1.45 system-ui,sans-serif}
h1,h2{margin:0 0 8px}p{color:#c6c3d0;margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
figure{margin:0;background:#20232c;border:1px solid #424653;border-radius:10px;overflow:hidden}figcaption{padding:10px 12px;font-weight:650}
img{display:block;width:100%;height:auto;background:#30343e}section{margin:28px 0 40px}@media(max-width:760px){.grid{grid-template-columns:1fr}}
</style></head><body><h1>FINISH-B1-R6 visual comparison</h1>
<p>Offline evidence. Captures use the pinned R5 harness, unchanged camera profiles, 1× DPR, and matched animation state. The main reference is supplied for comparison only; no reference pixels are used in the candidate assets.</p>
""" + "\n".join(sections) + "\n</body></html>\n"
DEST.write_text(html, encoding="utf-8")
print(f"PASS: wrote {DEST.relative_to(OUT).as_posix()}")

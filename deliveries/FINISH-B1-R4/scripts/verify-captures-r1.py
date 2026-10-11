"""Verify FINISH-25-R1 matched browser captures and draw-call receipts."""

import hashlib
import json
from pathlib import Path


OUT = Path(__file__).resolve().parents[1]
VARIANTS = ("R3", "material-only", "R4-R1")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def main() -> int:
    result = json.loads((OUT / "evidence" / "browser-results-r1.json").read_text(encoding="utf-8"))
    measurements = {(row["variant"], row["key"]): row for row in result["measurements"]}
    captures = []
    for capture in result["captures"]:
        raw = (OUT / capture["file"]).read_bytes()
        if raw[:8] != b"\x89PNG\r\n\x1a\n":
            raise RuntimeError(f"not a PNG: {capture['file']}")
        if len(raw) != capture["bytes"] or sha256(raw) != capture["sha256"]:
            raise RuntimeError(f"capture hash or length mismatch: {capture['file']}")
        if (int.from_bytes(raw[16:20], "big"), int.from_bytes(raw[20:24], "big")) != (
            capture["width"], capture["height"]
        ):
            raise RuntimeError(f"capture dimensions mismatch: {capture['file']}")
        current = measurements[(capture["variant"], capture["view"])]
        matched = []
        for variant in VARIANTS:
            peer = measurements[(variant, capture["view"])]
            if (peer["camera"], peer["renderer"], peer["lights"], peer["animationState"]) != (
                current["camera"], current["renderer"], current["lights"], current["animationState"]
            ):
                raise RuntimeError(f"matched scene settings differ for {capture['view']}: {variant}")
            matched.append(variant)
        captures.append({
            "file": capture["file"],
            "sha256": capture["sha256"],
            "bytes": capture["bytes"],
            "width": capture["width"],
            "height": capture["height"],
            "matchedVariants": matched,
            "status": "PASS",
        })

    for variant, responses in result["assetResponses"].items():
        if len(responses) != 5:
            raise RuntimeError(f"expected five loaded GLBs for {variant}; got {len(responses)}")
        for response in responses:
            name = response["url"].rsplit("/", 1)[-1]
            expected = result["assetHashes"][variant][name]
            if (response["sha256"], response["bytes"]) != (expected["sha256"], expected["bytes"]):
                raise RuntimeError(f"loaded GLB response differs from pinned {variant} {name}")

    profile_receipts = []
    for key, limit in (("desktop-home", 120), ("mobile-home", 80)):
        row = measurements[("R4-R1", key)]
        calls = row["rendererInfo"]["calls"]
        if row["budgetStatus"] != "PASS" or calls > limit:
            raise RuntimeError(f"draw-call limit failed for {key}: {calls}/{limit}")
        if calls != row["interceptedCalls"] or row["frameDelta"] != 1:
            raise RuntimeError(f"renderer/interceptor frame accounting mismatch for {key}")
        if row["byPass"].get("transmission", 0) != 0:
            raise RuntimeError(f"transmission pass returned for {key}")
        profile_receipts.append({
            "profile": key,
            "calls": calls,
            "limit": limit,
            "triangles": row["rendererInfo"]["triangles"],
            "interceptedCalls": row["interceptedCalls"],
            "frameDelta": row["frameDelta"],
            "transmissionCalls": row["byPass"].get("transmission", 0),
            "status": "PASS",
        })

    browser_errors = [row for row in result["console"] if row["type"] in ("warning", "error", "pageerror")]
    if browser_errors:
        raise RuntimeError(f"browser reported warnings/errors: {browser_errors}")
    receipt = {
        "status": "PASS",
        "command": "python scripts/verify-captures-r1.py",
        "captureCount": len(captures),
        "captures": captures,
        "loadedGLBResponsesExact": True,
        "profiles": profile_receipts,
        "browserWarningsErrorsPageErrors": browser_errors,
        "visualScope": {
            "pcGlass": "Matched exterior close capture shows the open chassis border and dark interior backplate behind alpha glass. The supplemental oblique capture resolves the three fan rings through the pane; the backplate partly occludes them, so it does not claim an unobstructed component view.",
            "windowGlass": "Matched exterior capture shows room content through the blind gaps; the interior close view is dominated by blind slats and does not independently establish the pane surface.",
            "exteriorAndDaylight": "No exterior environment, daylight simulation, blind presets, or production runtime behavior is implied by these local captures.",
        },
    }
    out = OUT / "evidence" / "capture-reverification-r1.json"
    out.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": receipt["status"], "captureCount": len(captures), "profiles": profile_receipts, "evidence": str(out)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

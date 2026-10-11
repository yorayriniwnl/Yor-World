# FINISH-30 — B1-R4 delivery-root collision reallocation

Date: 2026-10-11 UTC. Status: Parent-authorized destination reallocation only. FINISH-25 and FINISH-25-R1 remain the complete technical scope; this packet changes no accepted contract or implementation requirement.

## Preserved candidate and collision

The exact source base remains FINISH-B1-R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`, full tree `9759ac9879bcc9489770b7c5784ead2f022157b0`, delivery subtree `0bc042af5add583314a7e0713c6db8793f5ca18b`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.

The maker reports a complete isolated candidate commit `2cc4419aa9e0670b9b3da36cfbbcdb472231589e`, parent `bebfb2dede7d24d2859c34193cf6a9fda1cf7632`, full tree `dff52f393836de21d5d8996a7d09790e3cca5d88`, R4 subtree `6dc9356b973c9f76f05beea60b000c5c8349840f`. Its package manifest SHA-256 is `eca82a4e6ca08aa5e9a321f213d274db81e955f922917ed9417d10e1a4bc97ca`; the maker reports 209 manifest rows plus two self-excluded committed files. This commit is preserved as an unpushed candidate snapshot and is not accepted for delivery because its root includes eleven reported, unknown R1 artifacts.

The maker identifies these eleven paths as not authored by them and inadvertently included in the snapshot. Preserve them in their original location and exclude them from the reallocated delivery:

- `scripts/build-r1-room.py`
- `scripts/verify-browser-r1.mjs`
- `scripts/verify-r1-lineage.py`
- `scripts/verify-r1-native.py`
- `evidence/build-r1-final.log`
- `evidence/build-r1-replay.log`
- `evidence/lineage-r1.json`
- `evidence/native-debug-r1.json`
- `evidence/native-debug-r1.log`
- `evidence/native-parity-r1.json`
- `evidence/native-parity-r1.log`

The maker also reports two additional unknown, untracked browser-R1 files in the shared root; they are not part of commit `2cc4419…`. Neither those files nor any other contents in the old root are to be read, copied, modified, staged, deleted, or pushed.

Parent and maker then found a separate artifact-binding failure in the pinned snapshot. Directly reading `2cc4419…:deliveries/FINISH-B1-R4/assets/room.glb` yields 699,668 bytes, SHA-256 `ede3258e39efa6d2641f1480baaf3cfd9d44c3915b4da243fc6d4011d8c3654b`, Git blob `a1e8c32231c4d97c5c3eee6a8907dbcdd3bd74ce`. The package's `output-hashes.json` and `report.md` agree with that raw file. However, `evidence/final-export-reproducibility.json`, `evidence/final-lineage.json`, `evidence/final-room-replay.log`, and `evidence/final-budgets.json` bind the room to SHA-256 `d192a8154cc9e43adfef6b84beb0eaa64d40d2af464d8572fd4b0fcbf845baf5`. The maker confirms that `d192…` belongs to earlier browser/capture and replay receipts, not the committed final GLB; the earlier claim that the committed package was restored to `d192…` was incorrect. The maker also reports that the committed native room export differs from an earlier native export, and is investigating the exact source/export difference. Thus, output hashes alone are internally consistent while several final receipts are stale for the committed artifact. This snapshot is not eligible for acceptance or evidence reuse until the source/export discrepancy is resolved and the final artifact and every dependent receipt are freshly rebound.

## Reallocated destination and exact allowlist

Use only `deliveries/FINISH-B1-R4-02/`. Parent preflight found this new destination absent in the canonical checkout, and the maker confirmed it is absent in its isolated candidate worktree. Recheck immediately before creating it. If occupied, preserve it and stop for another Parent reallocation.

Start the final delivery branch from exact R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`; do not use `2cc4419…` as a parent commit. The only files eligible for reallocation are the 211 paths added under `deliveries/FINISH-B1-R4/` in `2cc4419…`, minus the eleven exact excluded paths above: exactly 200 maker-owned package paths. Retrieve eligible bytes only from that pinned isolated commit or regenerate them from the exact R3 base. Do not take files from the shared old root or include anything absent from the 211 committed paths. The final branch must contain no old `deliveries/FINISH-B1-R4/` package and no unknown R1 files in its history.

Rebind reports, commands and output manifests to `deliveries/FINISH-B1-R4-02/`; recompute stable-file hashes and validate the final delivery contains exactly the 200 allowed paths. Keep the material-only 72-file checkpoint byte-for-byte. Resolve why the committed room GLB is `ede3258e…` while final replay, lineage, export-reproducibility, and browser-budget receipts claim `d192a815…`; identify the exact native/export source bytes and replay output. Do not assume either hash is correct. Rebuild from the pinned R3 source and authorized patch as needed, then rerun source-patch replay, native/export lineage, structural validation, and the exact desktop/mobile browser budgets against the same final raw GLB. Recreate any capture or test evidence whose exact source/render binding does not match that artifact. Recompute and cross-check every manifest and receipt; mark anything not re-executed explicitly.

## Technical scope remains frozen

FINISH-25 and FINISH-25-R1 remain binding: change only `PC_TemperedGlass` material representation and the four authorized geometry edits (`pc_chassis_frame`, at most one `pc_internal_backplate`, the `wall_left` aperture component, and `window_frame`). Preserve all other components, UVs, materials, names, transforms, assets, hooks, runtime, door/camera path and accepted source. Raw draw-call caps remain 120 desktop / 80 mobile. The positive-Y door/camera concern and production door-transform owner stay unresolved and outside this packet.

Commit and push only `deliveries/FINISH-B1-R4-02/` on a scoped branch. Do not push the contaminated `2cc4419…` snapshot. Parent will assign an exact-candidate independent review after the clean return; the maker cannot approve itself. External GPT Plus #2, physical-device/provider proof, full B1 acceptance, canonical integration, deployment and G7 remain NOT RUN or separately pending as evidence dictates.

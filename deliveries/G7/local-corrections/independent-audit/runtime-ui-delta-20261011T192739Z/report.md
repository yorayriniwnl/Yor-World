# Local independent RUI delta audit

**PASS for the bounded RUI-01/RUI-02 correction scope.** Both prior findings are closed at source/actual Three.js Node probe scope. This is local Codex audit advice only, not external GPT Plus #2 review, implementation acceptance, browser/GPU proof or G7 acceptance.

Audited commits `179cb341` / `179cb341d3374deb4794285cbfd585b75a2dc0da` and `e75109a6` / `e75109a680454576601419e31d571463ad9167f1` in `fix/local-studio-check`, current HEAD `e75109a680454576601419e31d571463ad9167f1`. The current binding/test tracked diff against `e75109a6` is empty (exit 0); all recorded input raw hashes stayed unchanged during execution.

- `app/src/features/world/WorldInteractionBinding.ts`: SHA-256 `8892a6bb64115d721e5b4333597f3da107cca7a60d02fee1592857049b076730`.
- `app/tests/unit/world-interaction-binding.test.ts`: SHA-256 `454ab6a2de0dd42609a114bd452e8e42ff6f4da481f79f3368bfdb8a52f596a7`.

Independent execution: **6/6 PASS**, exit 0. Retained focused maker suite: **4/4 PASS**, exit 0. These are separate suites with overlapping behavior; do not report them as ten unique requirement cases.

| Independent actual raycast check | Result |
| --- | --- |
| Essential named monitor opens launcher before optional arrival | PASS |
| Proxy expands a visible target outside original mesh triangles | PASS |
| Opaque front mesh prevents proxy activation | PASS — RUI-01 closed |
| Hidden production target is rejected | PASS — RUI-02 closed |
| Hidden target ancestor is rejected | PASS |
| Disposed binding rejects late optional attachment | PASS |

The expansion case proves the production raycast has zero hits at canvas x=69 while the 2.4 m proxy has actual hits; its hit point falls inside the production bounds expanded by 0.12 m. The same click is inactive before attachment and opens the launcher after attachment. This confirms useful proxy expansion remains intact. Observed hit coordinates and resulting panels are captured in `observations.jsonl`.

Source inspection confirms `isVisibleInHierarchy` at `WorldInteractionBinding.ts:89` excludes hidden meshes/ancestors, the nearest visible unregistered solid now returns before optional fallback (`:119`), and optional targets require hierarchy visibility (`:123`). `attachInteractionScene` retains its disposal guard (`:78`). Commit `e75109a6` changes the regression to a true outside-mesh proxy hit; it does not change product source.

The probe uses real Three.js mesh intersection and the actual binding/controller with an EventTarget canvas; no WebGL renderer or browser is mocked into a claim of rendered proof. v24.19.0 / vitest/5.0.2 win32-x64 node-v24.19.0 observed. This narrow delta does not rerun the earlier broad runtime/UI suites, final combined E2E, native GPU/pixel budgets, physical/assistive/provider sessions or leak measurements. Those statuses remain separately bound to their existing/pending evidence. Product source and prior audit artifacts were not modified. Parent owns Git coordination and separate acceptance.

Returned: report, exact input/after/output hashes, identity/commit receipts, independent probe/config, raw command stdout/stderr/exits, both result JSON files, case summary and observations.

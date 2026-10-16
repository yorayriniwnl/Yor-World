# PRE-G7-25 attempt-04 evidence correction

Disposition remains **FAIL / unaccepted**. This evidence-only correction is bound to source commit `28fb4187445206bcc62e2ef0ae2678e44ac6604b` and prior evidence commit `afb42f938eef80a27e406bda3f976b519ae71bc7`. The accepted source baseline remains commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`.

Attempts 01–03, their reports, receipts, screenshots, and captures remain unchanged. This note corrects the interpretation and byte accounting of attempt-03 evidence only. No application source, tests, thresholds, accepted source, or captured evidence was edited, and no suite, build, or capture was rerun.

The read-only local Codex substitute audit is complete. It was performed by a local Codex substitute and is **not** the independent GPT Plus #2 audit. External GPT Plus #2 audit remains **NOT RUN**; parent acceptance remains **PENDING**.

## Pixel comparison file size

`attempt-03/commands/pixel-parity-06.json` is **14,967 bytes**, not 15,967 bytes as stated in the attempt-03 report. The file’s SHA-256 remains `18f97e7c736c97b034fa629f0da2128a3f3ed1ef713f148fcda35ccdee80baf1`; its local capture and committed Git blob are byte-identical at 14,967 bytes. This note corrects the reported size without changing the JSON or its verified digest.

## Local capture bytes and committed Git blobs

The attempt-03 working files retain their local captured CRLF line endings. Git’s checkout normalization stored the text blobs with LF line endings. For each of the following three files, the local bytes contain exactly three CRLF pairs and no lone CR bytes; replacing CRLF with LF yields bytes identical to the committed blob. The table distinguishes the local capture digest from the SHA-256 of the committed blob contents.

| File | Local capture bytes / SHA-256 | Committed Git blob bytes / SHA-256 | Verification |
|---|---|---|---|
| `attempt-03/commands/build-01.stdout.bin` | 1,308 / `ab8c4912ca50113870c864eddb2eb78e7bd94b1e64d3e29b12d7c4d858014d69` | 1,305 / `9556cec5624d4629761d543ca24b342ea683ed0eb499a60670298982a67f3389` | CRLF→LF normalized bytes match exactly |
| `attempt-03/commands/build-evidence-01.stdout.bin` | 1,306 / `7b9069b39fa42e47ddb9dce16995e8241270f8e0d2814f28ce205931a3fbe007` | 1,303 / `5da789861c9274d3812b30f528b89e803ca23cd6c183b171d6e3b75e133b9609` | CRLF→LF normalized bytes match exactly |
| `attempt-03/commands/pixel-parity-03.mjs` | 10,315 / `7eed9d1b0571fcdda3feef50d39b51f4d9e730f94a0b60da4ec3c33a6c5e61aa` | 10,312 / `2e1317c0aaae997b4a11c66355664719cfb4cb2bd4d838b01d555417797e6477` | CRLF→LF normalized bytes match exactly |

The `7eed9d1b…` digest is the local script capture hash, not the committed script bytes. Its committed bytes hash to `2e1317c0…`. The 3-byte size differences are the three CRLF-to-LF conversions, not deleted content. The committed values above were computed from `git cat-file blob afb42f938eef80a27e406bda3f976b519ae71bc7:<path>` and compared after normalizing the local bytes.

## Reconcile the two visual histories

The source-correct accepted-root comparison remains the fresh capture under `attempt-02/accepted-root-capture-budget-check-failed/`, bound to accepted source commit `500d10fa5901be48d4ff877e608d65ba0e271bb9` and app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. The compared accepted-root desktop and phone files are `attempt-02/accepted-root-capture-budget-check-failed/screenshots/studio-reference-desktop-1440x900-chrome.png` and `.../studio-reference-mobile-390x844-chrome.png`; the P25 candidate files are in `attempt-03/composition-e2e-02/screenshots/` with those same names. The historical PRE-G7-22 files are in `deliveries/G7/preparation/maker-evidence/pre-g7-22/delta-15/visual-run/screenshots/` with those same names, but they are not interchangeable with the accepted-root captures. Those historical desktop and mobile PNGs identify source commit `63756c058de7fec92ba9699b327667207fe48488` and app tree `a166d5c01473aec366305bdfaa68d27cf665d0ec`, which are a later, distinct source state. The local audit measured 13,156 differing pixels for the desktop comparison and 2,800 for mobile between those historical images and the fresh accepted-root captures. These counts describe a separate comparison history; they do not replace the accepted-root baseline or attempt-03 pixel comparison.

The PRE-G7-25 packet requires omitting the upper-left shelf foliage and stems present in later P22 work. The local visual audit found upper-left shelf foliage/stems visible in both the fresh 500d/ba0 accepted-root baseline capture and the P25 candidate capture. Therefore near-equality between those two captures does **not** establish compliance with the packet’s scene-parity requirement. Keep the fresh accepted-root capture as the source-bound baseline, retain the historical P22 images as a separate visual history, and do not claim scene parity from their similarity. The discrepancy’s cause is not established here.

## Final status

The attempt-03 results remain unchanged: all eight same-tier candidate snapshots measure 129 inclusive calls (118 main + 11 shadow), exceeding the frozen ceilings by 9 calls at desktop and landscape and 49 calls at mobile and compact. The performance suite remains **FAIL, 5/6**. Pixel identity and required scene parity remain **FAIL**; the attempt-03 pixel metrics remain bound to `pixel-parity-06.json`.

Physical device and accessibility checks remain **NOT RUN**: iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, Safari with VoiceOver, and the 10-minute mobile soak. Independent GPT Plus #2 audit is **NOT RUN**; parent acceptance is **PENDING**. This correction does not approve or accept the candidate.

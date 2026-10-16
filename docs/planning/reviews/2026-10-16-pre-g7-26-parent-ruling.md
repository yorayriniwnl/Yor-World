# PRE-G7-26 parent ruling

Date: 2026-10-16
Disposition: **FAIL / NOT ACCEPTED**

PRE-G7-26 does not establish a renderer correction. The final app and mirror trees remain the accepted PRE-G7-22 source, and the sole attribution invocation produced only one partial Edge desktop capture before timing out. No optimization was committed.

## Evidence and independent review

The maker source-restoration commit is  bae139b7f5135d57d1c8b31b9be0a46bb613817e. Its app tree is  ba0b709192367e1d12a796618f97801a8fcd5a70 and mirror tree is  34f7ac0731984e50cbb06cf02039911ba65f59a9, matching accepted source 500d10fa5901be48d4ff877e608d65ba0e271bb9.

The separate evidence commit is  63de3cd324374f0a9198da89bb2c621c6c4cf988. A read-only local Codex substitute audit verified the remote binding, source restoration, observer removal, evidence inventory, hashes, Git blobs, JSON, and retained Edge trace. This was not external GPT Plus #2. Parent acceptance remains withheld.

The partial trace is Edge 155 at 1440×900 HIGH: 412 main-pass plus 11 shadow-pass calls, 423 inclusive, against the desktop ceiling of 120 (+303 FAIL). It records 423 submission rows, 217 object/pass pairs, and zero multi-draw invocations. The capture also reports one 404 console error whose URL is unavailable. Chrome saved no capture. Edge timed out while advancing to the next viewport. The run was not retried.

P25 attempt-03 is a separate historical donor result: source 28fb4187445206bcc62e2ef0ae2678e44ac6604b, app tree f68074b41b8d2eea228d7fa964d3db8358a9fea4, mirror tree be03089ce9abae0f487bd829b4f24ddac9bb3dfd. Its report records 129 inclusive calls in each of eight browser/viewport rows, exceeding the unchanged ceilings by 9 on desktop/landscape and 49 on phone/compact. P26 did not remeasure the donor.

P25 donor attribution, seven accepted-root captures, optimization, parity, composition E2E, performance, integration, unit, lint, typecheck, and builds are NOT RUN in P26. Physical-device, screen-reader, mobile-soak, and chrome://gpu evidence remain NOT RUN. These gaps are not converted into passes.

The local audit found trailing-whitespace failures in preserved error-context and instrumentation-overlay artifacts under git show --check. They are recorded as a non-blocking evidence-format limitation; the audit found no content, source, hash, or metric mismatch. The external audit is still NOT RUN.

## Ruling and next work

The accepted 500d app/mirror source remains the immutable baseline. P26 does not authorize asset edits, threshold changes, a renderer optimization, deployment, or G7 acceptance.

Issue PRE-G7-27 as a new measurement-only packet. It isolates each browser/viewport into its own fresh page at the final viewport before navigation, and collects the complete accepted-root and P25-donor item traces. It changes the capture method and is a separate authorization, not a retry of P26. No source optimization may begin until the full traces have been independently reviewed.
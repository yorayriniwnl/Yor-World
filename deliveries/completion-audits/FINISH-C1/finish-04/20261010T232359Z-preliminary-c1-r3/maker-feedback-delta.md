# FINISH-C1-R3 preliminary delta feedback

Observed 2026-10-10 23:32–23:33 UTC. This extends [maker-feedback-preliminary.md](maker-feedback-preliminary.md) without replacing its historical snapshots. **No independent execution or final closure is claimed.**

A report and output manifest appeared, briefly binding a 480186-byte patch with SHA-256 6585a7c7f9600b8d3c45b9930882f8d2fd74778b083433f112b1fb57edfcccdd and all 29 then-current replacement files. Subsequent normalization/regeneration changed the patch to 157355 bytes, SHA-256 e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d. At 23:32:00 UTC, the output manifest/receipt still described the earlier patch and 41 of 52 output entries disagreed with current raw bytes. The maker later rewrote the receipt at 23:32:34 UTC. These transitions supersede the earlier identity binding; final applicability/evidence must be checked against one coherent stable set.

No independent test, build, browser or patch application ran against either superseded binding.

## PRE-C1R3-06 / RT-RA-06: unknown encoding information assumed to be identity

Severity: HIGH provisional source finding. Owner: assigned runtime maker.

Path/line: deliveries/FINISH-C1-R3/source/src/features/world/AssetLoader.ts:76-81.
Current inspected raw SHA-256: fa85b62be24e0eb0216f735a2042fdfd675f840b7065873e0d7cbfcd7b0d8b8f.

Trigger: all three required status-200 responses expose positive Content-Length but Content-Encoding is absent or unexposed; a CORS response can expose the length while hiding compression metadata. Another required negative case is uncertain/chunked transfer metadata.

Expected: accepted runtime01 disallows a numeric aggregate when encoding/length information is absent/unexposed, chunked or uncertain. The ratio requires a known matching identity/uncompressed representation for all three current attempts.

Observed from source: line76 converts a null encoding header to the literal identity. Line80 trusts a positive finite length for status200 when that assumed encoding is not compressed; it does not establish whether metadata is exposed/trustworthy or whether response/transfer semantics invalidate the representation. Once the third denominator is known, currentAggregate can therefore return determinate required-session bytes despite uncertain encoding. Existing positive tests use Content-Length-only responses, so those tests encode the permissive assumption instead of proving the accepted boundary. This is source inference, not executed behavior in this review.

Requested correction: establish trustworthy identity representation explicitly or keep the progress indeterminate; cover absent/unexposed encoding and uncertain transfer metadata using meaningful negative cases. Keep ordinary correct known-identity aggregate behavior and actual EOF checking. Do not treat a header/default assumption as transport proof.

## PRE-C1R3-07 / RT-RA-06: failed-attempt bytes remain in the announced retry aggregate

Severity: MEDIUM provisional source finding. Owner: assigned runtime maker.

Path/line: deliveries/FINISH-C1-R3/source/src/features/world/AssetLoader.ts:283-288 and 309-317.
Current inspected raw SHA-256: fa85b62be24e0eb0216f735a2042fdfd675f840b7065873e0d7cbfcd7b0d8b8f.

Trigger: the room and resident complete; the third asset fetch reaches its trusted advertised EOF, then GLTF parse/decode fails. The catch branch increments the attempt and emits Retrying fixture with attempt2 before the 500ms backoff.

Expected: determinate scope excludes previous failed-attempt bytes. Announcing a new attempt replaces the failed attempt's counter/denominator and cannot report that failed transfer as the new current-attempt 100%. The watchdog separately retains its independent high-water rule.

Observed from source: line316 emits the new retry attempt while attemptProgress[index] still contains the prior attempt's complete byte count and trusted denominator. Reset occurs only when the loop restarts after line317's await waitForRetry. For the backoff interval the announced new attempt can therefore carry the failed transfer's aggregate 100% (e.g. 12/12 across three four-byte mocked essentials). A fetch that fails partway can similarly leave old attempt bytes in the retry announcement. This is source inference, not executed behavior in this review.

Requested correction: retire/replace the failed current-attempt progress before emitting the retry transition, preserve separate watchdog high-water accounting, and add a decode-failure-at-EOF test that inspects the retry event before advancing the backoff clock. Verify retries can honestly reduce the displayed ratio; do not impose monotonic percentages across attempts.

## Remaining preliminary findings

The inspected RuntimeMaterialQuality.ts remains SHA-256 9af1b0bd5de16e779ca2fef61f49ad92e2235d88f879858185cac33805734be8 and contains the same missing GLB flipY/UV mapping handling at lines67-78.

WorldRuntime.ts is now SHA-256 12db7ee436e89e2c1e6915955f5c31629c1af5d72dbeb75275b35dc48a09f9fc after line-ending normalization; its greet() timer and cleanup logic remain semantically unchanged. Local installed Three source directly confirms Texture.js:280 defaults flipY=true and GLTFLoader.js:3328 sets flipY=false.

The final browser spec contains paused /about navigation and re-entry. New maker logs report those three browser cases passed. That useful evidence supersedes the earlier missing-navigation observation once its exact build/source identity is independently confirmed. Browser frame diagnostics still contain clip/time and selected target names rather than actual bone/skinned deformation, mapping orientation or pixels, and repeated resource/timer cleanup accounting is still not established by the inspected three cases.

A read-only helper also noted token-only entrance lifecycle APIs. That point is being checked for a real caller path versus an interface-only gap, and is not yet asserted as a demonstrated cross-generation mutation.


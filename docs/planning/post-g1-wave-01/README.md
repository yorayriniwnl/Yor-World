# POST-G1-WAVE-01 — bounded production dispatch

**Current continuation:** [POST-G1-WAVE-02](../post-g1-wave-02/README.md) assigns A3 to Gemini #1 and essential environment/pipeline to Gemini #2; B5-CORR-01 continues, A2 correction is queued and B3-BIND-01 is absorbed into environment production. The [dated intake](intake/2026-10-01/README.md) preserves A2/B5 REWORK and the B3 benchmark/member-identity ruling. FREEZE-1 shared contracts stay unchanged. This page retains the original wave below; its `dispatch-manifest.json` identifies issuance at `385c945fddd2de0b45353dcbc0324c001b3276fc`, not later living-document edits.

Status: **AUTHORIZED / READY FOR MAKER PICKUP**. Authority: the user's current instruction that G1 is formally accepted and that Gemini #1/#2/#3 receive A2/B3-P1/B5-P1. This assignment supersedes older account-role templates for these three packets only. Creating these files does not claim an external account was contacted or a worker started.

Dispatch branch: `planning/post-g1-wave-01`. Start each maker branch from a clean checkout containing this packet commit, then reconstruct the frozen application baseline from the identified archive. Do not assume these packet files already exist on an older `main` checkout. The final handoff identifies the pushed packet commit.

G1 acceptance is settled for this wave. This packet does not reopen that gate. The parent remains final technical acceptance authority; GPT Plus #2 performs independent audit and recommends ACCEPT / REWORK / INSUFFICIENT EVIDENCE. No maker accepts its own return.

## Post-G1 baseline

Planning checkout: `f04dfde5c361d11e8dccd8403b26ce68e5f47112`. Exact input identity is defined by [baseline-manifest.json](baseline-manifest.json), not by whatever `main` contains when a maker starts.

| Input | Accepted revision | Authoritative bytes |
| --- | --- | --- |
| G1 | G1-R1, PARENT-RECON-03 | Archive SHA-256 `10eb041ce009ce3ca2671df76cb8a2fb7c93c254753f0b1b510ff3a87b243cd5`, 6,419,527 bytes; recover `deliveries/G1/g1-integration-proof.zip` from Git commit `62ee8a064e744e0ff7a52f85fd550aef3f66def9` |
| W1 | W1-F1-r2, PARENT-RECON-02 | `room-blockout.glb`: `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f` |
| W2 | W2-F1-r2, PARENT-RECON-02 | Avatar: `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511`; fixture: `7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7` |
| W3 | W3-A1-r2, PARENT-RECON-02 | Handoff ZIP: `1fec5b26253bfbf03a5e7ab4f9e278156dae71bb0824f796a86506bc6a460fa2`; package: `8cb1995f42b71550f688d983948ede67f68851fef1af3cbafe212ebaa00acf70`; lockfile: `1d310d95e3f46bbdf6c3bcc6afe883e3419b4303d1cd2b89ac0d84ffae16a98e` |

The acceptance record binds the older G1 archive. Newer G1 source/ZIPs, W1-r3, W3-r3, the returned material-light sample, and dirty local files are **not automatically promoted into this baseline**. The exact accepted ZIP's 52 `source/` members are individually hashed in the manifest; its three shared contract files match accepted W3 semantics. Use those ZIP members as the application baseline. Do not substitute the different Git source tree at the archive's commit.

Recover archives byte-for-byte with Git object APIs or binary-safe subprocess output; do not pipe binary ZIPs through legacy PowerShell text redirection. Extract into external scratch, verify hashes first, and install with the accepted lockfile. Each maker uses a separate branch/worktree; never use a shared dirty `main` working directory for production changes.

The record pins source/spec/reference identities, not unverifiable claims of finished production quality. Prior audit findings are available as production regression inputs, particularly for B5-P1. Fixes made in an owned overlay are new candidate work; historical proof files remain unchanged.

## Shared contract freeze

Read [shared-contract-freeze.md](shared-contract-freeze.md) before starting. Freeze ID: **POST-G1-WAVE-01/FREEZE-1**. Runtime schema definitions, coordinates, public IDs, source assets, and dependency/configuration baseline are read-only. No cross-lane schema or signature changes are authorized by these packets.

Model policy recorded from the user: parent/default review **GPT-6.1 Sol, xHigh**. Use **GPT-6 Astra, xHigh only** for contract changes affecting multiple lanes, G3 acceptance, G4 acceptance, security-critical architectural disputes, or G6 release-candidate gate. This records assignment policy, not a claim that account/model selection occurred automatically. Each worker/auditor reports its actual provider/model and account alias.

## Three independent packets

| Packet | Maker | Output revision | Repository write root | Exit |
| --- | --- | --- | --- | --- |
| [A2](A2.md) | Gemini #1 | A2-r1 | `deliveries/A2/revisions/A2-r1/` | Evidence-backed content and semantic portfolio routes; at least one verified complete case study for full A2 acceptance |
| [B3-P1](B3-P1.md) | Gemini #2 | B3-P1-r1 | `deliveries/B3-P1/revisions/B3-P1-r1/` | One production-quality desk/monitor/light/plant sample proven in the browser; stop for review |
| [B5-P1](B5-P1.md) | Gemini #3 | B5-P1-r1 | `deliveries/B5-P1/revisions/B5-P1-r1/` | Production lifecycle/camera/entrance foundation using accepted proof assets; no full interaction catalog |

GPT Plus #2 owns review returns under `reviews/gpt-plus-2/post-g1-wave-01/<packet>/<revision>/` only. Parent owns these planning files and subsequent acceptance records. Detailed production destination ownership is in [ownership.json](ownership.json) and the freeze. No maker writes application-root production files directly during this wave.

## Integration boundary and dependencies

Each delivery is an **overlay**, not a new competing application. `overlay/` contains complete replacement/new files at application-relative destinations. A maker validates its overlay against an external scratch extraction of the exact G1 archive. Unchanged baseline application files are not duplicated into the overlay. `harness/`, fixtures, fault switches and evidence stay outside production routes and are never promoted with the overlay.

A2 depends on the accepted shell/contracts and actual content evidence; it needs no new room asset or runtime code. B3-P1 depends on the accepted geometry/rig/reference; its private preview harness gives it browser evidence without waiting for B5. B5-P1 uses accepted W1/W2/G1 assets, accepted empty content, and a private lighting adapter implementing the already specified interface; it does not wait for A2 publication or the new art sample. No circular dependency is permitted.

After independent audits and separate parent ACCEPT decisions, issue a **new, single-owner integration packet** naming exact output commits/hashes. It assembles accepted overlays, binds the approved B3 environment/lighting once, connects A2 publication to B5 navigation, and owns any approved shared-file/config/manifest changes. GPT Plus #2 re-audits the assembly. The parent does not implement it. This wave does not authorize a maker to merge another lane or independently accept a combined application.

## Return and evidence requirements

All three roots must contain:

- `report.md`: actual maker/provider/model; input freeze/revisions/digests; requirements table with PASS/FAIL/NOT RUN and evidence path; changed-path list; open P0/P1/P2/P3; explicit limitations and next action.
- `input-manifest.json`: the full frozen identities plus every additional source/provenance reference actually used. Newer work may be cited as an unaccepted reference, never substituted for accepted input bytes.
- `output-manifest.json`: output revision, source commit, baseline ID, per-file SHA-256/bytes, and production target for every overlay member. Exclude the manifest's own hash from its member list; hash the final manifest/archive separately after packaging. An evidence commit may cite the prior source commit to avoid circular commit hashes.
- `change-map.json`: each changed destination, ADD/REPLACE/DELETE, its owner, baseline hash when present, and why it is needed. No deletes outside the allowlist; no wildcard “shared files as needed.”
- `overlay/`, packet-specific source/assets, `harness/`, and `evidence/` with real logs/exit codes, screenshots/recordings/network traces and measurement context. No installed dependencies or `.next` build output in the handoff.
- A reproducible archive named `<output-revision>.zip` and separate SHA-256 receipt, if file tooling supports it. Hash native/binary outputs only after their last save. A script or screenshot is not a substitute for the requested actual GLB/source/runtime.

Repository integrity CI rejects newly added `.zip`/`.trace` files larger than 10 MiB without an artifact-storage decision. Return canonical source/assets plus their hash manifest when a package exceeds that limit; record any external archive location accurately and propose an approved storage channel only if needed. Do not invent an uploaded archive or external backup. This size rule does not stop independent source/asset production and review.

Record browser/OS/hardware/viewport/DPR, cold/warm cache, network profile, asset/publication revisions, commands, timing and renderer counters with runtime claims. Separate maker observations from independently reproduced results. Verify exported/browser behavior, not just Blender views or diagnostic labels. Unavailable tools/devices remain NOT RUN. Reversible local installs/builds belong in per-maker external scratch with pinned dependencies, not the shared workspace or global environment.

For completed code, commit only owned paths and push the maker branch; report failures immediately. Return the branch, source commit, evidence commit and archive digest. Do not merge `main` or publish/deploy the product as part of packet completion. A correction returns `r2` in a new revision directory; do not overwrite `r1` proof evidence.

## Audit and later work

[GPT Plus #2 audit criteria](audit-gpt-plus-2.md) are part of every packet. Individual lane acceptance is not G2/G3/G4/G6 acceptance. G3/G4/G6 gate decisions use the user's Astra escalation rule.

Still outside these packets: authentication/admin/contact implementation, Supabase/hosting/email provisioning, full environment production, production avatar/likeness and all eight clips, complete object interaction catalog, real audio, B2 CDN/compression rollout, deployment, and release certification. Those are later bounded assignments, not deleted product requirements. Content facts/rights and unavailable physical-device coverage block only dependent claims; they do not justify fabricated evidence or stopping independent lane work.

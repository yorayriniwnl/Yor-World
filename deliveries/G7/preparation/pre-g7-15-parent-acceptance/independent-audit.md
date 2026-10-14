# PRE-G7-15 independent audit record

- **Reviewer:** Local Codex read-only reviewer; not GPT Plus #2.
- **Final audited head:** `965abdaeff38282e2702e1ea97b4929acbef6889`
- **Source commit / app tree:** `8becac4ea3e9decc91ca2807e2004a0aa0407105` / `26d4885d4c76233168baaea52c5a33aca1ede594`
- **Final result:** PASS after evidence-only correction; no source correction was required.
- **Final delta:** Eight PRE-G7-15 evidence paths changed from `0f455d6ab8c58e1b6e928263bbeec6db74259d09`; source and app tree are unchanged.

## Initial findings and correction

The first read-only audit found two evidence defects. Three inventory rows preserved local raw hashes that differed from committed Git bytes because the files had CRLF or mixed line endings; the inventory did not record the committed-blob basis. The report also said `attempt-02/focused-unit.log` was archived although it was absent from the commit.

The maker corrected these issues in the evidence-only delta. The 47-entry inventory now records raw worktree and committed blob sizes, SHA-256 values, and Git object IDs. All 47 entries validate. The three historical worktree hashes remain unchanged, and each LF-normalized file matches its committed blob. The original attempt-02 receipt was recovered byte-for-byte and archived with provenance: 1,580 bytes, SHA-256 `a077ac417b82121d80ab762b81a3f07c6c0528c1fac08838a9b8a8dba0d212cf`. Its 14/14 result is explicitly classified as invalid because it ran against stale source and is excluded from passing checks; the preceding copy-error text is disclosed as not retained.

## Verified evidence

- Exact local and remote heads match `965abdaeff38282e2702e1ea97b4929acbef6889`; the worktree is clean and `git show --check` passes. The delta changes evidence files only.
- The source commit remains `8becac4ea3e9decc91ca2807e2004a0aa0407105`, and its app tree remains `26d4885d4c76233168baaea52c5a33aca1ede594`.
- The source correction distinguishes renderer-constructor/context-creation failure from post-start context loss. The capture is restricted to the exact one-argument Three.js context-creation message during synchronous construction; other `console.error` calls pass through and `console.error` is restored in `finally`. Genuine runtime errors and context-loss severity remain intact.
- The startup fallback provides the browser-hardware-acceleration guidance and portfolio links while retaining retry. No global hydration suppression, renderer/GPU policy, retry count, timeout, camera preset, interpolation, or endpoint change was found.
- Source mirror parity passes for 116 source and 10 test entries; all 17 protected hashes and the declared domain override are preserved. All 247 tracked application snapshot files match the source commit.
- The compressed `source.patch.gz` reproduces the exact 31,770-byte binary source diff.
- Six passing receipts verify focused unit **14/14**, full unit **327/327**, lint, typecheck, production build, and the renderer-recovery browser suite **20/20** across Chrome and Edge. The final browser JSON has 20 expected and zero unexpected results.
- The default integration suite remains **FAIL twice, 285/286**, because the unchanged canonical-fixture test reached its default 60,000 ms timeout. A prior pre-final-source run passed 286/286; it does not replace the two final-source failures.
- The user's actual Chrome GPU state is **NOT PROVIDED**. Physical iPhone/iPad Safari, Android Chrome/TalkBack, Windows NVDA, VoiceOver/Safari, and the 10-minute mobile soak are **NOT RUN**. No provider configuration or deployment occurred; local-only is preserved.

The initial audit identified the inventory and missing-receipt claims; the maker corrected both, and the read-only delta audit verified this exact final head. No implementation changes were made by the reviewer.

**Audit disposition: PASS. Parent acceptance is recorded separately.** No GPT Plus #2 review is claimed; any later gate requiring that designated external audit remains unsatisfied.

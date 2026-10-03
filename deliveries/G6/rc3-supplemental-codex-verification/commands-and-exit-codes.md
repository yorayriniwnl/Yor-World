# Supplemental command and exit ledger

These are completed local executions, separate from the original maker checks. A passing reproduction confirms a defect; it does not certify the product. Canonical production sources and the original maker dossier were not changed.

| Execution | Working directory / configuration | Actual result |
| --- | --- | --- |
| Auth/CMS worker probe | Canonical `app/`; temporary config `C:/Users/yoray/AppData/Local/Temp/yor-auth-cms-56bd5731-7eff-43b6-aca4-fbe75b42747a.config.mjs` | Exit0;1 file/1 case PASS;6.22s; [original log](evidence/auth-cms-probe.log) |
| Contact/operations worker probes | Canonical `app/`; temporary config `C:/Users/yoray/AppData/Local/Temp/yor-contact-ops-probe-c37bf2eb95414e3996316dc3e19614e6/vitest.config.mjs` | Exit0;1 file/5 cases PASS;4.16s; [original log](evidence/contact-ops-probe.log) |
| Shared portable config | Canonical `app/`; committed relative configuration below | Exit0;2 files/6 cases PASS;5.44s; [shared log](evidence/shared-config-probes.log), [receipt](evidence/shared-config-execution.json) |
| Version observations | Repository root; `node --version`, `pnpm.cmd --version` | Both exit0;v24.19.0 and9.15.9; actual run banner Vitest5.0.2 |
| Input/tree comparisons | Repository root; `git rev-parse REV:PATH`, candidate Git blobs versus canonical LF working files, `git diff HEAD -- app scripts/release .github/workflows deliveries/G6/full-stack-integration` | Exit0; source/candidate/coordination trees equal, tracked source/maker diff empty; [identity](verification-identity.json) |
| Earlier coordination CI observation | Repository root; `python deliveries/G6/full-stack-integration/tools/observe-github.py --head 2bbf7f05b34e17094acaa0078e9c6743d73f8196 --output TEMP/yor-world-rc3-coordination-ci-2bbf7f0.json` (TEMP denotes the actual process temporary directory) | Exit0 and parsed overallStatus PASS; both exact-head workflows and all required steps successful; [raw observation](evidence/coordination-head-ci.json). This is not archive-commit CI. |
| Archive/packet coherence | Repository root; local Python checks exact hashes, JSON, links, candidate blobs, tree pins and seven unfixed IDs | Exit0;21 checksum entries,10 JSON files,134 local links and35 candidate input hashes PASS before receipt addition; [receipt](evidence/archive-validation.json). Staged bytes are verified separately before commit. |

Reproduce the shared probe run from the repository's canonical `app/` with existing exact-pinned dependencies:

```powershell
pnpm.cmd exec vitest run --config '../deliveries/G6/rc3-supplemental-codex-verification/probes/vitest.config.mts'
```

The actual archived shared invocation redirected all output to the absolute shared log path with PowerShell `*>`; its exact command and working directory are in the receipt. Raw logs retain UTF-16LE BOM bytes and are marked `-text` in Git. The hash inventory uses exact raw bytes for every supplemental file; UTF-8 text/probes are stored as LF. The SQL hashes inside the auth result are executed local working-file bytes, which can differ from canonical Git-blob hashes through Windows line endings; the identity records and compares both.

The two initial worker invocations used temporary configs now superseded for reproduction by the checked-in shared config. Initial auth log redirection failed because the evidence directory was absent, before any test executed; the worker created its owned directory and ran successfully. An archive read command later had a Python parenthesis syntax error, and another hit stdout encoding while printing Unicode; both were corrected and neither executed tests nor changed product files. No failed test run was removed or converted to PASS.

Repeated probe execution overwrites fixed result JSON paths. Contact afterAll can write observations after a failed assertion, and failed auth execution can leave old JSON. The passing shared log and recorded actual exit0 establish this run; JSON alone does not establish a test outcome. Use a new evidence destination for future correction validation, and preserve this archive.

Hosted services, independent PostgreSQL sessions, real mail/upstream, browser/build suites, Gemini provider execution and independent GPT Plus #2 audit were NOT RUN by this supplemental review. The read-only [packet review](evidence/packet-review.json) checks coordination/evidence coherence and supplies no account acceptance.

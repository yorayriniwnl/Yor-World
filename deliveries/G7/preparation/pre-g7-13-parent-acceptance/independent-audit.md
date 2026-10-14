# Independent local audit return: PRE-G7-13

**Reviewer:** read-only local Codex audit agent. This is not an external GPT Plus #2 review. The maker did not review or alter this report. The auditor changed no files.

## Initial exact-revision audit

- Source candidate: `a3459c158af880319269196f85c0c922ee86c5d6`
- Initial evidence revision: `a0e0cbfd9ea3a336f345e64bdb6fdd82475a77ab`
- App tree: `23c7dac82746d7db84632e228efe3224736b9266`

Source and visual checks passed: console support, tabletop footprint and microphone adjacency; all three camera feet on `shelf_rear_upper`; raw desktop/mobile review; placement regression assertions; original material/light inventory; GLB immutability at 861,364 bytes and SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`; and mirror parity for 116 source files plus 9 tests.

The initial review found two evidence defects: `REPORT.md` had a mistyped PRE-G7-13-A1 commit, and 17 of 246 historical log hashes differed between local checkout bytes and committed Git blob bytes. The auditor required preserving the local historical hashes and adding labeled exact-blob hashes. These findings were corrected in subsequent evidence-only commits.

## Read-only delta audit

Audited final evidence revision: `498d6e1329ce651a816cd17935af5fa25bf01ba2`.

| Check | Result |
|---|---|
| Prior source and visual fixes | PASS; app tree remains `23c7dac82746d7db84632e228efe3224736b9266`; final delta changed only evidence inventory after report correction |
| PRE-G7-13-A1 provenance | PASS; report names `0a73f307d078cc531f09bbc4ae7a5dfef2eedd01` |
| Existing local `sha256` preservation | PASS; all 246 values match the prior inventory and local bytes |
| `committedBlobSha256` | PASS; independently recomputed all 246 exact Git blobs at base evidence commit `a351493e3bb93e05ec52e9b4b3e5620ae7c5af87`; zero mismatches |
| CRLF differences | PASS; exactly the 17 previously identified logs differ; normalizing CRLF to LF reproduces each committed hash; no extra differences |
| REPORT inclusion / inventory self-exclusion | PASS; report is included and both recorded hashes match; the checksum inventory excludes itself and explains why |
| Remote branch identity | PASS; `git ls-remote` returned `498d6e1329ce651a816cd17935af5fa25bf01ba2` |
| Fresh test/device execution on evidence-only delta | NOT RUN; source did not change; prior full integration remains FAIL at 285/286; physical-device sessions remain NOT RUN |

No remaining source or checksum defect was identified by this local audit. Its results are maker-independent but do not constitute an external GPT Plus #2 audit.
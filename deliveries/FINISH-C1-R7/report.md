# FINISH-C1-R7 committed-byte receipt supplement

Status: maker verification PASS for this evidence package; independent delta audit and Parent acceptance are pending. This evidence-only supplement does not accept C1-R6, change `app/`, rewrite historical candidates, or authorize canonical integration.

## Provenance results

- R6 input provenance: **29/29 PASS** — 19 direct Git blobs, 8 mapped Git blobs under FINISH-21-R1, and 2 installed `three@0.180.0` package files verified against the R6 package manifest, lockfile integrity, source-build identity, and frozen-install receipt. Only the 27 Git-backed rows are labelled Git blobs.
- R5 predecessor outputs: **32/32 PASS** against raw Git blobs at `5e85e6a8a248581fe3893fd80c7da3d05079f305`. The original manifest's own blob receipt is recorded separately and excluded from its 32 outputs.
- The historic receipts differ from committed/install bytes in 7 R6 rows and 23 R5 rows. Corrected values are raw Git bytes for Git-backed files; no line-ending conversion or Unicode normalization was applied.
- R6 lockfile direct input receipt: historical `158580` bytes; pinned Git blob `app/pnpm-lock.yaml`: `153898` bytes. The frozen package installation evidence binds the pinned lock blob and its `three@0.180.0` integrity string; the installed package rows remain explicitly non-Git evidence.

## One-byte diagnostic-test discrepancy

The original R6 receipt for `deliveries/completion-audits/FINISH-C1/finish-08/20261011T003551Z-c1-r5-local-review/evidence/retry-aggregation-diagnostic.test.ts` declares `2874` bytes and SHA-256 `f19932723c3644d4cc25b65d919317bc28e89520c3c47c926b49e08d2fd22235`. The pinned R6 commit blob is `2873` bytes with SHA-256 `d952aef28ae996208471a13b5dc3aafe2a12e85a219a677463d06691cf03663a`. FINISH-16's pinned audit log at `27938c5c3a224a52849f2508cc7ebfcefa61fe6f:deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/evidence/logs/fin16-local-20261011-0711-single-byte-verification-rerun.log` records exactly one additional CR byte (`0x0d`) at offset `2872` in the historical expected representation. This supplement uses the committed raw blob for the corrected row and infers no source change from the receipt mismatch.

## Verification and limits

Verifier command: `python deliveries/FINISH-C1-R7/verify-input-provenance.py --json`. Exit code: **0**. Tool versions: `Python 3.12.10`, `git version 2.55.0.windows.5`, pnpm `9.15.9`. Raw stdout/stderr and the structured result are in `evidence/verifier.log` and `evidence/verification.json`.

The original R6 and R5 manifests were read from their pinned Git objects and remain unchanged. Application source, tests, build, and browser checks are inherited from FINISH-16 and **NOT RUN** by this evidence-only task. Independent delta review, external GPT Plus #2 review, Parent acceptance, provider/device checks, and G7 remain pending or NOT RUN.

## Expected, returned, and missing files

| Expected stable file | Returned | Missing |
| --- | --- | --- |
| `.gitattributes` | YES | NO |
| `.gitignore` | YES | NO |
| `report.md` | YES | NO |
| `requirements-matrix.json` | YES | NO |
| `source-binding.json` | YES | NO |
| `candidate-input-provenance.json` | YES | NO |
| `predecessor-output-git-blobs.json` | YES | NO |
| `verify-input-provenance.py` | YES | NO |
| `evidence/verification.json` | YES | NO |
| `evidence/verifier.log` | YES | NO |
| `output-hashes.json` | YES | NO |

Scratch is under `.work/` and excluded from the output manifest and commit.

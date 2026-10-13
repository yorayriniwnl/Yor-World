# LOCAL-CORRECTIONS-03 attempt 24: final inventory receipt

**Status:** scoped implementation and fixture regressions complete; independent Parent audit is pending. No files were staged or committed.

## Result

The successful inventory completion receipt is now staged as assembler output and included by exact SHA-256 in the final `SHA256SUMS.txt`. It binds the inventory phase, PASS result and exit code, completion time, exact source commit, delivery root, release ID, and canonical assembler argv including `--inventory-only`. The assembler preflights all output destinations before the first write, creates ordinary outputs and the checksum file exclusively, then creates `evidence/inventory-completed.json` last. A failed/interrupted attempt therefore cannot leave a success receipt; an existing or partial receipt blocks a repeat.

The driver now invokes the actual `assemble-evidence.py` path relative to the primary repository (a defect found by the new regression had it deriving the path from `candidate-driver.py`). It verifies the primary receipt and its unique exact checksum entry read-only after successful finalization. The inventory phase performs no later driver export or delivery-tree write.

Isolated regressions exercise package to final inventory, exact receipt hash/listing, preservation of package artifacts and earlier execution bytes, repeat refusal, injected interruption before the last write, and a pre-existing partial receipt. Driver tests check source/delivery/release/command binding, checksum rejection, no checkout receipt, no post-finalization writes, and refusal to resume a delivery with a primary completion receipt.

## Existing R7 evidence boundary

Read-only inspection confirmed `deliveries/G7/rc6-candidate-r7/release-composition.json` (30,384 bytes) and `gltf-validation-receipt.json` (285,048 bytes) remain present. The current policy selects the separate path `deliveries/G7/rc6-candidate-r7/attempt-20261011T1820Z-localfinal`; that destination was absent at inspection. The candidate driver's preflight rejects an already existing destination, and isolated tests seed the root-level artifacts and verify they remain byte-for-byte unchanged while a distinct attempt path is exercised. No real candidate attempt was run, so this is guard/test evidence, not a claim of a successful real R7 run.

## Validation evidence

| Result | Exact command | Raw outcome | Captured evidence |
| --- | --- | --- | --- |
| PASS | `node --test --test-reporter=tap scripts/release/tests/assemble-evidence.test.mjs` | 9 tests, 9 passed, 0 failed; exit 0 | `assemble-evidence.test-run-06.log` |
| PASS | `node --test --test-reporter=tap scripts/release/tests/policy-output.test.mjs` | 50 tests, 50 passed, 0 failed; exit 0 | `policy-output.test-run-03.log` |
| PASS | `node --test --test-reporter=tap --test-name-pattern="final inventory verifies" scripts/release/tests/policy-output.test.mjs` | 1 test, 1 passed, 0 failed; exit 0 | `driver-inventory-test-run-06.log` |
| PASS | `node --check scripts/release/tests/assemble-evidence.test.mjs` | exit 0, no output | final scoped syntax check |
| PASS | `node --check scripts/release/tests/policy-output.test.mjs` | exit 0, no output | final scoped syntax check |
| PASS | `python -B -` with `ast.parse` on `assemble-evidence.py` and `candidate-driver.py` | both AST parses passed | final scoped syntax check |
| PASS | `git diff --check -- deliveries/G7/preparation/tools/assemble-evidence.py deliveries/G7/preparation/tools/candidate-driver.py scripts/release/tests/assemble-evidence.test.mjs scripts/release/tests/policy-output.test.mjs` | exit 0 | final scoped whitespace check |

Earlier exploratory runs and their failure logs remain in this attempt directory; they caught the incorrect finalizer path and test-fixture argv mismatches. The final targeted and complete suites above pass after those corrections.

## Changed code paths and SHA-256

| Path | SHA-256 |
| --- | --- |
| `deliveries/G7/preparation/tools/assemble-evidence.py` | `A28C12B048E5813A82D85C3C296D247678AB95303317C9831BD4666501B50E8D` |
| `deliveries/G7/preparation/tools/candidate-driver.py` | `34F8F62AED5956FA88E483D57AB3F5E169F4BD160009FBDC3EF522D726CE57E9` |
| `scripts/release/tests/assemble-evidence.test.mjs` | `7B4C59644A3F49C9942E43783B4E85D4A26DA0F24AB62FFFEA6BE1FF2D83A53C` |
| `scripts/release/tests/policy-output.test.mjs` | `B9E164CC7E7890ADAA059AF01970C7F01292A1F81AD6BF1CFE145A74F9277495` |

Final test log hashes:

- `assemble-evidence.test-run-06.log`: `D690910E5DB509AEE57A6AB8DFCDA62FDA112FC7FC16247A3301C07CA7516A47`
- `policy-output.test-run-03.log`: `4D33EDD676FD0D121759ACAA54579D0DEF7B87F1DF37FFD27F40B01A08BDE34D`

## NOT RUN and limits

- Real R7 candidate driver, shared build, providers, deployment/production probes, and G7 operations: **NOT RUN**, as instructed.
- No service provisioning or production writes were performed.
- Results are isolated fixture/worktree evidence only; no clean-checkout CI run or independent acceptance was performed.
- Parent owns the Git audit, commit, and push.

Worktree at inspection: branch `fix/local-studio-check`, HEAD `dbc52619ab8d2d20a894b67988e50c5f86115bf8`.

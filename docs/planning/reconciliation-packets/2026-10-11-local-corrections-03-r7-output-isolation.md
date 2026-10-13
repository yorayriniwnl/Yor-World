# Parent amendment — isolate the final R7 output attempt

Date: 2026-10-11 (UTC). This amendment preserves the assigned RC6 successor and resolves a pre-existing output collision discovered during local re-audit.

## Finding

The initially allocated R7 directory already contained two untracked artifacts before final source generation:

| Path | Bytes | SHA-256 | Recorded identity |
|---|---:|---|---|
| `deliveries/G7/rc6-candidate-r7/release-composition.json` | 30,384 | `67ff44f8ac07b1bd24f2a6b152418459a3c391b2e4c5bcc92f5c33fb30d7adf8` | `PASS`, build ID `GdJuSbpL6Yf1kmHHMBSno`, no source commit or application tree |
| `deliveries/G7/rc6-candidate-r7/gltf-validation-receipt.json` | 285,048 | `50439e0df756c511b0021e3a0be965bbd537c5f37f202ee44ce8ee167c44047d` | `PASS`, 16 assets, no source commit or application tree |

These records are preserved at their original paths and are not evidence for the final source. They must not be overwritten or upgraded by inference.

## Authorized output isolation

Use the previously absent fresh R7 attempt root `deliveries/G7/rc6-candidate-r7/attempt-20261011T1820Z-localfinal` for the final candidate. Bind both `deliveryRoot` and the canonical archive under that root. Preserve the two root-level artifacts as immutable file outputs in every applicable release writer, and add isolated regression coverage for their preservation. Keep the same release ID, schema, asset, publication, contact, governance, and budget contracts.

The amendment changes output identity only. R7 remains pending independent review and Parent acceptance. It authorizes no deployment or live production probe. The candidate driver may run only after the complete source and final policy are committed, all entry-point preservation/inventory guards pass, and the final asset revision is bound.

## Interrupted-attempt preservation rule

The candidate writer treats the selected delivery root as a single-use attempt. `prepare` rejects any existing file or directory in that root, even without `evidence/execution.jsonl`. Each later phase records its start before writing; a missing completion receipt means the attempt is interrupted and cannot be resumed in place. Detached-to-primary export uses exclusive file creation, permits only byte-identical existing copies, and allows only append-only growth of `evidence/execution.jsonl` after prefix verification. A mismatch preserves both versions and requires a new delivery revision. This guard does not authorize an R7 run before final source freeze and independent inspection of the writer.

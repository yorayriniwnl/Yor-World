# Parent local R7 writer delta re-audit — 2026-10-12

**PASS for the three previously reproduced writer defects at the current committed source.** This is a local Parent re-audit, not the assigned external GPT Plus #2 review, candidate acceptance, or G7 acceptance.

Audited branch `fix/local-studio-check`, HEAD `6de3e05a289e86e759d4602e9ee49f1a19f3b8da` (`fix: close R7 release writer gaps`). The release-writer implementation and focused regression files are clean at this HEAD. The wider checkout still has unrelated app/art candidate work in progress; it was not staged or included in this audit.

## Findings

1. **Occupied bundle receipt/archive: closed.** The bundle entrypoint checks both exclusive destinations before bundle computation or writing. The current isolated fixture exercises both an occupied archive and an occupied receipt, verifies the existing bytes are preserved, and verifies the other destination is not created.
2. **Partially existing reservation parents: closed.** `ensureParent` resumes beneath the validated prefix at the first missing component. The current actual-helper tests cover first missing indices 0, 1 and 2 and verify that no misplaced root-level `G7` or `evidence` directory is created.
3. **Package/final-inventory output collision: closed.** The package phase writes separately named immutable `package-*` outputs; the final inventory writes the canonical names once. The current isolated test runs package then final inventory, checks package bytes are unchanged and included in the final checksum list, then verifies a repeat refuses without changing prior outputs.

## Verification

-`node --test scripts/release/tests/*.test.mjs` — **PASS, 121/121**, zero skipped/flaky; raw output and exit are in `release-tests.log` and `exit.txt`.
- `git show --check 6de3e05a -- <scoped writer paths>` — **PASS**.
- Current SHA-256 values for the three implementation paths and three focused test files are recorded below; the current working-tree diff for those paths is empty.

| Path | SHA-256 |
|---|---|
| `scripts/release/build-release-bundle.mjs` | `a3419a23031324825d2d10fba6c9c48a4447ac6d3af3950df80d189ab18ba8a4` |
| `scripts/release/release-lib.mjs` | `e0640d23151fadc3a8a845434e46ce0fdf392d251935c4ff23fc3b7f49b6687e` |
| `deliveries/G7/preparation/tools/reserve-attempt.mjs` | `38c1e2478c0be0fd4a0289af67f4fd56e531e1c5d0016364874ea2ad452eb0b3` |
| `deliveries/G7/preparation/tools/assemble-evidence.py` | `4ebc8a2dad12dc9deaa72081c95f4c8bd53e7432d177ae4c7a3f9e49e070bd3c` |
| `scripts/release/tests/policy-output.test.mjs` | `271504fcead80af583c898da515a350e932cc5a2b5d40bd320263e1d536ff0f2` |
| `scripts/release/tests/reserve-attempt.test.mjs` | `cd8045a0a3026d9b503207fe242bd6eea5ff3564e8e8d7f678967d8e9e3e6965` |
| `scripts/release/tests/assemble-evidence.test.mjs` | `23a070dbc55e6b0ffebec240ef3f4d13974080fb1ca7628b3959e697df27162d` |

## Remaining gate limits

The candidate driver has not been run and no actual R7 candidate/package was generated. The current status ledger still correctly reports RC6 as not source accepted. External GPT Plus #2 delta review and its separate Parent disposition remain pending. No provider, deployment, production database, email-delivery, device, or G7 execution is inferred from these writer tests.

# PRE-G7-09 residual maker handoff

Maker only; independent audit and Parent acceptance remain required.

Input base: `7f257dbc8de9866228d6064fc749f354e099bd6a`; read `START_HERE.md`, work orders, PRE-G7-08, PRE-G7-09 and the seven owned paths directly. Incoming PRE-G7-08 implementation and R5 proof were retained. This worker made no edits during the earlier R4 archive/remote reconciliation hold.

Changed actual files: `scripts/release/rc6-policy.json`, `scripts/release/release-lib.mjs`, `scripts/release/validate-release.mjs`, `scripts/release/tests/immutable-output.test.mjs`, `scripts/release/tests/policy-output.test.mjs`, and `deliveries/G7/preparation/tools/candidate-driver.py`. The owned builder is unchanged. No application, CI, docs or actual prior candidate/history files were written by this maker.

Policy now binds `deliveries/G7/rc6-candidate-r6/` and its matching canonical archive. JS/Python guards protect incoming R5. Validator receipt identity preflight protects fixed source binding/composition/bundle receipt, all policy mandatory evidence and every directly read candidate browser/performance input before parsing a manifest. Dynamic bindings/hashes/check inputs retain identity checks afterward. The detached validation check remains exempt from circular input treatment. Existing JS identity helpers/readers remain unchanged.

Python direct `write_json` now checks existing hard-link count immediately before creating directories or truncating output; `safe_output` reuses that guard. Isolated tests call the direct writer against links to each preserved candidate sentinel and verify unchanged bytes, then exercise fresh and single-link replacement JSON writes.

| Check | Result | Evidence |
| --- | --- | --- |
| Final Windows guard regressions | PASS: 52/52, zero failures/skips, exit 0 | `guard-tests-final.log`, `checks.json` |
| JS syntax: lib/builder/validator/two tests | PASS: each exit 0 | `syntax-*.log`, `checks.json` |
| Python AST syntax | PASS: exit 0 | `python-syntax.log`, `checks.json` |
| Owned diff whitespace check | PASS: `git diff --check --` the seven owned paths, exit 0 | Executed terminal result; no output |
| Full fresh R6 all-thirteen/primary/hosted proof | NOT RUN: Parent owns source freeze and full proof | Pending independent workflow |
| Real G7 services/physical/manual checks | NOT RUN | Outside this packet |

Regression coverage includes exact and basename-only uppercase collisions against all fourteen fixed inputs with omitted manifest declarations; malformed JSON and wrong-shaped declaration preflight; dynamic binding/hash/check collisions; detached and primary receipt admission through collision preflight; hardlinked JSON readers; JS writer unchanged protected bytes; Python direct writer unchanged protected bytes; and the existing all-destination export preflight.

The positive validator receipt fixture intentionally has an invalid synthetic source and verifies admission through collision preflight only. It does not claim full release validation. All write probes run in labelled temporary repositories outside real candidate/history paths and verify cleanup targets.

Reproduce: `python -B scratch/pre-g7-09-residual/run-checks.py`. Exact commands, exit codes, tool versions and raw hashes for all seven owned files are in `checks.json`; scoped source delta is in `owned-source.diff`. The first guard run passed 51/51 before the additional malformed-declaration regression; its log is preserved as `guard-tests-attempt-01.log`. No commit, push, provider/account action or acceptance was performed by the maker.

Open defects: none observed by maker checks. Parent and the independent reviewer decide disposition; incoming R5 observations retain their narrower recorded scope.

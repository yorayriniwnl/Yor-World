# Exact RC5 candidate: hosted runner acquisition failure

Candidate: `f3cb4d1a4fcb797dd4520e796a3422b7b12a890f`; release `v1.0.0-rc5`. These are read-only maker diagnostics, not independent audit or gate acceptance. No cancellation, rerun, workflow change, or source change was performed.

Both exact-candidate Actions workflows completed with **failure** on attempt 1. Both jobs ended **cancelled** during GitHub-hosted runner acquisition. Each job reported runner ID 0, an empty runner name, and zero executed steps.

| Workflow | Run ID | Job ID | Job completed UTC | Run updated UTC | Result |
| --- | --- | --- | --- | --- | --- |
| Repository integrity | 37365134471 | 111948347223 | 2026-10-05T19:57:32Z | 2026-10-05T19:57:33Z | run failure; job cancelled; 0 steps |
| CI / Release Quality Gate | 37365134461 | 111949250528 | 2026-10-05T20:00:14Z | 2026-10-05T20:00:15Z | run failure; job cancelled; 0 steps |

Both check annotations identify the same actual failure: "The job was not acquired by Runner of type hosted even after multiple attempts". The source checks, including performance and strict manifest validation, were **NOT RUN in GitHub Actions** because no hosted runner was acquired. These observations provide no hosted result for the corrected LOW benchmark and cannot establish a successful candidate release gate. Existing local execution evidence remains separately recorded.

All requests used unique query values plus Cache-Control no-cache/no-store and Pragma no-cache. Response metadata records current HTTP Date and X-GitHub-Request-Id values. Both API records bind the exact candidate head. Integrity was captured at 2026-10-05T19:59:11Z; Quality's terminal state was captured at 2026-10-05T20:00:44Z. Those observations correspond to 2026-10-06 01:29:11 and 01:30:44 Asia/Calcutta.

`20261005T195911288782Z/` contains both workflow run/job/check/annotation snapshots, including Integrity's terminal evidence and Quality's then-queued state. `20261005T200044185183Z/` contains Quality's terminal run/job/check/annotation snapshots. Each directory has a diagnostic receipt. `terminal-results.json` consolidates both final identities and states; `SHA256SUMS.txt` hashes every returned file except itself.

The earlier queue investigation separately captured official GitHub Actions degraded-performance incident `3q1yb5m7ltvb`, which describes hosted runner assignment delays. Official incident: https://www.githubstatus.com/incidents/3q1yb5m7ltvb

The user packet's exact-candidate CI success requirement is unmet. Parent owns the packet disposition. G6 remains ACTIVE / REWORK; G7 remains LOCKED.

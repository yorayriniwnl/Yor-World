# RC5 Actions queue investigation

Read-only observation at 2026-10-05 19:45:43–19:47 UTC (2026-10-06 01:15:43–01:17 Asia/Calcutta). No Actions cancellation, rerun, workflow edit, or production change was performed. Credentials were only retrieved in memory when API authentication was required.

GitHub-hosted runner assignment is the demonstrated blocker. The official Actions component reports degraded performance, and active incident `3q1yb5m7ltvb` specifically describes delayed hosted-runner assignment across runner configurations. Incident started 2026-10-05T19:11:58Z; its latest update is 19:15:17Z. Both official summary and unresolved-incidents snapshots are archived here.

Two independently nonce-tagged API rounds sent Cache-Control no-cache/no-store and Pragma no-cache. Each run received different X-GitHub-Request-Id values and current response Date headers. The same exact-candidate run/head/job assignment state was returned in both rounds. Earlier source runs changed from the parent's queued observation to actual completed/failure records, demonstrating current service state rather than reliance on the earlier observation.

| Revision | Workflow/run | Fresh run state | Job evidence |
| --- | --- | --- | --- |
| f3cb4d1a4fcb797dd4520e796a3422b7b12a890f | Integrity / 37365134471 | queued, conclusion null | job 111948347223 queued; no assigned runner; steps [] |
| f3cb4d1a4fcb797dd4520e796a3422b7b12a890f | Quality / 37365134461 | queued, conclusion null | job 111949250528 queued; runner_id 0 / name empty; steps [] |
| c34e01bb5bff210d924f42d5266e2fa1ed13288e | Integrity / 37363795783 | completed, failure | job 111944210926 cancelled at 19:45:10Z; runner_id 0; steps [] |
| c34e01bb5bff210d924f42d5266e2fa1ed13288e | Quality / 37363795703 | completed, failure | job 111944210808 cancelled at 19:45:10Z; runner_id 0; steps [] |

Both earlier source-job check annotations explicitly report: "The job was not acquired by Runner of type hosted even after multiple attempts". No source check step executed. These failures occurred during runner acquisition, before the missing source-only manifest could be evaluated.

Current Quality has a real queued job created at 19:45:11Z, one second after the earlier Quality job terminated. The workflow's existing concurrency group serializes Quality on main, with cancel-in-progress false for pushes; Integrity has no concurrency group. The timing is consistent with earlier Quality holding that concurrency slot until its runner-acquisition failure. That possible earlier serialization delay has cleared: both current candidate workflows now await hosted runners. No remaining running repository workflow appears among the captured 30 recent main runs.

Files: `round-1.json` (runs/jobs/recent runs/status plus response metadata), `round-2-runs.json` (fresh repeat observations), `checks-and-annotations.json` (earlier source-job check records and exact failure annotations), `official-status-summary.json`, `official-status-unresolved.json`, and `findings.json` (compact facts). Source-only runs cannot satisfy the RC5 candidate gate. The exact candidate has no executed gate result yet. This is maker support evidence, not independent audit or gate acceptance.

Official source: https://www.githubstatus.com/incidents/3q1yb5m7ltvb

# Executed test evidence

Canonical new source is app/tests/integration/platform/residual-media-still-images.test.ts (32 cases) and app/tests/integration/platform/scp-github-durable.test.ts (24 cases). Production commit and canonical file blobs are bound in [parent identity](../../implementation-identity.json). Exact source copies are under workers/media/files/app/ and workers/github/source-*.txt.

| Executed suite | Actual result | Raw/structured evidence |
| --- | --- | --- |
| Full unit | 266/266,0 skipped | [JSON](../../evidence/unit-results.json), [log](../../evidence/unit.log) |
| Full integration | 280/280,0 skipped | [JSON](../../evidence/integration-results.json), [log](../../evidence/integration.log) |
| Media focused, including original 34 | 66/66,0 skipped | [JSON](../../workers/media/evidence/focused-results.json), [observed POST side effects](../../workers/media/evidence/post-observations.json) |
| GitHub focused, including original 17 | 41/41,0 skipped | [JSON](../../workers/github/focused-final.json), [log](../../workers/github/focused-final.log) |
| Supplemental independent delta | 25/25,0 skipped | [JSON](../../review/delta/results.json), [independent source/report](../../review/delta/report.md) |

Fixtures include the immutable corrupt-second-frame APNG bytes and fresh bounded PNG cases. The media generator/oracle, source snapshots, and fixture SHA inventory are in [media maker report](../../workers/media/report.md). Storage HTTP transport is mocked; SQL runs in PGlite. Native independent PostgreSQL sessions were NOT RUN after the OS executable block; native.optional.ts is retained source, excluded from the executed suite rather than counted as a skip. Counts across focused and full suites overlap.

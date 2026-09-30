# W3 / A1 returned delivery

Read [report.md](report.md) for the maker's results, limitations and review handoff. This is an isolated proof, awaiting parent and independent review. `source/` is the complete Next.js application. No files should be copied to shared production paths without a separate integration assignment.

## Reproduce on the demonstrated Windows setup

Prerequisites actually used: Node 24.19.0, pnpm 9.15.9, Python 3.12.10, installed Chrome 154 and Edge 154. No database, secret, account, global install or browser download is required. Use existing tool versions; this packet does not install them.

From this delivery directory in PowerShell:

```powershell
$env:W3_PROOF_EVIDENCE = Join-Path (Get-Location) ('evidence/reproduction-' + [guid]::NewGuid().ToString('N'))
python -X utf8 tools/proof.py prepare
python -X utf8 tools/proof.py install
python -X utf8 tools/proof.py lint typecheck test:unit build test:e2e list audit
```

The helper copies `source/` to a unique directory under the system temporary directory, uses a private package store/cache there, and executes pnpm through the already installed Node CLI. `install` uses `--frozen-lockfile`. Each command has a timestamp, exact argv, working directory and exit code in the selected evidence directory. All child processes are hidden on Windows. A runtime-only environment allowlist excludes backend credentials and disables Next telemetry. The initial maker run explicitly generated a new lockfile before its frozen install; `resolve` exists only for a separately chosen dependency update, not for normal reproduction.

Playwright starts and stops a **production** `next start` server on `127.0.0.1:3147`; it does not use `next dev`. The port must be free. Browser configuration is in `source/playwright.config.ts`. Missing browsers cause a real failure; do not interpret that as a browser pass. Run `pnpm test:e2e --project=chrome` inside the external app for a deliberately narrower check.

For a manual preview after the build, use the `app` path in the newly written `execution.json`, and run this in a terminal you control:

```powershell
$env:NEXT_TELEMETRY_DISABLED = '1'
pnpm start --port 3147
```

The start script binds loopback. Stop it with Ctrl+C. This is local serving, not deployment. The `test:integration` script deliberately fails when no integration tests exist: backend work belongs to later assignments and is NOT RUN here.

## Evidence and test boundaries

`evidence/a1-current/` is this maker run. The older root-level evidence and `delivery-w3.zip` are interrupted artifacts, preserved and superseded for review by `W3-A1-handoff.zip`. `interrupted-snapshot.zip` and its inventory preserve the pre-change bytes. The first failing browser run is also retained, including its screenshots/traces.

Tests cover exact contract types, valid and invalid schema inputs, fixture isolation, direct load/refresh, browser Back and anchors, keyboard and skip link, useful JavaScript-disabled HTML, honest studio disclosure, world/API blocking, zero WebGL/audio use, reduced motion, narrow reflow, axe scans, and application payload observations. Test samples live only under `tests/`. Structural schema success does not grant publication approval or verify claims.

This machine injected Kaspersky browser scripts. The initial unfiltered failures are retained. Final network proof blocks every off-origin request; only the two observed antivirus hostnames are classified separately in evidence. Unknown external hosts still fail. Built HTML and application chunks contain no such script. Payload byte totals cover application-origin resources; they are not unfiltered physical-device performance claims. No OS security setting was changed.

The abstract CSS poster is a placeholder, not a recreated studio or licensed reference asset. The main image was inspected and remains a design reference with unknown rights. Public projects stay empty, identity/title stay provisional, and studio, résumé download and messaging remain unavailable.

## Handoff boundaries

Claude-01: exact shared types/schemas and import boundaries. Claude-02: complete source, build, fixture separation and payload evidence. Claude-05: semantics, focus, keyboard and accessibility limits. These are requested review roles, not claims of external Claude execution. Parent review decides acceptance. No A2–A6, world integration, root changes, service provisioning or deployment is included.

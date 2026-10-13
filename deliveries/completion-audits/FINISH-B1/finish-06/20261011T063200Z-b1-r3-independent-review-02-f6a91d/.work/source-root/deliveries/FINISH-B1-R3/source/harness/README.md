# FINISH-B1-R3 verification harness

This folder pins the browser-side dependencies used by the local art verification runner. From this directory, run `npm ci`, install Playwright Chromium once with `npx playwright install chromium`, then run `npm run verify`. The runner prefers these local dependencies. In this workspace, before an isolated install, it can use the matching pinned dependencies already present in `app/`.

The browser runner serves the R3 exports directly, extracts the supplied maker HTML harness, and records actual local browser measurements and captures under the enclosing R3 delivery. It does not mount production runtime directors or establish external review, acceptance, or physical-device performance.

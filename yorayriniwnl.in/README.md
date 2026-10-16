# yorayriniwnl.in

This folder mirrors the canonical YOR WORLD application source in `app/`, with the intentional domain URL override at `src/config/public-base-url.ts`. The local Node and pnpm versions are Node 24.19.0 and pnpm 9.15.9.

The current local source candidate is PRE-G7-24, source commit `017bead7813d5ea9875b8789621b93b8a8cd00ce`, app tree `b28bf52127947dce6ad9e032d1fd0ffd2577fb47`, based on source baseline `26e87c8cd41f2745d165a74446ae1366f17f7bc1`. It reduces render calls to 56 across the required emulated captures, but fails same-tier visual parity: the desktop and mobile captures differ substantially from the frozen source. It remains a failed, unaccepted candidate. Source-bound renderer evidence is recorded in `deliveries/G7/preparation/maker-evidence/pre-g7-24/`.

This candidate is local-only, not accepted, and not deployed. Independent review and parent acceptance remain pending. See `source-delivery-manifest.json` for source identity and parity hashes.

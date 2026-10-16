# yorayriniwnl.in

This folder mirrors the canonical YOR WORLD application in `app/`, with the intentional domain URL override at `src/config/public-base-url.ts`. Local tooling for this candidate used Node 24.19.0 and pnpm 9.15.9.

## Current source candidate: PRE-G7-25

Candidate source is commit `8ff3c929030c77208d31b937dc800e6ebdd2e6a2`, app tree `385c7e967837e3a4e76e6c92c8dd19900ab99428`, based on accepted PRE-G7-22 root commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`.

The production renderer correction is source commit `3ad7e1c390cba7073229f008b38211c8e957c9dc`, app tree `202012f7d1ced70f6d5136d53d864288c52e022b`. Later source commits `bf4a4859` and `8ff3c929` only repair test harness support and close the existing Studio drawer before performance navigation; no production runtime source changed after `3ad7e1c`.

The candidate reports 59 inclusive renderer calls per required viewport (3 shadow plus 56 main) while preserving the accepted scene's triangle counts and tier. Exact-root captures match tier at desktop 1440×900 (HIGH), mobile 390×844 (MEDIUM), compact 320×600 (MEDIUM), and landscape 844×390 (HIGH). Pixel comparison is at least 99.9835% identical in every viewport. The temporary baseline measurement overlay is separately bound and produces pixel-identical output to the unmodified accepted source.

The candidate remains **unaccepted and undeployed**. The performance suite has a remaining failure: the second studio cycle stays in `LOADING` after 15 seconds while loading the optional monitor wallpaper. Other recorded local checks and this failure are preserved in `deliveries/G7/preparation/maker-evidence/pre-g7-25/REPORT.md`. Independent audit and parent acceptance remain pending. See `source-delivery-manifest.json` for the final source identity and source/mirror parity hashes.

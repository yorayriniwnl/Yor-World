# yorayriniwnl.in

This folder is the local YOR WORLD website source for `https://yorayriniwnl.in`.

## Run locally

Use Node.js `24.19.0` and pnpm `9.15.9`. From this folder:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Copy `.env.example` to `.env.local` before configuring local services. Backend-dependent features need the services documented in `.env.example`.

## Source identity and review status

The frozen accepted input is PRE-G7-11 app source commit `cfdc744f69cd257c8ac0cbaad78b8805c48f20d5`, app tree `915c26f4b9a1fa075614ea64959750f9e486187c`. PRE-G7-13 is a local maker correction based on the failed PRE-G7-12 source commit `133529868c8c7279831cbbffe35ab23178012b8c`, app tree `06f2b4ad62f8022bc4f2d410d67ffa197316e6ab`. The current source commit, app tree, and evidence commit are recorded in `deliveries/G7/preparation/maker-evidence/pre-g7-13/REPORT.md`. The manifest records mirrored source and test hashes plus the intentional `https://yorayriniwnl.in` canonical URL override.

PRE-G7-13 remains a maker candidate and is **NOT ACCEPTED**. Its evidence report records anchor measurements, color calibration, unresolved limitations, and checks. This source is **NOT DEPLOYED. G7 NOT ACCEPTED.**

# Parent integrated art review

This folder contains parent-owned browser tooling for a read-only integrated Chrome capture. It loads the exact environment and chair fixture GLBs from a named art evidence attempt, the existing resident GLB, and current runtime TypeScript modules. Lighting, exposure, camera sizing, renderer quality, and batching follow the application runtime.

The harness does not modify the public asset manifest, public model files, or application build outputs. Its server confines asset reads to application source and public model roots plus the selected art evidence root.

Run from the repository root with the chosen environment and fixture attempt names. The capture report records the selected files, source hashes, image hashes, viewport and scene diagnostics. Screenshots are stored in the captures subdirectory.

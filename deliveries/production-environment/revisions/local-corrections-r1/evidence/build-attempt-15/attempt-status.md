# Interrupted Blender export attempt 15

Status: INTERRUPTED; do not reuse this attempt root.

The PowerShell wrapper used `$ErrorActionPreference = Stop`. Blender emitted its expected `Material.use_nodes` deprecation warning on stderr immediately after the builder created this attempt directory. PowerShell treated that native stderr record as terminating before the export proceeded. The root contains no files and no GLB, render, inspection, or exit-code receipt. Empty wrapper stdout/stderr logs are preserved beside this directory. The source was not modified by Blender.

A new attempt root is required for the next export.

# Parent integrated art review — attempt 03

Read-only Chrome review of the exact frozen `build-attempt-19` environment export, `fixture-attempt-12` resident fixture, and the committed runtime source. Attempt 02 is preserved as a diagnostic capture with one `ERR_ABORTED` candidate GLB request; this attempt adds viewport context to request failures and allows additional settling time.

The server confines asset reads to project app source/public models and the selected art evidence. It does not change the public manifest or public model files. The capture records source, asset, reference, and screenshot hashes plus runtime diagnostics. The greeting capture returns the camera to HOME desktop framing before playing the greeting animation.

Run from the repository root:

```powershell
node deliveries/G7/local-corrections/coordination/attempt-20261012T-integrated-art-review-03/server.cjs 3156 build-attempt-19 fixture-attempt-12
```

In a second shell:

```powershell
node deliveries/G7/local-corrections/coordination/attempt-20261012T-integrated-art-review-03/capture.cjs build-attempt-19 fixture-attempt-12 http://127.0.0.1:3156
```

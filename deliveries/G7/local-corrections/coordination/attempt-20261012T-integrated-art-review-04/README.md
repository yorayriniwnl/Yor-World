# Parent integrated art review — attempt 04

Read-only Chrome review of the exact frozen `build-attempt-19` environment export, `fixture-attempt-12` resident fixture, and committed runtime source. Attempts 02/03 are preserved with their request-abort diagnostics. This attempt logs each browser request and response status with viewport and request ID to determine whether the observed `ERR_ABORTED` is a missing asset or a canceled duplicate fetch.

The server confines asset reads to app source/public models and the selected art evidence. It does not change the public manifest or public model files. The greeting capture returns the camera to HOME desktop framing before playing the greeting animation.

Run from the repository root:

```powershell
node deliveries/G7/local-corrections/coordination/attempt-20261012T-integrated-art-review-04/server.cjs 3157 build-attempt-19 fixture-attempt-12
```

In a second shell:

```powershell
node deliveries/G7/local-corrections/coordination/attempt-20261012T-integrated-art-review-04/capture.cjs build-attempt-19 fixture-attempt-12 http://127.0.0.1:3157
```

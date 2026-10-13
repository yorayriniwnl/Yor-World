# Parent integrated art review — attempt 02

Read-only Chrome review of the exact frozen `build-attempt-19` environment export, `fixture-attempt-12` resident fixture, and the committed runtime source in this worktree. It preserves the previous attempt and uses a separate capture folder.

The server reads only project app source/model files and the selected candidate evidence. It does not change the public manifest or public model files. The capture records source, asset, reference, and screenshot hashes plus runtime diagnostics.

Run from the repository root:

```powershell
node deliveries/G7/local-corrections/coordination/attempt-20261012T-integrated-art-review-02/server.cjs 3155 build-attempt-19 fixture-attempt-12
```

In a second shell:

```powershell
node deliveries/G7/local-corrections/coordination/attempt-20261012T-integrated-art-review-02/capture.cjs build-attempt-19 fixture-attempt-12 http://127.0.0.1:3155
```

The greeting capture first returns the camera to the HOME desktop framing before playing the greeting animation. The prior attempt's greeting frame duplicated the scanner frame and is not used as greeting evidence.

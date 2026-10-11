# Audit method and scope notes

- Reviewed only exact candidate `7936fa981a24fe4af834ff250ffec8a7b02b09b3`, based on exact R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`.
- Package verification ran in a detached candidate worktree and matched all 198 stable outputs plus the committed manifest to raw Git blobs.
- Replayed from a separate exact candidate archive with a depth-1 R3 Git object. The old `2cc4419...` collision commit was absent; the old R4 root and eleven unknown R1 files were not read.
- The final replay runner lived only in `.work/`. It was adjusted to avoid opening the collision snapshot and to omit the maker's input-binding script in the isolated repository. A separate verifier checked all 28 declared inputs against their named Git blob paths; it did not read collision artifacts.
- The first source-patch replay attempt hit Windows' path-length limit. The scratch-only rerun enabled Git `core.longpaths=true` and all 11 executed checks passed. No candidate bytes were changed.
- Four fresh replay captures were inspected alongside all 21 capture records: desktop home, PC exterior, the supplemental PC exterior with only `Project_Effects_Root` hidden, and window exterior.
- This is a Parent-local audit recommendation. External GPT Plus #2 and final Parent acceptance remain separate.

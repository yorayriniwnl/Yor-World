# UI raw evidence recovery

Parent identified that commit `da873a605e7a259b33d64ab38c471b7e3653ea60` reused `ui/raw`: it replaced the browser JSON and last-run receipt, removed earlier failure artifacts and added newer screenshots. This violated the requirement to retain earlier attempts. Neither output establishes independent acceptance.

The complete on-disk `ui/raw` tree observed at `d16e073` was copied, before recovery, to `archive-overwritten-da873a6-attempt-01/`. That exclusive archive preserves the newer results and screenshots; `inventory.json` records their actual bytes and SHA-256. These are the files referenced by `report-checkpoint-02.md`; its original report is retained unchanged. Its generic raw paths should be read as references to this archive for that newer attempt, not proof of the restored historical attempt.

The tracked historical `ui/raw` tree was then recovered from exact Git source `da873a6^` (`619563a` is an earlier UI source commit, not necessarily this recovered tree's parent identity). Recovered original failures remain failures. Newer screenshots removed from their historical locations by recovery remain in the archive. No browser suite was rerun during recovery, and no historical result was relabeled as a PASS.

The preview runner now requires `UI_RUN_DIR`, rejects historical `raw`, rejects existing attempts, and reserves a new directory before Playwright writes output. Future attempts must use distinct child directories. Checkpoint 02 remains a maker report and is superseded for final-source verification by fresh combined tests and independent review.

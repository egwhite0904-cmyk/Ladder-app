# Ladder App (Baseline, fix)

This is the simple baseline (no charts) with:
- Add/Replace Asset
- 3 rungs (baseline) / 20 rows
- Toggle-like sections per asset (each asset renders as its own block)
- Local auto-save (localStorage)
- CSV export (baseline example)

If you see only **"Ladder App"** and a blank page, it means `app.js` wasn't loading.
This bundle sets explicit filenames and adds a footer that says "JS loaded" when the script runs.

**Deploy**: upload *all* files to the repo root and ensure GitHub Pages uses `main` + `(root)`.
Then open your site with `?v=3` to bust cache.

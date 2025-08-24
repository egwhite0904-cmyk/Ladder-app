Ladder App — baseline (accordion, no dates)
=================================================

This is the simple, stable version you had working earlier:
- Multi-asset with **accordion toggle** per asset
- Basic columns only: Planned Buy, Planned Sell, Profit/Share, Planned Shares, Planned Total
- Preset locked %:
  * Sells: +2.5%, +4.5%, +7% (+10% if 4 rungs is selected)
  * Buybacks: 1%, 2.5%, 3.5%, 5%
- 20 cycles
- Row 1 buy equals Start Price; each next row:
    nextBuy = prevSell × (1 − buyback%)
    sell    = buy × (1 + sell%)
- Auto-saves to localStorage
- Export CSV button

Files
-----
- index.html
- styles.css
- app.js
- ladder.svg (header icon)

Deploy
------
Upload ALL files to your GitHub repo (root). GitHub Pages should point to that repo’s **/ (root)** on branch **main**.
Then open: https://YOUR_USER.github.io/YOUR_REPO_NAME/


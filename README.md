# Ladder App (Accordion + Dates)

- Accordion toggle per asset
- Buy Date & Sell Date columns
- Rungs selector (2/3/4)
- Row 1 Planned Buy equals Start Price; following rows use: `nextBuy = prevSell × (1 − buyback%)`, `sell = buy × (1 + sell%)`
- Auto-save to localStorage on input
- Export CSV for Excel
- Backup/Restore JSON

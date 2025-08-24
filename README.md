# Ladder App (v2)

- Toggle/accordion per asset
- 2 / 3 / 4 rung presets
- Wide, right-aligned inputs that show full dollar amounts on mobile
- Buy Date and Sell Date columns
- Auto-save to localStorage
- Export CSV (Excel)
- Backup/Restore JSON

Math:
- Row 1 Planned Buy = Start Price.
- Each subsequent row uses:
  - `nextBuy = prevSell × (1 − buyback%)`
  - `sell = buy × (1 + sell%)`
- Profit/Share and Planned Total recalc live on edits.
- Cum Realized = running sum of the “Realized P/L” you enter in each rung.

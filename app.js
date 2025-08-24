// Ladder App v2 – accordion + rungs 2/3/4 + dates + autosave + wide inputs
(() => {
  const byId = (id) => document.getElementById(id);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const SELL_PRESETS = {
    2: [2.5, 4.5],
    3: [2.5, 4.5, 7.0],
    4: [2.5, 4.5, 7.0, 10.0],
  };
  const BUYBACK_PRESETS = {
    2: [1.0, 2.5],
    3: [1.0, 2.5, 3.5],
    4: [1.0, 2.5, 3.5, 5.0],
  };
  const ROWS = 20;

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem('ladder_state_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { assets: [] };
  }
  function saveState() {
    localStorage.setItem('ladder_state_v2', JSON.stringify(state));
    setReady(true);
  }
  function setReady(ok) {
    const pill = byId('autosave-pill');
    pill.textContent = ok ? 'saved' : '...';
    pill.className = 'pill ' + (ok ? 'pill-ok' : '');
    if (ok) setTimeout(() => { pill.textContent = 'ready'; }, 800);
  }

  function fmt(n) {
    if (n === '' || n == null || isNaN(n)) return '';
    return Number(n).toFixed(2);
  }

  function buildRows(start, sellPct, buybackPct, defaultShares) {
    const rows = [];
    let buy = Number(start);
    for (let i = 0; i < ROWS; i++) {
      const sell = buy * (1 + sellPct/100);
      const profit = sell - buy;
      rows.push({
        idx: i+1,
        buy: +fmt(buy),
        sell: +fmt(sell),
        profit: +fmt(profit),
        shares: defaultShares,
        total: +fmt(profit * defaultShares),
        buyDate: '',
        sellDate: '',
        realized: '',
        cum: ''
      });
      buy = sell * (1 - buybackPct/100);
    }
    return rows;
  }

  function addOrReplaceAsset(ticker, rungs, start, defaultShares) {
    // Use rung-specific sell/buyback from presets
    const sellPercents = SELL_PRESETS[rungs];
    const buybackPercents = BUYBACK_PRESETS[rungs];
    const ladders = sellPercents.map((sp, i) => ({
      name: `Rung ${i+1}`,
      sellPct: sp,
      buybackPct: buybackPercents[i] ?? buybackPercents[buybackPercents.length-1],
      rows: buildRows(start, sp, buybackPercents[i] ?? buybackPercents[0], defaultShares)
    }));

    // Replace if ticker exists (case-insensitive), else push
    const ix = state.assets.findIndex(a => a.ticker.toLowerCase() === ticker.toLowerCase());
    const asset = { ticker, start: Number(start), rungs, defaultShares, ladders };
    if (ix >= 0) state.assets[ix] = asset; else state.assets.push(asset);
    saveState();
    render();
  }

  function recalcPlannedTotals(asset) {
    asset.ladders.forEach(l => {
      l.rows.forEach(row => {
        const profit = Number(row.sell) - Number(row.buy);
        row.profit = +fmt(profit);
        row.total = +fmt(profit * Number(row.shares || 0));
      });
    });
  }

  function render() {
    const wrap = byId('assets');
    wrap.innerHTML = '';
    state.assets.forEach((asset, aIdx) => {
      const node = renderAsset(asset, aIdx);
      wrap.appendChild(node);
    });
  }

  function renderAsset(asset, aIdx) {
    const tpl = byId('assetTpl');
    const el = tpl.content.firstElementChild.cloneNode(true);

    el.querySelector('.chip-name').textContent = asset.ticker;
    el.querySelector('.chip-rungs').textContent = `${asset.rungs} rung(s)`;
    el.querySelector('.chip-start').textContent = `start ${fmt(asset.start)}`;

    // show rung 1 chips initially
    el.querySelector('.chip-sell').textContent = `Sell +${asset.ladders[0].sellPct}%`;
    el.querySelector('.chip-buyback').textContent = `Buyback ${asset.ladders[0].buybackPct}%`;

    const tbody = el.querySelector('tbody');
    // default to Rung 1 shown; others appended below separated by headings
    asset.ladders.forEach((l, li) => {
      const heading = document.createElement('tr');
      heading.className = 'rung-h';
      heading.innerHTML = `<td class="cell-idx"></td>
        <td colspan="9"><b>${asset.ticker} — ${l.name}</b> · Sell +${l.sellPct}% · Buyback ${l.buybackPct}%</td>`;
      tbody.appendChild(heading);

      l.rows.forEach((r, ri) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="cell-idx">${r.idx}</td>
          <td class="cell"><input type="number" step="0.01" value="${fmt(r.buy)}" data-k="buy"></td>
          <td class="cell"><input type="number" step="0.01" value="${fmt(r.sell)}" data-k="sell"></td>
          <td class="cell cell-num">$${fmt(r.profit)}</td>
          <td class="cell"><input type="number" step="1" min="0" value="${r.shares}" data-k="shares" class="small"></td>
          <td class="cell cell-num">$${fmt(r.total)}</td>
          <td class="cell"><input type="date" value="${r.buyDate||''}" data-k="buyDate" class="cell-date"></td>
          <td class="cell"><input type="date" value="${r.sellDate||''}" data-k="sellDate" class="cell-date"></td>
          <td class="cell"><input type="number" step="0.01" value="${r.realized||''}" data-k="realized" class="cell-num"></td>
          <td class="cell cell-num">$${fmt(r.cum)}</td>`;
        // attach listeners
        $$('input', tr).forEach(inp => {
          inp.addEventListener('input', () => {
            const k = inp.dataset.k;
            let v = inp.value;
            if (k === 'buy' || k === 'sell' || k === 'shares' || k === 'realized') {
              v = v === '' ? '' : Number(v);
            }
            r[k] = v;
            // recompute dependent fields
            r.profit = +fmt(Number(r.sell) - Number(r.buy));
            r.total  = +fmt((Number(r.sell) - Number(r.buy)) * Number(r.shares||0));
            // cumulative realized within the ladder
            const ladder = asset.ladders[li];
            let cum = 0;
            ladder.rows.forEach((rr, j) => {
              cum += Number(rr.realized || 0);
              rr.cum = +fmt(cum);
            });
            recalcPlannedTotals(asset);
            saveState();
            render(); // quick re-render keeps it simple
          });
        });
        tbody.appendChild(tr);
      });
    });

    // actions
    el.querySelector('.btn-delete').addEventListener('click', () => {
      state.assets.splice(aIdx, 1);
      saveState(); render();
    });
    el.querySelector('.btn-toggle').addEventListener('click', () => {
      el.classList.toggle('collapsed');
    });

    return el;
  }

  // Add/Replace
  byId('btnAdd').addEventListener('click', () => {
    const t = byId('inTicker').value.trim();
    const r = Number(byId('inRungs').value);
    const s = Number(byId('inStart').value);
    const sh = Number(byId('inShares').value || 1);
    if (!t || isNaN(s)) return;
    addOrReplaceAsset(t, r, s, sh);
    // Clear inputs minimally
    byId('inTicker').value = '';
  });

  // Export CSV of all assets
  byId('btnExport').addEventListener('click', () => {
    const rows = [];
    state.assets.forEach(a => {
      a.ladders.forEach(l => {
        l.rows.forEach(r => {
          rows.push({
            Ticker: a.ticker,
            Rung: l.name,
            Start: a.start,
            PlannedBuy: r.buy,
            PlannedSell: r.sell,
            ProfitPerShare: r.profit,
            PlannedShares: r.shares,
            PlannedTotal: r.total,
            BuyDate: r.buyDate,
            SellDate: r.sellDate,
            RealizedPL: r.realized,
            CumRealized: r.cum
          });
        });
      });
    });
    const csv = toCSV(rows);
    downloadText(csv, 'ladder_export.csv');
  });

  // Backup/restore/clear
  byId('btnSave').addEventListener('click', () => {
    downloadText(JSON.stringify(state, null, 2), 'ladder_backup.json');
  });
  byId('btnRestore').addEventListener('click', async () => {
    const file = await pickFile('.json');
    if (!file) return;
    const txt = await file.text();
    try {
      state = JSON.parse(txt);
      saveState(); render();
    } catch (e) { alert('Invalid JSON'); }
  });
  byId('btnClear').addEventListener('click', () => {
    if (!confirm('Clear all data on this device?')) return;
    state = { assets: [] };
    saveState(); render();
  });

  // util: csv
  function toCSV(arr) {
    if (!arr.length) return '';
    const cols = Object.keys(arr[0]);
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    };
    return [cols.join(','), ...arr.map(o => cols.map(k => esc(o[k])).join(','))].join('\n');
  }
  function downloadText(text, filename) {
    const blob = new Blob([text], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function pickFile(accept) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      if (accept) inp.accept = accept;
      inp.addEventListener('change', () => resolve(inp.files[0]));
      inp.click();
    });
  }

  // initial render
  render();
  setReady(true);

  // Simple tabs (future: charts)
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.dataset.tab;
      $$('.tabpane').forEach(p => p.classList.remove('active'));
      byId(name).classList.add('active');
    });
  });
})();

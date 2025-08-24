// Baseline Ladder App (accordion, basic columns only).
// No dates, no charts. Multi-asset with per-asset toggle. Auto-saves to localStorage.
(function () {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  const STORAGE_KEY = 'ladder_baseline_assets_v1';

  const sellPercentsByRungs = {
    2: [0.025, 0.045],          // rung1, rung2
    3: [0.025, 0.045, 0.07],    // rung1..3
    4: [0.025, 0.045, 0.07, 0.10]
  };
  const buybackPercentsByRungs = {
    2: [0.01, 0.025],
    3: [0.01, 0.025, 0.035],
    4: [0.01, 0.025, 0.035, 0.05]
  };
  const CYCLES = 20;

  const state = {
    assets: load() // [{id, name, startPrice, rungs, defaultShares, rows: [...] }]
  };

  function load() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.assets));
    $('#ready').textContent = 'saved';
    setTimeout(()=>$('#ready').textContent='ready',700);
  }

  // Helpers
  const toNum = (v, d=0) => {
    const n = typeof v==='number' ? v : parseFloat(String(v).replace(/[^\d.-]/g,''));
    return isFinite(n) ? n : d;
  };
  const money = v => '$' + toNum(v).toFixed(2);
  const calcRows = (start, sellPct, buybackPct, cycles, defaultShares) => {
    const rows = [];
    let buy = toNum(start);
    for (let i=0;i<cycles;i++) {
      const sell = buy * (1 + sellPct);
      const profit = sell - buy;
      rows.push({
        buy: round(buy), sell: round(sell),
        profit: round(profit),
        shares: toNum(defaultShares, 1),
      });
      buy = sell * (1 - buybackPct); // next cycle's buy
    }
    return rows;
  };
  const round = (n) => Math.round(n*100)/100;

  function buildAsset({name, startPrice, rungs, defaultShares}) {
    const id = name.trim().toUpperCase();
    const sells = sellPercentsByRungs[rungs];
    const buys  = buybackPercentsByRungs[rungs];
    const r = [];
    for (let i=0;i<rungs;i++) {
      r.push({
        rung: i+1,
        sellPct: sells[i],
        buybackPct: buys[i],
        rows: calcRows(startPrice, sells[i], buys[i], CYCLES, defaultShares)
      });
    }
    return { id, name: id, startPrice: toNum(startPrice), rungs, defaultShares: toNum(defaultShares,1), rungsData: r, open: true };
  }

  // UI wiring
  function render() {
    const wrap = $('#assets');
    wrap.innerHTML = '';
    if (state.assets.length===0) {
      wrap.innerHTML = '<div class="card" style="text-align:center;color:#6a737d">No assets yet.</div>';
      return;
    }
    state.assets.forEach(asset => wrap.appendChild(renderAssetCard(asset)));
  }

  function renderAssetCard(asset) {
    const card = document.createElement('section');
    card.className = 'card assets-card';
    card.dataset.id = asset.id;

    const head = document.createElement('div');
    head.className = 'asset-head';
    const metas = document.createElement('div'); metas.className = 'asset-metas';
    metas.innerHTML = `<span class="badge">${asset.name}</span>
      <span class="badge">${asset.rungs} rung(s)</span>
      <span class="badge">start ${money(asset.startPrice)}</span>`;
    const actions = document.createElement('div'); actions.className = 'asset-actions';
    const toggleBtn = btn('Toggle', 'toggle');
    const rebuildBtn = btn('Build Ladder');
    const delBtn = btn('Delete Ladder','danger');
    actions.append(toggleBtn, rebuildBtn, delBtn);

    head.append(metas, actions);
    card.appendChild(head);

    const body = document.createElement('div');
    body.style.display = asset.open ? 'block' : 'none';
    body.appendChild(renderRungs(asset));
    card.appendChild(body);

    // Events
    toggleBtn.onclick = () => { asset.open = !asset.open; body.style.display = asset.open?'block':'none'; save(); };
    rebuildBtn.onclick = () => { rebuild(asset); body.innerHTML=''; body.appendChild(renderRungs(asset)); save(); };
    delBtn.onclick = () => { state.assets = state.assets.filter(a=>a.id!==asset.id); save(); render(); };

    return card;
  }

  function renderRungs(asset) {
    const wrap = document.createElement('div');
    asset.rungsData.forEach(rd => {
      const section = document.createElement('div');
      section.style.marginTop = '.6rem';
      section.innerHTML = `<div class="badge">Rung ${rd.rung} • Sell +${(rd.sellPct*100).toFixed(1)}% • Buyback ${(rd.buybackPct*100).toFixed(1)}%</div>`;
      section.appendChild(renderTable(asset, rd));
      wrap.appendChild(section);
    });
    return wrap;
  }

  function renderTable(asset, rd) {
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr>
      <th>#</th>
      <th>Planned Buy</th>
      <th>Planned Sell</th>
      <th>Profit/Share</th>
      <th>Planned Shares</th>
      <th>Planned Total</th>
    </tr></thead>`;
    const tb = document.createElement('tbody');
    rd.rows.forEach((row, idx) => {
      const tr = document.createElement('tr');

      const c1 = document.createElement('td'); c1.textContent = idx+1; tr.appendChild(c1);

      const buyTd = document.createElement('td');
      const buyIn = document.createElement('input');
      buyIn.value = row.buy.toFixed(2);
      buyIn.onchange = () => { row.buy = toNum(buyIn.value, row.buy); row.profit = round(row.sell-row.buy); totalTd.textContent = money(row.profit * row.shares); save(); };
      buyTd.appendChild(buyIn); tr.appendChild(buyTd);

      const sellTd = document.createElement('td');
      const sellIn = document.createElement('input');
      sellIn.value = row.sell.toFixed(2);
      sellIn.onchange = () => { row.sell = toNum(sellIn.value, row.sell); row.profit = round(row.sell-row.buy); totalTd.textContent = money(row.profit * row.shares); save(); };
      sellTd.appendChild(sellIn); tr.appendChild(sellTd);

      const profitTd = document.createElement('td'); profitTd.className='amount'; profitTd.textContent = money(row.profit); tr.appendChild(profitTd);

      const sharesTd = document.createElement('td');
      const sharesIn = document.createElement('input');
      sharesIn.value = String(row.shares);
      sharesIn.onchange = () => { row.shares = toNum(sharesIn.value, row.shares); totalTd.textContent = money(row.profit * row.shares); save(); };
      sharesTd.appendChild(sharesIn); tr.appendChild(sharesTd);

      const totalTd = document.createElement('td'); totalTd.className='amount'; totalTd.textContent = money(row.profit * row.shares); tr.appendChild(totalTd);

      tb.appendChild(tr);
    });
    table.appendChild(tb);
    return table;
  }

  function rebuild(asset) {
    const sells = sellPercentsByRungs[asset.rungs];
    const buys  = buybackPercentsByRungs[asset.rungs];
    asset.rungsData = sells.map((sp, i) => ({
      rung: i+1,
      sellPct: sp,
      buybackPct: buys[i],
      rows: calcRows(asset.startPrice, sp, buys[i], CYCLES, asset.defaultShares)
    }));
  }

  // Add/Replace
  $('#addAsset').onclick = () => {
    const name = $('#ticker').value.trim();
    const start = toNum($('#startPrice').value);
    const rungs = parseInt($('#rungs').value,10);
    const defShares = toNum($('#defaultShares').value, 1);
    if (!name || !isFinite(start)) {
      alert('Enter a ticker and a numeric start price.');
      return;
    }
    // Replace if exists
    state.assets = state.assets.filter(a => a.id !== name.toUpperCase());
    const asset = buildAsset({name, startPrice:start, rungs, defaultShares:defShares});
    state.assets.unshift(asset);
    save();
    render();
    // Clear inputs except ticker (handy when adding multiple similar)
    $('#startPrice').value = '';
  };

  // Export CSV of the currently visible assets (basic columns)
  $('#exportAll').onclick = () => {
    if (!state.assets.length) { alert('No data'); return; }
    const rows = [['Asset','Rung','#','Planned Buy','Planned Sell','Profit/Share','Planned Shares','Planned Total']];
    state.assets.forEach(a => {
      a.rungsData.forEach(rd => {
        rd.rows.forEach((r,i)=>{
          rows.push([a.name, rd.rung, i+1, r.buy, r.sell, r.profit, r.shares, (r.profit*r.shares)]);
        });
      });
    });
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ladder_export.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };

  $('#clearAll').onclick = () => {
    if (!confirm('Clear all ladders on this device?')) return;
    state.assets = []; save(); render();
  };

  // Initial render
  render();
})();
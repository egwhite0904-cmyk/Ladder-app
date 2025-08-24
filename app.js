// Ladder App (vanilla JS) — localStorage, CSV export, accordion assets

const SELL_PRESETS = [0.025, 0.045, 0.07, 0.10]; // rung 1..4
const BUYBACK_PRESETS = [0.01, 0.025, 0.035, 0.05]; // rung 1..4
const MAX_CYCLES = 20;

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const state = {
  assets: [] // { id, symbol, start, rungs, defaultShares, rows: [{buy,sell,profit,shares,total}], collapsed: false }
};

function save() {
  localStorage.setItem('ladder_app_v3', JSON.stringify(state));
  $('#status').textContent = 'saved';
  setTimeout(() => $('#status').textContent = 'ready', 800);
}

function load() {
  const raw = localStorage.getItem('ladder_app_v3');
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.assets)) {
        state.assets = s.assets;
      }
    } catch {}
  }
}

function dollars(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function buildRows(start, rungIdx, defaultShares) {
  const rows = [];
  const sellPct = SELL_PRESETS[rungIdx];
  const buyPct = BUYBACK_PRESETS[rungIdx];

  let buy = Number(start);
  for (let i=1; i<=MAX_CYCLES; i++) {
    const sell = buy * (1 + sellPct);
    const profit = sell - buy;
    const shares = defaultShares ?? 1;
    const total = profit * shares;

    rows.push({
      cycle: i,
      buy: Number(dollars(buy)),
      sell: Number(dollars(sell)),
      profit: Number(dollars(profit)),
      shares,
      total: Number(dollars(total))
    });

    // next row
    buy = sell * (1 - buyPct);
  }
  return rows;
}

function upsertAsset(symbol, rungs, start, defaultShares) {
  const id = symbol.toUpperCase().trim();
  const i = state.assets.findIndex(a => a.id === id);
  const base = {
    id, symbol: id, start: Number(start), rungs: Number(rungs),
    defaultShares: Number(defaultShares) || 1, collapsed: false, ladders: []
  };
  base.ladders = [];
  for (let r=0; r<Number(rungs); r++) {
    base.ladders.push({
      rung: r+1,
      sellPct: SELL_PRESETS[r],
      buyPct: BUYBACK_PRESETS[r],
      rows: buildRows(start, r, base.defaultShares)
    });
  }
  if (i >= 0) state.assets[i] = base; else state.assets.unshift(base);
  save();
  render();
}

function deleteAsset(id) {
  state.assets = state.assets.filter(a => a.id !== id);
  save(); render();
}

function toggleAsset(id) {
  const a = state.assets.find(x => x.id === id);
  if (!a) return;
  a.collapsed = !a.collapsed;
  save(); render();
}

function exportCSV() {
  // Flatten to rows
  const lines = [];
  lines.push(['Ticker','Rung','Cycle','Planned Buy','Planned Sell','Profit/Share','Planned Shares','Planned Total'].join(','));
  state.assets.forEach(a => {
    a.ladders.forEach(l => {
      l.rows.forEach(row => {
        lines.push([a.symbol, l.rung, row.cycle, row.buy, row.sell, row.profit, row.shares, row.total].join(','));
      });
    });
  });
  const csv = lines.join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ladder_export.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function backupJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ladder_backup.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function restoreJSON() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        if (s && Array.isArray(s.assets)) {
          state.assets = s.assets;
          save(); render();
        } else { alert('Invalid backup JSON'); }
      } catch { alert('Could not parse JSON'); }
    };
    reader.readAsText(file);
  };
  inp.click();
}

// ---------- Rendering ----------
function render() {
  const $assets = $('#assets');
  $assets.innerHTML = '';
  const tmpl = $('#assetTemplate');

  state.assets.forEach(asset => {
    const node = tmpl.content.cloneNode(true);
    node.querySelector('.asset-title').textContent = asset.symbol;
    node.querySelector('.badge.rungs').textContent = `${asset.rungs} rung(s)`;
    node.querySelector('.badge.start').textContent = `start $${dollars(asset.start)}`;
    node.querySelector('.sellPerc').textContent = SELL_PRESETS.slice(0,asset.rungs).map(p=>`+${(p*100).toFixed(1)}%`).join(', ');
    node.querySelector('.buyPerc').textContent = BUYBACK_PRESETS.slice(0,asset.rungs).map(p=>`${(p*100).toFixed(1)}%`).join(', ');

    // Accordion
    const body = node.querySelector('.asset-body');
    const toggleBtn = node.querySelector('.accordion-toggle');
    toggleBtn.addEventListener('click', () => toggleAsset(asset.id));
    if (asset.collapsed) body.style.display = 'none';

    // Delete
    node.querySelector('.delete').addEventListener('click', () => {
      if (confirm(`Delete ${asset.symbol}?`)) deleteAsset(asset.id);
    });

    // Renders only rung 1 table for now (keeps DOM lighter on mobile)
    const tableBody = node.querySelector('tbody');
    const rung1 = asset.ladders[0];
    node.querySelector('.sellTag').textContent = `Sell +${(rung1.sellPct*100).toFixed(1)}%`;
    node.querySelector('.buyTag').textContent = `Buyback ${(rung1.buyPct*100).toFixed(1)}%`;
    node.querySelectorAll('.asset-name').forEach(el=>el.textContent = asset.symbol);

    rung1.rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.cycle}</td>
        <td><input value="${row.buy.toFixed(2)}" /></td>
        <td><input value="${row.sell.toFixed(2)}" /></td>
        <td>$${row.profit.toFixed(2)}</td>
        <td><input value="${row.shares}" /></td>
        <td>$${row.total.toFixed(2)}</td>
      `;
      tableBody.appendChild(tr);
    });

    $assets.appendChild(node);
  });
}

function wire() {
  // Tabs
  $$('.tab').forEach(btn => btn.addEventListener('click', () => {
    $$('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $$('.tabpane').forEach(p=>p.classList.remove('active'));
    $('#'+tab).classList.add('active');
  }));

  $('#addAsset').addEventListener('click', () => {
    const t = $('#ticker').value.trim();
    const r = $('#rungs').value;
    const s = $('#startPrice').value;
    const d = $('#defaultShares').value || 1;
    if (!t) return alert('Enter a ticker / name');
    if (!s) return alert('Enter a start price');
    upsertAsset(t, r, s, d);
    $('#ticker').value='';
  });

  $('#exportCsv').addEventListener('click', exportCSV);
  $('#saveBackup').addEventListener('click', backupJSON);
  $('#restoreBackup').addEventListener('click', restoreJSON);
  $('#clearAll').addEventListener('click', () => {
    if (confirm('Clear all data saved on this device?')) {
      state.assets = []; save(); render();
    }
  });
}

// Boot
load();
wire();
render();

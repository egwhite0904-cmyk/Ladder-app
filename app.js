(() => {
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  const SELL_STEPS = [0.025, 0.045, 0.07, 0.10];
  const BUYBACK_STEPS = [0.01, 0.025, 0.035, 0.05];
  const CYCLES = 20;

  const els = {
    ticker: $('#ticker'),
    rungs: $('#rungs'),
    startPrice: $('#startPrice'),
    defaultShares: $('#defaultShares'),
    add: $('#addAsset'),
    save: $('#saveBackup'),
    restore: $('#restoreBackup'),
    exportCsv: $('#exportCsv'),
    clear: $('#clearAll'),
    assets: $('#assets'),
    status: $('#status'),
    footStatus: $('#footStatus')
  };

  const storeKey = 'ladder_assets_v2';

  const load = () => {
    try {
      const raw = localStorage.getItem(storeKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  };
  const save = (assets) => localStorage.setItem(storeKey, JSON.stringify(assets));

  function buildRows(start, rungIdx, shares) {
    const sellPct = SELL_STEPS[rungIdx];
    const buybackPct = BUYBACK_STEPS[rungIdx];
    const rows = [];
    let buy = Number(start);
    for (let i=0;i<CYCLES;i++){
      const sell = buy * (1 + sellPct);
      rows.push({
        buy: Number(buy.toFixed(2)),
        sell: Number(sell.toFixed(2)),
        profit: Number((sell - buy).toFixed(2)),
        shares
      });
      buy = sell * (1 - buybackPct);
    }
    return rows;
  }

  function buildAsset(ticker, startPrice, rungs, defShares) {
    const rungCount = Number(rungs);
    const data = [];
    for (let r=0;r<rungCount;r++){
      data.push(buildRows(startPrice, r, Number(defShares || 1)));
    }
    return { id: Date.now()+Math.random().toString(16).slice(2), ticker, startPrice: Number(startPrice), rungs: rungCount, shares: Number(defShares||1), data };
  }

  function render() {
    const assets = load();
    els.assets.innerHTML = '';
    assets.forEach(asset => {
      els.assets.appendChild(renderAssetCard(asset));
    });
  }

  function renderAssetCard(asset) {
    const card = document.createElement('section');
    card.className = 'asset-card card';
    card.dataset.id = asset.id;

    const head = document.createElement('div');
    head.className = 'asset-head';

    const meta = document.createElement('div');
    meta.className = 'asset-meta';
    meta.innerHTML = `
      <span class="pill">${asset.ticker}</span>
      <span class="pill">${asset.rungs} rung(s)</span>
      <span class="pill">start ${fmt(asset.startPrice)}</span>
    `;

    const headBtns = document.createElement('div');
    headBtns.innerHTML = `
      <button class="btn small" data-action="toggle">Toggle</button>
      <button class="btn small danger" data-action="delete">Delete</button>
    `;

    head.append(meta, headBtns);

    const body = document.createElement('div');
    body.className = 'asset-body';
    body.appendChild(renderRungs(asset));

    card.append(head, body);

    headBtns.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'toggle'){
        body.classList.toggle('hidden');
      } else if (action === 'delete'){
        const assets = load().filter(a => a.id !== asset.id);
        save(assets);
        render();
      }
    });

    return card;
  }

  function renderRungs(asset){
    const wrap = document.createElement('div');
    asset.data.forEach((rows, rIdx) => {
      const section = document.createElement('div');
      section.style.marginTop = '8px';
      const title = document.createElement('div');
      title.innerHTML = `<strong>${asset.ticker} — Rung ${rIdx+1}</strong> <span class="pill">Sell +${(SELL_STEPS[rIdx]*100).toFixed(1)}%</span> <span class="pill">Buyback ${(BUYBACK_STEPS[rIdx]*100).toFixed(1)}%</span>`;
      section.appendChild(title);

      const table = document.createElement('table');
      table.className = 'table';
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr>
        <th>#</th>
        <th>Planned Buy</th>
        <th>Planned Sell</th>
        <th>Profit/Share</th>
        <th>Planned Shares</th>
        <th>Planned Total</th>
      </tr>`;
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      rows.forEach((row, i) => {
        const tr = document.createElement('tr');
        const total = (row.profit * row.shares).toFixed(2);
        tr.innerHTML = `
          <td>${i+1}</td>
          <td class="cell"><input value="${row.buy.toFixed(2)}"></td>
          <td class="cell"><input value="${row.sell.toFixed(2)}"></td>
          <td>${fmt(row.profit)}</td>
          <td class="cell"><input value="${row.shares}"></td>
          <td>${fmt(total)}</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      section.appendChild(table);
      wrap.appendChild(section);
    });
    return wrap;
  }

  // Buttons
  els.add.addEventListener('click', () => {
    const ticker = (els.ticker.value || '').trim();
    const start = parseFloat(els.startPrice.value);
    const rungs = parseInt(els.rungs.value, 10);
    const shares = parseInt(els.defaultShares.value || '1', 10);
    if (!ticker || !(start>0)) {
      alert('Enter ticker and a valid start price.'); return;
    }
    // Add new OR replace same-ticker
    let assets = load().filter(a => a.ticker.toLowerCase() !== ticker.toLowerCase());
    assets.unshift(buildAsset(ticker.toUpperCase(), start, rungs, shares));
    save(assets);
    render();
    document.getElementById('status').textContent = 'saved';
    setTimeout(()=>document.getElementById('status').textContent='ready',1200);
  });

  els.clear.addEventListener('click', () => {
    if (confirm('Clear all ladders on this device?')){
      localStorage.removeItem(storeKey);
      render();
    }
  });

  els.save.addEventListener('click', () => {
    const data = JSON.stringify(load(), null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ladder_backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  els.restore.addEventListener('click', async () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = () => {
      const file = inp.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arr = JSON.parse(reader.result);
          if (Array.isArray(arr)) { save(arr); render(); }
        } catch {}
      };
      reader.readAsText(file);
    };
    inp.click();
  });

  els.exportCsv.addEventListener('click', () => {
    const assets = load();
    const lines = ['Ticker,Rung,Row,Planned Buy,Planned Sell,Profit/Share,Planned Shares,Planned Total'];
    assets.forEach(a => {
      a.data.forEach((rows,rIdx) => {
        rows.forEach((row,i) => {
          const total = (row.profit * row.shares).toFixed(2);
          lines.push([a.ticker, rIdx+1, i+1, row.buy.toFixed(2), row.sell.toFixed(2), row.profit.toFixed(2), row.shares, total].join(','));
        });
      });
    });
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ladders.csv';
    a.click(); URL.revokeObjectURL(a.href);
  });

  // initial
  render();
})();
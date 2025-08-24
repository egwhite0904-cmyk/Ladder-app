(function(){
  const LS_KEY = 'ladder_app_v2_data';
  const assetsEl = document.getElementById('assets');
  const addBtn = document.getElementById('addAsset');
  const saveBtn = document.getElementById('saveJson');
  const restoreBtn = document.getElementById('restoreJson');
  const exportBtn = document.getElementById('exportCsv');
  const clearBtn = document.getElementById('clearAll');

  const $ = sel => document.querySelector(sel);

  function load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { assets: [] };
    }catch(e){ return { assets: [] }; }
  }
  function save(state){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

  function presetsByRungs(rungs){
    // fixed presets per rung index
    const sell =   [0.025, 0.045, 0.070, 0.10];
    const buyback=[0.010, 0.025, 0.035, 0.05];
    return {sell: sell.slice(0, rungs), buyback: buyback.slice(0, rungs)};
  }

  function buildRows(start, rungs, defaultShares){
    const rowsPerRung = 20;
    const {sell, buyback} = presetsByRungs(rungs);
    const all = [];
    for(let rung=0;rung<rungs;rung++){
      const sPct = sell[rung], bPct = buyback[rung];
      let buy = start; // row1 buy equals start
      for(let i=1;i<=rowsPerRung;i++){
        const sellPrice = +(buy * (1 + sPct)).toFixed(2);
        all.push({
          rung: rung+1, row: i,
          buy: +buy.toFixed(2),
          sell: sellPrice,
          shares: defaultShares,
          profit: +(sellPrice - buy).toFixed(2), // per share
          plannedTotal: +((sellPrice - buy) * defaultShares).toFixed(2),
          buyDate: '', sellDate: ''
        });
        // next row buy uses previous row sell discounted by buyback%
        const nextBuy = sellPrice * (1 - bPct);
        buy = nextBuy;
      }
    }
    return all;
  }

  function addOrReplaceAsset(state, ticker, rungs, startPrice, defaultShares){
    // replace if ticker exists
    const idx = state.assets.findIndex(a => a.ticker.toLowerCase() === ticker.toLowerCase());
    const rows = buildRows(startPrice, rungs, defaultShares);
    const cardState = {collapsed:false};
    const asset = {ticker, rungs, startPrice, defaultShares, rows, ui:cardState};
    if(idx >= 0) state.assets[idx] = asset; else state.assets.unshift(asset);
    save(state);
    render(state);
  }

  function fmtMoney(v){
    if (v === '' || v === null || v === undefined) return '';
    const n = Number(v);
    if (isNaN(n)) return '';
    return '$' + n.toFixed(2);
  }

  function cellNum(val, onChange, small=false){
    const td = document.createElement('td'); td.className='cell' + (small?' small':'');
    const inp = document.createElement('input'); inp.type='number'; inp.step='0.01'; inp.value = val;
    inp.addEventListener('change', e => onChange(Number(inp.value)));
    td.appendChild(inp); return td;
  }
  function cellText(val, onChange){
    const td = document.createElement('td'); td.className='cell';
    const inp = document.createElement('input'); inp.type='text'; inp.value = val || '';
    inp.addEventListener('change', e => onChange(inp.value));
    td.appendChild(inp); return td;
  }
  function tdText(text, cls=''){ const td=document.createElement('td'); if(cls) td.className=cls; td.textContent=text; return td; }

  function render(state){
    assetsEl.innerHTML = '';
    if(!state.assets.length){
      const empty = document.createElement('p');
      empty.textContent = 'No assets yet. Add one above.';
      assetsEl.appendChild(empty);
      return;
    }
    state.assets.forEach((asset, aidx) => {
      const card = document.createElement('div'); card.className='card';
      const head = document.createElement('div'); head.className='cardHead';
      const left = document.createElement('div');
      left.innerHTML = `
        <span class="badge">${asset.ticker}</span>
        <span class="badge">${asset.rungs} rung(s)</span>
        <span class="badge">start ${fmtMoney(asset.startPrice)}</span>
        <span class="badge">Sell +${(presetsByRungs(asset.rungs).sell[0]*100).toFixed(1)}% …</span>
        <span class="badge">Buyback ${(presetsByRungs(asset.rungs).buyback[0]*100).toFixed(1)}% …</span>
      `;
      const spacer = document.createElement('div'); spacer.className='spacer';
      const btns = document.createElement('div'); btns.className='cardBtns';
      const toggle = document.createElement('button'); toggle.textContent = 'Toggle';
      const del = document.createElement('button'); del.textContent = 'Delete'; del.className='danger';
      btns.append(toggle, del);
      head.append(left, spacer, btns);

      const body = document.createElement('div'); body.className='cardBody' + (asset.ui?.collapsed?' collapsed':'');

      // table
      const tbl = document.createElement('table'); tbl.className='table';
      const thead = document.createElement('thead'); const thr = document.createElement('tr');
      ['#','Planned Buy','Planned Sell','Profit/Share','Planned Shares','Planned Total','Buy Date','Sell Date']
        .forEach(h => { const th=document.createElement('th'); th.textContent=h; thr.appendChild(th); });
      thead.appendChild(thr); tbl.appendChild(thead);
      const tbody = document.createElement('tbody');

      asset.rows.forEach((r, ridx) => {
        const tr = document.createElement('tr');
        tr.appendChild( tdText(String(r.row),'right') );
        tr.appendChild( cellNum(r.buy, v => { r.buy = v; r.profit=+(r.sell - r.buy).toFixed(2); r.plannedTotal=+((r.sell-r.buy)*r.shares).toFixed(2); save(state); render(state);} ) );
        tr.appendChild( cellNum(r.sell, v => { r.sell = v; r.profit=+(r.sell - r.buy).toFixed(2); r.plannedTotal=+((r.sell-r.buy)*r.shares).toFixed(2); save(state); render(state);} ) );
        tr.appendChild( tdText(fmtMoney(r.profit),'right') );
        tr.appendChild( cellNum(r.shares, v => { r.shares=v; r.plannedTotal=+((r.sell-r.buy)*r.shares).toFixed(2); save(state); render(state); }, true) );
        tr.appendChild( tdText(fmtMoney(r.plannedTotal),'right') );
        tr.appendChild( cellText(r.buyDate || '', v => { r.buyDate=v; save(state);} ) );
        tr.appendChild( cellText(r.sellDate || '', v => { r.sellDate=v; save(state);} ) );
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      body.appendChild(tbl);

      // wire buttons
      toggle.addEventListener('click', () => {
        asset.ui = asset.ui || {}; asset.ui.collapsed = !asset.ui.collapsed; save(state); render(state);
      });
      del.addEventListener('click', () => {
        if(confirm(`Delete ${asset.ticker}?`)){ state.assets.splice(aidx,1); save(state); render(state); }
      });

      card.append(head, body);
      assetsEl.appendChild(card);
    });
  }

  // Controls
  addBtn.addEventListener('click', () => {
    const t = $('#ticker').value.trim();
    const r = Number($('#rungs').value);
    const sp = Number($('#startPrice').value);
    const ds = Number($('#defaultShares').value || 1);
    if(!t || !sp) { alert('Enter ticker and start price'); return; }
    const state = load();
    addOrReplaceAsset(state, t, r, sp, ds);
    // clear ticker/start fields for quick next add
    $('#ticker').value=''; $('#startPrice').value='';
  });

  saveBtn.addEventListener('click', () => {
    const state = load();
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ladder_backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  restoreBtn.addEventListener('click', async () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange = async () => {
      const file = inp.files[0]; if(!file) return;
      const txt = await file.text();
      try{ const data = JSON.parse(txt); save(data); render(data);}catch(e){ alert('Bad JSON'); }
    };
    inp.click();
  });

  exportBtn.addEventListener('click', () => {
    const {assets} = load();
    let lines = ['Ticker,Rung,Row,Planned Buy,Planned Sell,Profit/Share,Planned Shares,Planned Total,Buy Date,Sell Date'];
    assets.forEach(a => {
      a.rows.forEach(r => {
        lines.push([a.ticker, r.rung, r.row, r.buy, r.sell, r.profit, r.shares, r.plannedTotal, `"${r.buyDate||''}"`, `"${r.sellDate||''}"`].join(','));
      });
    });
    const blob=new Blob([lines.join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ladder_export.csv'; a.click();
    URL.revokeObjectURL(a.href);
  });

  clearBtn.addEventListener('click', () => {
    if(confirm('Clear all data on this device?')){ localStorage.removeItem(LS_KEY); render(load()); }
  });

  // first render
  render(load());
})();
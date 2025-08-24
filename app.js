
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const LS_KEY = 'ladderApp.v2';

  const state = load() || { assets: [] };

  const startPercents = {
    sell:[0.025,0.045,0.07,0.10],
    buyback:[0.01,0.025,0.035,0.05]
  };

  // UI references
  const addBtn = $('#addAsset');
  const addPanel = $('#addPanel');
  const confirmAdd = $('#confirmAdd');
  const assetsHost = $('#assets');
  const status = $('#status');

  $('#saveBackup').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.download = 'ladder_backup.json';
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  $('#restoreBackup').onclick = async () => {
    const input = document.createElement('input');
    input.type='file';
    input.accept='application/json';
    input.onchange = async () => {
      const file = input.files[0];
      if(!file) return;
      const text = await file.text();
      try{
        const obj = JSON.parse(text);
        state.assets = obj.assets || [];
        save();
        render();
      }catch(e){ alert('Invalid JSON'); }
    };
    input.click();
  };

  $('#exportCSV').onclick = () => {
    const rows = [["Asset","Rung","Row","# Buy","# Sell","Profit/Share","Planned Shares","Planned Total","Buy Date","Sell Date"]];
    state.assets.forEach(a => {
      a.rows.forEach((r,i) => {
        rows.push([a.name, a.rungs, i+1, r.buy, r.sell, profitPerShare(r).toFixed(2), r.shares, (r.shares*profitPerShare(r)).toFixed(2), r.buyDate||"", r.sellDate||""]);
      });
    });
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.download = 'ladder_export.csv';
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  $('#clearAll').onclick = () => {
    if(confirm('Clear all ladders on this device?')){
      state.assets = [];
      save();
      render();
    }
  };

  addBtn.onclick = () => addPanel.classList.toggle('hidden');

  confirmAdd.onclick = () => {
    const name = $('#tickerInput').value.trim() || 'ASSET';
    const rungs = parseInt($('#rungsInput').value,10);
    const start = toNum($('#startInput').value);
    const shares = parseInt($('#sharesInput').value || '1', 10);
    if(!start){ alert('Enter a valid Start Price'); return; }
    const rows = buildRows(rungs, start, shares);
    // replace if exists
    const idx = state.assets.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
    const asset = {
      name, rungs, start, sharesDefault: shares,
      sellPct: startPercents.sell[rungs-1],
      buybackPct: startPercents.buyback[rungs-1],
      rows
    };
    if(idx >= 0) state.assets[idx] = asset; else state.assets.unshift(asset);
    save();
    addPanel.classList.add('hidden');
    render();
  };

  function buildRows(rungs, start, shares){
    const sellPct = startPercents.sell[rungs-1];
    const buybackPct = startPercents.buyback[rungs-1];
    const out = [];
    let buy = start;
    for(let i=0;i<20;i++){
      const sell = round2(buy * (1 + sellPct));
      out.push({ buy: round2(buy), sell, shares, buyDate:"", sellDate:"" });
      buy = round2(sell * (1 - buybackPct));
    }
    return out;
  }

  function profitPerShare(r){ return round2(r.sell - r.buy); }

  function render(){
    assetsHost.innerHTML = '';
    state.assets.forEach(a => {
      const tpl = $('#assetTemplate').content.cloneNode(true);
      const card = tpl.querySelector('.asset');
      card.dataset.name = a.name;

      card.querySelector('.chip.name').textContent = a.name;
      card.querySelector('.chip.rungs').textContent = `${a.rungs} rung(s)`;
      card.querySelector('.chip.start').textContent = `start ${fmt(a.start)}`;
      card.querySelector('.chip.sell').textContent = `Sell +${(a.sellPct*100).toFixed(1)}%`;
      card.querySelector('.chip.buyback').textContent = `Buyback ${(a.buybackPct*100).toFixed(1)}%`;

      card.querySelector('[data-action="toggle"]').onclick = () => {
        card.querySelector('.asset-body').classList.toggle('hidden');
      };
      card.querySelector('[data-action="delete"]').onclick = () => {
        if(confirm(`Delete ${a.name}?`)){
          state.assets = state.assets.filter(x => x !== a);
          save(); render();
        }
      };

      const tbody = card.querySelector('tbody');
      a.rows.forEach((r, i) => {
        const tr = document.createElement('tr');

        const tdIdx = document.createElement('td');
        tdIdx.textContent = (i+1);
        tr.appendChild(tdIdx);

        const tdBuy = document.createElement('td');
        tdBuy.className = 'cell';
        const inBuy = inputAmount(r.buy);
        inBuy.onchange = () => { r.buy = toNum(inBuy.value); save(); updateRow(tr, r, a); };
        tdBuy.appendChild(inBuy);
        tr.appendChild(tdBuy);

        const tdSell = document.createElement('td');
        tdSell.className = 'cell';
        const inSell = inputAmount(r.sell);
        inSell.onchange = () => { r.sell = toNum(inSell.value); save(); updateRow(tr, r, a); };
        tdSell.appendChild(inSell);
        tr.appendChild(tdSell);

        const tdProfit = document.createElement('td');
        tdProfit.className = 'cell';
        const roProfit = ro(fmt(profitPerShare(r)));
        tdProfit.appendChild(roProfit);
        tr.appendChild(tdProfit);

        const tdShares = document.createElement('td');
        tdShares.className = 'cell';
        const inShares = document.createElement('input');
        inShares.type='number'; inShares.step='1'; inShares.value = r.shares;
        inShares.onchange = () => { r.shares = parseInt(inShares.value||'1',10); save(); updateRow(tr, r, a); };
        tdShares.appendChild(inShares);
        tr.appendChild(tdShares);

        const tdTotal = document.createElement('td');
        tdTotal.className = 'cell';
        const roTotal = ro(fmt(r.shares * profitPerShare(r)));
        tdTotal.appendChild(roTotal);
        tr.appendChild(tdTotal);

        const tdBuyDate = document.createElement('td');
        tdBuyDate.className = 'cell';
        const inBuyDate = document.createElement('input');
        inBuyDate.type='date'; inBuyDate.className='date';
        if(r.buyDate) inBuyDate.value = r.buyDate;
        inBuyDate.onchange = () => { r.buyDate = inBuyDate.value; save(); };
        tdBuyDate.appendChild(inBuyDate);
        tr.appendChild(tdBuyDate);

        const tdSellDate = document.createElement('td');
        tdSellDate.className = 'cell';
        const inSellDate = document.createElement('input');
        inSellDate.type='date'; inSellDate.className='date';
        if(r.sellDate) inSellDate.value = r.sellDate;
        inSellDate.onchange = () => { r.sellDate = inSellDate.value; save(); };
        tdSellDate.appendChild(inSellDate);
        tr.appendChild(tdSellDate);

        tbody.appendChild(tr);
      });

      assetsHost.appendChild(card);
    });
  }

  function updateRow(tr, r, a){
    // profit cell (3rd) and total (6th)
    tr.children[3].querySelector('.ro').textContent = fmt(profitPerShare(r));
    tr.children[5].querySelector('.ro').textContent = fmt(r.shares * profitPerShare(r));
  }

  function inputAmount(v){
    const inp = document.createElement('input');
    inp.type='number'; inp.step='0.01'; inp.inputMode='decimal';
    inp.value = Number(v).toFixed(2);
    inp.className='amount';
    return inp;
  }
  function ro(text){
    const span = document.createElement('span');
    span.className='ro';
    span.textContent = text;
    return span;
  }

  function toNum(v){ return Math.round(parseFloat(v||'0')*100)/100 }
  function round2(v){ return Math.round(v*100)/100 }
  function fmt(v){ return '$' + Number(v).toFixed(2) }

  function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); status.textContent='saved'; setTimeout(()=>status.textContent='ready',500) }
  function load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||''); }catch(e){ return null; } }

  // Initial render
  render();
})();

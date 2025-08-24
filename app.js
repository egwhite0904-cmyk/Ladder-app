/* Ladder App — baseline 3‑rung with toggles + autosave */
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const storeKey = 'ladder_app_assets_v2';
  const jsStatus = $("#jsStatus"); if(jsStatus) jsStatus.textContent = "JS loaded";

  const presetsSell = [0.025, 0.045, 0.07, 0.10];
  const presetsBuyback = [0.01, 0.025, 0.035, 0.05];

  const state = {
    assets: loadAssets()
  };

  function saveAssets(){ localStorage.setItem(storeKey, JSON.stringify(state.assets)); }
  function loadAssets(){
    try{ return JSON.parse(localStorage.getItem(storeKey)) || []; }
    catch(e){ return []; }
  }

  function buildTable(asset){
    const rows = 20;
    const rungCount = Math.min(4, Math.max(2, asset.rungs||3));
    const sells = presetsSell.slice(0, rungCount);
    const buys = presetsBuyback.slice(0, rungCount);

    let out = '';
    for(let r=0;r<rungCount;r++){
      out += `<div class="asset">
        <div class="head">
          <div class="title">${asset.ticker} — Rung ${r+1}</div>
          <span class="tag">Sell +${(sells[r]*100).toFixed(1)}%</span>
          <span class="tag">Buyback ${(buys[r]*100).toFixed(1)}%</span>
          <div class="btns">
            <button data-csv="${asset.id}" data-rung="${r}">Export CSV</button>
          </div>
        </div>
        <div class="body">
          <table class="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Planned Buy</th>
                <th>Planned Sell</th>
                <th>Profit/Share</th>
                <th>Planned Shares</th>
                <th>Planned Total</th>
              </tr>
            </thead>
            <tbody>
              ${genRows(asset.start, sells[r], buys[r], rows, asset.defaultShares)}
            </tbody>
          </table>
        </div>
      </div>`;
    }
    return out;
  }

  function genRows(start, sellPct, buybackPct, rows, defaultShares){
    // row1 buy = start; sell = buy * (1 + sell%)
    // next row buy = prevSell * (1 - buyback%)
    let buy = Number(start);
    let html = '';
    for(let i=1;i<=rows;i++){
      let sell = buy * (1 + sellPct);
      let profit = (sell - buy);
      html += `<tr>
        <td>${i}</td>
        <td><input value="${buy.toFixed(2)}"></td>
        <td><input value="${sell.toFixed(2)}"></td>
        <td>$${profit.toFixed(2)}</td>
        <td><input value="${defaultShares||1}" type="number" min="0"></td>
        <td>$${(profit*(defaultShares||1)).toFixed(2)}</td>
      </tr>`;
      buy = sell * (1 - buybackPct);
    }
    return html;
  }

  function render(){
    const container = $("#assets");
    if(!container) return;
    if(state.assets.length===0){ container.innerHTML = ''; return; }
    container.innerHTML = state.assets.map(buildTable).join('');
  }

  // Add / Replace
  $("#addAsset").addEventListener('click', ()=>{
    const ticker = $("#ticker").value.trim().toUpperCase();
    const startPrice = parseFloat($("#startPrice").value);
    const defaultShares = parseInt($("#defaultShares").value||"1",10);
    if(!ticker || !isFinite(startPrice)){ alert("Enter ticker and start price"); return; }
    const existingIdx = state.assets.findIndex(a=>a.ticker===ticker);
    const asset = { id: Date.now().toString(36), ticker, start: startPrice, defaultShares, rungs: 3 };
    if(existingIdx>=0) state.assets[existingIdx] = asset; else state.assets.push(asset);
    saveAssets(); render();
  });

  $("#clearAll").addEventListener('click', ()=>{
    if(confirm("Clear everything saved on this device?")){ state.assets=[]; saveAssets(); render(); }
  });

  $("#saveBackup").addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state.assets,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ladder_backup.json';
    a.click();
  });

  $("#restoreBackup").addEventListener('click', async ()=>{
    const input = document.createElement('input'); input.type='file'; input.accept='.json,application/json';
    input.onchange = async () => {
      const file = input.files[0]; if(!file) return;
      const txt = await file.text();
      try{ state.assets = JSON.parse(txt)||[]; saveAssets(); render(); }
      catch(e){ alert("Invalid backup file"); }
    };
    input.click();
  });

  $("#exportCsv").addEventListener('click', ()=>{
    if(state.assets.length===0){ alert("No assets"); return; }
    // export first asset first rung example (simple baseline)
    const a = state.assets[0];
    const rows = 20;
    let csv = "row,planned_buy,planned_sell,profit_per_share,planned_shares,planned_total\n";
    let buy = a.start;
    const sellPct = 0.025, buybackPct = 0.01;
    for(let i=1;i<=rows;i++){
      const sell = buy*(1+sellPct);
      const p = sell - buy;
      const sh = a.defaultShares||1;
      csv += [i, buy.toFixed(2), sell.toFixed(2), p.toFixed(2), sh, (p*sh).toFixed(2)].join(",")+"\n";
      buy = sell*(1-buybackPct);
    }
    const blob = new Blob([csv], {type:"text/csv"});
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${a.ticker}_rung1.csv`; link.click();
  });

  // Initial render
  render();
})();
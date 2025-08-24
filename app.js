
// ----- Helpers
const $ = (sel, ctx=document)=>ctx.querySelector(sel);
const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));
const fmt = (n)=> isFinite(n) ? (n>=100 ? `$${n.toFixed(2)}` : `$${n.toFixed(2)}`) : '';

const SAVE_KEY = 'ladder_app_assets_v2_dates';

const PRESETS = {
  sell: {1:0.025, 2:0.045, 3:0.07, 4:0.10},
  buyback: {1:0.01, 2:0.025, 3:0.035, 4:0.05},
  cycles: 20
};

const statusEl = $('#status');
function setStatus(s){ statusEl.textContent = s; }

function save(state){
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  setStatus('saved');
  setTimeout(()=>setStatus('ready'), 500);
}
function load(){
  try{ return JSON.parse(localStorage.getItem(SAVE_KEY)||'[]') }catch(_){ return [] }
}

// ----- App State
let assets = load();
renderAssets();

// ----- Controls
$('#addAsset').addEventListener('click', ()=>{
  const ticker = $('#ticker').value.trim();
  const rungs = +$('#rungs').value || 3;
  const start = parseFloat($('#startPrice').value);
  const defShares = parseFloat($('#defaultShares').value) || 1;
  if(!ticker || !isFinite(start)) { alert('Enter Ticker and Start Price'); return; }
  const existIdx = assets.findIndex(a=>a.ticker.toUpperCase()===ticker.toUpperCase());
  const asset = buildAsset(ticker, rungs, start, defShares);
  if(existIdx>=0) assets[existIdx] = asset; else assets.unshift(asset);
  save(assets);
  renderAssets();
  // scroll to asset
  const card = document.getElementById(`asset-${asset.id}`);
  card.scrollIntoView({behavior:'smooth', block:'start'});
});

$('#saveBackup').addEventListener('click', ()=>{
  const dataStr = 'data:text/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(assets));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = 'ladder_backup.json';
  a.click();
});

$('#restoreBackup').addEventListener('click', async()=>{
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json,application/json';
  inp.onchange = ()=>{
    const f = inp.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{ try{
      assets = JSON.parse(r.result); save(assets); renderAssets();
    }catch(e){ alert('Invalid backup'); } };
    r.readAsText(f);
  };
  inp.click();
});

$('#exportCSV').addEventListener('click', ()=>{
  const rows = [];
  assets.forEach(a=>{
    a.rungs.forEach((r, ri)=>{
      r.rows.forEach((row, i)=>{
        rows.push({
          Ticker: a.ticker,
          Rung: ri+1,
          Row: i+1,
          PlannedBuy: row.buy,
          PlannedSell: row.sell,
          ProfitPerShare: row.profitShare,
          PlannedShares: row.shares,
          PlannedTotal: row.plannedTotal,
          BuyDate: row.buyDate||'',
          SellDate: row.sellDate||'',
          ActualBuy: row.actualBuy||'',
          ActualSell: row.actualSell||'',
          FilledQty: row.filledQty||'',
          RealizedPL: row.realizedPL||'',
          DeltaVsPlan: row.deltaVsPlan||'',
          CumRealized: row.cumRealized||''
        });
      });
    });
  });
  const headers = Object.keys(rows[0]||{Ticker:'',Rung:'',Row:''});
  const csv = [headers.join(',')].concat(rows.map(r=>headers.map(h=>r[h]).join(','))).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download = 'ladder_export.csv';
  a.click();
});

$('#clearAll').addEventListener('click', ()=>{
  if(confirm('Clear all data on this device?')){
    assets=[]; save(assets); renderAssets();
  }
});

// ----- Builders & Renderers
function uid(){ return Math.random().toString(36).slice(2,9); }

function buildAsset(ticker, rungsCount, startPrice, defaultShares){
  const asset = {
    id: uid(),
    ticker,
    startPrice,
    rungsCount,
    defaultShares,
    rungs: []
  };
  for(let r=1;r<=rungsCount;r++){
    const sellPct = PRESETS.sell[r] ?? 0.025;
    const buyback = PRESETS.buyback[r] ?? 0.01;
    const rows = [];
    // row 1
    let buy = round2(startPrice);
    let sell = round2(buy * (1+sellPct));
    for(let i=0;i<PRESETS.cycles;i++){
      const profitShare = round2(sell - buy);
      rows.push({
        buy, sell,
        profitShare,
        shares: defaultShares,
        plannedTotal: round2(profitShare * defaultShares),
        buyDate:'', sellDate:'',
        actualBuy:'', actualSell:'', filledQty:'',
        realizedPL:'', deltaVsPlan:'', cumRealized:''
      });
      // next row
      buy = round2(sell * (1 - buyback));
      sell = round2(buy * (1 + sellPct));
    }
    asset.rungs.push({sellPct, buyback, rows});
  }
  return asset;
}

function round2(n){ return Math.round(n*100)/100; }

function renderAssets(){
  const wrap = $('#assets');
  wrap.innerHTML='';
  assets.forEach(a=>{
    const card = document.createElement('div');
    card.className='asset'; card.id=`asset-${a.id}`;

    // Header
    const head = document.createElement('div');
    head.className='assetHeader';
    head.innerHTML = `
      <div class="assetTitle">${a.ticker} — ${a.rungsCount} rung(s) • start ${fmt(a.startPrice)}</div>
      <div class="assetButtons">
        <button class="toggleBtn">Toggle</button>
        <button class="danger delBtn">Delete</button>
      </div>`;
    card.appendChild(head);

    // Badges
    const badges = document.createElement('div');
    badges.className='badges';
    badges.innerHTML = a.rungs.map((r,i)=>
      `<span class="badge">Sell +${(r.sellPct*100).toFixed(1)}%</span>
       <span class="badge">Buyback ${(r.buyback*100).toFixed(1)}%</span>`
    ).join('');
    card.appendChild(badges);

    // Table
    const tableWrap = document.createElement('div'); tableWrap.className='tableWrap';
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Planned Buy</th>
          <th>Planned Sell</th>
          <th>Profit/Share</th>
          <th>Planned Shares</th>
          <th>Planned Total</th>
          <th>Buy Date</th>
          <th>Sell Date</th>
          <th>Actual Buy</th>
          <th>Actual Sell</th>
          <th>Filled Qty</th>
          <th>Realized P/L</th>
          <th>Δ vs Plan</th>
          <th>Cum Realized</th>
        </tr>
      </thead>
      <tbody></tbody>`;
    const tbody = $('tbody', table);

    // Flatten rows across rungs but show “Rung X — Row” numbering
    let cum = 0;
    a.rungs.forEach((r, ri)=>{
      r.rows.forEach((row, i)=>{
        // compute derived values
        row.plannedTotal = round2((row.profitShare||0) * (parseFloat(row.shares)||0));
        const hasActual = isFinite(parseFloat(row.actualBuy)) && isFinite(parseFloat(row.actualSell)) && isFinite(parseFloat(row.filledQty));
        row.realizedPL = hasActual ? round2((parseFloat(row.actualSell)-parseFloat(row.actualBuy)) * parseFloat(row.filledQty)) : '';
        row.deltaVsPlan = hasActual ? round2(parseFloat(row.realizedPL) - row.plannedTotal) : '';
        if(hasActual){ cum += parseFloat(row.realizedPL); row.cumRealized = round2(cum);} else { row.cumRealized = cum ? round2(cum) : ''; }

        const tr = document.createElement('tr');

        tr.innerHTML = `
          <td>${i+1}</td>
          <td class="money"><input type="number" step="0.01" value="${row.buy}"></td>
          <td class="money"><input type="number" step="0.01" value="${row.sell}"></td>
          <td class="money">${fmt(row.profitShare)}</td>
          <td><input type="number" step="1" value="${row.shares}"></td>
          <td class="money">${fmt(row.plannedTotal)}</td>
          <td><input type="date" value="${row.buyDate||''}"></td>
          <td><input type="date" value="${row.sellDate||''}"></td>
          <td><input type="number" step="0.01" value="${row.actualBuy||''}"></td>
          <td><input type="number" step="0.01" value="${row.actualSell||''}"></td>
          <td><input type="number" step="1" value="${row.filledQty||''}"></td>
          <td class="money">${row.realizedPL!==''?fmt(row.realizedPL):''}</td>
          <td class="money">${row.deltaVsPlan!==''?fmt(row.deltaVsPlan):''}</td>
          <td class="money">${row.cumRealized!==''?fmt(row.cumRealized):''}</td>
        `;

        // wiring: inputs
        const [inBuy,inSell,,inShares,,,,inActBuy,inActSell,inQty] = $$('input', tr);
        inBuy.addEventListener('input', e=>{
          row.buy = parseFloat(inBuy.value)||0;
          row.profitShare = round2(row.sell - row.buy);
          save(assets); renderAssets();
        });
        inSell.addEventListener('input', e=>{
          row.sell = parseFloat(inSell.value)||0;
          row.profitShare = round2(row.sell - row.buy);
          save(assets); renderAssets();
        });
        inShares.addEventListener('input', ()=>{
          row.shares = parseFloat(inShares.value)||0; save(assets); renderAssets();
        });

        const dateInputs = $$('input[type="date"]', tr);
        dateInputs.forEach((el, idx)=>{
          el.addEventListener('input', ()=>{
            if(idx===0) row.buyDate = el.value; else row.sellDate = el.value;
            save(assets); renderAssets();
          });
        });

        inActBuy.addEventListener('input', ()=>{ row.actualBuy = inActBuy.value; save(assets); renderAssets(); });
        inActSell.addEventListener('input', ()=>{ row.actualSell = inActSell.value; save(assets); renderAssets(); });
        inQty.addEventListener('input', ()=>{ row.filledQty = inQty.value; save(assets); renderAssets(); });

        tbody.appendChild(tr);
      });
      // Insert a rung break row
      const br = document.createElement('tr');
      br.innerHTML = `<td colspan="14" class="grid-note">— End of Rung ${ri+1} —</td>`;
      tbody.appendChild(br);
    });

    tableWrap.appendChild(table);
    card.appendChild(tableWrap);
    wrap.appendChild(card);

    // Toggle visibility
    let open = true;
    const bodyEls = [badges, tableWrap];
    $('.toggleBtn', head).addEventListener('click', ()=>{
      open = !open;
      bodyEls.forEach(el=>el.style.display = open ? '' : 'none');
    });
    $('.delBtn', head).addEventListener('click', ()=>{
      if(confirm(`Delete ${a.ticker}?`)){
        assets = assets.filter(x=>x.id!==a.id);
        save(assets); renderAssets();
      }
    });
  });
}

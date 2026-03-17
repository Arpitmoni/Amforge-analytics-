/* =====================================================
   AmForge Analytics — cleaner.js
   Data Cleaner PRO Engine
   Smart Imputation · Revenue Recovery
   Linear Interpolation · WMA · Forward Fill
   Quality Scoring · Before/After Comparison
   Developed by Arpit Moni
   Version: 2.0
   ===================================================== */

// ═══════════ CLEANER STATS ═══════════
function cMean(rows,col){const v=rows.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v)&&v>=0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;}
function cMedian(rows,col){const v=rows.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v)&&v>=0).sort((a,b)=>a-b);if(!v.length)return 0;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2;}
function cMode(rows,col){const f={};rows.forEach(r=>{const v=String(r[col]||'').trim();if(v&&!isNull(v))f[v]=(f[v]||0)+1;});const top=Object.entries(f).sort((a,b)=>b[1]-a[1])[0];return top?top[0]:'Unknown';}
function fwdFill(rows,col,idx){for(let i=idx-1;i>=0;i--){const v=String(rows[i][col]||'').trim();if(v&&!isNull(v))return v;}return null;}
function linInterp(rows,col,idx){
  let p=null,n=null,pi=-1,ni=-1;
  for(let i=idx-1;i>=0;i--){const v=parseFloat(rows[i][col]);if(!isNaN(v)&&v>=0){p=v;pi=i;break;}}
  for(let i=idx+1;i<rows.length;i++){const v=parseFloat(rows[i][col]);if(!isNaN(v)&&v>=0){n=v;ni=i;break;}}
  if(p!==null&&n!==null){return Math.round(p+(n-p)*(idx-pi)/(ni-pi));}
  return p!==null?Math.round(p):n!==null?Math.round(n):Math.round(cMean(rows,col));
}
function wma3(rows,col,idx){
  const w=[];
  for(let i=Math.max(0,idx-3);i<idx;i++){const v=parseFloat(rows[i][col]);if(!isNaN(v)&&v>=0)w.push(v);}
  for(let i=idx+1;i<=Math.min(rows.length-1,idx+3);i++){const v=parseFloat(rows[i][col]);if(!isNaN(v)&&v>=0)w.push(v);}
  return w.length?Math.round(w.reduce((a,b)=>a+b,0)/w.length):Math.round(cMean(rows,col));
}
function avgPriceMap(rows,prodCol,unitsCol,revCol){
  const map={};
  rows.forEach(r=>{const rev=parseFloat(r[revCol]),units=parseFloat(r[unitsCol]);if(!isNaN(rev)&&rev>0&&!isNaN(units)&&units>0){const p=String(r[prodCol]||'').trim();if(p&&!isNull(p)){if(!map[p])map[p]={sum:0,cnt:0};map[p].sum+=rev/units;map[p].cnt++;}}});
  const out={};Object.entries(map).forEach(([k,v])=>out[k]=v.cnt?v.sum/v.cnt:0);return out;
}

// ═══════════ MESSY CSV ═══════════
const MESSY_CSV=`Date,Product,Region,Salesperson,Revenue,Units,Profit,Rating
2024-01,Laptop Pro,North,Amit,84200,42,22100,4.5
2024-01,SmartPhone X,South,Priya,61500,205,18450,4.2
2024-01,Tablet Air,East,,32400,108,,3.8
2024-01,Headphones,West,Sneha,,315,5670,
2024-01,Smart Watch,,Vikram,24600,,7380,4.1
2024-02,Laptop Pro,West,Amit,91800,46,24780,4.6
2024-02,SmartPhone X,North,Priya,78200,260,23460,
2024-02,Tablet Air,South,Rahul,28900,96,8670,3.9
2024-02,,East,Sneha,22400,373,6720,4.8
2024-02,Smart Watch,West,,31200,104,9360,4.0
2024-01,Laptop Pro,North,Amit,84200,42,22100,4.5
2024-01,SmartPhone X,South,Priya,61500,205,18450,4.2
2024-03,Laptop Pro,East,Amit,102500,51,28700,4.7
2024-03,smartphone x,West,Priya,88400,294,26520,4.4
2024-03,TABLET AIR,North,Rahul,41200,137,12360,4.1
2024-03,Headphones,South,Sneha,19800,330,,4.6
2024-03,Smart Watch,East,Vikram,abc,96,8670,4.2
2024-04,Laptop Pro,South,Amit,88600,44,23922,4.4
2024-04,SmartPhone X,east,Priya,94100,313,28230,4.5
2024-04,Tablet Air,West,Rahul,35600,,10680,3.7
2024-04,Headphones,North,Sneha,27300,455,8190,999
2024-04,Smart Watch,South,Vikram,33600,112,,4.3
2024-05,,North,Amit,118200,59,31914,4.8
2024-05,SmartPhone X,South,Priya,102400,341,30720,4.6
2024-05,Tablet Air,East,Rahul,,163,14670,4.2
2024-05,Headphones,West,Sneha,31200,520,9360,4.7
2024-05,Smart Watch,North,Vikram,39800,132,11940,
2024/06,Laptop Pro,West,Amit,125600,62,33912,4.9
06-2024,SmartPhone X,North,Priya,115800,386,34740,4.7
2024-06,Tablet Air,South,Rahul,52100,173,15630,4.3
2024-06,Headphones,East,Sneha,28900,481,8670,4.8
2024-06,Smart Watch,West,Vikram,44200,147,13260,4.5
2024-07,Laptop Pro,East,Amit,112400,56,30348,4.6
2024-07,SmartPhone X,West,Priya,108200,360,32460,4.5
2024-07,Tablet Air,North,Rahul,45800,152,13740,4.0
2024-07,headphones,South,Sneha,33600,560,10080,4.9
2024-07,Smart Watch,East,Vikram,41500,138,12450,4.3
2024-07,Smart Watch,East,Vikram,41500,138,12450,4.3
2024-08,Laptop Pro,South,Amit,131000,65,35370,4.9
2024-08,SmartPhone X,East,Priya,124600,415,37380,4.8
2024-08,Tablet Air,West,Rahul,58200,194,17460,4.4
2024-08,Headphones,North,Sneha,36800,613,,4.7
2024-08,Smart Watch,South,Vikram,48900,163,14670,4.6
2024-09,Laptop Pro,North,Amit,142800,71,38556,4.9
2024-09,SmartPhone X,South,Priya,138200,460,41460,4.8
2024-09,Tablet Air,East,Rahul,61400,,18420,4.5
2024-09,Headphones,West,Sneha,42100,701,12630,4.8
2024-09,,North,Vikram,52300,174,15690,4.7
2024-10,Laptop Pro,West,Amit,158400,79,42768,4.8
2024-10,SmartPhone X,North,Priya,152800,509,45840,4.9
2024-10,Tablet Air,South,Rahul,68900,229,20670,4.6
2024-10,Headphones,East,Sneha,48200,803,14460,4.9
2024-10,Smart Watch,West,,57800,192,17340,4.8
2024-11,LAPTOP PRO,East,Amit,189200,94,51084,5.0
2024-11,SmartPhone X,West,Priya,178400,594,53520,4.9
2024-11,Tablet Air,North,Rahul,82400,274,24720,4.7
2024-11,Headphones,South,Sneha,58900,981,17670,4.8
2024-11,Smart Watch,East,Vikram,68200,227,20460,4.9
2024-12,Laptop Pro,South,Amit,224600,112,60642,5.0
2024-12,SmartPhone X,East,Priya,198600,661,59580,4.9
2024-12,Tablet Air,West,Rahul,N/A,314,28260,4.8
2024-12,Headphones,North,Sneha,72400,1206,21720,4.9
2024-12,Smart Watch,South,Vikram,81400,271,24420,4.8
,Laptop Pro,North,Amit,95000,47,,4.5
2024-01,SmartPhone X,South,Priya,61500,205,18450,4.2
2024-08,Tablet Air,NULL,Rahul,58200,194,17460,4.4
2024-09,Headphones,West,Sneha,-500,701,12630,4.8
2024-10,Smart Watch,West,Vikram,57800,192,-9999,4.8`;

function loadMessySample(){runCleaner(MESSY_CSV,'messy_sales_2024.csv');notify('⚠️ Messy sample loaded — full quality report generated!','info');}
function loadMessyToDash(){const p=parseCSV(MESSY_CSV);const c=basicClean(p.rows,p.schema);const id='ds_'+Date.now();APP.datasets.push({id,name:'MessyData_2024.csv',headers:p.headers,rows:c,schema:p.schema});APP.activeId=id;APP.filterCol='';APP.filterVal='';updateNav();showScreen('dashboard');notify('⚠️ Messy dataset loaded — visit Data Cleaner for full fix!','info');}

// ═══════════ CLEANER FILE HANDLING ═══════════
function clDrop(e){e.preventDefault();document.getElementById('cl-zone').classList.remove('drag');const f=e.dataTransfer.files[0];if(f)clReadFile(f);}
function clInput(inp){const f=inp.files[0];if(f)clReadFile(f);inp.value='';}
function clReadFile(file){if(!['csv','txt'].includes(file.name.split('.').pop().toLowerCase())){notify('Please upload a CSV file.','error');return;}const r=new FileReader();r.onload=e=>runCleaner(e.target.result,file.name);r.readAsText(file);}

// ═══════════ RUN CLEANER ═══════════
function runCleaner(csvText,fileName,strategies){
  const lines=csvText.trim().split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2){notify('File too small or empty.','error');return;}
  const t=(lines[0].match(/\t/g)||[]).length,c=(lines[0].match(/,/g)||[]).length;
  const sep=t>c?'\t':',';
  const headers=lines[0].split(sep).map(h=>h.trim().replace(/^["']|["']$/g,'').trim()).filter(Boolean);
  const rawRows=lines.slice(1).map((line,idx)=>{const vals=line.split(sep).map(v=>v.trim().replace(/^["']|["']$/g,''));const obj={_r:idx+2};headers.forEach((h,i)=>obj[h]=vals[i]!==undefined?vals[i]:'');return obj;}).filter(r=>headers.some(h=>r[h]!==''));
  CL.rawRows=rawRows;CL.headers=headers;CL.fileName=fileName;
  const schema={};
  headers.forEach(h=>{const vals=rawRows.map(r=>r[h]);const nn=vals.filter(v=>!isNull(v)&&v!=='NULL'&&v!=='N/A');const dr=/^\d{4}[-\/]\d{1,2}([-\/]\d{1,2})?$|^\d{1,2}-\d{4}$/;if(nn.every(v=>!isNaN(Number(String(v).trim()))&&String(v).trim()!=''))schema[h]='number';else if(nn.slice(0,30).every(v=>dr.test(String(v).trim())))schema[h]='date';else schema[h]='text';});
  CL.schema=schema;
  const report=analyzeData(rawRows,headers,schema);
  CL.report=report;
  const strats=strategies||buildDefaultStrats(headers,schema);
  CL.strategies=strats;
  const cleaned=buildCleaned(rawRows,headers,schema,report,strats);
  CL.cleanedRows=cleaned;
  document.getElementById('cl-zone').style.display='none';
  document.getElementById('cl-dl-btn').style.display='inline-flex';
  renderClReport(report,rawRows,headers,schema,cleaned,fileName,strats);
}

function buildDefaultStrats(headers,schema){
  const s={};
  headers.forEach(h=>{s[h]=schema[h]==='number'?'mean':schema[h]==='text'?'mode':'interpolate';});
  return s;
}

// ═══════════ ANALYZE ═══════════
function analyzeData(rows,headers,schema){
  const R={missing:[],dupes:[],typeErrs:[],outliers:[],caseIss:[],negVals:[],nullTxt:[],dateFmt:[],colStats:{}};
  // missing
  rows.forEach(row=>headers.forEach(h=>{if(row[h]===''||row[h]===null||row[h]===undefined)R.missing.push({row:row._r,col:h});}));
  // dupes
  const seen=new Map();rows.forEach(row=>{const k=headers.map(h=>String(row[h]||'').toLowerCase().trim()).join('|');if(seen.has(k))R.dupes.push({row:row._r,first:seen.get(k)});else seen.set(k,row._r);});
  // type errors
  headers.filter(h=>schema[h]==='number').forEach(h=>rows.forEach(row=>{const v=row[h];if(v!==''&&!isNull(v)&&isNaN(Number(v))&&!['null','n/a'].includes(String(v).toLowerCase()))R.typeErrs.push({row:row._r,col:h,val:v});}));
  // null text
  headers.forEach(h=>rows.forEach(row=>{if(['null','n/a','na','none','undefined','#n/a'].includes(String(row[h]||'').toLowerCase().trim())&&row[h]!=='')R.nullTxt.push({row:row._r,col:h,val:row[h]});}));
  // case issues
  headers.filter(h=>schema[h]==='text').forEach(h=>{const vm=new Map();rows.forEach(row=>{const v=String(row[h]||'').trim();if(!v||isNull(v))return;const lo=v.toLowerCase();if(!vm.has(lo))vm.set(lo,v);else if(vm.get(lo)!==v&&!R.caseIss.find(c=>c.col===h&&c.val===v))R.caseIss.push({row:row._r,col:h,val:v,fix:toTC(v)});});});
  // outliers (z-score>3)
  headers.filter(h=>schema[h]==='number').forEach(h=>{const vals=rows.map(r=>parseFloat(r[h])).filter(v=>!isNaN(v)&&v>=0);if(vals.length<4)return;const mn=vals.reduce((a,b)=>a+b,0)/vals.length,std=Math.sqrt(vals.reduce((s,v)=>s+Math.pow(v-mn,2),0)/vals.length);if(!std)return;rows.forEach(row=>{const v=parseFloat(row[h]);if(!isNaN(v)&&Math.abs(v-mn)>3*std)R.outliers.push({row:row._r,col:h,val:v,mean:Math.round(mn),z:Math.abs((v-mn)/std).toFixed(1)});});});
  // negatives
  headers.filter(h=>schema[h]==='number').forEach(h=>rows.forEach(row=>{const v=parseFloat(row[h]);if(!isNaN(v)&&v<0)R.negVals.push({row:row._r,col:h,val:v});}));
  // date format
  headers.filter(h=>schema[h]==='date').forEach(h=>{const std=/^\d{4}-\d{2}/;rows.forEach(row=>{const v=String(row[h]||'').trim();if(v&&!std.test(v)&&/\d/.test(v))R.dateFmt.push({row:row._r,col:h,val:v,fix:normDate(v)});});});
  // col stats
  headers.forEach(h=>{const tot=rows.length,miss=rows.filter(r=>isNull(r[h])||r[h]===''||r[h]===undefined).length;let iss=0;['missing','typeErrs','nullTxt','caseIss','outliers','negVals'].forEach(k=>iss+=R[k].filter(x=>x.col===h).length);R.colStats[h]={tot,fill:tot-miss,miss,pct:Math.round((tot-miss)/tot*100),iss};});
  return R;
}

// ═══════════ REVENUE RECOVERY ═══════════
function detectRevRecovery(headers,schema,rawRows){
  const numCols=headers.filter(h=>schema[h]==='number');
  const txtCols=headers.filter(h=>schema[h]==='text');
  const revCandidates=numCols.filter(h=>/rev|sale|amount|income|earn|turnover/i.test(h));
  const unitCandidates=numCols.filter(h=>/unit|qty|quant|count|sold|vol/i.test(h));
  const prodCandidates=txtCols.filter(h=>/prod|item|sku|name|good|service/i.test(h));
  if(!revCandidates.length||!unitCandidates.length||!prodCandidates.length)return null;
  const revCol=revCandidates[0],unitsCol=unitCandidates[0],prodCol=prodCandidates[0];
  const missingRev=rawRows.filter(r=>isNull(r[revCol])||r[revCol]===''||r[revCol]==='N/A');
  const recoverableRows=missingRev.filter(r=>!isNull(r[unitsCol])&&parseFloat(r[unitsCol])>0&&!isNull(r[prodCol])&&r[prodCol]!=='');
  if(!recoverableRows.length)return null;
  const priceMap=avgPriceMap(rawRows,prodCol,unitsCol,revCol);
  const recoverable=recoverableRows.filter(r=>{const p=toTC(String(r[prodCol]||'').trim());return priceMap[p]&&priceMap[p]>0;});
  if(!recoverable.length)return null;
  return{revCol,unitsCol,prodCol,priceMap,recoverable,total:recoverable.length};
}

// ═══════════ BUILD CLEANED ROWS ═══════════
function buildCleaned(rawRows,headers,schema,report,strats){
  const dupSet=new Set(report.dupes.map(d=>d.row));
  const removeSet=new Set();
  rawRows.forEach((row,idx)=>{
    headers.forEach(h=>{
      const isEmpty=row[h]===''||row[h]===null||row[h]===undefined||isNull(row[h]);
      if(isEmpty&&strats[h]==='remove_row')removeSet.add(row._r);
    });
  });
  // Revenue recovery map
  const rrInfo=detectRevRecovery(headers,schema,rawRows);
  const priceMap=rrInfo?rrInfo.priceMap:{};
  const revCol=rrInfo?rrInfo.revCol:null;
  const unitsCol=rrInfo?rrInfo.unitsCol:null;
  const prodCol=rrInfo?rrInfo.prodCol:null;
  return rawRows
    .filter(row=>!dupSet.has(row._r)&&!removeSet.has(row._r))
    .map((row,idx)=>{
      const cleaned={...row};
      headers.forEach(h=>{
        let v=String(cleaned[h]===null||cleaned[h]===undefined?'':cleaned[h]).trim();
        const isEmpty=!v||isNull(v)||v==='NULL'||v==='N/A';
        const isTypeErr=schema[h]==='number'&&v&&isNaN(Number(v));
        const isNeg=schema[h]==='number'&&parseFloat(v)<0;
        const s=strats[h]||'mean';
        // Revenue recovery — try to recover from Units x Avg Price
        if(isEmpty&&h===revCol&&unitsCol&&prodCol){
          const units=parseFloat(cleaned[unitsCol]);
          const prod=toTC(String(cleaned[prodCol]||'').trim());
          if(!isNaN(units)&&units>0&&priceMap[prod]>0){v=String(Math.round(units*priceMap[prod]));} // recovered!
        }
        // Still empty after recovery attempt
        if(!v||isNull(v)||v==='NULL'||v==='N/A'||isTypeErr){
          if(schema[h]==='number'){
            if(s==='mean')v=String(Math.round(cMean(rawRows,h)));
            else if(s==='median')v=String(Math.round(cMedian(rawRows,h)));
            else if(s==='interpolate')v=String(linInterp(rawRows,h,rawRows.indexOf(row)));
            else if(s==='wma')v=String(wma3(rawRows,h,rawRows.indexOf(row)));
            else if(s==='fwd')v=String(fwdFill(rawRows,h,rawRows.indexOf(row))||Math.round(cMean(rawRows,h)));
            else if(s==='zero')v='0';
            else v=String(Math.round(cMean(rawRows,h)));
          }else if(schema[h]==='text'){
            if(s==='mode')v=cMode(rawRows,h);
            else if(s==='fwd')v=fwdFill(rawRows,h,rawRows.indexOf(row))||cMode(rawRows,h);
            else v=cMode(rawRows,h);
          }else{
            v=fwdFill(rawRows,h,rawRows.indexOf(row))||normDate(v)||'Unknown';
          }
        }
        if(isNeg)v=String(Math.round(cMean(rawRows,h)));
        if(schema[h]==='text'&&v&&!isNull(v))v=toTC(v);
        if(schema[h]==='date')v=normDate(v);
        cleaned[h]=schema[h]==='number'?parseFloat(v)||0:v;
      });
      delete cleaned._r;
      return cleaned;
    });
}

function reApply(){
  const strats={};
  CL.headers.forEach(h=>{const el=document.getElementById('ss_'+h);if(el)strats[h]=el.value;});
  const cleaned=buildCleaned(CL.rawRows,CL.headers,CL.schema,CL.report,strats);
  CL.cleanedRows=cleaned;CL.strategies=strats;
  document.getElementById('clean-row-count').textContent=cleaned.length;
  notify(`✓ Re-applied! ${cleaned.length} clean rows ready.`);
}

function downloadClean(){
  if(!CL.cleanedRows.length){notify('No cleaned data yet.','error');return;}
  const csv=[CL.headers.join(','),...CL.cleanedRows.map(r=>CL.headers.map(h=>`"${String(r[h]===null||r[h]===undefined?'':r[h]).replace(/"/g,'""')}"`).join(','))].join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=CL.fileName.replace(/\.csv$/i,'')+'_cleaned.csv';a.click();
  notify('✓ Cleaned CSV downloaded!');
}

// ═══════════ RENDER REPORT ═══════════
function renderClReport(report,rawRows,headers,schema,cleaned,fileName,strats){
  const totalIss=report.missing.length+report.dupes.length+report.typeErrs.length+report.outliers.length+report.caseIss.length+report.negVals.length+report.nullTxt.length+report.dateFmt.length;
  const maxScore=rawRows.length*headers.length;
  const score=Math.max(0,Math.round(((maxScore-totalIss)/maxScore)*100));
  const sColor=score>=80?'var(--gn)':score>=50?'var(--am)':'var(--rd)';
  const sLabel=score>=80?'Good Quality':score>=50?'Needs Cleaning':'Poor Quality';
  const rrInfo=detectRevRecovery(headers,schema,rawRows);
  const colsWithIss=headers.filter(h=>report.colStats[h].iss>0||report.missing.some(m=>m.col===h));
  let html='';

  // ONE TAP BUTTON
  html+=`<button class="one-tap" onclick="oneTapFix()">⚡ ONE TAP — AUTO FIX EVERYTHING</button>`;

  // SCORE CARD
  html+=`<div class="score-card">
    <div style="text-align:center;flex-shrink:0">
      <div class="score-big" style="color:${sColor}">${score}</div>
      <div style="font-size:11px;color:var(--t2);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-top:4px">Quality Score</div>
    </div>
    <div style="flex:1">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.5px;margin-bottom:6px;color:${sColor}">${sLabel}</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:13px">Analyzed <strong style="color:var(--tx)">${rawRows.length} rows</strong> × <strong style="color:var(--tx)">${headers.length} cols</strong> = ${(rawRows.length*headers.length).toLocaleString()} cells · <strong style="color:${sColor}">${totalIss} issues found</strong></div>
      <div class="prog"><div class="prog-fill" style="width:${score}%;background:${sColor}"></div></div>
    </div>
    <button class="dl-btn" onclick="downloadClean()"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Download Cleaned</button>
  </div>`;

  // STAT GRID
  html+=`<div class="stat-grid">
    <div class="stat-card"><div class="stat-num" style="color:var(--ac2)">${rawRows.length}</div><div class="stat-lbl">Total Rows</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${report.dupes.length?'var(--rd)':'var(--gn)'}">${report.dupes.length}</div><div class="stat-lbl">Duplicates</div><div class="stat-sub">Removed</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${report.missing.length?'var(--am)':'var(--gn)'}">${report.missing.length}</div><div class="stat-lbl">Missing Cells</div><div class="stat-sub">Smart filled</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${report.typeErrs.length?'var(--rd)':'var(--gn)'}">${report.typeErrs.length}</div><div class="stat-lbl">Type Errors</div><div class="stat-sub">Fixed</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${report.outliers.length?'var(--pu)':'var(--gn)'}">${report.outliers.length}</div><div class="stat-lbl">Outliers</div><div class="stat-sub">Flagged</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${report.negVals.length?'var(--rd)':'var(--gn)'}">${report.negVals.length}</div><div class="stat-lbl">Negatives</div><div class="stat-sub">Fixed with mean</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--gn)" id="clean-row-count">${cleaned.length}</div><div class="stat-lbl">Clean Rows</div><div class="stat-sub">After cleaning</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${rrInfo?'var(--gold)':'var(--t2)'}">${rrInfo?rrInfo.total:0}</div><div class="stat-lbl">Revenue Recovered</div><div class="stat-sub">${rrInfo?`via ${rrInfo.prodCol} × price`:'N/A'}</div></div>
  </div>`;

  // REVENUE RECOVERY SECTION
  if(rrInfo){
    html+=`<div class="sec-card" style="border-color:rgba(212,175,55,.3);background:rgba(212,175,55,.04)">
      <div class="sec-head">
        <div class="sec-icon" style="background:rgba(212,175,55,.15);font-size:18px">💰</div>
        <div><div class="sec-title" style="color:var(--gold)">Revenue Recovery — ${rrInfo.total} Rows Recovered</div><div class="sec-sub">${rrInfo.revCol} was missing → calculated from ${rrInfo.unitsCol} × Avg Price Per ${rrInfo.prodCol}</div></div>
      </div>
      <div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>${rrInfo.prodCol}</th><th>${rrInfo.unitsCol}</th><th>Avg Price</th><th>Recovered ${rrInfo.revCol}</th></tr></thead><tbody>
      ${rrInfo.recoverable.slice(0,8).map(row=>{
        const prod=toTC(String(row[rrInfo.prodCol]||'').trim());
        const units=parseFloat(row[rrInfo.unitsCol]);
        const price=rrInfo.priceMap[prod]||0;
        const recovered=Math.round(units*price);
        return`<tr><td><span class="r-tag">#${row._r}</span></td><td style="color:var(--tx)">${prod}</td><td class="v-a">${units}</td><td style="color:var(--am);font-family:'IBM Plex Mono',monospace">${fmtN(price)}/unit</td><td><span class="v-a">${fmtN(recovered)}</span></td></tr>`;
      }).join('')}
      </tbody></table></div>
      <div style="margin-top:12px;font-size:12px;color:var(--t2);line-height:1.6">
        💡 <strong style="color:var(--gold)">Power BI Method:</strong> Avg price per product calculated from complete rows, then applied to missing revenue rows. More accurate than simple mean fill because it respects product-level pricing.
      </div>
    </div>`;
  }

  // STRATEGY SELECTOR
  if(colsWithIss.length){
    const stratOpts={
      number:[{v:'mean',l:'📊 Mean (Power BI default)',d:'Column average — keeps totals accurate'},{v:'median',l:'📍 Median',d:'Middle value — safer when outliers exist'},{v:'interpolate',l:'📐 Linear Interpolation',d:'Calculates value from surrounding rows — best for time series'},{v:'wma',l:'〰️ Weighted Moving Average',d:'Average of 3 nearby rows — smooths trends'},{v:'fwd',l:'⬆️ Forward Fill',d:'Copy value from previous row'},{v:'zero',l:'0️⃣ Zero',d:'Use only if 0 is meaningful'},{v:'remove_row',l:'🗑️ Remove Row',d:'Delete rows with missing values'}],
      text:[{v:'mode',l:'🔤 Mode (Power BI default)',d:'Most common value in column'},{v:'fwd',l:'⬆️ Forward Fill',d:'Copy value from previous row'},{v:'remove_row',l:'🗑️ Remove Row',d:'Delete the entire row'}],
      date:[{v:'interpolate',l:'📐 Interpolate (default)',d:'Estimate from surrounding dates'},{v:'fwd',l:'⬆️ Forward Fill',d:'Copy date from previous row'},{v:'remove_row',l:'🗑️ Remove Row',d:'Delete the entire row'}]
    };
    html+=`<div class="sec-card" style="border-color:rgba(37,99,235,.3)">
      <div class="sec-head">
        <div class="sec-icon" style="background:rgba(37,99,235,.15);font-size:18px">⚙️</div>
        <div style="flex:1"><div class="sec-title" style="color:var(--ac2)">Power BI Style — Fill Strategy Per Column</div><div class="sec-sub">Choose how each column's missing values are handled. Click Re-Apply to update.</div></div>
        <button onclick="reApply()" class="btn btn-primary btn-sm">↻ Re-Apply</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
        ${colsWithIss.map(h=>{
          const t=schema[h];const opts=stratOpts[t]||stratOpts.text;const cur=strats[h]||opts[0].v;
          const mn=t==='number'?Math.round(cMean(rawRows,h)):null;
          const md=t==='number'?Math.round(cMedian(rawRows,h)):null;
          const mo=t==='text'?cMode(rawRows,h):null;
          let pv='';
          if(t==='number'){if(cur==='mean')pv=`→ ${fmtN(mn)}`;else if(cur==='median')pv=`→ ${fmtN(md)}`;else if(cur==='zero')pv='→ 0';else if(cur==='interpolate')pv='→ interpolated';else if(cur==='wma')pv='→ avg(neighbors)';else if(cur==='fwd')pv='→ prev row';else pv='→ row removed';}
          else if(t==='text'){if(cur==='mode')pv=`→ "${mo}"`;else if(cur==='fwd')pv='→ prev row';else pv='→ row removed';}
          else pv=cur==='remove_row'?'→ row removed':'→ interpolated';
          const miss=report.missing.filter(m=>m.col===h).length+(report.nullTxt.filter(m=>m.col===h).length)+(report.typeErrs.filter(m=>m.col===h).length);
          return`<div style="background:var(--s2);border:1px solid var(--b1);border-radius:10px;padding:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div><div style="font-size:13px;font-weight:600">${h}</div><div style="font-size:10px;color:var(--t2)">${miss} issues · <span class="${t==='number'?'t-num':t==='date'?'t-date':'t-txt'}" style="padding:1px 5px;border-radius:3px">${t}</span></div></div>
              <span style="font-size:11px;font-family:'IBM Plex Mono',monospace;color:var(--gn)" id="sp_${h}">${pv}</span>
            </div>
            <select class="strat-sel" id="ss_${h}" onchange="updateStratPrev('${h}','${t}',${t==='number'?mn:0},${t==='number'?md:0},'${mo||''}')">
              ${opts.map(o=>`<option value="${o.v}"${o.v===cur?' selected':''}>${o.l} — ${o.d}</option>`).join('')}
            </select>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:14px;padding:12px 14px;border-radius:9px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.15);font-size:12px;line-height:1.6">
        💡 <strong style="color:var(--gn)">Power BI uses Mean for numbers, Mode for text by default.</strong> For time-series data (monthly revenue), use <strong>Linear Interpolation</strong> — it calculates Jan from Dec+Feb instead of copying Dec. This keeps trend reports accurate.
      </div>
    </div>`;
  }

  // COLUMN HEALTH
  html+=`<div class="sec-card"><div class="sec-head"><div class="sec-icon" style="background:rgba(37,99,235,.12);font-size:17px">📋</div><div><div class="sec-title">Column Health</div><div class="sec-sub">Completeness % per column</div></div></div>
  ${headers.map(h=>{const s=report.colStats[h];const bc=s.pct>=90?'var(--gn)':s.pct>=60?'var(--am)':'var(--rd)';return`<div class="col-hlth"><div class="col-name" title="${h}">${h}</div><span class="col-type ${schema[h]==='number'?'t-num':schema[h]==='date'?'t-date':'t-txt'}">${schema[h]}</span><div class="col-bar"><div class="col-bar-fill" style="width:${s.pct}%;background:${bc}"></div></div><div class="col-pct" style="color:${bc}">${s.pct}%</div><div class="col-iss">${s.iss>0?`<span style="color:var(--am)">⚠ ${s.iss} issue${s.iss>1?'s':''}</span>`:'<span style="color:var(--gn)">✓ Clean</span>'}</div></div>`;}).join('')}
  </div>`;

  // ISSUE SECTIONS
  const sections=[
    {key:'dupes',icon:'🔁',title:'Duplicate Rows',sub:'Exact same rows removed',render:v=>{if(!v.length)return okRow('No duplicates found');return v.slice(0,10).map(d=>`<div class="iss-row err"><span style="font-size:17px">🔁</span><div class="iss-body"><div class="iss-t">Row ${d.row} duplicates Row ${d.first}</div><div class="iss-d">Removed from cleaned output.</div></div><span class="iss-cnt cr">REMOVED</span></div>`).join('')+(v.length>10?`<div style="font-size:11px;color:var(--t2);padding:8px 14px">…and ${v.length-10} more removed</div>`:'');}},
    {key:'missing',icon:'❓',title:'Missing Values',sub:'Filled using chosen strategy',render:v=>{if(!v.length)return okRow('No missing values');const rows2=v.slice(0,12).map(d=>{const s=strats[d.col]||'mean';let rv='–';if(schema[d.col]==='number'){if(s==='mean')rv=fmtN(Math.round(cMean(rawRows,d.col)));else if(s==='median')rv=fmtN(Math.round(cMedian(rawRows,d.col)));else if(s==='zero')rv='0';else if(s==='interpolate')rv='interpolated';else if(s==='wma')rv='avg(neighbors)';else if(s==='fwd')rv='prev row';else rv='row removed';}else if(schema[d.col]==='text'){rv=s==='mode'?cMode(rawRows,d.col):s==='fwd'?'prev row':'row removed';}else rv='interpolated';const sl={mean:'Mean',median:'Median',zero:'Zero',interpolate:'Interpolate',wma:'WMA',fwd:'Fwd Fill',mode:'Mode',remove_row:'Remove'}[s]||s;return`<tr><td><span class="r-tag">#${d.row}</span></td><td style="color:var(--tx)">${d.col}</td><td><span class="v-b">(empty)</span></td><td><span class="v-a">${rv}</span></td><td><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(37,99,235,.15);color:var(--ac2)">${sl}</span></td></tr>`;});return`<div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>Column</th><th>Before</th><th>Filled With</th><th>Strategy</th></tr></thead><tbody>${rows2.join('')}</tbody></table></div>`+(v.length>12?`<div style="font-size:11px;color:var(--t2);padding:8px 0">…and ${v.length-12} more filled</div>`:'');}},
    {key:'typeErrs',icon:'⚡',title:'Type Errors',sub:'Non-numeric values in number columns',render:v=>{if(!v.length)return okRow('No type errors');return`<div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>Column</th><th>Bad Value</th><th>Strategy Used</th></tr></thead><tbody>${v.map(d=>`<tr><td><span class="r-tag">#${d.row}</span></td><td style="color:var(--tx)">${d.col}</td><td><span class="v-b">${d.val}</span></td><td><span class="v-a">mean fill: ${fmtN(Math.round(cMean(rawRows,d.col)))}</span></td></tr>`).join('')}</tbody></table></div>`;}},
    {key:'nullTxt',icon:'🚫',title:'NULL / N/A Text',sub:'"NULL", "N/A" etc found as values',render:v=>{if(!v.length)return okRow('No null text values');return`<div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>Column</th><th>Before</th><th>Fixed</th></tr></thead><tbody>${v.map(d=>`<tr><td><span class="r-tag">#${d.row}</span></td><td style="color:var(--tx)">${d.col}</td><td><span class="v-b">${d.val}</span></td><td><span class="v-a">${schema[d.col]==='number'?'mean fill':'mode fill'}</span></td></tr>`).join('')}</tbody></table></div>`;}},
    {key:'negVals',icon:'📉',title:'Negative Values',sub:'Replaced with column mean (Power BI method)',render:v=>{if(!v.length)return okRow('No negative values');return`<div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>Column</th><th>Value</th><th>Fixed To</th></tr></thead><tbody>${v.map(d=>`<tr><td><span class="r-tag">#${d.row}</span></td><td style="color:var(--tx)">${d.col}</td><td><span class="v-b">${d.val}</span></td><td><span class="v-a">~${fmtN(Math.round(cMean(rawRows,d.col)))}</span></td></tr>`).join('')}</tbody></table></div>`;}},
    {key:'caseIss',icon:'🔠',title:'Inconsistent Casing',sub:'Same value written differently — Title Cased',render:v=>{if(!v.length)return okRow('No casing issues');return`<div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>Column</th><th>Original</th><th>Normalized</th></tr></thead><tbody>${v.slice(0,10).map(d=>`<tr><td><span class="r-tag">#${d.row}</span></td><td style="color:var(--tx)">${d.col}</td><td><span class="v-b">${d.val}</span></td><td><span class="v-a">${d.fix}</span></td></tr>`).join('')}</tbody></table></div>`+(v.length>10?`<div style="font-size:11px;color:var(--t2);padding:8px 0">…and ${v.length-10} more fixed</div>`:'');}},
    {key:'dateFmt',icon:'📅',title:'Date Format Issues',sub:'Normalized to YYYY-MM standard',render:v=>{if(!v.length)return okRow('No date format issues');return`<div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>Column</th><th>Original</th><th>Fixed</th></tr></thead><tbody>${v.map(d=>`<tr><td><span class="r-tag">#${d.row}</span></td><td style="color:var(--tx)">${d.col}</td><td><span class="v-b">${d.val}</span></td><td><span class="v-a">${d.fix}</span></td></tr>`).join('')}</tbody></table></div>`;}},
    {key:'outliers',icon:'🎯',title:'Statistical Outliers (Z-Score > 3)',sub:'Values more than 3 standard deviations from mean',render:v=>{if(!v.length)return okRow('No outliers detected');return`<div class="ba-wrap"><table class="ba-tbl"><thead><tr><th>Row</th><th>Column</th><th>Value</th><th>Mean</th><th>Z-Score</th><th>Status</th></tr></thead><tbody>${v.map(d=>`<tr><td><span class="r-tag">#${d.row}</span></td><td style="color:var(--tx)">${d.col}</td><td style="color:var(--pu);font-family:'IBM Plex Mono',monospace;font-weight:600">${fmtN(d.val)}</td><td style="color:var(--t2);font-family:'IBM Plex Mono',monospace">${fmtN(d.mean)}</td><td><span style="color:var(--rd);font-weight:700">${d.z}σ</span></td><td><span class="iss-cnt ca">FLAGGED</span></td></tr>`).join('')}</tbody></table></div>`;}}
  ];
  function okRow(msg){return`<div class="iss-row ok"><span style="font-size:17px">✅</span><div><div class="iss-t">${msg}</div></div></div>`;}
  sections.forEach(sec=>{
    const items=report[sec.key];const cnt=items.length;const ok=cnt===0;
    html+=`<div class="sec-card"><div class="sec-head"><div class="sec-icon" style="background:rgba(${ok?'16,185,129':'239,68,68'},.1);font-size:17px">${sec.icon}</div><div style="flex:1"><div class="sec-title">${sec.title} <span class="iss-cnt ${ok?'cg':'cr'}" style="margin-left:6px">${ok?'✓ None':cnt+' found'}</span></div><div class="sec-sub">${sec.sub}</div></div></div>${sec.render(items)}</div>`;
  });

  // BEFORE vs AFTER
  html+=`<div class="sec-card"><div class="sec-head"><div class="sec-icon" style="background:rgba(16,185,129,.1);font-size:17px">✨</div><div><div class="sec-title">Before vs After Comparison</div></div></div>
  <div class="compare-wrap">
    <div class="compare-panel before"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--rd);margin-bottom:12px">❌ BEFORE (Raw)</div>
    <div style="font-size:13px;line-height:2.2">📄 ${rawRows.length} total rows<br>🔁 ${report.dupes.length} duplicate rows<br>❓ ${report.missing.length} missing cells<br>⚡ ${report.typeErrs.length} type errors<br>🚫 ${report.nullTxt.length} NULL/N/A text values<br>📉 ${report.negVals.length} negative values<br>🔠 ${report.caseIss.length} case inconsistencies<br>📅 ${report.dateFmt.length} date format issues<br>🎯 ${report.outliers.length} statistical outliers</div></div>
    <div class="compare-panel after"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--gn);margin-bottom:12px">✅ AFTER (Cleaned)</div>
    <div style="font-size:13px;line-height:2.2">📄 <span id="clean-row-count">${cleaned.length}</span> clean rows (${rawRows.length-cleaned.length} removed)<br>✅ All duplicates removed<br>✅ Missing → smart filled (${strats[headers[0]]||'mean'} etc)<br>✅ Type errors → mean filled<br>✅ NULL/N/A → proper defaults<br>✅ Negatives → mean filled<br>✅ Text → Title Case<br>✅ Dates → YYYY-MM format<br>${rrInfo?`✅ Revenue recovered: ${rrInfo.total} rows`:'⚠️ Outliers flagged (kept)'}</div></div>
  </div></div>`;

  document.getElementById('cl-report').innerHTML=html;
  notify(`✓ Report complete! ${totalIss} issues found across ${rawRows.length} rows.`);
}

function updateStratPrev(h,type,mn,md,mo){
  const el=document.getElementById('ss_'+h);const sp=document.getElementById('sp_'+h);
  if(!el||!sp)return;const s=el.value;let pv='';
  if(type==='number'){if(s==='mean')pv=`→ ${fmtN(mn)}`;else if(s==='median')pv=`→ ${fmtN(md)}`;else if(s==='zero')pv='→ 0';else if(s==='interpolate')pv='→ interpolated';else if(s==='wma')pv='→ avg(neighbors)';else if(s==='fwd')pv='→ prev row';else pv='→ row removed';}
  else if(type==='text'){if(s==='mode')pv=`→ "${mo}"`;else if(s==='fwd')pv='→ prev row';else pv='→ row removed';}
  else pv=s==='remove_row'?'→ row removed':'→ interpolated';
  sp.textContent=pv;
}

function oneTapFix(){
  // set all to best defaults
  CL.headers.forEach(h=>{const el=document.getElementById('ss_'+h);if(el){if(CL.schema[h]==='number')el.value='interpolate';else if(CL.schema[h]==='text')el.value='mode';else el.value='interpolate';}});
  reApply();
  notify('⚡ One Tap Fix applied! All columns set to best strategy.');
}


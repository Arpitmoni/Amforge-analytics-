/* =====================================================
   AmForge Analytics — app.js
   Core Application Logic
   State Management · Data Engine · File Handling
   Navigation · Chart Engine · Dashboard · Insights
   Forecast · Data Table · NL Query · Export
   Developed by Arpit Moni
   Version: 2.0
   ===================================================== */


'use strict';
// ═══════════ STATE ═══════════
const APP={datasets:[],activeId:null,filterCol:'',filterVal:'',nlCharts:[],CI:{}};
const CL={rawRows:[],headers:[],schema:{},cleanedRows:[],strategies:{},report:null,fileName:'',derivedCols:[]};
const COLORS=['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899','#A78BFA','#34D399'];
const NULL_SET=new Set(['','null','n/a','na','#n/a','none','undefined','nil','missing','nan','-']);
const isNull=v=>NULL_SET.has(String(v||'').trim().toLowerCase());
const toTC=s=>s.replace(/\w\S*/g,t=>t[0].toUpperCase()+t.slice(1).toLowerCase());
const fmtN=n=>{n=parseFloat(n);if(isNaN(n))return'0';if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return(Math.round(n*100)/100).toLocaleString();};

let _nt=null;
function notify(msg,type='success'){const el=document.getElementById('notif');el.textContent=msg;el.className=type;el.style.display='block';clearTimeout(_nt);_nt=setTimeout(()=>el.style.display='none',4000);}
function killChart(id){if(APP.CI[id]){APP.CI[id].destroy();delete APP.CI[id];}}
function normDate(v){v=String(v||'').trim();if(/^\d{4}[\/]\d{1,2}/.test(v))return v.replace('/','-');if(/^\d{2}-\d{4}$/.test(v)){const[m,y]=v.split('-');return`${y}-${m}`;}return v;}

// ═══════════ DATA ENGINE ═══════════
function detectType(vals){
  const nn=vals.filter(v=>!isNull(v)&&String(v).trim());
  if(!nn.length)return'text';
  const dr=/^\d{4}[-\/]\d{1,2}([-\/]\d{1,2})?$|^\d{1,2}-\d{4}$/;
  if(nn.every(v=>!isNaN(Number(String(v).trim()))))return'number';
  if(nn.slice(0,30).every(v=>dr.test(String(v).trim())))return'date';
  return'text';
}
function parseCSV(text){
  const lines=text.trim().split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2)return null;
  const t=(lines[0].match(/\t/g)||[]).length,c=(lines[0].match(/,/g)||[]).length;
  const sep=t>c?'\t':',';
  const headers=lines[0].split(sep).map(h=>h.trim().replace(/^["']|["']$/g,'').trim()).filter(Boolean);
  if(!headers.length)return null;
  const rows=lines.slice(1).map(line=>{
    const vals=line.split(sep).map(v=>v.trim().replace(/^["']|["']$/g,''));
    const obj={};headers.forEach((h,i)=>obj[h]=vals[i]!==undefined?vals[i]:'');return obj;
  }).filter(r=>Object.values(r).some(v=>v!==''));
  const schema={};headers.forEach(h=>schema[h]=detectType(rows.map(r=>r[h])));
  return{headers,rows,schema};
}
function basicClean(rows,schema){
  const seen=new Set();
  return rows.map(row=>{const c={...row};Object.entries(schema).forEach(([h,t])=>{if(t==='number'){const v=parseFloat(c[h]);c[h]=isNaN(v)?0:v;}});return c;})
    .filter(row=>{const k=JSON.stringify(row);return seen.has(k)?false:(seen.add(k),true);});
}
const getDS=()=>APP.datasets.find(d=>d.id===APP.activeId);
function getRows(){const ds=getDS();if(!ds)return[];let r=ds.rows;if(APP.filterCol&&APP.filterVal)r=r.filter(row=>String(row[APP.filterCol]||'').toLowerCase().includes(APP.filterVal.toLowerCase()));return r;}

// ═══════════ FILE HANDLING ═══════════
function handleDrop(e){e.preventDefault();document.getElementById('dz').classList.remove('drag');[...e.dataTransfer.files].forEach(processFile);}
function handleFileInput(inp){[...inp.files].forEach(processFile);inp.value='';}
function processFile(file){
  if(!['csv','txt'].includes(file.name.split('.').pop().toLowerCase())){notify('Please upload a CSV or TXT file.','error');return;}
  const r=new FileReader();
  r.onload=e=>{
    const p=parseCSV(e.target.result);
    if(!p){notify('Could not parse file — check CSV format.','error');return;}
    const c=basicClean(p.rows,p.schema);
    const id='ds_'+Date.now();
    APP.datasets.push({id,name:file.name,headers:p.headers,rows:c,schema:p.schema});
    APP.activeId=id;APP.filterCol='';APP.filterVal='';
    updateNav();showScreen('dashboard');
    notify(`✓ ${c.length.toLocaleString()} rows loaded from ${file.name}`);
  };
  r.readAsText(file);
}

// ═══════════ NAVIGATION ═══════════
const TITLES={import:'IMPORT DATA',dashboard:'AUTO DASHBOARD',charts:'CHART GALLERY',ai:'AI INSIGHTS',forecast:'FORECASTING',datatable:'DATA TABLE',nl:'ASK AI',cleaner:'DATA CLEANER PRO',vscompare:'VS POWER BI'};
const SUBS={import:'Upload your CSV file to get started',dashboard:'Auto-generated KPIs and charts',charts:'All chart types with live switching',ai:'AI-powered pattern and anomaly detection',forecast:'Linear regression for next 3 periods',datatable:'Search and filter raw data',nl:'Type English to generate charts instantly',cleaner:'Power BI-grade data quality + smart fixing',vscompare:'How AmForge compares to Power BI'};

function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const sc=document.getElementById('sc-'+name);if(sc)sc.classList.add('active');
  document.querySelectorAll('.ni[data-sc]').forEach(b=>b.classList.toggle('active',b.dataset.sc===name));
  document.getElementById('tb-title').textContent=TITLES[name]||name.toUpperCase();
  const ds=getDS();
  document.getElementById('tb-sub').textContent=ds&&!['import','vscompare'].includes(name)?`${ds.name} · ${ds.rows.length.toLocaleString()} rows · ${ds.headers.length} cols`:SUBS[name]||'';
  const eb=document.getElementById('exp-btns');
  eb.style.display=ds&&['dashboard','charts','datatable'].includes(name)?'flex':'none';
  if(name==='dashboard')renderDashboard();
  else if(name==='charts')renderAllCharts();
  else if(name==='ai')renderInsights();
  else if(name==='forecast')renderForecast();
  else if(name==='datatable')renderTable();
  else if(name==='nl')renderNL();
  else if(name==='vscompare')renderVS();
}
document.querySelectorAll('.ni[data-sc]').forEach(b=>b.addEventListener('click',()=>showScreen(b.dataset.sc)));

function updateNav(){
  const sep=document.getElementById('ds-sep'),nav=document.getElementById('ds-nav');
  sep.style.display=APP.datasets.length?'block':'none';
  nav.innerHTML=APP.datasets.map(ds=>`<button class="ds-item ${ds.id===APP.activeId?'active':''}" onclick="switchDS('${ds.id}')"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${ds.name}</span></button>`).join('');
  renderDSList();
}
function switchDS(id){APP.activeId=id;APP.filterCol='';APP.filterVal='';updateNav();showScreen('dashboard');}
function renderDSList(){
  const w=document.getElementById('ds-list-wrap'),items=document.getElementById('ds-list-items');
  if(!APP.datasets.length){w.style.display='none';return;}
  w.style.display='block';
  items.innerHTML=APP.datasets.map(ds=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;background:var(--s1);border-radius:10px;border:1px solid var(--b1);margin-bottom:8px"><div style="display:flex;align-items:center;gap:10px"><svg width="15" height="15" fill="none" stroke="var(--ac2)" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div><div style="font-size:13px;font-weight:500">${ds.name}</div><div style="font-size:11px;color:var(--t2)">${ds.rows.length.toLocaleString()} rows · ${ds.headers.length} cols</div></div></div><div style="display:flex;gap:6px"><button class="btn btn-ghost btn-xs" onclick="switchDS('${ds.id}')">Open</button><button class="btn btn-danger btn-xs" onclick="removeDS('${ds.id}')">✕</button></div></div>`).join('');
}
function removeDS(id){APP.datasets=APP.datasets.filter(d=>d.id!==id);if(APP.activeId===id)APP.activeId=APP.datasets[0]?.id||null;updateNav();if(!APP.activeId)showScreen('import');}

// ═══════════ CHART ENGINE ═══════════
function buildChart(cid,type,labels,values){
  killChart(cid);
  const canvas=document.getElementById(cid);if(!canvas)return;
  const gc='#1E2840';
  const cols=Array.isArray(labels)?labels.map((_,i)=>COLORS[i%COLORS.length]):[COLORS[0]];
  const baseOpts={responsive:true,maintainAspectRatio:true,plugins:{legend:{display:type==='pie',labels:{color:'#475569',font:{size:10}}},tooltip:{callbacks:{label:c=>` ${fmtN(c.raw)}`}}},scales:(type==='pie')?{}:{x:{ticks:{color:'#475569',font:{size:9,family:'IBM Plex Mono'}},grid:{color:gc},border:{color:gc}},y:{ticks:{color:'#475569',font:{size:9,family:'IBM Plex Mono'},callback:fmtN},grid:{color:gc},border:{color:gc}}}};
  let ds,ct=type==='area'?'line':type==='histogram'?'bar':type;
  if(type==='pie')ds={data:values,backgroundColor:cols,borderColor:'#06080E',borderWidth:2};
  else if(type==='scatter')ds={data:values,backgroundColor:'rgba(37,99,235,.65)',pointRadius:5,pointHoverRadius:7};
  else if(type==='line')ds={data:values,borderColor:COLORS[0],backgroundColor:'transparent',borderWidth:2,pointBackgroundColor:COLORS[0],pointRadius:3,tension:.35};
  else if(type==='area')ds={data:values,borderColor:COLORS[0],backgroundColor:'rgba(37,99,235,.1)',borderWidth:2,fill:true,tension:.35};
  else ds={data:values,backgroundColor:cols,borderRadius:4,borderSkipped:false};
  APP.CI[cid]=new Chart(canvas.getContext('2d'),{type:ct==='scatter'?'scatter':ct,data:ct==='scatter'?{datasets:[ds]}:{labels,datasets:[ds]},options:baseOpts});
}

function agg(rows,gcol,ncol){
  const m={};
  rows.forEach(r=>{
    const k=String(r[gcol]||'').trim();
    const nulls=new Set(['','null','n/a','na','none','undefined','nil','missing','nan','-','?','NULL','N/A']);
    if(!k||nulls.has(k.toLowerCase()))return;
    const v=parseFloat(r[ncol]);
    if(isNaN(v))return;
    m[k]=(m[k]||0)+v;
  });
  return m;
}

function makeChartCard(id,title,pts,type){
  const types=['bar','line','pie','area','scatter','histogram'];
  return`<div class="chart-card"><div class="ch-head"><div><div class="ch-title">${title}</div><div class="ch-pts">${pts} data points</div></div></div><div class="type-btns">${types.map(t=>`<button class="type-btn${t===type?' on':''}" onclick="switchChartType('${id}','${t}',this)">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}</div><canvas id="${id}"></canvas></div>`;
}

function getChartData(rows,schema){
  const nums=Object.entries(schema).filter(([,t])=>t==='number').map(([k])=>k);
  const cats=Object.entries(schema).filter(([,t])=>t==='text').map(([k])=>k);
  const dates=Object.entries(schema).filter(([,t])=>t==='date').map(([k])=>k);
  const out=[];if(!nums.length)return out;
  if(cats.length){const m=agg(rows,cats[0],nums[0]);const s=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10);out.push({id:'c_bar',type:'bar',title:`${nums[0]} by ${cats[0]}`,labels:s.map(e=>e[0]),values:s.map(e=>Math.round(e[1])),pts:s.length});}
  if(dates.length){const m=agg(rows,dates[0],nums[0]);const s=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));out.push({id:'c_line',type:'line',title:`${nums[0]} Trend (${dates[0]})`,labels:s.map(e=>e[0]),values:s.map(e=>Math.round(e[1])),pts:s.length});}
  const cc=cats.length>1?cats[1]:cats[0]||dates[0];
  if(cc){const m=agg(rows,cc,nums[0]);const s=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6);out.push({id:'c_pie',type:'pie',title:`${nums[0]} Share by ${cc}`,labels:s.map(e=>e[0]),values:s.map(e=>Math.round(e[1])),pts:s.length});}
  if(nums.length>1){const gc=dates[0]||cats[0];if(gc){const m=agg(rows,gc,nums[1]);const s=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,12);out.push({id:'c_area',type:'area',title:`${nums[1]} Area Trend`,labels:s.map(e=>e[0]),values:s.map(e=>Math.round(e[1])),pts:s.length});}}
  if(nums.length>=2){const pts=rows.slice(0,200).map(r=>({x:parseFloat(r[nums[0]])||0,y:parseFloat(r[nums[1]])||0}));out.push({id:'c_scatter',type:'scatter',title:`${nums[0]} vs ${nums[1]}`,scatter:pts,pts:pts.length});}
  if(nums.length){const vals=rows.map(r=>parseFloat(r[nums[0]])||0).filter(v=>v>0);if(vals.length){const mn=Math.min(...vals),mx=Math.max(...vals),bins=10,bs=(mx-mn)/bins||1;const h=Array.from({length:bins},(_,i)=>({l:Math.round(mn+i*bs)+'',v:0}));vals.forEach(v=>{const i=Math.min(Math.floor((v-mn)/bs),bins-1);h[i].v++;});out.push({id:'c_hist',type:'histogram',title:`${nums[0]} Distribution`,labels:h.map(e=>e.l),values:h.map(e=>e.v),pts:vals.length});}}
  return out;
}

function renderCharts(containerId,rows,schema){
  const cdata=getChartData(rows,schema);
  const el=document.getElementById(containerId);
  if(!cdata.length){el.innerHTML='<div style="color:var(--t2);padding:40px;text-align:center">No numeric columns found for charts.</div>';return;}
  el.innerHTML=cdata.map(c=>makeChartCard(c.id,c.title,c.pts,c.type)).join('');
  setTimeout(()=>cdata.forEach(c=>{
    if(c.type==='scatter')buildChart(c.id,'scatter',null,c.scatter||[]);
    else buildChart(c.id,c.type,c.labels,c.values);
  }),30);
}

// chart type switching — rebuild with same data
function switchChartType(id,newType,btn){
  const ds=getDS();if(!ds)return;
  const rows=getRows();
  const allData=getChartData(rows,ds.schema);
  const cfg=allData.find(c=>c.id===id);
  if(!cfg)return;
  btn.closest('.type-btns').querySelectorAll('.type-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  if(newType==='scatter'&&cfg.scatter)buildChart(id,'scatter',null,cfg.scatter);
  else if(newType==='scatter'&&!cfg.scatter)notify('Scatter needs 2 numeric columns','error');
  else buildChart(id,newType,cfg.labels,cfg.values);
}

// ═══════════ DASHBOARD ═══════════
function renderDashboard(){
  const ds=getDS();if(!ds){showScreen('import');return;}
  const rows=getRows();
  const nums=Object.entries(ds.schema).filter(([,t])=>t==='number').map(([k])=>k);
  const cats=Object.entries(ds.schema).filter(([,t])=>t==='text').map(([k])=>k);
  // filter bar
  const fc=document.getElementById('f-col');
  fc.innerHTML='<option value="">Filter by column...</option>'+cats.map(c=>`<option value="${c}"${c===APP.filterCol?' selected':''}>${c}</option>`).join('');
  document.getElementById('f-val').value=APP.filterVal;
  document.getElementById('f-count').textContent=`${rows.length.toLocaleString()} of ${ds.rows.length.toLocaleString()} rows`;
  // KPIs
  const kColors=['var(--ac2)','var(--gn)','var(--am)','var(--pu)','var(--cy)'];
  document.getElementById('kpi-grid').innerHTML=nums.slice(0,4).map((col,i)=>{
    const vals=rows.map(r=>parseFloat(r[col])||0);
    const tot=vals.reduce((a,b)=>a+b,0),avg=tot/vals.length,mx=Math.max(...vals);
    const c=kColors[i%kColors.length];
    return`<div class="kpi-card"><div class="kpi-glow" style="background:${c}"></div><div class="kpi-label">${col}</div><div class="kpi-val" style="color:${c}">${fmtN(tot)}</div><div class="kpi-sub">Avg: ${fmtN(avg)} · Max: ${fmtN(mx)}</div><div class="kpi-bar"><div class="kpi-bar-fill" style="width:${Math.min(90,65)}%;background:${c}"></div></div></div>`;
  }).join('')+`<div class="kpi-card"><div class="kpi-glow" style="background:var(--cy)"></div><div class="kpi-label">Records</div><div class="kpi-val" style="color:var(--cy)">${rows.length.toLocaleString()}</div><div class="kpi-sub">${ds.headers.length} columns detected</div><div class="kpi-bar"><div class="kpi-bar-fill" style="width:80%;background:var(--cy)"></div></div></div>`;
  // Runtime schema recheck for messy data
  const rSchema={};
  ds.headers.forEach(h=>{
    const vals=rows.map(r=>String(r[h]||'').trim()).filter(v=>v&&!['null','n/a','na','none','nan','-'].includes(v.toLowerCase()));
    const numVals=vals.filter(v=>!isNaN(parseFloat(v))&&isFinite(v));
    const dateRx=/^\d{4}[-\/]\d{1,2}([-\/]\d{1,2})?$|^\d{1,2}-\d{4}$/;
    if(vals.length&&numVals.length/vals.length>0.6)rSchema[h]='number';
    else if(vals.length&&vals.filter(v=>dateRx.test(v)).length/vals.length>0.6)rSchema[h]='date';
    else rSchema[h]='text';
  });
  renderCharts('dash-charts',rows,rSchema);
}
function applyFilter(){APP.filterCol=document.getElementById('f-col').value;APP.filterVal=document.getElementById('f-val').value;renderDashboard();}
function clearFilter(){APP.filterCol='';APP.filterVal='';document.getElementById('f-val').value='';renderDashboard();}

// ═══════════ CHARTS SCREEN ═══════════
function renderAllCharts(){
  const ds=getDS();if(!ds)return;
  const rows=getRows();
  // Recheck schema at runtime — messy data may have wrong types from initial parse
  const schema={};
  ds.headers.forEach(h=>{
    const vals=rows.map(r=>String(r[h]||'').trim()).filter(v=>v&&!['null','n/a','na','none','nan','-'].includes(v.toLowerCase()));
    const numVals=vals.filter(v=>!isNaN(parseFloat(v))&&isFinite(v));
    const dateRx=/^\d{4}[-\/]\d{1,2}([-\/]\d{1,2})?$|^\d{1,2}-\d{4}$/;
    const dateVals=vals.filter(v=>dateRx.test(v));
    if(vals.length&&numVals.length/vals.length>0.6)schema[h]='number';
    else if(vals.length&&dateVals.length/vals.length>0.6)schema[h]='date';
    else schema[h]='text';
  });
  renderCharts('all-charts',rows,schema);
}

// ═══════════ AI INSIGHTS ═══════════
function renderInsights(){
  const ds=getDS();if(!ds){document.getElementById('ins-list').innerHTML='<div style="color:var(--t2);padding:20px;text-align:center">Load a dataset first.</div>';return;}
  const rows=getRows(),schema=ds.schema;
  const nums=Object.entries(schema).filter(([,t])=>t==='number').map(([k])=>k);
  const cats=Object.entries(schema).filter(([,t])=>t==='text').map(([k])=>k);
  const insights=[];
  nums.forEach(col=>{
    const vals=rows.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));
    if(!vals.length)return;
    const sum=vals.reduce((a,b)=>a+b,0),avg=sum/vals.length;
    const std=Math.sqrt(vals.reduce((s,v)=>s+Math.pow(v-avg,2),0)/vals.length);
    const mx=Math.max(...vals),mn=Math.min(...vals);
    // Top/Bottom
    if(cats.length){const m=agg(rows,cats[0],col);const s=Object.entries(m).sort((a,b)=>b[1]-a[1]);if(s.length>=2){insights.push({type:'positive',em:'🏆',text:`<strong>${s[0][0]}</strong> leads in <strong>${col}</strong> with ${fmtN(s[0][1])} — ${((s[0][1]/s[s.length-1][1]-1)*100).toFixed(0)}% more than bottom performer <strong>${s[s.length-1][0]}</strong>`});}}
    // Anomalies
    const anoms=rows.filter(r=>{const v=parseFloat(r[col]);return!isNaN(v)&&Math.abs(v-avg)>2.5*std;});
    if(anoms.length)insights.push({type:'alert',em:'⚠️',text:`<strong>${anoms.length} anomaly rows</strong> in <strong>${col}</strong> — values beyond 2.5σ. Avg: ${fmtN(avg)}, flagged range: <${fmtN(avg-2.5*std)} or >${fmtN(avg+2.5*std)}`});
    // Growth (if date col)
    const dates=Object.entries(schema).filter(([,t])=>t==='date').map(([k])=>k);
    if(dates.length){const m=agg(rows,dates[0],col);const s=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));if(s.length>=2){const first=s[0][1],last=s[s.length-1][1],growth=((last/first-1)*100).toFixed(1);insights.push({type:parseFloat(growth)>=0?'positive':'warning',em:parseFloat(growth)>=0?'📈':'📉',text:`<strong>${col}</strong> changed <strong>${growth}%</strong> from ${s[0][0]} to ${s[s.length-1][0]}`});}}
    // High variance
    const cv=(std/avg*100);if(cv>50)insights.push({type:'warning',em:'📊',text:`<strong>${col}</strong> has high variability (CV: ${cv.toFixed(0)}%) — data is widely spread. Min: ${fmtN(mn)}, Max: ${fmtN(mx)}`});
  });
  if(!insights.length)insights.push({type:'info',em:'✅',text:'Data looks clean and consistent — no anomalies or issues detected.'});
  document.getElementById('ins-list').innerHTML=insights.map((ins,i)=>`<div class="ins-card ${ins.type}" style="animation-delay:${i*0.05}s"><span style="font-size:19px">${ins.em}</span><div class="ins-tx">${ins.text}</div></div>`).join('');
  // schema tags
  document.getElementById('schema-tags').innerHTML=ds.headers.map(h=>{const t=ds.schema[h];const c=t==='number'?'var(--cy)':t==='date'?'var(--am)':'var(--ac2)';return`<span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:rgba(${t==='number'?'6,182,212':t==='date'?'245,158,11':'37,99,235'},.12);color:${c};border:1px solid ${c}33">${h} <span style="opacity:.6;font-weight:400">${t}</span></span>`;}).join('');
}

// ═══════════ FORECAST ═══════════
function renderForecast(){
  const ds=getDS();if(!ds)return;
  const rows=getRows(),schema=ds.schema;
  const dates=Object.entries(schema).filter(([,t])=>t==='date').map(([k])=>k);
  const nums=Object.entries(schema).filter(([,t])=>t==='number').map(([k])=>k);
  if(!nums.length||!dates.length){document.getElementById('fc-cards').innerHTML='<div style="color:var(--t2);padding:20px">Need at least 1 date column and 1 numeric column.</div>';return;}
  const m=agg(rows,dates[0],nums[0]);
  const sorted=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
  const n=sorted.length,xVals=sorted.map((_,i)=>i),yVals=sorted.map(e=>e[1]);
  const xm=xVals.reduce((a,b)=>a+b,0)/n,ym=yVals.reduce((a,b)=>a+b,0)/n;
  const slope=(xVals.reduce((s,x,i)=>s+(x-xm)*(yVals[i]-ym),0))/(xVals.reduce((s,x)=>s+Math.pow(x-xm,2),0)||1);
  const intercept=ym-slope*xm;
  const fc=[{l:'P+1',v:Math.max(0,Math.round(intercept+slope*(n)))},{l:'P+2',v:Math.max(0,Math.round(intercept+slope*(n+1)))},{l:'P+3',v:Math.max(0,Math.round(intercept+slope*(n+2)))}];
  const allLabels=[...sorted.map(e=>e[0]),'P+1','P+2','P+3'];
  const histData=sorted.map(e=>e[1]);
  const forecastData=[...Array(n).fill(null),...fc.map(f=>f.v)];
  killChart('fc-chart');
  const canvas=document.getElementById('fc-chart');if(!canvas)return;
  APP.CI['fc-chart']=new Chart(canvas.getContext('2d'),{type:'line',data:{labels:allLabels,datasets:[{label:'Historical',data:histData,borderColor:'#2563EB',backgroundColor:'rgba(37,99,235,.1)',borderWidth:2,fill:true,tension:.35,pointRadius:3,spanGaps:false},{label:'Forecast',data:forecastData,borderColor:'#F59E0B',backgroundColor:'rgba(245,158,11,.15)',borderWidth:2,borderDash:[6,4],fill:true,tension:.2,pointRadius:5,pointBackgroundColor:'#F59E0B',spanGaps:false}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{color:'#94A3B8',font:{size:11}}}},scales:{x:{ticks:{color:'#475569',font:{size:9}},grid:{color:'#1E2840'},border:{color:'#1E2840'}},y:{ticks:{color:'#475569',font:{size:9},callback:fmtN},grid:{color:'#1E2840'},border:{color:'#1E2840'}}}}});
  document.getElementById('fc-cards').innerHTML=fc.map(f=>`<div class="fc-card"><div class="fc-lbl">Forecast ${f.l}</div><div class="fc-val">${fmtN(f.v)}</div><div class="fc-sub">Predicted ${nums[0]}</div></div>`).join('');
}

// ═══════════ DATA TABLE ═══════════
function renderTable(){
  const ds=getDS();if(!ds)return;
  const srch=document.getElementById('tbl-srch').value.toLowerCase();
  const col=document.getElementById('tbl-col').value;
  document.getElementById('tbl-col').innerHTML='<option value="">All columns</option>'+ds.headers.map(h=>`<option value="${h}">${h}</option>`).join('');
  document.getElementById('tbl-head').innerHTML=`<tr>${ds.headers.map(h=>`<th>${h}<span class="type-tag">${ds.schema[h]}</span></th>`).join('')}</tr>`;
  let rows=ds.rows;
  if(srch)rows=rows.filter(r=>{const t=col?String(r[col]):Object.values(r).join(' ');return t.toLowerCase().includes(srch);});
  document.getElementById('tbl-count').textContent=`${rows.length.toLocaleString()} rows`;
  document.getElementById('tbl-body').innerHTML=rows.slice(0,500).map(r=>`<tr>${ds.headers.map(h=>`<td class="${ds.schema[h]==='number'?'num':''}">${ds.schema[h]==='number'?fmtN(r[h]):r[h]}</td>`).join('')}</tr>`).join('');
}

// ═══════════ NL QUERY ═══════════
function renderNL(){
  const ds=getDS();if(!ds)return;
  const nums=Object.entries(ds.schema).filter(([,t])=>t==='number').map(([k])=>k);
  const cats=Object.entries(ds.schema).filter(([,t])=>t==='text').map(([k])=>k);
  const sugs=[`Show ${nums[0]||'revenue'} by ${cats[0]||'category'}`,`${nums[0]||'revenue'} trend over time`,`Top 5 ${cats[0]||'products'} by ${nums[0]||'sales'}`,`Distribution of ${nums[0]||'revenue'}`];
  document.getElementById('nl-sug').innerHTML=sugs.map(s=>`<button class="nl-sug-btn" onclick="document.getElementById('nl-in').value='${s}'">${s}</button>`).join('');
  renderNLCharts();
}
function buildNLChart(){
  const ds=getDS();if(!ds){notify('Load a dataset first','error');return;}
  const q=document.getElementById('nl-in').value.trim();if(!q)return;
  const ql=q.toLowerCase();
  const nums=Object.entries(ds.schema).filter(([,t])=>t==='number').map(([k])=>k);
  const cats=Object.entries(ds.schema).filter(([,t])=>t==='text').map(([k])=>k);
  if(!nums.length){notify('No numeric columns found','error');return;}
  let type='bar';
  if(ql.includes('trend')||ql.includes('over time')||ql.includes('line'))type='line';
  else if(ql.includes('pie')||ql.includes('share')||ql.includes('distribution'))type='pie';
  else if(ql.includes('area'))type='area';
  else if(ql.includes('scatter')||ql.includes(' vs '))type='scatter';
  const topN=(ql.match(/top\s*(\d+)/)||[,10])[1]*1;
  const numCol=nums.find(c=>ql.includes(c.toLowerCase()))||nums[0];
  const catCol=cats.find(c=>ql.includes(c.toLowerCase()))||cats[0];
  const rows=getRows();
  const id='nl_'+Date.now();
  if(type==='scatter'&&nums.length>=2){APP.nlCharts.unshift({id,title:`"${q}"`,type:'scatter',scatter:rows.slice(0,150).map(r=>({x:parseFloat(r[nums[0]])||0,y:parseFloat(r[nums[1]])||0})),pts:150});}
  else{const m=agg(rows,catCol||ds.headers[0],numCol);const s=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,topN);APP.nlCharts.unshift({id,title:`"${q}"`,type,labels:s.map(e=>e[0]),values:s.map(e=>Math.round(e[1])),pts:s.length});}
  document.getElementById('nl-in').value='';
  document.getElementById('nl-empty').style.display='none';
  renderNLCharts();
  notify(`✓ Chart created: "${q}"`);
}
function renderNLCharts(){
  const c=document.getElementById('nl-charts');
  if(!APP.nlCharts.length)return;
  c.innerHTML=APP.nlCharts.map(ch=>makeChartCard(ch.id,ch.title,ch.pts,ch.type)+`<button onclick="removeNLChart('${ch.id}')" style="margin-top:8px;font-size:11px;color:var(--t2);background:none;border:none;cursor:pointer">✕ Remove</button>`).join('');
  setTimeout(()=>APP.nlCharts.forEach(ch=>{
    if(ch.type==='scatter')buildChart(ch.id,'scatter',null,ch.scatter||[]);
    else buildChart(ch.id,ch.type,ch.labels,ch.values);
  }),30);
}
function removeNLChart(id){APP.nlCharts=APP.nlCharts.filter(c=>c.id!==id);if(!APP.nlCharts.length)document.getElementById('nl-empty').style.display='block';renderNLCharts();}

// ═══════════ EXPORT ═══════════
function exportCSV(){
  const ds=getDS();if(!ds)return;
  const rows=getRows();
  const csv=[ds.headers.join(','),...rows.map(r=>ds.headers.map(h=>`"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=ds.name.replace('.csv','')+'_filtered.csv';a.click();
  notify('✓ CSV exported!');
}

// ═══════════ SAMPLE DATA ═══════════
const CLEAN_CSV=`Date,Product,Region,Salesperson,Revenue,Units,Profit,Rating
2024-01,Laptop Pro,North,Amit,84200,42,22100,4.5
2024-01,SmartPhone X,South,Priya,61500,205,18450,4.2
2024-01,Tablet Air,East,Rahul,32400,108,9720,3.8
2024-01,Headphones,West,Sneha,18900,315,5670,4.7
2024-01,Smart Watch,North,Vikram,24600,82,7380,4.1
2024-02,Laptop Pro,West,Amit,91800,46,24780,4.6
2024-02,SmartPhone X,North,Priya,78200,260,23460,4.3
2024-02,Tablet Air,South,Rahul,28900,96,8670,3.9
2024-02,Headphones,East,Sneha,22400,373,6720,4.8
2024-02,Smart Watch,West,Vikram,31200,104,9360,4.0
2024-03,Laptop Pro,East,Amit,102500,51,28700,4.7
2024-03,SmartPhone X,West,Priya,88400,294,26520,4.4
2024-03,Tablet Air,North,Rahul,41200,137,12360,4.1
2024-03,Headphones,South,Sneha,19800,330,5940,4.6
2024-03,Smart Watch,East,Vikram,28900,96,8670,4.2
2024-04,Laptop Pro,South,Amit,88600,44,23922,4.4
2024-04,SmartPhone X,East,Priya,94100,313,28230,4.5
2024-04,Tablet Air,West,Rahul,35600,118,10680,3.7
2024-04,Headphones,North,Sneha,27300,455,8190,4.9
2024-04,Smart Watch,South,Vikram,33600,112,10080,4.3
2024-05,Laptop Pro,North,Amit,118200,59,31914,4.8
2024-05,SmartPhone X,South,Priya,102400,341,30720,4.6
2024-05,Tablet Air,East,Rahul,48900,163,14670,4.2
2024-05,Headphones,West,Sneha,31200,520,9360,4.7
2024-05,Smart Watch,North,Vikram,39800,132,11940,4.4
2024-06,Laptop Pro,West,Amit,125600,62,33912,4.9
2024-06,SmartPhone X,North,Priya,115800,386,34740,4.7
2024-06,Tablet Air,South,Rahul,52100,173,15630,4.3
2024-06,Headphones,East,Sneha,28900,481,8670,4.8
2024-06,Smart Watch,West,Vikram,44200,147,13260,4.5
2024-07,Laptop Pro,East,Amit,112400,56,30348,4.6
2024-07,SmartPhone X,West,Priya,108200,360,32460,4.5
2024-07,Tablet Air,North,Rahul,45800,152,13740,4.0
2024-07,Headphones,South,Sneha,33600,560,10080,4.9
2024-07,Smart Watch,East,Vikram,41500,138,12450,4.3
2024-08,Laptop Pro,South,Amit,131000,65,35370,4.9
2024-08,SmartPhone X,East,Priya,124600,415,37380,4.8
2024-08,Tablet Air,West,Rahul,58200,194,17460,4.4
2024-08,Headphones,North,Sneha,36800,613,11040,4.7
2024-08,Smart Watch,South,Vikram,48900,163,14670,4.6
2024-09,Laptop Pro,North,Amit,142800,71,38556,4.9
2024-09,SmartPhone X,South,Priya,138200,460,41460,4.8
2024-09,Tablet Air,East,Rahul,61400,204,18420,4.5
2024-09,Headphones,West,Sneha,42100,701,12630,4.8
2024-09,Smart Watch,North,Vikram,52300,174,15690,4.7
2024-10,Laptop Pro,West,Amit,158400,79,42768,4.8
2024-10,SmartPhone X,North,Priya,152800,509,45840,4.9
2024-10,Tablet Air,South,Rahul,68900,229,20670,4.6
2024-10,Headphones,East,Sneha,48200,803,14460,4.9
2024-10,Smart Watch,West,Vikram,57800,192,17340,4.8
2024-11,Laptop Pro,East,Amit,189200,94,51084,5.0
2024-11,SmartPhone X,West,Priya,178400,594,53520,4.9
2024-11,Tablet Air,North,Rahul,82400,274,24720,4.7
2024-11,Headphones,South,Sneha,58900,981,17670,4.8
2024-11,Smart Watch,East,Vikram,68200,227,20460,4.9
2024-12,Laptop Pro,South,Amit,224600,112,60642,5.0
2024-12,SmartPhone X,East,Priya,198600,661,59580,4.9
2024-12,Tablet Air,West,Rahul,94200,314,28260,4.8
2024-12,Headphones,North,Sneha,72400,1206,21720,4.9
2024-12,Smart Watch,South,Vikram,81400,271,24420,4.8`;

function loadSample(){const p=parseCSV(CLEAN_CSV);const c=basicClean(p.rows,p.schema);const id='ds_'+Date.now();APP.datasets.push({id,name:'SalesData_2024.csv',headers:p.headers,rows:c,schema:p.schema});APP.activeId=id;APP.filterCol='';APP.filterVal='';updateNav();showScreen('dashboard');notify('✓ Sample dataset loaded — 60 rows');}

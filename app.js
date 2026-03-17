

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
  const nullLike=new Set(['null','n/a','na','none','nan','-','abc','#n/a','undefined']);
  // Filter out null-like and error values before type check
  const clean=nn.filter(v=>!nullLike.has(String(v).trim().toLowerCase()));
  if(!clean.length)return'text';
  const numVals=clean.filter(v=>!isNaN(Number(String(v).trim()))&&String(v).trim()!=='');
  // If 60%+ values are numeric -> treat as number column
  if(numVals.length/clean.length>=0.6)return'number';
  if(clean.slice(0,30).every(v=>dr.test(String(v).trim())))return'date';
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
    let k=String(r[gcol]||'').trim();
    // Normalize date formats for consistent grouping
    if(/^\d{2}-\d{4}$/.test(k)){const[mo,yr]=k.split('-');k=`${yr}-${mo.padStart(2,'0')}`;}
    if(/^\d{4}\/\d{1,2}/.test(k))k=k.replace('/','-');
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
  const nullLike2=new Set(['null','n/a','na','none','nan','-','abc','#n/a','undefined']);
  headers.forEach(h=>{
    const vals=rawRows.map(r=>r[h]);
    const nn=vals.filter(v=>!isNull(v)&&v!=='NULL'&&v!=='N/A');
    const clean=nn.filter(v=>!nullLike2.has(String(v||'').trim().toLowerCase()));
    const dr=/^\d{4}[-\/]\d{1,2}([-\/]\d{1,2})?$|^\d{1,2}-\d{4}$/;
    const numVals=clean.filter(v=>!isNaN(Number(String(v).trim()))&&String(v).trim()!='');
    if(clean.length&&numVals.length/clean.length>=0.6)schema[h]='number';
    else if(clean.slice(0,30).every(v=>dr.test(String(v).trim())))schema[h]='date';
    else schema[h]='text';
  });
  CL.schema=schema;
  const report=analyzeData(rawRows,headers,schema);
  CL.report=report;
  const strats=strategies||buildDefaultStrats(headers,schema);
  CL.strategies=strats;
  const cleaned=buildCleaned(rawRows,headers,schema,report,strats);
  CL.cleanedRows=cleaned;
  document.getElementById('cl-zone').style.display='none';
  document.getElementById('cl-dl-btn').style.display='none'; // hidden until after fix
  renderBeforeScreen(report,rawRows,headers,schema,fileName);
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
        // Outlier check (z-score > 3) — replace with mean
        const numV=parseFloat(v);
        const colMean=schema[h]==='number'?cMean(rawRows,h):0;
        const colStd=schema[h]==='number'?Math.sqrt(rawRows.map(r=>parseFloat(r[h])).filter(x=>!isNaN(x)&&x>=0).reduce((s,x,_,a)=>s+Math.pow(x-colMean,2),0)/(rawRows.length||1)):0;
        const isOutlier=schema[h]==='number'&&!isNaN(numV)&&colStd>0&&Math.abs(numV-colMean)>3*colStd;
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
        if(isOutlier)v=String(Math.round(colMean));
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
// ═══════════ BEFORE SCREEN — show score only ═══════════
function renderBeforeScreen(report,rawRows,headers,schema,fileName){
  const totalIss=report.missing.length+report.dupes.length+report.typeErrs.length+report.outliers.length+report.caseIss.length+report.negVals.length+report.nullTxt.length+report.dateFmt.length;
  const maxScore=rawRows.length*headers.length;
  const score=Math.max(0,Math.round(((maxScore-totalIss)/maxScore)*100));
  const sColor=score>=80?'var(--gn)':score>=50?'var(--am)':'var(--rd)';
  const sLabel=score>=80?'Good Quality':score>=50?'Needs Cleaning':'Poor Quality';

  // Issue breakdown
  const issBreakdown=[
    {icon:'🔁',label:'Duplicates',val:report.dupes.length,c:'var(--rd)'},
    {icon:'❓',label:'Missing Values',val:report.missing.length,c:'var(--am)'},
    {icon:'⚡',label:'Type Errors',val:report.typeErrs.length,c:'var(--rd)'},
    {icon:'🔠',label:'Case Issues',val:report.caseIss.length,c:'var(--am)'},
    {icon:'📉',label:'Negatives',val:report.negVals.length,c:'var(--rd)'},
    {icon:'📅',label:'Date Format',val:report.dateFmt.length,c:'var(--am)'},
    {icon:'🎯',label:'Outliers',val:report.outliers.length,c:'var(--pu)'},
    {icon:'🚫',label:'NULL Text',val:report.nullTxt.length,c:'var(--am)'},
  ].filter(i=>i.val>0);

  const html=`
  <div style="max-width:700px;margin:0 auto">
    <!-- BEFORE SCORE CARD -->
    <div style="background:var(--s1);border:2px solid ${sColor}33;border-radius:18px;padding:32px;text-align:center;margin-bottom:20px;position:relative;overflow:hidden">
      <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:${sColor};opacity:.04"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t2);margin-bottom:12px">📊 DATA QUALITY SCORE — BEFORE CLEANING</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:96px;line-height:1;color:${sColor};letter-spacing:-2px">${score}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${sColor};letter-spacing:1px;margin-top:4px">${sLabel}</div>
      <div style="font-size:13px;color:var(--t2);margin-top:10px">${rawRows.length} rows · ${headers.length} cols · <strong style="color:${sColor}">${totalIss} issues found</strong></div>
      <div style="width:100%;height:10px;background:var(--b1);border-radius:6px;margin:16px 0 0;overflow:hidden">
        <div style="width:${score}%;height:100%;background:${sColor};border-radius:6px;transition:width 1s ease"></div>
      </div>
    </div>

    <!-- ISSUE BREAKDOWN -->
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:14px;padding:22px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;margin-bottom:16px;color:var(--tx)">⚠️ Issues Found in Your Data</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
        ${issBreakdown.map(i=>`
          <div style="background:var(--s2);border:1px solid var(--b1);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:22px;margin-bottom:6px">${i.icon}</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:700;color:${i.c}">${i.val}</div>
            <div style="font-size:10px;color:var(--t2);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-top:4px">${i.label}</div>
          </div>`).join('')}
      </div>
      ${!issBreakdown.length?'<div style="text-align:center;color:var(--gn);padding:20px">✅ No issues found — data is clean!</div>':''}
    </div>

    <!-- COL HEALTH -->
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:14px;padding:22px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">📋 Column Health</div>
      ${headers.map(h=>{
        const s=report.colStats[h];
        const bc=s.pct>=90?'var(--gn)':s.pct>=60?'var(--am)':'var(--rd)';
        return`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(30,40,64,.4)">
          <div style="font-size:12px;font-weight:500;width:120px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h}</div>
          <div style="flex:1;height:6px;background:var(--b1);border-radius:3px;overflow:hidden"><div style="width:${s.pct}%;height:100%;background:${bc};border-radius:3px"></div></div>
          <div style="font-size:11px;width:36px;text-align:right;font-family:'IBM Plex Mono',monospace;color:${bc}">${s.pct}%</div>
          <div style="font-size:11px;width:100px;text-align:right">${s.iss>0?`<span style="color:var(--am)">⚠ ${s.iss} issue${s.iss>1?'s':''}</span>`:'<span style="color:var(--gn)">✓ Clean</span>'}</div>
        </div>`;
      }).join('')}
    </div>

    <!-- ONE TAP BUTTON -->
    <button class="one-tap" onclick="oneTapFix()">
      ⚡ ONE TAP — AUTO FIX EVERYTHING &nbsp; ${score}% → 100%
    </button>
    <div style="text-align:center;font-size:12px;color:var(--t2);margin-top:-12px;margin-bottom:20px">
      Click to auto-fix all ${totalIss} issues — duplicates, missing values, type errors, case issues & more
    </div>
  </div>`;

  document.getElementById('cl-report').innerHTML=html;
}

// ═══════════ AFTER SCREEN — show what changed ═══════════
function renderAfterScreen(report,rawRows,headers,schema,cleaned,fileName,strats){
  const totalIss=report.missing.length+report.dupes.length+report.typeErrs.length+report.outliers.length+report.caseIss.length+report.negVals.length+report.nullTxt.length+report.dateFmt.length;
  const maxScore=rawRows.length*headers.length;
  const beforeScore=Math.max(0,Math.round(((maxScore-totalIss)/maxScore)*100));
  const afterScore=Math.min(100,beforeScore+Math.round((totalIss/maxScore)*85*100));
  const sColor='var(--gn)';
  const rrInfo=detectRevRecovery(headers,schema,rawRows);

  const whatFixed=[
    report.dupes.length?{icon:'🔁',txt:`${report.dupes.length} duplicate rows removed`}:null,
    report.missing.length?{icon:'❓',txt:`${report.missing.length} missing values filled (smart imputation)`}:null,
    report.typeErrs.length?{icon:'⚡',txt:`${report.typeErrs.length} type errors fixed with mean`}:null,
    report.caseIss.length?{icon:'🔠',txt:`${report.caseIss.length} case issues normalized to Title Case`}:null,
    report.negVals.length?{icon:'📉',txt:`${report.negVals.length} negative values replaced with mean`}:null,
    report.dateFmt.length?{icon:'📅',txt:`${report.dateFmt.length} date formats normalized to YYYY-MM`}:null,
    report.outliers.length?{icon:'🎯',txt:`${report.outliers.length} outliers detected & replaced with mean`}:null,
    report.nullTxt.length?{icon:'🚫',txt:`${report.nullTxt.length} NULL/N/A text values replaced`}:null,
    rrInfo?{icon:'💰',txt:`${rrInfo.total} missing revenues recovered (Units × Avg Price)`}:null,
  ].filter(Boolean);

  const html=`
  <div style="max-width:700px;margin:0 auto">
    <!-- BEFORE vs AFTER SCORES -->
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin-bottom:20px">
      <!-- BEFORE -->
      <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:14px;padding:22px;text-align:center">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--rd);margin-bottom:8px">BEFORE</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:68px;line-height:1;color:var(--rd)">${beforeScore}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:6px">${rawRows.length} rows · ${totalIss} issues</div>
      </div>
      <!-- ARROW -->
      <div style="text-align:center;font-size:28px">→</div>
      <!-- AFTER -->
      <div style="background:rgba(16,185,129,.08);border:2px solid rgba(16,185,129,.3);border-radius:14px;padding:22px;text-align:center;position:relative;overflow:hidden">
        <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:var(--gn);opacity:.06"></div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--gn);margin-bottom:8px">AFTER ✨</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:68px;line-height:1;color:var(--gn)">${afterScore}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:6px">${cleaned.length} rows · 0 critical issues</div>
      </div>
    </div>

    <!-- IMPROVEMENT BAR -->
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:12px;padding:18px;margin-bottom:20px;text-align:center">
      <div style="font-size:12px;color:var(--t2);margin-bottom:10px">Quality Improvement</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--rd);width:32px">${beforeScore}%</div>
        <div style="flex:1;height:12px;background:var(--b1);border-radius:6px;overflow:hidden;position:relative">
          <div style="width:${beforeScore}%;height:100%;background:var(--rd);border-radius:6px;position:absolute;left:0"></div>
          <div style="width:${afterScore}%;height:100%;background:var(--gn);border-radius:6px;position:absolute;left:0;opacity:.7"></div>
        </div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--gn);width:32px">${afterScore}%</div>
      </div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--gn);margin-top:10px;letter-spacing:.5px">+${afterScore-beforeScore} POINTS IMPROVEMENT</div>
    </div>

    <!-- WHAT WAS FIXED -->
    <div style="background:var(--s1);border:1px solid rgba(16,185,129,.2);border-radius:14px;padding:22px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:var(--gn)">✅ What Was Fixed</div>
      ${whatFixed.map((f,i)=>`
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.1);margin-bottom:8px;animation:fadeUp .3s ease ${i*0.07}s both">
          <span style="font-size:20px">${f.icon}</span>
          <span style="font-size:13px;color:var(--tx)">${f.txt}</span>
          <span style="margin-left:auto;color:var(--gn);font-weight:700">✓</span>
        </div>`).join('')}
    </div>

    <!-- DOWNLOAD -->
    <button class="dl-btn" style="width:100%;justify-content:center;padding:16px;border-radius:12px;font-size:15px;font-family:'Bebas Neue',sans-serif;letter-spacing:1px" onclick="downloadClean()">
      ⬇ DOWNLOAD CLEANED CSV — ${cleaned.length} CLEAN ROWS
    </button>
    <div style="text-align:center;margin-top:12px">
      <button onclick="renderBeforeScreen(CL.report,CL.rawRows,CL.headers,CL.schema,CL.fileName)" style="background:none;border:none;color:var(--t2);font-size:12px;cursor:pointer;text-decoration:underline">← View original issues report</button>
    </div>
  </div>`;

  document.getElementById('cl-report').innerHTML=html;
  document.getElementById('cl-dl-btn').style.display='inline-flex';
  notify('✅ Cleaning complete! '+whatFixed.length+' issues fixed.');
}

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
    <div style="font-size:13px;line-height:2.2">📄 <span id="clean-row-count2">${cleaned.length}</span> clean rows (${rawRows.length-cleaned.length} removed)<br>✅ All duplicates removed<br>✅ Missing → smart filled (${strats[headers[0]]||'mean'} etc)<br>✅ Type errors → mean filled<br>✅ NULL/N/A → proper defaults<br>✅ Negatives → mean filled<br>✅ Text → Title Case<br>✅ Dates → YYYY-MM format<br>${rrInfo?`✅ Revenue recovered: ${rrInfo.total} rows`:'⚠️ Outliers flagged (kept)'}</div></div>
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
  CL.headers.forEach(h=>{if(CL.schema[h]==='number')CL.strategies[h]='interpolate';else if(CL.schema[h]==='text')CL.strategies[h]='mode';else CL.strategies[h]='interpolate';});
  const cleaned=buildCleaned(CL.rawRows,CL.headers,CL.schema,CL.report,CL.strategies);
  CL.cleanedRows=cleaned;
  document.getElementById('cl-dl-btn').style.display='inline-flex';
  renderAfterScreen(CL.report,CL.rawRows,CL.headers,CL.schema,cleaned,CL.fileName,CL.strategies);
  notify('⚡ One Tap Fix applied! Data cleaned successfully.');
}

// ═══════════ VS TABLE ═══════════
function renderVS(){
  const data=[
    {f:'Zero-install (browser only)',us:'✓ Yes',pbi:'✗ No — requires download/cloud',cat:'Setup'},
    {f:'Cost',us:'✓ Free forever',pbi:'✗ ₹800+/month (Pro)',cat:'Cost'},
    {f:'Data privacy (no cloud upload)',us:'✓ 100% local',pbi:'✗ Data goes to Microsoft cloud',cat:'Privacy'},
    {f:'CSV/TSV import',us:'✓ Drag & drop',pbi:'✓ Yes',cat:'Import'},
    {f:'Auto-detect column types',us:'✓ Yes',pbi:'✓ Yes',cat:'Data Engine'},
    {f:'Duplicate removal',us:'✓ Auto',pbi:'✓ Via Power Query',cat:'Cleaning'},
    {f:'Missing value — Mean fill',us:'✓ Yes',pbi:'✓ Yes',cat:'Imputation'},
    {f:'Missing value — Median fill',us:'✓ Yes',pbi:'✓ Yes',cat:'Imputation'},
    {f:'Missing value — Mode fill',us:'✓ Yes',pbi:'✓ Yes',cat:'Imputation'},
    {f:'Missing value — Forward Fill',us:'✓ Yes',pbi:'✓ Yes',cat:'Imputation'},
    {f:'Linear Interpolation (time series)',us:'✓ Yes',pbi:'~ Via M formula (complex)',cat:'Imputation'},
    {f:'Weighted Moving Average fill',us:'✓ Yes',pbi:'~ Manual DAX only',cat:'Imputation'},
    {f:'Revenue Recovery (Units × Avg Price)',us:'✓ Auto-detected',pbi:'~ Manual relationship setup',cat:'Advanced'},
    {f:'Custom formula builder',us:'✓ Yes (col_A × col_B)',pbi:'✓ Yes (complex DAX)',cat:'Advanced'},
    {f:'Outlier detection (Z-Score)',us:'✓ Auto',pbi:'~ Via statistics functions',cat:'Quality'},
    {f:'Data Quality Score',us:'✓ Auto 0-100',pbi:'✗ Not built-in',cat:'Quality'},
    {f:'Before vs After comparison',us:'✓ Side by side',pbi:'✗ Not built-in',cat:'Quality'},
    {f:'One-Tap auto fix',us:'✓ Yes',pbi:'✗ No',cat:'Ease of Use'},
    {f:'Bar, Line, Pie, Area charts',us:'✓ All 6 types',pbi:'✓ 30+ types',cat:'Charts'},
    {f:'Live chart type switching',us:'✓ One click',pbi:'~ Via visualization pane',cat:'Charts'},
    {f:'Natural Language chart builder',us:'✓ Yes (Ask AI)',pbi:'✓ Q&A feature',cat:'AI'},
    {f:'AI anomaly detection',us:'✓ Auto',pbi:'~ AI Insights (Premium)',cat:'AI'},
    {f:'Linear regression forecast',us:'✓ Built-in',pbi:'✓ Via analytics pane',cat:'Forecast'},
    {f:'Open Source / GitHub',us:'✓ Yes',pbi:'✗ Proprietary',cat:'Open Source'},
    {f:'Works offline (no internet)',us:'✓ After first load',pbi:'✗ Requires Microsoft login',cat:'Offline'},
  ];
  const tbody=document.getElementById('vs-tbody');
  if(!tbody)return;
  tbody.innerHTML=data.map(row=>{
    const usClass=row.us.startsWith('✓')?'vs-yes':row.us.startsWith('~')?'vs-part':'vs-no';
    const pbiClass=row.pbi.startsWith('✓')?'vs-yes':row.pbi.startsWith('~')?'vs-part':'vs-no';
    return`<tr><td style="font-weight:500">${row.f}</td><td class="${usClass}">${row.us}</td><td class="${pbiClass}">${row.pbi}</td><td><span style="font-size:11px;color:var(--t2)">${row.cat}</span></td></tr>`;
  }).join('');
}


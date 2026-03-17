

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
  document.getElementById('ins-list').innerHTML=insights.map((ins,i)=>`

/* =====================================================
   AmForge Analytics — vscompare.js
   vs Power BI Comparison Table
   25-Feature Side-by-Side Analysis
   Developed by Arpit Moni
   Version: 2.0
   ===================================================== */

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

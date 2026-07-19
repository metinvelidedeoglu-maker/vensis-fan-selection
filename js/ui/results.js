(function(){
  const S=window.VensisState,U=window.VensisUtils;
  function sortValue(row,key){if(key==='flow')return Number(row.qq)||0;if(key==='pressure')return Number(row.pp)||0;if(key==='price')return row.price==null?Infinity:Number(row.price);return Number(row.score)||0}
  function arrow(key){return S.tableSortKey!==key?'↕':S.tableSortDirection===1?'↑':'↓'}
  function setSort(key){if(S.tableSortKey===key)S.tableSortDirection*=-1;else{S.tableSortKey=key;S.tableSortDirection=1}render()}
  function render(){
    const box=U.byId('cards');if(!box)return;
    if(!S.results.length){box.innerHTML='<div class="empty">No matching fan found for these conditions.</div>';return}
    const rows=S.results.map((row,index)=>({row,index})).sort((a,b)=>{const av=sortValue(a.row,S.tableSortKey),bv=sortValue(b.row,S.tableSortKey);return av===bv?a.index-b.index:(av-bv)*S.tableSortDirection});
    const closest=U.byId('sortClosest'),closestArrow=U.byId('arrowClosest');if(closest){closest.classList.toggle('active',S.tableSortKey==='closest');closestArrow.textContent=arrow('closest')}
    box.innerHTML=`<table class="results-table"><thead><tr><th>Product</th><th><button class="sort-head" data-sort="flow">Flow <span>${arrow('flow')}</span></button></th><th><button class="sort-head" data-sort="pressure">Pressure <span>${arrow('pressure')}</span></button></th><th>Motor Power</th><th>Noise</th><th><button class="sort-head" data-sort="price">Price (€) <span>${arrow('price')}</span></button></th><th style="text-align:center">Details</th></tr></thead><tbody>${rows.map(({row,index})=>{
      const product=window.VensisProducts.fromResult(row),image=product.media.image;
      const price=row.price==null?'-':`€${U.format(row.price,2)}`;
      return `<tr><td><div style="display:flex;align-items:center;gap:12px"><img src="${U.escapeHtml(image)}" alt="${U.escapeHtml(product.series.title)}" style="width:72px;height:72px;object-fit:contain;flex:0 0 72px;border:1px solid #e2e9e5;border-radius:8px;background:#fff;padding:5px" onerror="this.remove()"><div><div class="model-main">${U.escapeHtml(product.model)}</div><div class="series-sub">${U.escapeHtml(product.series.title)}</div></div></div></td><td>${U.format(row.qq)} m³/h</td><td>${U.format(row.pp)} Pa</td><td>${U.format(row.kw,2)} kW</td><td>${U.format(row.spl)} dB(A)</td><td>${price}</td><td style="text-align:center"><button class="detail-icon-btn" data-preview="${index}" title="Open product details">👁</button></td></tr>`}).join('')}</tbody></table>`;
  }
  function roundedAxisMax(value){
    if(!(value>0))return 1;
    const magnitude=Math.pow(10,Math.floor(Math.log10(value)));
    return Math.ceil(value/magnitude)*magnitude;
  }
  function curveSvg(r){
    const pts=(r.points||[]).slice().sort((a,b)=>a[1]-b[1]);if(!pts.length)return '<div class="muted">No performance curve data available.</div>';
    const requiredQ=U.number('q'),requiredP=U.number('p');
    const W=900,H=540,L=86,R=30,T=28,B=105,plotW=W-L-R,plotH=H-T-B;
    const fanMaxQ=Math.max(...pts.map(v=>Number(v[1])||0));
    const fanMaxP=Math.max(...pts.map(v=>Number(v[0])||0));
    const maxQ=roundedAxisMax(fanMaxQ),maxP=roundedAxisMax(fanMaxP);
    const x=q=>L+(Math.max(0,Math.min(q,maxQ))/maxQ)*plotW,y=p=>T+plotH-(Math.max(0,Math.min(p,maxP))/maxP)*plotH;
    const visiblePts=pts.filter(v=>v[1]>=0&&v[1]<=maxQ&&v[0]>=0&&v[0]<=maxP);
    const poly=visiblePts.map(v=>`${x(v[1]).toFixed(2)},${y(v[0]).toFixed(2)}`).join(' '),grid=[];
    for(let i=0;i<=10;i++){
      const q=maxQ*i/10,p=maxP*i/10,gx=x(q),gy=y(p);
      grid.push(`<line x1="${gx}" y1="${T}" x2="${gx}" y2="${T+plotH}" stroke="#dbe4e7" stroke-width="1"/><text x="${gx}" y="${T+plotH+23}" text-anchor="middle" font-size="11" fill="#52666b">${U.format(q)}</text>`);
      grid.push(`<line x1="${L}" y1="${gy}" x2="${L+plotW}" y2="${gy}" stroke="#dbe4e7" stroke-width="1"/><text x="${L-11}" y="${gy+4}" text-anchor="end" font-size="11" fill="#52666b">${U.format(p)}</text>`);
    }
    const selectedVisible=r.qq>=0&&r.qq<=maxQ&&r.pp>=0&&r.pp<=maxP;
    const requiredVisible=requiredQ>0&&requiredP>0&&requiredQ<=maxQ&&requiredP<=maxP;
    const selectedX=x(r.qq),selectedY=y(r.pp),requiredX=x(requiredQ),requiredY=y(requiredP);
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Fan performance curve">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
      ${grid.join('')}
      <line x1="${L}" y1="${T+plotH}" x2="${L+plotW}" y2="${T+plotH}" stroke="#5d7378" stroke-width="1.5"/>
      <line x1="${L}" y1="${T}" x2="${L}" y2="${T+plotH}" stroke="#5d7378" stroke-width="1.5"/>
      <polyline fill="none" stroke="#123c43" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${poly}"/>
      ${requiredVisible?`<line x1="${requiredX}" y1="${requiredY}" x2="${requiredX}" y2="${T+plotH}" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="7 6"/><line x1="${L}" y1="${requiredY}" x2="${requiredX}" y2="${requiredY}" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="7 6"/><circle cx="${requiredX}" cy="${requiredY}" r="7" fill="#dc2626" stroke="#fff" stroke-width="2"/><text x="${Math.max(L+10,requiredX-12)}" y="${Math.max(T+18,requiredY-14)}" text-anchor="end" font-size="13" font-weight="700" fill="#dc2626">Required: ${U.format(requiredQ)} m³/h @ ${U.format(requiredP)} Pa</text>`:''}
      ${selectedVisible?`<line x1="${selectedX}" y1="${selectedY}" x2="${selectedX}" y2="${T+plotH}" stroke="#0b8f55" stroke-width="1.8" stroke-dasharray="7 6"/><line x1="${L}" y1="${selectedY}" x2="${selectedX}" y2="${selectedY}" stroke="#0b8f55" stroke-width="1.8" stroke-dasharray="7 6"/><circle cx="${selectedX}" cy="${selectedY}" r="8" fill="#0b8f55" stroke="#fff" stroke-width="2"/><text x="${Math.min(L+plotW-10,selectedX+12)}" y="${Math.max(T+18,selectedY-14)}" text-anchor="start" font-size="13" font-weight="700" fill="#087f4f">Program Selected: ${U.format(r.qq)} m³/h @ ${U.format(r.pp)} Pa</text>`:''}
      <text x="${L+plotW/2}" y="${H-48}" text-anchor="middle" font-size="16" font-weight="700" fill="#173033">Air Flow (m³/h)</text>
      <text x="22" y="${T+plotH/2}" text-anchor="middle" font-size="16" font-weight="700" fill="#173033" transform="rotate(-90 22 ${T+plotH/2})">Static Pressure (Pa)</text>
      <g transform="translate(${L},${H-18})"><line x1="0" y1="0" x2="34" y2="0" stroke="#123c43" stroke-width="4"/><text x="42" y="4" font-size="12" fill="#40565b">Fan Performance Curve</text>${requiredVisible?`<circle cx="220" cy="0" r="6" fill="#dc2626"/><text x="232" y="4" font-size="12" fill="#40565b">Required Point</text>`:''}${selectedVisible?`<circle cx="365" cy="0" r="6" fill="#0b8f55"/><text x="377" y="4" font-size="12" fill="#40565b">Program Selected Point</text>`:''}</g>
    </svg>`;
  }
  function bullets(items){return items?.length?`<ul>${items.map(x=>`<li>${U.escapeHtml(x)}</li>`).join('')}</ul>`:'<p class="muted">No catalogue text available.</p>'}
  function preview(index){
    const r=S.results[index];if(!r)return;const p=window.VensisProducts.fromResult(r),d=p.description;
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${U.escapeHtml(p.model)}</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#eef3f4;color:#173033}.wrap{max-width:1050px;margin:18px auto;padding:0 14px}.sheet{background:#fff;border:1px solid #d8e3e5;border-radius:14px;padding:20px}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #087f4f;padding-bottom:12px}.logo{height:58px}.hero{display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:center;margin-top:18px}.product-image{width:100%;height:220px;object-fit:contain;border:1px solid #d8e3e5;border-radius:10px;padding:12px}.section{margin-top:18px}.title{background:#087f4f;color:#fff;padding:8px 11px;font-weight:700;border-radius:7px 7px 0 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}.field{border:1px solid #d8e3e5;background:#f7fafb;border-radius:7px;padding:9px}.field span{display:block;font-size:11px;color:#64748b}.curve,.catalogue{border:1px solid #d8e3e5;padding:12px;margin-top:8px;border-radius:7px}.curve{overflow:hidden}.actions{margin-top:14px}.actions button{border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer;background:#e8eff0;color:#29484d}@media(max-width:700px){.hero,.grid{grid-template-columns:1fr}.curve{padding:4px}}</style></head><body><div class="wrap"><div class="sheet"><div class="top"><img class="logo" src="assets/vensis-logo.png"><b>FAN SELECTION DETAILS</b></div><div class="hero"><img class="product-image" src="${U.escapeHtml(p.media.image)}" onerror="this.remove()"><div><h1>${U.escapeHtml(p.model)}</h1><div>${U.escapeHtml(p.series.title)}</div><div class="actions"><button onclick="window.close()">Close</button></div></div></div><div class="section"><div class="title">Operating Point</div><div class="grid"><div class="field"><span>Airflow</span><b>${U.format(r.qq)} m³/h</b></div><div class="field"><span>Static Pressure</span><b>${U.format(r.pp)} Pa</b></div><div class="field"><span>Motor Power</span><b>${U.format(r.kw,2)} kW</b></div><div class="field"><span>Noise</span><b>${U.format(r.spl)} dB(A)</b></div><div class="field"><span>Price</span><b>${r.price==null?'-':`€${U.format(r.price,2)}`}</b></div><div class="field"><span>Speed</span><b>${U.format(r.rpm)} rpm</b></div><div class="field"><span>Voltage</span><b>${U.escapeHtml(r.voltage||'-')}</b></div></div></div><div class="section"><div class="title">Performance Curve</div><div class="curve">${curveSvg(r)}</div></div><div class="section"><div class="title">Catalogue Information</div><div class="catalogue"><h3>General Features</h3>${bullets(d.general)}<h3>Motor</h3>${bullets(d.motor)}<h3>Areas of Usage</h3>${bullets(d.applications)}</div></div></div></div></body></html>`;
    const key='vensis_detail_'+Date.now();localStorage.setItem(key,html);window.open('detail.html?key='+encodeURIComponent(key),'_blank');
  }
  document.addEventListener('click',e=>{const sort=e.target.closest('[data-sort]');if(sort)setSort(sort.dataset.sort);const button=e.target.closest('[data-preview]');if(button)preview(Number(button.dataset.preview))});
  window.VensisResults={render,setSort,preview};
})();
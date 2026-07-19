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
    box.innerHTML=`<table class="results-table"><thead><tr><th>Product</th><th><button class="sort-head" data-sort="flow">Flow <span>${arrow('flow')}</span></button></th><th><button class="sort-head" data-sort="pressure">Pressure <span>${arrow('pressure')}</span></button></th><th>Motor Power</th><th>Noise</th><th><button class="sort-head" data-sort="price">Price (€) <span>${arrow('price')}</span></button></th><th style="text-align:center">Report</th></tr></thead><tbody>${rows.map(({row,index})=>{
      const product=window.VensisProducts.fromResult(row),image=product.media.image,price=row.price==null?'-':`€${U.format(row.price,2)}`;
      return `<tr><td><div style="display:flex;align-items:center;gap:12px"><img src="${U.escapeHtml(image)}" alt="${U.escapeHtml(product.series.title)}" style="width:72px;height:72px;object-fit:contain;flex:0 0 72px;border:1px solid #e2e9e5;border-radius:8px;background:#fff;padding:5px" onerror="this.remove()"><div><div class="model-main">${U.escapeHtml(product.model)}</div><div class="series-sub">${U.escapeHtml(product.series.title)}</div></div></div></td><td>${U.format(row.qq)} m³/h</td><td>${U.format(row.pp)} Pa</td><td>${U.format(row.kw,2)} kW</td><td>${U.format(row.spl)} dB(A)</td><td>${price}</td><td style="text-align:center"><button class="detail-icon-btn" data-preview="${index}" title="Open PDF report" aria-label="Open PDF report">👁</button></td></tr>`}).join('')}</tbody></table>`;
  }
  function preview(index){
    const r=S.results[index];if(!r)return;
    const p=window.VensisProducts.fromResult(r);
    const payload={
      model:p.model||r.model||'-',series:p.series?.title||r.series||'',fanType:r.fanType||r.productGroup||'',image:p.media?.image||'',logo:'assets/vensis-logo.png',
      requiredQ:U.number('q'),requiredP:U.number('p'),selectedQ:Number(r.qq)||0,selectedP:Number(r.pp)||0,
      kw:r.kw,rpm:r.rpm,spl:r.spl,voltage:r.voltage||'-',price:r.price,points:r.points||[]
    };
    const key='vensis_pdf_'+Date.now();localStorage.setItem(key,JSON.stringify(payload));window.open('detail.html?key='+encodeURIComponent(key),'_blank');
  }
  document.addEventListener('click',e=>{const sort=e.target.closest('[data-sort]');if(sort)setSort(sort.dataset.sort);const button=e.target.closest('[data-preview]');if(button)preview(Number(button.dataset.preview))});
  window.VensisResults={render,setSort,preview};
})();
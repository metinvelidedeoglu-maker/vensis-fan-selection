(function(){
  const S=window.VensisState,U=window.VensisUtils,C=window.VensisCatalog;
  function validPositive(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null}
  function sortValue(row,key){if(key==='flow')return Number(row.qq)||0;if(key==='pressure')return Number(row.pp)||0;if(key==='price')return validPositive(row.price)??Infinity;if(key==='noise')return validPositive(row.spl)??Infinity;return Number(row.score)||0}
  function displayPositive(value,decimals,unit){const n=validPositive(value);return n==null?'-':`${U.format(n,decimals)}${unit?' '+unit:''}`}
  function arrow(key){return S.tableSortKey!==key?'↕':S.tableSortDirection===1?'↑':'↓'}
  function setSort(key){if(S.tableSortKey===key)S.tableSortDirection*=-1;else{S.tableSortKey=key;S.tableSortDirection=1}render()}
  function productFor(row){
    const product=C?.product?.(row?.key||row?.id)||window.VensisProducts?.fromResult?.(row);
    if(product)return product;
    return {model:row?.model||row?.display||'',series:{title:row?.catalogNameEn||row?.series||'',manufacturer:row?.manufacturer||'Vitlo'},media:{image:row?.image||''},description:row?.catalogueInfo||{general:[],motor:[],applications:[]}};
  }
  function render(){
    const box=U.byId('cards');if(!box)return;
    if(!S.results.length){box.innerHTML='<div class="empty">No matching fan found for these conditions.</div>';return}
    const rows=S.results.map((row,index)=>({row,index})).sort((a,b)=>{const av=sortValue(a.row,S.tableSortKey),bv=sortValue(b.row,S.tableSortKey);return av===bv?a.index-b.index:(av-bv)*S.tableSortDirection});
    const closest=U.byId('sortClosest'),closestArrow=U.byId('arrowClosest');if(closest){closest.classList.toggle('active',S.tableSortKey==='closest');closestArrow.textContent=arrow('closest')}
    box.innerHTML=`<table class="results-table"><thead><tr><th>Product</th><th><button class="sort-head" data-sort="flow">Flow <span>${arrow('flow')}</span></button></th><th><button class="sort-head" data-sort="pressure">Pressure <span>${arrow('pressure')}</span></button></th><th>Motor Power</th><th>Current</th><th><button class="sort-head" data-sort="noise">Noise <span>${arrow('noise')}</span></button></th><th><button class="sort-head" data-sort="price">Price (€) <span>${arrow('price')}</span></button></th><th style="text-align:center">PDF</th></tr></thead><tbody>${rows.map(({row,index})=>{
      const product=productFor(row),image=product.media?.image||'';
      return `<tr><td><div style="display:flex;align-items:center;gap:12px"><img src="${U.escapeHtml(image)}" alt="${U.escapeHtml(product.series?.title||'')}" style="width:72px;height:72px;object-fit:contain;flex:0 0 72px;border:1px solid #e2e9e5;border-radius:8px;background:#fff;padding:5px" onerror="this.remove()"><div><div class="model-main">${U.escapeHtml(product.model||row.model||'')}</div><div class="series-sub">${U.escapeHtml(product.series?.title||row.series||'')}</div></div></div></td><td>${U.format(row.qq)} m³/h</td><td>${U.format(row.pp)} Pa</td><td>${displayPositive(row.kw,2,'kW')}</td><td>${displayPositive(row.amps,2,'A')}</td><td>${displayPositive(row.spl,0,'dB(A)')}</td><td>${validPositive(row.price)==null?'-':`€${U.format(row.price,2)}`}</td><td style="text-align:center"><button class="detail-icon-btn" data-save-pdf="${index}" title="Save as PDF" style="white-space:nowrap;padding:8px 10px">Save as PDF</button></td></tr>`}).join('')}</tbody></table>`;
  }
  function savePdf(index){
    const r=S.results[index];if(!r)return;
    const product=productFor(r);
    if(!window.VensisDatasheet?.save){alert('PDF renderer is unavailable.');return}
    window.VensisDatasheet.save({
      mode:'selection',
      product,
      model:r,
      required:{q:U.number('q'),p:U.number('p')},
      selected:{q:Number(r.qq)||0,p:Number(r.pp)||0}
    });
  }
  document.addEventListener('click',e=>{const sort=e.target.closest('[data-sort]');if(sort)setSort(sort.dataset.sort);const button=e.target.closest('[data-save-pdf]');if(button)savePdf(Number(button.dataset.savePdf))});
  window.VensisResults={render,setSort,savePdf};
})();

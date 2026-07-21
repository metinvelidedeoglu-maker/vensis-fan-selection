(function(){
  const S=window.VensisState,U=window.VensisUtils,C=window.VensisCatalog;
  const PROJECT_KEY='vensis_project_items_v1';
  function validPositive(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null}
  function sortValue(row,key){if(key==='flow')return Number(row.qq)||0;if(key==='pressure')return Number(row.pp)||0;if(key==='price')return validPositive(row.price)??Infinity;if(key==='noise')return validPositive(row.spl)??Infinity;return Number(row.score)||0}
  function displayPositive(value,decimals,unit){const n=validPositive(value);return n==null?'-':`${U.format(n,decimals)}${unit?' '+unit:''}`}
  function arrow(key){return S.tableSortKey!==key?'↕':S.tableSortDirection===1?'↑':'↓'}
  function setSort(key){if(S.tableSortKey===key)S.tableSortDirection*=-1;else{S.tableSortKey=key;S.tableSortDirection=1}render()}
  function productFor(row){
    const product=C?.product?.(row?.key||row?.id)||window.VensisProducts?.fromResult?.(row);
    if(product)return product;
    return {model:row?.model||row?.display||'',series:{title:row?.catalogNameEn||row?.series||'',manufacturer:row?.manufacturer||'Vitlo'},media:{image:row?.image||''},motor:{speed:Number(row?.rpm)||0,voltage:row?.voltage||'',sound:Number(row?.spl)||0},description:row?.catalogueInfo||{general:[],motor:[],applications:[]}};
  }
  function icon(type){
    if(type==='eye')return '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function render(){
    const box=U.byId('cards');if(!box)return;
    if(!S.results.length){box.innerHTML='<div class="empty">No matching fan found for these conditions.</div>';return}
    const rows=S.results.map((row,index)=>({row,index})).sort((a,b)=>{const av=sortValue(a.row,S.tableSortKey),bv=sortValue(b.row,S.tableSortKey);return av===bv?a.index-b.index:(av-bv)*S.tableSortDirection});
    const closest=U.byId('sortClosest'),closestArrow=U.byId('arrowClosest');if(closest){closest.classList.toggle('active',S.tableSortKey==='closest');closestArrow.textContent=arrow('closest')}
    box.innerHTML=`<table class="results-table"><thead><tr><th>Product</th><th><button class="sort-head" data-sort="flow">Flow <span>${arrow('flow')}</span></button></th><th><button class="sort-head" data-sort="pressure">Pressure <span>${arrow('pressure')}</span></button></th><th>Motor Power</th><th>Current</th><th><button class="sort-head" data-sort="noise">Noise <span>${arrow('noise')}</span></button></th><th><button class="sort-head" data-sort="price">Price (€) <span>${arrow('price')}</span></button></th><th style="text-align:center">Actions</th></tr></thead><tbody>${rows.map(({row,index})=>{
      const product=productFor(row),image=product.media?.image||'';
      return `<tr><td><div style="display:flex;align-items:center;gap:12px"><img src="${U.escapeHtml(image)}" alt="${U.escapeHtml(product.series?.title||'')}" style="width:72px;height:72px;object-fit:contain;flex:0 0 72px;border:1px solid #e2e9e5;border-radius:8px;background:#fff;padding:5px" onerror="this.remove()"><div><div class="model-main">${U.escapeHtml(product.model||row.model||'')}</div><div class="series-sub">${U.escapeHtml(product.series?.title||row.series||'')}</div></div></div></td><td>${U.format(row.qq)} m³/h</td><td>${U.format(row.pp)} Pa</td><td>${displayPositive(row.kw,2,'kW')}</td><td>${displayPositive(row.amps,2,'A')}</td><td>${displayPositive(row.spl,0,'dB(A)')}</td><td>${validPositive(row.price)==null?'-':`€${U.format(row.price,2)}`}</td><td style="text-align:center"><div style="display:inline-flex;align-items:center;gap:7px"><button class="detail-icon-btn" data-view-datasheet="${index}" title="View datasheet" aria-label="View datasheet" style="width:38px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center">${icon('eye')}</button><button class="detail-icon-btn project-add-btn" data-add-project="${index}" title="Add to project" aria-label="Add to project" style="width:38px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:#087f4f;color:#fff">${icon('plus')}</button></div></td></tr>`}).join('')}</tbody></table>`;
  }
  function viewDatasheet(index){
    const r=S.results[index];if(!r)return;
    const product=productFor(r);
    if(!window.VensisDatasheet?.save){alert('Datasheet renderer is unavailable.');return}
    window.VensisDatasheet.save({
      mode:'selection',
      product,
      model:r,
      required:{q:U.number('q'),p:U.number('p')},
      selected:{q:Number(r.qq)||0,p:Number(r.pp)||0}
    });
  }
  function projectItems(){
    try{const data=JSON.parse(localStorage.getItem(PROJECT_KEY)||'[]');return Array.isArray(data)?data:[]}catch{return []}
  }
  function saveProjectItems(items){
    localStorage.setItem(PROJECT_KEY,JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('vensis-project-updated'));
  }
  function showProjectToast(text){
    let toast=document.getElementById('projectToast');
    if(!toast){toast=document.createElement('div');toast.id='projectToast';toast.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#173033;color:#fff;padding:11px 15px;border-radius:9px;font:700 13px Arial,Helvetica,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transform:translateY(8px);transition:.2s';document.body.appendChild(toast)}
    toast.textContent=text;toast.style.opacity='1';toast.style.transform='translateY(0)';clearTimeout(toast._timer);toast._timer=setTimeout(()=>{toast.style.opacity='0';toast.style.transform='translateY(8px)'},1800);
  }
  function addToProject(index,button){
    const r=S.results[index];if(!r)return;
    const product=productFor(r),required={q:U.number('q'),p:U.number('p')},selected={q:Number(r.qq)||0,p:Number(r.pp)||0};
    const productKey=r.key||r.id||product.model||r.model||'';
    const itemKey=[productKey,required.q,required.p,selected.q,selected.p].join('|');
    const speed=Number(r.rpm)||Number(product.motor?.speed)||0;
    const voltage=String(r.voltage||product.motor?.voltage||'').trim();
    const noise=Number(r.spl)||Number(product.motor?.sound)||0;
    const items=projectItems();
    const existing=items.find(item=>item.itemKey===itemKey);
    if(existing){
      existing.quantity=(Number(existing.quantity)||1)+1;
      existing.speed=Number(existing.speed)||speed;
      existing.voltage=existing.voltage||voltage;
      existing.noise=Number(existing.noise)||noise;
      existing.updatedAt=new Date().toISOString();
    }else items.push({itemKey,productKey,model:product.model||r.model||'',series:product.series?.title||r.series||'',manufacturer:product.series?.manufacturer||r.manufacturer||'Vitlo',image:product.media?.image||r.image||'',required,selected,motorPower:Number(r.kw)||0,current:Number(r.amps)||0,speed,voltage,noise,price:Number(r.price)||0,quantity:1,addedAt:new Date().toISOString()});
    saveProjectItems(items);
    if(button){const old=button.innerHTML;button.innerHTML='✓';button.title='Added to project';setTimeout(()=>{button.innerHTML=old;button.title='Add to project'},1200)}
    showProjectToast(existing?'Project quantity increased.':'Fan added to project.');
  }
  document.addEventListener('click',e=>{
    const sort=e.target.closest('[data-sort]');if(sort)setSort(sort.dataset.sort);
    const view=e.target.closest('[data-view-datasheet]');if(view)viewDatasheet(Number(view.dataset.viewDatasheet));
    const add=e.target.closest('[data-add-project]');if(add)addToProject(Number(add.dataset.addProject),add);
  });
  window.VensisProjectBasket={items:projectItems,add:addToProject,key:PROJECT_KEY};
  window.VensisResults={render,setSort,viewDatasheet,savePdf:viewDatasheet,addToProject};
})();
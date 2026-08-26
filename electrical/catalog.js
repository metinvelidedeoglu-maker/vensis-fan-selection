(function(){
  'use strict';

  const products=Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[];
  const byId=id=>document.getElementById(id);
  const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'tr'));
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  let activeSeries='';

  function selected(key){return [...document.querySelectorAll(`[data-${key}]:checked`)].map(input=>input.dataset[key]);}
  function filteredProducts(){
    const brands=selected('brand');
    const categories=selected('category');
    return products.filter(product=>(!brands.length||brands.includes(product.brand))&&(!categories.length||categories.includes(product.category)));
  }
  function renderChecks(id,values,key){
    byId(id).innerHTML=values.map(value=>`<label class="check-row"><input type="checkbox" data-${key}="${escapeHtml(value)}"><span>${escapeHtml(value)}</span></label>`).join('');
  }
  function productVisual(product){
    return product.image?`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.modelName)}">`:'<div class="product-placeholder" aria-hidden="true">⚡</div>';
  }
  function seriesCard(product){
    const count=Array.isArray(product.submodels)?product.submodels.length:0;
    return `<article class="series-card" tabindex="0" role="button" data-series="${escapeHtml(product.modelName)}" aria-label="${escapeHtml(product.modelName)}"><div class="series-card-image">${productVisual(product)}</div><div class="series-card-body"><div class="series-brand">${escapeHtml(product.brand||'ZONEX')}</div><h2>${escapeHtml(product.modelName)}</h2><div class="series-title">${escapeHtml(product.description||product.category||'')}</div><div class="series-card-footer"><span>${escapeHtml(product.category||'')}</span><b>${count} Submodels</b></div></div></article>`;
  }
  function modelField(label,value){return value?`<div class="model-field"><span>${label}</span><b>${escapeHtml(value)}</b></div>`:'';}
  function modelCard(product,model){
    const visual=product.image?`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(model.model||product.modelName)}">`:'<div class="model-card-icon" aria-hidden="true">⚡</div>';
    return `<article class="model-card"><div class="model-card-head">${visual}<div><div class="section-kicker">${escapeHtml(model.subcategory||product.category||'')}</div><h3>${escapeHtml(model.model||product.modelName)}</h3></div></div><div class="model-grid">${modelField('Power',model.power)}${modelField('Current',model.current)}${modelField('Voltage',model.voltage)}${modelField('Frequency',model.frequency)}${modelField('Phase',model.phase)}${modelField('IP',model.ip)}${modelField('Insulation',model.insulation)}${modelField('Lumen',model.lumen)}${modelField('Operating Temperature',model.operatingTemperature)}${modelField('Order Code',model.orderCode)}</div><div class="model-card-footer"><span>${escapeHtml(product.category||'')}</span><b>${escapeHtml(model.price||'')}</b></div></article>`;
  }
  function bindSeriesCards(){
    document.querySelectorAll('[data-series]').forEach(card=>{
      const open=()=>openSeries(card.dataset.series);
      card.addEventListener('click',open);
      card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
    });
  }
  function renderCatalog(){
    const filtered=filteredProducts();
    byId('count').textContent=`${filtered.length} Series`;
    byId('cards').innerHTML=filtered.length?filtered.map(seriesCard).join(''):'<div class="empty-state">No series match these filters.</div>';
    bindSeriesCards();
  }
  function openSeries(seriesName){
    const product=products.find(item=>item.modelName===seriesName);
    if(!product)return;
    activeSeries=seriesName;
    const submodels=Array.isArray(product.submodels)?product.submodels:[];
    byId('electricalCatalogLayout').hidden=true;
    const detail=byId('electricalDetail');
    detail.hidden=false;
    detail.innerHTML=`<button id="backToElectricalCatalog" class="detail-back" type="button">← Electrical Catalog</button><section class="series-hero"><div class="series-hero-image">${productVisual(product)}</div><div class="series-hero-copy"><div class="series-brand">${escapeHtml(product.brand||'ZONEX')}</div><h1>${escapeHtml(product.modelName)}</h1><h2>${escapeHtml(product.description||product.category||'')}</h2><div class="series-badges"><span>${escapeHtml(product.category||'')}</span><span>${submodels.length} Submodels</span></div></div></section><section class="models-section"><div class="catalog-head"><h2>Models</h2><div class="catalog-count">${submodels.length} Submodels</div></div><div class="models-grid">${submodels.length?submodels.map(model=>modelCard(product,model)).join(''):'<div class="empty-state">No submodels found.</div>'}</div></section>`;
    byId('backToElectricalCatalog').addEventListener('click',closeSeries);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function closeSeries(){
    activeSeries='';
    byId('electricalDetail').hidden=true;
    byId('electricalDetail').innerHTML='';
    byId('electricalCatalogLayout').hidden=false;
    renderCatalog();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  renderChecks('brands',unique(products.map(product=>product.brand)),'brand');
  renderChecks('categories',unique(products.map(product=>product.category)),'category');
  document.querySelectorAll('#brands input,#categories input').forEach(input=>input.addEventListener('change',()=>{if(activeSeries)closeSeries();else renderCatalog();}));
  byId('reset').addEventListener('click',()=>{document.querySelectorAll('#brands input,#categories input').forEach(input=>{input.checked=false;});if(activeSeries)closeSeries();else renderCatalog();});
  renderCatalog();
})();

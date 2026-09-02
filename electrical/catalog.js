(function(){
  'use strict';

  const products=Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[];
  const byId=id=>document.getElementById(id);
  const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'tr'));
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const projectSubtitleOverrides={'ZNF.2X18W.EM':'Acil Kitli Floresan (Kısa)'};
  let activeSeries='';
  let activeModel='';

  function numeric(value){const match=String(value||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return match?Number(match[0]):0;}
  function electricalProjectItem(product,model){
    const identity=model.orderCode||model.model;
    const projectSubtitle=model.name||projectSubtitleOverrides[model.model]||model.subcategory||product.description||product.modelName||'';
    return {
      itemKey:`electrical|${product.modelName}|${identity}`,
      mode:'catalog',productType:'electrical',productKey:`${product.modelName}|${identity}`,
      model:model.model||product.modelName,series:projectSubtitle,manufacturer:product.brand||'ZONEX',
      image:product.image?`electrical/${product.image}`:'',description:'',category:product.category||'',
      orderCode:model.orderCode||'',power:model.power||'',currentText:model.current||'',voltage:model.voltage||'',
      frequency:model.frequency||'',phase:model.phase||'',ip:model.ip||'',insulation:model.insulation||'',
      lumen:model.lumen||'',operatingTemperature:model.operatingTemperature||'',current:numeric(model.current),
      price:numeric(model.price),priceCurrency:String(model.price||'').toUpperCase().includes('USD')?'USD':String(model.price||'').toUpperCase().includes('TRY')?'TRY':'EUR',quantity:1
    };
  }

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
    const identity=String(model.orderCode||model.model||'');
    return `<article class="model-card" data-electrical-model="${escapeHtml(identity)}"><div class="model-card-head">${visual}<div><div class="section-kicker">${escapeHtml(model.subcategory||product.category||'')}</div><h3>${escapeHtml(model.model||product.modelName)}</h3><div class="model-name">${escapeHtml(model.name||'')}</div></div></div><div class="model-grid">${modelField('Power',model.power)}${modelField('Current',model.current)}${modelField('Voltage',model.voltage)}${modelField('Frequency',model.frequency)}${modelField('Phase',model.phase)}${modelField('IP',model.ip)}${modelField('Insulation',model.insulation)}${modelField('Lumen',model.lumen)}${modelField('Operating Temperature',model.operatingTemperature)}</div><button class="model-project-btn" type="button" data-add-electrical-project="${escapeHtml(identity)}">＋ Add to Project</button><div class="model-card-footer"><span>${escapeHtml(product.category||'')}</span><b>${escapeHtml(model.price||'')}</b></div></article>`;
  }
  function routeState(){
    const query=new URLSearchParams(location.search);
    return {series:String(query.get('series')||'').trim(),model:String(query.get('model')||'').trim()};
  }
  function routeHref(seriesName='',modelIdentity=''){
    const url=new URL(location.href);
    url.searchParams.delete('series');
    url.searchParams.delete('model');
    if(seriesName)url.searchParams.set('series',seriesName);
    if(modelIdentity)url.searchParams.set('model',modelIdentity);
    return url.pathname+(url.searchParams.toString()?`?${url.searchParams.toString()}`:'');
  }
  function writeRoute(seriesName='',modelIdentity='',mode='push'){
    const href=routeHref(seriesName,modelIdentity);
    if(`${location.pathname}${location.search}`===href)return;
    history[mode==='replace'?'replaceState':'pushState']({vensisElectrical:true,series:seriesName,model:modelIdentity},'',href);
  }
  function emitRoute(){
    window.dispatchEvent(new CustomEvent('vensis-electrical-route-changed',{detail:{series:activeSeries,model:activeModel}}));
  }
  function bindSeriesCards(){
    document.querySelectorAll('[data-series]').forEach(card=>{
      const open=()=>openSeries(card.dataset.series,{updateUrl:true,model:''});
      card.addEventListener('click',open);
      card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
    });
  }
  function renderCatalog(){
    const filtered=filteredProducts();
    byId('count').textContent=`${filtered.length} Series`;
    byId('cards').innerHTML=filtered.length?filtered.map(seriesCard).join(''):'<div class="empty-state">No series match these filters.</div>';
    bindSeriesCards();
    setTimeout(emitRoute,0);
  }
  function findModel(product,identity){
    const needle=String(identity||'').trim();
    if(!needle)return null;
    return (product.submodels||[]).find(model=>String(model.orderCode||'')===needle||String(model.model||'')===needle)||null;
  }
  function openSeries(seriesName,options={}){
    const product=products.find(item=>item.modelName===seriesName);
    if(!product)return false;
    const requestedModel=String(options.model||'').trim();
    const selectedModel=findModel(product,requestedModel);
    activeSeries=seriesName;
    activeModel=selectedModel?String(selectedModel.orderCode||selectedModel.model||''):'';
    if(options.updateUrl)writeRoute(activeSeries,activeModel,'push');
    const submodels=Array.isArray(product.submodels)?product.submodels:[];
    const visibleModels=selectedModel?[selectedModel]:submodels;
    byId('electricalCatalogLayout').hidden=true;
    const detail=byId('electricalDetail');
    detail.hidden=false;
    detail.dataset.electricalSeries=activeSeries;
    if(activeModel)detail.dataset.electricalModel=activeModel;else delete detail.dataset.electricalModel;
    const countLabel=`${visibleModels.length} ${visibleModels.length===1?'Submodel':'Submodels'}`;
    detail.innerHTML=`<button id="backToElectricalCatalog" class="detail-back" type="button">← Electrical Catalog</button><section class="series-hero"><div class="series-hero-image">${productVisual(product)}</div><div class="series-hero-copy"><div class="series-brand">${escapeHtml(product.brand||'ZONEX')}</div><h1>${escapeHtml(product.modelName)}</h1><h2>${escapeHtml(product.description||product.category||'')}</h2><div class="series-badges"><span>${escapeHtml(product.category||'')}</span><span>${countLabel}</span></div></div></section><section class="models-section"><div class="catalog-head"><h2>Models</h2><div class="catalog-count">${countLabel}</div></div><div class="models-grid">${visibleModels.length?visibleModels.map(model=>modelCard(product,model)).join(''):'<div class="empty-state">No submodels found.</div>'}</div></section>`;
    byId('backToElectricalCatalog').addEventListener('click',()=>closeSeries({updateUrl:true}));
    window.scrollTo({top:0,behavior:options.scroll===false?'auto':'smooth'});
    emitRoute();
    return true;
  }
  function closeSeries(options={}){
    activeSeries='';
    activeModel='';
    if(options.updateUrl)writeRoute('','','push');
    const detail=byId('electricalDetail');
    detail.hidden=true;
    detail.innerHTML='';
    delete detail.dataset.electricalSeries;
    delete detail.dataset.electricalModel;
    byId('electricalCatalogLayout').hidden=false;
    renderCatalog();
    window.scrollTo({top:0,behavior:options.scroll===false?'auto':'smooth'});
    emitRoute();
  }
  function applyRouteFromLocation(){
    const route=routeState();
    if(route.series&&products.some(item=>item.modelName===route.series)){
      openSeries(route.series,{updateUrl:false,model:route.model,scroll:false});
      return;
    }
    if(activeSeries)closeSeries({updateUrl:false,scroll:false});
    else emitRoute();
  }

  renderChecks('brands',unique(products.map(product=>product.brand)),'brand');
  renderChecks('categories',unique(products.map(product=>product.category)),'category');
  document.querySelectorAll('#brands input,#categories input').forEach(input=>input.addEventListener('change',()=>{if(activeSeries)closeSeries({updateUrl:true});else renderCatalog();}));
  byId('reset').addEventListener('click',()=>{document.querySelectorAll('#brands input,#categories input').forEach(input=>{input.checked=false;});if(activeSeries)closeSeries({updateUrl:true});else renderCatalog();});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-add-electrical-project]');
    if(!button)return;
    const product=products.find(item=>item.modelName===activeSeries);
    const model=product?.submodels?.find(item=>String(item.orderCode||item.model)===button.dataset.addElectricalProject);
    if(product&&model)window.VensisCatalogProjectPicker?.openItem?.(electricalProjectItem(product,model),button);
  });
  window.addEventListener('popstate',applyRouteFromLocation);
  window.VensisElectricalCatalog={products,openSeries,closeSeries,applyRouteFromLocation,routeHref};
  renderCatalog();
  applyRouteFromLocation();
})();
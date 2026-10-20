(function(){
  const catalog=window.VensisCatalog||{series:[],models:[]};
  const PROJECT_KEY=window.VensisAccess?.storageKey?.('vensis_project_items_v1')||'vensis_project_items_v1';
  const selected={manufacturers:new Set(),categories:new Set()};
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const displayBrand=value=>value;
  const num=(value,decimals=0)=>{const n=Number(value);return Number.isFinite(n)&&n>0?n.toLocaleString('en-US',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}):'-'};
  const unique=items=>[...new Set(items.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const seriesOrder=new Intl.Collator('tr',{sensitivity:'base',numeric:true});
  const allSeries=[...(catalog.series||[])].sort((a,b)=>
    seriesOrder.compare(a.code||a.title||'',b.code||b.title||'')||
    seriesOrder.compare(a.manufacturer||'',b.manufacturer||'')
  );
  const allModels=catalog.models||[];
  const modelsBySeries=new Map();
  for(const model of allModels){
    if(!modelsBySeries.has(model.seriesId))modelsBySeries.set(model.seriesId,[]);
    modelsBySeries.get(model.seriesId).push(model);
  }
  const normalizeSearch=value=>String(value||'').normalize('NFKD').replace(/[ıİ]/g,'i').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let searchText=String(new URLSearchParams(location.search).get('q')||'').trim();
  const matchesSearch=(value,term)=>{
    const haystack=normalizeSearch(value);
    return haystack.includes(term)||term.split(' ').every(word=>haystack.includes(word));
  };
  function matchingModels(series,term){
    if(!term)return [];
    return (modelsBySeries.get(series.id)||[]).filter(model=>matchesSearch([model.model,model.id,model.technical?.productCode].join(' '),term));
  }
  function modelSearchUrl(series,model){
    const routed=window.VensisVentilationRoutes?.navigationUrl?.(series,model);
    if(routed)return routed;
    const q=new URLSearchParams(location.search);q.set('series',series.id);q.set('model',model.id);
    return '/catalog.html?'+q.toString();
  }
  function searchResultHtml(series,term){
    if(!term)return '';
    const matches=matchingModels(series,term);
    if(!matches.length)return '';
    const result=matches.slice(0,6).map(model=>'<a class="catalog-search-result" href="'+esc(modelSearchUrl(series,model))+'">↳ '+esc(model.model)+'</a>').join('');
    return '<div class="catalog-search-results">'+result+(matches.length>6?'<span class="catalog-search-result-note">+'+(matches.length-6)+' model daha</span>':'')+'</div>';
  }
  const manufacturers=unique(allSeries.map(series=>series.manufacturer));
  const categories=unique(allSeries.flatMap(series=>series.categories||[]));

  const params=new URLSearchParams(location.search);
  for(const key of [params.get('brand'),...(params.get('brands')||'').split(',')]){
    const brand=catalog.brand?.(key);if(brand)selected.manufacturers.add(brand.name);
  }
  for(const category of params.getAll('category'))if(categories.includes(category))selected.categories.add(category);
  function syncFilters(){
    const q=new URLSearchParams(location.search);for(const key of ['brand','brands','category','series','model','lang','q'])q.delete(key);
    const brands=[...selected.manufacturers].map(name=>catalog.brand(name).slug);
    if(brands.length)q.set(brands.length===1?'brand':'brands',brands.join(','));
    for(const category of selected.categories)q.append('category',category);
    if(searchText)q.set('q',searchText);
    const lang=window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'en';
    history.replaceState(history.state,'','/'+lang+'/catalog.html'+(q.size?'?'+q.toString():''));
    window.VensisVentilationRoutes?.apply();
  }

  function checkedList(id,items,set){
    const box=document.getElementById(id);if(!box)return;
    box.innerHTML=items.map(item=>`<label class="check-row"><input type="checkbox" value="${esc(item)}" ${set.has(item)?'checked':''}><span>${esc(item)}</span></label>`).join('')||'<div class="empty-note">No data</div>';
    box.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
      input.checked?set.add(input.value):set.delete(input.value);
      renderSeries();syncFilters();
    }));
  }

  function renderFilters(){
    checkedList('catalogManufacturers',manufacturers,selected.manufacturers);
    checkedList('catalogCategories',categories,selected.categories);
  }

  function filteredSeries(){
    return allSeries.filter(series=>{
      if(selected.manufacturers.size&&!selected.manufacturers.has(series.manufacturer))return false;
      if(selected.categories.size&&![...selected.categories].every(category=>(series.categories||[]).includes(category)))return false;
      const term=normalizeSearch(searchText);
      if(term&&!matchesSearch([series.manufacturer,series.code,series.title,(series.categories||[]).join(' ')].join(' '),term)&&!matchingModels(series,term).length)return false;
      return true;
    });
  }

  function firstText(items){return Array.isArray(items)&&items.length?items[0]:''}
  function seriesUrl(id){const query=new URLSearchParams(location.search);query.set('series',id);query.delete('model');return window.VensisVentilationRoutes?.navigationUrl(catalog.getSeries(id))||'/catalog.html?'+query.toString()}

  function seriesCard(series){
    const count=(series.modelIds||[]).length;
    const summary=firstText(series.description?.general)||series.title||'';
    return `<article class="series-card" data-series="${esc(series.id)}" role="link" tabindex="0">
      <div class="series-card-image"><img src="${esc(series.media?.image||'')}" alt="${esc(series.code)}" onerror="this.style.visibility='hidden'"></div>
      <div class="series-card-body">
        <div class="series-brand">${esc(displayBrand(series.manufacturer||''))}</div>
        <h2>${esc(series.code||series.title)}</h2>
        <div class="series-title">${esc(series.title||'')}</div>
        ${summary&&summary!==series.title?`<p>${esc(summary)}</p>`:''}
        <div class="series-card-footer"><b>${count} Models</b><span>View Series →</span></div>
        ${searchResultHtml(series,normalizeSearch(searchText))}
      </div>
    </article>`;
  }

  function renderSeries(){
    const rows=filteredSeries();
    document.getElementById('catalogCount').textContent=`${rows.length} series`;
    document.getElementById('catalogGrid').innerHTML=rows.map(seriesCard).join('')||'<div class="empty-state">No series matches these filters.</div>';
    document.querySelectorAll('[data-series]').forEach(card=>{
      const open=()=>location.assign(seriesUrl(card.dataset.series));
      card.addEventListener('click',event=>{if(!event.target.closest('.catalog-search-result'))open()});
      card.addEventListener('keydown',event=>{if(event.target.closest('.catalog-search-result'))return;if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
    });
  }

  function bullets(items){
    return Array.isArray(items)&&items.length?`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class="empty-note">No information available.</p>';
  }

  function hazardousAreaSummary(atex){
    if(!atex||typeof atex!=='object')return '';
    const zones=[atex.gas_zone,atex.dust_zone].filter(value=>value!=null).join(' / ');
    const groups=[atex.gas_group,atex.dust_group].filter(Boolean).join(' / ');
    const temperatures=[atex.temperature_class,atex.max_surface_temperature_c?`T${atex.max_surface_temperature_c}°C`:null].filter(Boolean).join(' / ');
    const epl=[String(atex.gas_marking||'').match(/\b(Gb|Gc|Ga)\b/)?.[1],String(atex.dust_marking||'').match(/\b(Db|Dc|Da)\b/)?.[1]].filter(Boolean).join(' / ');
    return [zones?`Zone ${zones}`:'',groups,temperatures,epl?`EPL ${epl}`:'',atex.special_conditions_X?'X special conditions':''].filter(Boolean).join(' · ');
  }

  function modelFeatures(model){
    const lang=window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'tr';
    const tags=catalog.featureTags?.(model,lang)||[];
    return '<div class="model-feature-section"><div class="model-feature-heading">'+(lang==='tr'?'Özellikler':'Features')+'</div><div class="model-feature-tags">'+
      (tags.length?tags.map(tag=>'<span class="model-feature-tag">'+esc(tag)+'</span>').join(''):'<span class="model-feature-empty">-</span>')+'</div></div>';
  }
  function modelFields(model){
    const info=model.standard||{};
    const fields=[
      ['Motor Power',info.motorPower>0?`${num(info.motorPower,3)} kW`:'-'],
      ['Speed',info.speed>0?`${num(info.speed)} rpm`:'-'],
      ['Voltage',info.voltage||'-'],
      ['Max. Airflow',info.maxAirflow>0?`${num(info.maxAirflow)} m³/h`:'-'],
      ['Price',info.price>0?`${num(info.price,2)} ${model.pricing?.currency||'EUR'}`:'-'],
      ['Phase',model.technical?.phase||model.motor?.phase||'-']
    ];
    return fields.map(([label,value])=>`<div class="model-field"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('');
  }

  function operatingPointsTable(model){
    const points=model.performance?.operatingPoints||[];
    if(points.length<2)return '';
    return `<div class="model-operating-points"><div class="model-operating-title">Catalog Operating Points</div><div class="model-operating-scroll"><table><thead><tr><th>Control</th><th>kW</th><th>rpm</th><th>A</th><th>m³/h</th><th>Pa</th><th>dB(A)</th></tr></thead><tbody>${points.map(point=>`<tr><td><b>${esc(point.control||'-')}</b></td><td>${num(point.power,3)}</td><td>${num(point.speed)}</td><td>${num(point.current,2)}</td><td>${num(point.nominalAirflow)}</td><td>${num(point.maxPressure)}</td><td>${num(point.sound,1)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function modelCard(model,series){
    const image=model.media?.image||series.media?.image||'';
    const dimensionImage=model.media?.dimensionImage||'';
    return `<article class="model-card" data-model-id="${esc(model.id)}">
      <div class="model-card-head">
        <img src="${esc(image)}" alt="${esc(model.model)}" onerror="this.style.visibility='hidden'">
        <div><div class="series-brand">${esc(series.code||'')}</div><h3>${esc(model.model)}</h3>${model.catalogOnly?'<span class="model-catalog-only">Catalog only</span>':'<span class="model-catalog-only" style="background:#e8f6ef;color:#087f4f">Curve available · selection ready</span>'}</div>
      </div>
      <div class="model-grid">${modelFields(model)}</div>
      ${modelFeatures(model)}
      ${model.technical?.safetyWarning?`<div class="model-safety-warning" style="margin-top:12px;padding:10px 12px;border:1px solid #e5b05c;border-radius:8px;background:#fff8e8;color:#7a4b00;font-size:12px;font-weight:750;line-height:1.4"><b>Safety:</b> ${esc(model.technical.safetyWarning)}</div>`:''}
      ${dimensionImage?`<details class="model-dimension"><summary>Dimension Drawing</summary><img src="${esc(dimensionImage)}" alt="${esc(model.model)} dimension drawing" loading="lazy" onerror="this.closest('details').hidden=true"></details>`:''}

      <div class="model-card-actions" style="display:grid;grid-template-columns:1fr 48px;gap:8px;margin-top:13px">
        <button class="model-datasheet-btn" style="margin-top:0" type="button" data-model-datasheet="${esc(model.id)}">Preview</button>
        <button class="model-datasheet-btn" style="margin-top:0;font-size:22px;padding:0" type="button" data-add-catalog-project="${esc(model.id)}" title="Add to project" aria-label="Add to project">+</button>
      </div>
    </article>`;
  }

  function modelById(id){return catalog.getModel?catalog.getModel(id):allModels.find(item=>String(item.id)===String(id))}
  function productById(id){return catalog.product?catalog.product(id):null}

  function saveModelPdf(id){
    const model=modelById(id);
    const product=productById(id);
    const renderer=window.VensisDatasheet;
    if(!model||!renderer)return;
    const save=typeof renderer.save==='function'?renderer.save.bind(renderer):(typeof renderer.open==='function'?renderer.open.bind(renderer):null);
    if(!save)return;
    save({mode:'catalog',product,model});
  }

  function projectItems(){
    try{const value=JSON.parse(localStorage.getItem(PROJECT_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}
  }
  function saveProjectItems(items){
    localStorage.setItem(PROJECT_KEY,JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('vensis-project-updated'));
  }
  function toast(text){
    let node=document.getElementById('catalogProjectToast');
    if(!node){node=document.createElement('div');node.id='catalogProjectToast';node.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#173033;color:#fff;padding:11px 15px;border-radius:9px;font:700 13px Arial,Helvetica,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transform:translateY(8px);transition:.2s';document.body.appendChild(node)}
    node.textContent=text;node.style.opacity='1';node.style.transform='translateY(0)';clearTimeout(node._timer);node._timer=setTimeout(()=>{node.style.opacity='0';node.style.transform='translateY(8px)'},1800);
  }
  function addCatalogToProject(id,button){
    const model=modelById(id);if(!model)return;
    const product=productById(id)||{};
    const series=catalog.getSeries?catalog.getSeries(model.seriesId):allSeries.find(item=>item.id===model.seriesId)||{};
    const productKey=model.id||model.model||id;
    const itemKey=`catalog|${productKey}`;
    const speed=Number(model.motor?.speed)||0;
    const voltage=String(model.motor?.voltage||'').trim();
    const noise=Number(model.motor?.sound)||0;
    const items=projectItems();
    const existing=items.find(item=>item.itemKey===itemKey);
    if(existing){
      existing.quantity=(Number(existing.quantity)||1)+1;
      existing.speed=Number(existing.speed)||speed;
      existing.voltage=existing.voltage||voltage;
      existing.noise=Number(existing.noise)||noise;
      existing.hazardousArea=existing.hazardousArea||model.technical?.atex||null;
      existing.safetyWarning=existing.safetyWarning||model.technical?.safetyWarning||'';
      existing.updatedAt=new Date().toISOString();
    }else items.push({
      itemKey,
      mode:'catalog',
      productKey,
      model:model.model||'',
      series:series.title||model.seriesTitle||'',
      manufacturer:series.manufacturer||model.manufacturer||'',
      image:product.media?.image||series.media?.image||model.image||'',
      nominalAirflow:Number(model.performance?.nominalAirflow)||0,
      required:null,
      selected:null,
      motorPower:Number(model.motor?.power)||0,
      current:Number(model.motor?.current)||0,
      speed,
      voltage,
      noise,
      hazardousArea:model.technical?.atex||null,
      safetyWarning:model.technical?.safetyWarning||'',
      price:Number(model.pricing?.listPrice)||0,
      quantity:1,
      addedAt:new Date().toISOString()
    });
    saveProjectItems(items);
    if(button){const old=button.innerHTML;button.innerHTML='✓';setTimeout(()=>{button.innerHTML=old},1100)}
    toast(existing?'Project quantity increased.':'Catalog model added to project.');
  }

  function showSeries(id){
    const series=catalog.getSeries?catalog.getSeries(id):allSeries.find(item=>item.id===id);if(!series)return;
    const models=catalog.modelsForSeries?catalog.modelsForSeries(id):allModels.filter(model=>model.seriesId===id);
    const pdf=series.catalogue?.pdf;
    const description=series.description||{};
    const features=[...(description.general||[]),...(description.motor||[]),...(description.applications||[])];
    const seriesInfoHtml=`<div class="series-info-grid"><section class="detail-section" data-product-features style="grid-column:1/-1"><h3>General Features</h3>${bullets([...new Set(features)])}</section></div>`;
    document.getElementById('catalogLayout').hidden=true;
    const detail=document.getElementById('detailPage');
    detail.hidden=false;
    detail.innerHTML=`
      <button class="detail-back" type="button" onclick="Catalog.back()">← Back to Series</button>
      <section class="series-hero">
        <div class="series-hero-image"><img src="${esc(series.media?.image||'')}" alt="${esc(series.code)}" onerror="this.style.visibility='hidden'"></div>
        <div class="series-hero-copy">
          <div class="series-brand">${esc(displayBrand(series.manufacturer||''))}</div>
          <h1>${esc(series.code||series.title)}</h1>
          <h2>${esc(series.title||'')}</h2>
          <div class="series-badges"><span>${models.length} Models</span>${(series.categories||[]).map(category=>`<span>${esc(category)}</span>`).join('')}</div>
          <div class="series-hero-actions">
            ${pdf?`<a class="catalog-pdf" href="${esc(pdf)}" target="_blank" rel="noopener">Open Product PDF</a>`:''}
          </div>
        </div>
      </section>
      ${seriesInfoHtml}
      <section class="models-section">
        <div class="catalog-head"><div><div class="section-kicker">${esc(series.code)}</div><h2>Models</h2></div><div class="catalog-count">${models.length} models</div></div>
        <div class="models-grid">${models.map(model=>modelCard(model,series)).join('')||'<div class="empty-state">No models available.</div>'}</div>
      </section>`;
    detail.querySelectorAll('[data-model-datasheet]').forEach(button=>button.addEventListener('click',()=>saveModelPdf(button.dataset.modelDatasheet)));
    detail.querySelectorAll('[data-add-catalog-project]').forEach(button=>button.addEventListener('click',()=>addCatalogToProject(button.dataset.addCatalogProject,button)));
    document.title=`${series.code||series.title} | Vensis Product Catalog`;
    window.scrollTo({top:0,behavior:'auto'});
  }

  function back(){const q=new URLSearchParams(location.search);q.delete('series');q.delete('model');location.assign('/catalog.html'+(q.toString()?'?'+q.toString():''))}
  function reset(){selected.manufacturers.clear();selected.categories.clear();searchText='';const box=document.getElementById('catalogSearch');if(box)box.value='';renderFilters();renderSeries();syncFilters()}

  window.Catalog={render:renderSeries,reset,showSeries,saveModelPdf,addCatalogToProject,back};
  renderFilters();
  const searchInput=document.getElementById('catalogSearch');
  if(searchInput){searchInput.value=searchText;searchInput.addEventListener('input',()=>{searchText=searchInput.value.trim();renderSeries();syncFilters()});}
  const requestedValue=new URLSearchParams(location.search).get('series');
  const requestedSeries=catalog.resolveSeries?.(requestedValue,params.get('brand'))?.id||requestedValue;
  if(requestedSeries)showSeries(requestedSeries);else renderSeries();
  window.addEventListener('vensis-language-changed',()=>{if(requestedSeries)showSeries(requestedSeries);else renderSeries()});
})();

(function(){
  const catalog=window.VensisCatalog||{series:[],models:[]};
  const selected={manufacturers:new Set(),categories:new Set()};
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const num=(value,decimals=0)=>{const n=Number(value);return Number.isFinite(n)&&n>0?n.toLocaleString('en-US',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}):'-'};
  const unique=items=>[...new Set(items.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const allSeries=catalog.series||[];
  const allModels=catalog.models||[];
  const manufacturers=unique(allSeries.map(series=>series.manufacturer));
  const categories=unique(allSeries.flatMap(series=>series.categories||[]));

  function checkedList(id,items,set){
    const box=document.getElementById(id);if(!box)return;
    box.innerHTML=items.map(item=>`<label class="check-row"><input type="checkbox" value="${esc(item)}" ${set.has(item)?'checked':''}><span>${esc(item)}</span></label>`).join('')||'<div class="empty-note">No data</div>';
    box.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
      input.checked?set.add(input.value):set.delete(input.value);
      renderSeries();
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
      return true;
    });
  }

  function firstText(items){return Array.isArray(items)&&items.length?items[0]:''}

  function seriesUrl(id){
    return `${location.pathname}?series=${encodeURIComponent(id)}`;
  }

  function seriesCard(series){
    const count=(series.modelIds||[]).length;
    const summary=firstText(series.description?.general)||series.title||'';
    return `<article class="series-card" data-series="${esc(series.id)}" role="link" tabindex="0">
      <div class="series-card-image"><img src="${esc(series.media?.image||'')}" alt="${esc(series.code)}" onerror="this.style.visibility='hidden'"></div>
      <div class="series-card-body">
        <div class="series-brand">${esc(series.manufacturer||'')}</div>
        <h2>${esc(series.code||series.title)}</h2>
        <div class="series-title">${esc(series.title||'')}</div>
        ${summary&&summary!==series.title?`<p>${esc(summary)}</p>`:''}
        <div class="series-card-footer"><b>${count} Models</b><span>View Series →</span></div>
      </div>
    </article>`;
  }

  function renderSeries(){
    const rows=filteredSeries();
    document.getElementById('catalogCount').textContent=`${rows.length} series`;
    document.getElementById('catalogGrid').innerHTML=rows.map(seriesCard).join('')||'<div class="empty-state">No series matches these filters.</div>';
    document.querySelectorAll('[data-series]').forEach(card=>{
      const open=()=>location.assign(seriesUrl(card.dataset.series));
      card.addEventListener('click',open);
      card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
    });
  }

  function bullets(items){
    return Array.isArray(items)&&items.length?`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class="empty-note">No information available.</p>';
  }

  function modelFields(model){
    const fields=[
      ['Power',`${num(model.motor?.power,2)} kW`],
      ['Speed',`${num(model.motor?.speed)} rpm`],
      ['Current',`${num(model.motor?.current,2)} A`],
      ['Voltage',model.motor?.voltage||'-'],
      ['Frequency',model.motor?.frequency||'-'],
      ['Airflow',`${num(model.performance?.nominalAirflow)} m³/h`],
      ['Noise',`${num(model.motor?.sound)} dB(A)`],
      ['Weight',`${num(model.technical?.weight,1)} kg`],
      ['IP Class',model.technical?.ipClass||'-'],
      ['Insulation',model.technical?.insulationClass||'-'],
      ['Efficiency',model.technical?.efficiencyClass||'-'],
      ['Price',model.pricing?.listPrice>0?`€${num(model.pricing.listPrice,2)}`:'-']
    ];
    return fields.map(([label,value])=>`<div class="model-field"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('');
  }

  function modelCard(model,series){
    return `<article class="model-card">
      <div class="model-card-head">
        <img src="${esc(series.media?.image||'')}" alt="${esc(model.model)}" onerror="this.style.visibility='hidden'">
        <div><div class="series-brand">${esc(series.code||'')}</div><h3>${esc(model.model)}</h3></div>
      </div>
      <div class="model-grid">${modelFields(model)}</div>
    </article>`;
  }

  function showSeries(id){
    const series=catalog.getSeries?catalog.getSeries(id):allSeries.find(item=>item.id===id);if(!series)return;
    const models=catalog.modelsForSeries?catalog.modelsForSeries(id):allModels.filter(model=>model.seriesId===id);
    const pdf=series.catalogue?.pdf;
    document.getElementById('catalogLayout').hidden=true;
    const detail=document.getElementById('detailPage');
    detail.hidden=false;
    detail.innerHTML=`
      <button class="detail-back" type="button" onclick="Catalog.back()">← Back to Series</button>
      <section class="series-hero">
        <div class="series-hero-image"><img src="${esc(series.media?.image||'')}" alt="${esc(series.code)}" onerror="this.style.visibility='hidden'"></div>
        <div class="series-hero-copy">
          <div class="series-brand">${esc(series.manufacturer||'')}</div>
          <h1>${esc(series.code||series.title)}</h1>
          <h2>${esc(series.title||'')}</h2>
          <div class="series-badges"><span>${models.length} Models</span>${(series.categories||[]).map(category=>`<span>${esc(category)}</span>`).join('')}</div>
          ${pdf?`<a class="catalog-pdf" href="${esc(pdf)}" target="_blank" rel="noopener">Open Product PDF</a>`:''}
        </div>
      </section>
      <div class="series-info-grid">
        <section class="detail-section"><h3>General Features</h3>${bullets(series.description?.general)}</section>
        <section class="detail-section"><h3>Motor</h3>${bullets(series.description?.motor)}</section>
        <section class="detail-section"><h3>Areas of Usage</h3>${bullets(series.description?.applications)}</section>
      </div>
      <section class="models-section">
        <div class="catalog-head"><div><div class="section-kicker">${esc(series.code)}</div><h2>Models</h2></div><div class="catalog-count">${models.length} models</div></div>
        <div class="models-grid">${models.map(model=>modelCard(model,series)).join('')||'<div class="empty-state">No models available.</div>'}</div>
      </section>`;
    document.title=`${series.code||series.title} | Vensis Product Catalog`;
    window.scrollTo({top:0,behavior:'auto'});
  }

  function back(){
    location.assign(location.pathname);
  }

  function reset(){
    selected.manufacturers.clear();selected.categories.clear();
    renderFilters();renderSeries();
  }

  window.Catalog={render:renderSeries,reset,showSeries,back};
  renderFilters();
  const requestedSeries=new URLSearchParams(location.search).get('series');
  if(requestedSeries)showSeries(requestedSeries);else renderSeries();
})();

(function(){
  const catalog=window.VensisCatalog||{series:[],models:[]};
  const selected={manufacturers:new Set(),categories:new Set(),series:new Set()};
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const num=(value,decimals=0)=>{const n=Number(value);return Number.isFinite(n)&&n>0?n.toLocaleString('en-US',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}):'-'};
  const seriesById=new Map((catalog.series||[]).map(s=>[s.id,s]));
  const models=(catalog.models||[]).map(model=>({model,series:seriesById.get(model.seriesId)||{}}));
  const unique=items=>[...new Set(items.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const manufacturers=unique(models.map(x=>x.series.manufacturer));
  const categories=unique(models.flatMap(x=>x.series.categories||[]));
  const seriesIds=unique(models.map(x=>x.model.seriesId));

  function checkedList(id,items,set,label){
    const box=document.getElementById(id);if(!box)return;
    box.innerHTML=items.map(item=>`<label class="check-row"><input type="checkbox" value="${esc(item)}" ${set.has(item)?'checked':''}><span>${esc(label?label(item):item)}</span></label>`).join('')||'<div style="padding:6px;color:#64748b">No data</div>';
    box.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{input.checked?set.add(input.value):set.delete(input.value);render()}));
  }

  function renderFilters(){
    checkedList('catalogManufacturers',manufacturers,selected.manufacturers);
    checkedList('catalogCategories',categories,selected.categories);
    checkedList('catalogSeries',seriesIds,selected.series,id=>{const s=seriesById.get(id);return s?`${s.code} — ${s.title}`:id});
  }

  function filtered(){
    const q=(document.getElementById('catalogSearch')?.value||'').trim().toLowerCase();
    return models.filter(({model,series})=>{
      if(selected.manufacturers.size&&!selected.manufacturers.has(series.manufacturer))return false;
      if(selected.categories.size&&![...selected.categories].every(category=>(series.categories||[]).includes(category)))return false;
      if(selected.series.size&&!selected.series.has(model.seriesId))return false;
      if(q&&!`${model.model} ${model.display} ${series.code} ${series.title} ${series.manufacturer}`.toLowerCase().includes(q))return false;
      return true;
    });
  }

  function card({model,series}){
    const image=series.media?.image||'';
    return `<article class="product-card" data-model="${esc(model.id)}"><img src="${esc(image)}" alt="${esc(model.model)}" onerror="this.style.visibility='hidden'"><div class="product-card-body"><h3>${esc(model.model)}</h3><div class="series">${esc(series.title||series.code||model.seriesId)}</div><div class="product-meta"><div><span>Power</span><b>${num(model.motor?.power,2)} kW</b></div><div><span>Speed</span><b>${num(model.motor?.speed)} rpm</b></div><div><span>Current</span><b>${num(model.motor?.current,2)} A</b></div><div><span>Price</span><b>${model.pricing?.listPrice>0?'€'+num(model.pricing.listPrice,2):'-'}</b></div></div></div></article>`;
  }

  function render(){
    const rows=filtered();
    document.getElementById('catalogCount').textContent=`${rows.length} product`;
    document.getElementById('catalogGrid').innerHTML=rows.map(card).join('')||'<div style="padding:20px;color:#64748b">No product matches these filters.</div>';
    document.querySelectorAll('[data-model]').forEach(el=>el.addEventListener('click',()=>open(el.dataset.model)));
  }

  function fields(model){
    const values=[
      ['Motor Power',`${num(model.motor?.power,2)} kW`],['Speed',`${num(model.motor?.speed)} rpm`],['Current',`${num(model.motor?.current,2)} A`],['Voltage',model.motor?.voltage||'-'],
      ['Frequency',model.motor?.frequency||'-'],['Noise',`${num(model.motor?.sound)} dB(A)`],['Weight',`${num(model.technical?.weight,1)} kg`],['Price',model.pricing?.listPrice>0?`€${num(model.pricing.listPrice,2)}`:'-']
    ];
    return values.map(([label,value])=>`<div class="detail-field"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('');
  }

  function bullets(items){return items?.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p style="color:#64748b">No information available.</p>'}

  function open(id){
    const model=catalog.getModel?catalog.getModel(id):(catalog.models||[]).find(x=>x.id===id);if(!model)return;
    const series=catalog.getSeries?catalog.getSeries(model.seriesId):seriesById.get(model.seriesId)||{};
    const siblings=(catalog.modelsForSeries?catalog.modelsForSeries(model.seriesId):(catalog.models||[]).filter(x=>x.seriesId===model.seriesId));
    document.getElementById('detailSheet').innerHTML=`<button class="detail-close" onclick="Catalog.close()">×</button><div class="detail-hero"><img src="${esc(series.media?.image||'')}" alt="${esc(model.model)}" onerror="this.remove()"><div><div style="font-size:13px;color:#087f4f;font-weight:700">${esc(series.manufacturer||'')}</div><h1>${esc(model.model)}</h1><div>${esc(series.title||series.code||model.seriesId)}</div><div class="detail-grid">${fields(model)}</div></div></div><section class="detail-section"><h3>General Features</h3>${bullets(series.description?.general)}</section><section class="detail-section"><h3>Motor</h3>${bullets(series.description?.motor)}</section><section class="detail-section"><h3>Areas of Usage</h3>${bullets(series.description?.applications)}</section><section class="detail-section"><h3>Other Models in This Series</h3><div class="siblings">${siblings.map(item=>`<button class="${item.id===model.id?'active':''}" onclick="Catalog.open('${esc(item.id)}')">${esc(item.model)}</button>`).join('')}</div></section>`;
    document.getElementById('detailModal').classList.add('open');document.body.style.overflow='hidden';
  }
  function close(){document.getElementById('detailModal').classList.remove('open');document.body.style.overflow=''}
  function backdrop(event){if(event.target.id==='detailModal')close()}
  function reset(){selected.manufacturers.clear();selected.categories.clear();selected.series.clear();const search=document.getElementById('catalogSearch');if(search)search.value='';renderFilters();render()}
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
  window.Catalog={render,reset,open,close,backdrop};
  renderFilters();render();
})();
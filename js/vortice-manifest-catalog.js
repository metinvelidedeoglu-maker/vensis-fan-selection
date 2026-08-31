(function(){
  'use strict';
  if(!window.VensisCatalogManifestOnly)return;

  const rows=Array.isArray(window.VensisCatalog?.series)?window.VensisCatalog.series:[];
  const selected=new Set();
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const unique=items=>[...new Set(items.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const categories=unique(rows.flatMap(row=>row.categories||[]));

  const categoryTr={
    'Axial Fan':'Aksiyel Fan',
    'Cabinet Fan':'Hücreli Fan',
    'Centrifugal Fan':'Santrifüj Fan',
    'Duct Fan':'Kanal Tipi Fan',
    'EC Fan':'EC Fan',
    'Explosion-Proof / ATEX Fan':'Ex-Proof / ATEX Fan',
    'Extract Fan':'Egzoz Fanı',
    'Mixed Flow Fan':'Karma Akışlı Fan',
    'Quiet Fan':'Sessiz Fan',
    'Residential Fan':'Konut Tipi Fan',
    'Roof Fan':'Çatı Tipi Fan',
    'Smoke Exhaust Fan':'Duman Tahliye Fanı',
    'Wall-Mounted Fan':'Duvar Tipi Fan'
  };

  function language(){
    if(window.VensisI18n?.getLanguage)return window.VensisI18n.getLanguage();
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  }
  function tr(){return language()==='tr'}
  function categoryLabel(value){return tr()?(categoryTr[value]||value):value}
  function firstText(items){return Array.isArray(items)&&items.length?items[0]:''}

  function renderFilters(){
    const box=document.getElementById('catalogCategories');
    if(!box)return;
    box.innerHTML=categories.map(category=>`<label class="check-row"><input type="checkbox" value="${esc(category)}" ${selected.has(category)?'checked':''}><span>${esc(categoryLabel(category))}</span></label>`).join('');
    box.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
      input.checked?selected.add(input.value):selected.delete(input.value);
      renderSeries();
    }));
  }

  function filteredRows(){
    if(!selected.size)return rows;
    return rows.filter(row=>[...selected].every(category=>(row.categories||[]).includes(category)));
  }

  function seriesUrl(id){
    const params=new URLSearchParams(location.search);
    params.set('series',id);
    return `${location.pathname}?${params.toString()}`;
  }

  function card(row){
    const count=Array.isArray(row.modelIds)?row.modelIds.length:Number(row.modelCount)||0;
    const summary=firstText(row.description?.general)||row.title||'';
    const modelLabel=tr()?'model':'Models';
    const action=tr()?'Seriyi Gör →':'View Series →';
    const image=String(row.media?.image||'').trim();
    return `<article class="series-card" data-series="${esc(row.id)}" role="link" tabindex="0">
      <div class="series-card-image">${image?`<img src="${esc(image)}" alt="${esc(row.code||row.title||'Vortice')}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.remove()">`:''}</div>
      <div class="series-card-body">
        <div class="series-brand">${esc(row.manufacturer||'Vortice')}</div>
        <h2>${esc(row.code||row.title||'')}</h2>
        <div class="series-title">${esc(row.title||'')}</div>
        ${summary&&summary!==row.title?`<p>${esc(summary)}</p>`:''}
        <div class="series-card-footer"><b>${count} ${modelLabel}</b><span>${action}</span></div>
      </div>
    </article>`;
  }

  function renderSeries(){
    const list=filteredRows();
    const count=document.getElementById('catalogCount');
    const grid=document.getElementById('catalogGrid');
    if(count)count.textContent=tr()?`${list.length} seri`:`${list.length} series`;
    if(!grid)return;
    grid.innerHTML=list.map(card).join('')||`<div class="empty-state">${tr()?'Bu filtrelere uygun seri bulunamadı.':'No series matches these filters.'}</div>`;
    grid.querySelectorAll('[data-series]').forEach(node=>{
      const open=()=>location.assign(seriesUrl(node.dataset.series));
      node.addEventListener('click',open);
      node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
    });
  }

  function reset(){selected.clear();renderFilters();renderSeries()}
  function render(){renderFilters();renderSeries()}

  window.Catalog={render,reset};
  window.addEventListener('vensis-language-changed',render);
  render();
})();

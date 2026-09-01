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
    'Mixed Flow Fan':'Karışık Akışlı Fan',
    'Quiet Fan':'Sessiz Fan',
    'Residential Fan':'Konut Tipi Fan',
    'Roof Fan':'Çatı Tipi Fan',
    'Smoke Exhaust Fan':'Duman Tahliye Fanı',
    'Wall-Mounted Fan':'Duvar Tipi Fan'
  };

  const titleTr={
    'LINEO QUIET ES':'LINEO QUIET ES Düşük Sesli Kanal Tipi EC Karışık Akışlı Fanlar',
    'LINEO QUIET':'LINEO QUIET Düşük Sesli Kanal Tipi Karışık Akışlı Fanlar',
    'LINEO':'LINEO Kanal Tipi Karışık Akışlı Fanlar',
    'CA MD EXTRA EU':'CA MD Extra EU Kanal Tipi Karışık Akışlı Fanlar',
    'CA MD E RF':'CA MD E RF Çatı Tipi Karışık Akışlı Egzoz Fanları',
    'SLIMROOF ES':'SLIMROOF ES EC Santrifüj Çatı Fanları',
    'HEATMASTER F400':'HEATMASTER F400 Duman Tahliye Santrifüj Çatı Fanları',
    'E-ATEX':'E-ATEX Patlamaya Dayanıklı Aksiyel Plaka Fanları',
    'TIRACAMINO':'Tiracamino Baca Üstü Aspiratör',
    'VORT QBK SAL-KC EVO':'VORT QBK SAL-KC EVO Hücreli Santrifüj Fanlar',
    'VORT QUADRO EVO':'VORT QUADRO EVO Konut Tipi Santrifüj Aspiratörler',
    'VORT QUADRO I':'VORT QUADRO I Gömme Tip Santrifüj Kanal Fanları',
    'VORT QUADRO':'VORT QUADRO Santrifüj Kanal Fanları',
    'VORTICE VARIO I':'VORTICE VARIO I Gömme Tip Aksiyel Fanlar',
    'VORTICE VARIO':'VORTICE VARIO Duvar / Pencere Tipi Aksiyel Fanlar',
    'PUNTO EVO FLEXO':'PUNTO EVO FLEXO Duvar Tipi Aksiyel Fanlar',
    'PUNTO EVO GOLD':'PUNTO EVO GOLD Dekoratif Duvar Tipi Aksiyel Fanlar',
    'PUNTO EVO':'PUNTO EVO Çift Hızlı Duvar Tipi Aksiyel Fanlar',
    'PUNTO GHOST':'PUNTO GHOST Aksiyel Kanal Fanları',
    'PUNTO FOUR':'PUNTO FOUR Duvar Tipi Aksiyel Fanlar',
    'PUNTO FILO':'PUNTO FILO İnce Tasarımlı Duvar Tipi Aksiyel Fanlar',
    'PUNTO':'PUNTO Duvar / Pencere Tipi Aksiyel Fanlar'
  };

  const summaryTr={
    'LINEO QUIET ES':'Dairesel kanal sistemleri için düşük sesli EC karışık akışlı kanal fanı serisi.',
    'LINEO QUIET':'Dairesel kanal sistemleri için düşük sesli karışık akışlı kanal fanı serisi.',
    'LINEO':'Dairesel kanal sistemleri için karışık akışlı kanal fanı serisi.',
    'CA MD EXTRA EU':'Yüksek performanslı karışık akışlı kanal fanı serisi.',
    'CA MD E RF':'Çatı tipi karışık akışlı egzoz fanı serisi.',
    'SLIMROOF ES':'EC motorlu santrifüj çatı fanı serisi.',
    'HEATMASTER F400':'F400 sınıfı duman tahliye santrifüj çatı fanı serisi.',
    'E-ATEX':'Tehlikeli bölgeler için patlamaya dayanıklı aksiyel plaka fan serisi.',
    'TIRACAMINO':'Baca üstü aspiratör serisi.',
    'VORT QBK SAL-KC EVO':'Ticari ve endüstriyel kanal sistemleri için hücreli santrifüj fan serisi.',
    'VORT QUADRO EVO':'Konut tipi santrifüj aspiratör serisi.',
    'VORT QUADRO I':'Gömme tip santrifüj aspiratör serisi.',
    'VORT QUADRO':'Konut tipi santrifüj aspiratör serisi.',
    'VORTICE VARIO I':'Gömme tip tersinir aksiyel fan serisi.',
    'VORTICE VARIO':'Duvar ve pencere montajlı aksiyel fan serisi.',
    'PUNTO EVO FLEXO':'Duvar tipi aksiyel aspiratör serisi.',
    'PUNTO EVO GOLD':'Dekoratif duvar tipi aksiyel aspiratör serisi.',
    'PUNTO EVO':'Çift hızlı duvar tipi aksiyel aspiratör serisi.',
    'PUNTO GHOST':'Aksiyel kanal tipi aspiratör serisi.',
    'PUNTO FOUR':'Duvar tipi aksiyel aspiratör serisi.',
    'PUNTO FILO':'İnce tasarımlı duvar tipi aksiyel aspiratör serisi.',
    'PUNTO':'Duvar ve pencere tipi aksiyel aspiratör serisi.'
  };

  function language(){
    if(window.VensisI18n?.getLanguage)return window.VensisI18n.getLanguage();
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  }
  function tr(){return language()==='tr'}
  function categoryLabel(value){return tr()?(categoryTr[value]||value):value}
  function firstText(items){return Array.isArray(items)&&items.length?items[0]:''}
  function localizedTitle(row){return tr()?(titleTr[row.id]||row.title||''):(row.title||'')}
  function localizedSummary(row){
    const source=firstText(row.description?.general)||row.title||'';
    return tr()?(summaryTr[row.id]||source):source;
  }

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
    const title=localizedTitle(row);
    const summary=localizedSummary(row);
    const modelLabel=tr()?'model':'Models';
    const action=tr()?'Seriyi Gör →':'View Series →';
    const image=String(row.media?.image||'').trim();
    return `<article class="series-card" data-series="${esc(row.id)}" role="link" tabindex="0">
      <div class="series-card-image">${image?`<img src="${esc(image)}" alt="${esc(row.code||row.title||'Vortice')}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.remove()">`:''}</div>
      <div class="series-card-body">
        <div class="series-brand">${esc(row.manufacturer||'Vortice')}</div>
        <h2>${esc(row.code||row.title||'')}</h2>
        <div class="series-title">${esc(title)}</div>
        ${summary&&summary!==title?`<p>${esc(summary)}</p>`:''}
        <div class="series-card-footer"><b>${count} ${modelLabel}</b><span>${action}</span></div>
      </div>
    </article>`;
  }

  function renderSeries(){
    const list=filteredRows();
    const count=document.getElementById('catalogCount');
    const grid=document.getElementById('catalogGrid');
    document.title=tr()?'Vortice | Vensis Ürün Kataloğu':'Vortice | Vensis Product Catalog';
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

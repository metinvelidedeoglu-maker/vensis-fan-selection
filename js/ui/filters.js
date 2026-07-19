(function(){
  const S=window.VensisState,U=window.VensisUtils;
  const categoryNames={'Aksiyal':'Axial Fan','Radyal':'Radial Fan','Kanal Tipi':'Duct Fan','Hücreli':'Cabinet Fan','Jetfan':'Jet Fan','Tünel Tipi':'Tunnel Fan','Çatı Tipi':'Roof Fan','Duvar Tipi':'Wall-Mounted Fan','Mobil':'Mobile Fan','Salyangoz':'Centrifugal Fan','Bifurcated':'Bifurcated Fan','Kısa Kasalı':'Short-Casing Fan','Duman Tahliye':'Smoke Exhaust Fan','Exproof / ATEX':'Explosion-Proof / ATEX Fan','EC':'EC Fan','Isı Geri Kazanım':'Heat Recovery Unit','Sığınak':'Shelter Fan'};
  const categoryName=category=>categoryNames[category]||category;
  const seriesName=series=>window.VensisProducts?.seriesName(series)||series;

  function modelMatchesManufacturer(model){
    return !S.selectedManufacturers.size||S.selectedManufacturers.has(model.manufacturer);
  }

  function availableCategories(){
    return [...new Set(S.models.filter(modelMatchesManufacturer).flatMap(model=>model.categories||[]))]
      .sort((a,b)=>categoryName(a).localeCompare(categoryName(b),'en'));
  }

  function modelMatchesCategories(model){
    return [...S.selectedCategories].every(category=>(model.categories||[]).includes(category));
  }

  function availableSeries(){
    return [...new Set(S.models.filter(model=>modelMatchesManufacturer(model)&&modelMatchesCategories(model)).map(model=>model.series).filter(Boolean))]
      .sort((a,b)=>seriesName(a).localeCompare(seriesName(b),'en'));
  }

  function countSeries(series){
    return new Set(S.models.filter(model=>model.series===series&&modelMatchesManufacturer(model)&&modelMatchesCategories(model)).map(model=>model.key)).size;
  }

  function button(value,label,active,dataName,extra=''){
    return `<button type="button" class="list-item ${active?'active':''}" data-${dataName}="${U.escapeHtml(value)}"><span class="checkmark">${active?'✓':''}</span><span>${U.escapeHtml(label)}${extra}</span></button>`;
  }

  function render(){
    const manufacturerBox=U.byId('manufacturerList'),categoryBox=U.byId('categoryList'),seriesBox=U.byId('seriesList');
    if(!manufacturerBox||!categoryBox||!seriesBox)return;

    const manufacturers=[...S.indexes.manufacturers].sort((a,b)=>a.localeCompare(b,'en'));
    manufacturerBox.innerHTML=manufacturers.map(name=>button(name,name,S.selectedManufacturers.has(name),'manufacturer')).join('');
    U.byId('manufacturerCount').textContent=`${S.selectedManufacturers.size} selected`;

    const categories=availableCategories();
    const categoryQuery=U.byId('categorySearch')?.value||'';
    const visibleCategories=categories.filter(category=>U.smartMatch(categoryName(category),categoryQuery));
    categoryBox.innerHTML=visibleCategories.map(category=>button(category,categoryName(category),S.selectedCategories.has(category),'category')).join('')||'<div class="empty">No product category found.</div>';
    U.byId('categoryCount').textContent=`${visibleCategories.length} of ${categories.length}`;

    const allSeries=availableSeries();
    const seriesQuery=U.byId('seriesSearch')?.value||'';
    const visibleSeries=allSeries.filter(series=>U.smartMatch(seriesName(series),seriesQuery));
    seriesBox.innerHTML=visibleSeries.map(series=>button(series,seriesName(series),S.selectedSeries.has(series),'series',` <b style="color:#0b7f4c">(${countSeries(series)})</b>`)).join('')||'<div class="empty">No product series found.</div>';
    U.byId('seriesCount').textContent=`${visibleSeries.length} of ${allSeries.length}`;
  }

  function cleanSelections(){
    const allowedCategories=new Set(availableCategories());
    for(const category of S.selectedCategories)if(!allowedCategories.has(category))S.selectedCategories.delete(category);
    const allowedSeries=new Set(availableSeries());
    for(const series of S.selectedSeries)if(!allowedSeries.has(series))S.selectedSeries.delete(series);
  }

  function toggleManufacturer(name){
    S.selectedManufacturers.has(name)?S.selectedManufacturers.delete(name):S.selectedManufacturers.add(name);
    cleanSelections();render();window.runSelection();
  }

  function toggleCategory(category){
    S.selectedCategories.has(category)?S.selectedCategories.delete(category):S.selectedCategories.add(category);
    cleanSelections();render();window.runSelection();
  }

  function toggleSeries(series){
    S.selectedSeries.has(series)?S.selectedSeries.delete(series):S.selectedSeries.add(series);
    render();window.runSelection();
  }

  document.addEventListener('click',event=>{
    const manufacturer=event.target.closest('[data-manufacturer]');
    if(manufacturer){toggleManufacturer(manufacturer.dataset.manufacturer);return}
    const category=event.target.closest('[data-category]');
    if(category){toggleCategory(category.dataset.category);return}
    const series=event.target.closest('[data-series]');
    if(series)toggleSeries(series.dataset.series);
  });

  window.VensisFilters={render,toggleManufacturer,toggleCategory,toggleSeries,categoryName,seriesName};
})();
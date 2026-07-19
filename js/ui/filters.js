(function(){
  const S=window.VensisState,U=window.VensisUtils;
  const tagNames={'Aksiyal':'Axial Fan','Radyal':'Radial Fan','Kanal Tipi':'Duct Fan','Hücreli':'Cabinet Fan','Jetfan':'Jet Fan','Tünel Tipi':'Tunnel Fan','Çatı Tipi':'Roof Fan','Duvar Tipi':'Wall-Mounted Fan','Mobil':'Mobile Fan','Salyangoz':'Centrifugal Fan','Bifurcated':'Bifurcated Fan','Kısa Kasalı':'Short-Casing Fan','Duman Tahliye':'Smoke Exhaust Fan','Exproof / ATEX':'Explosion-Proof / ATEX Fan','EC':'EC Fan','Isı Geri Kazanım':'Heat Recovery Unit','Sığınak':'Shelter Fan'};
  const tagName=tag=>tagNames[tag]||tag;
  const seriesName=series=>window.VensisProducts?.seriesName(series)||series;
  const allTags=[...S.indexes.tags].sort((a,b)=>tagName(a).localeCompare(tagName(b),'en'));

  function availableSeries(){
    const selected=[...S.selectedTags];
    const source=selected.length?S.models.filter(model=>selected.every(tag=>(model.tags||[]).includes(tag))).map(model=>model.series):S.indexes.series;
    return [...new Set(source.filter(Boolean))].sort((a,b)=>seriesName(a).localeCompare(seriesName(b),'en'));
  }

  function countSeries(series){return S.indexes.seriesCounts.get(series)?.size||0}

  function render(){
    const tagBox=U.byId('tagList'),seriesBox=U.byId('seriesList');
    if(!tagBox||!seriesBox)return;

    const tagQuery=U.byId('typeSearch')?.value||'';
    const visibleTags=allTags.filter(tag=>U.smartMatch(tagName(tag),tagQuery));
    U.byId('typeCount').textContent=`${visibleTags.length} of ${allTags.length}`;
    tagBox.innerHTML=visibleTags.map(tag=>`<button type="button" class="list-item ${S.selectedTags.has(tag)?'active':''}" data-tag="${U.escapeHtml(tag)}"><span class="checkmark">${S.selectedTags.has(tag)?'✓':''}</span><span>${U.escapeHtml(tagName(tag))}</span></button>`).join('')||'<div class="empty">No product type found.</div>';

    const allSeries=availableSeries();
    const seriesQuery=U.byId('seriesSearch')?.value||'';
    const visibleSeries=allSeries.filter(series=>U.smartMatch(seriesName(series),seriesQuery));
    U.byId('seriesCount').textContent=`${visibleSeries.length} of ${allSeries.length}`;
    seriesBox.innerHTML=visibleSeries.map(series=>`<button type="button" class="list-item ${S.selectedSeries.has(series)?'series-active':''}" data-series="${U.escapeHtml(series)}"><span class="checkmark">${S.selectedSeries.has(series)?'✓':''}</span><span>${U.escapeHtml(seriesName(series))} <b style="color:#0b7f4c">(${countSeries(series)})</b></span></button>`).join('')||'<div class="empty">No product series found.</div>';
  }

  function toggleTag(tag){
    S.selectedTags.has(tag)?S.selectedTags.delete(tag):S.selectedTags.add(tag);
    const allowed=new Set(availableSeries());
    for(const series of S.selectedSeries)if(!allowed.has(series))S.selectedSeries.delete(series);
    render();
    window.runSelection();
  }

  function toggleSeries(series){
    S.selectedSeries.has(series)?S.selectedSeries.delete(series):S.selectedSeries.add(series);
    render();
    window.runSelection();
  }

  document.addEventListener('click',event=>{
    const tag=event.target.closest('[data-tag]');
    if(tag){toggleTag(tag.dataset.tag);return}
    const series=event.target.closest('[data-series]');
    if(series)toggleSeries(series.dataset.series);
  });

  window.VensisFilters={render,toggleTag,toggleSeries,tagName,seriesName};
})();
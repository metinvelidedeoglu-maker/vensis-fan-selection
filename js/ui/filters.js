(function(){
  const S=window.VensisState,U=window.VensisUtils;
  const tagNames={'Aksiyal':'Axial Fan','Radyal':'Radial Fan','Kanal Tipi':'Duct Fan','Hücreli':'Cabinet Fan','Jetfan':'Jet Fan','Tünel Tipi':'Tunnel Fan','Çatı Tipi':'Roof Fan','Duvar Tipi':'Wall-Mounted Fan','Mobil':'Mobile Fan','Salyangoz':'Centrifugal Fan','Bifurcated':'Bifurcated Fan','Kısa Kasalı':'Short-Casing Fan','Duman Tahliye':'Smoke Exhaust Fan','Exproof / ATEX':'Explosion-Proof / ATEX Fan','EC':'EC Fan','Isı Geri Kazanım':'Heat Recovery Unit','Sığınak':'Shelter Fan'};
  const tagName=t=>tagNames[t]||t;
  const seriesName=s=>window.VensisProducts?.seriesName(s)||s;
  function allTags(){return [...new Set(S.models.flatMap(m=>m.tags||[]))].sort((a,b)=>tagName(a).localeCompare(tagName(b),'en'))}
  function allSeries(){return [...new Set(S.models.filter(m=>!S.selectedTags.size||[...S.selectedTags].every(t=>(m.tags||[]).includes(t))).map(m=>m.series).filter(Boolean))].sort((a,b)=>seriesName(a).localeCompare(seriesName(b),'en'))}
  function countSeries(series){return new Set(S.models.filter(m=>m.series===series).map(m=>m.key)).size}
  function render(){
    const tagBox=U.byId('tagList'),seriesBox=U.byId('seriesList'); if(!tagBox||!seriesBox)return;
    const tags=allTags().filter(t=>U.smartMatch(tagName(t),U.byId('typeSearch')?.value||''));
    U.byId('typeCount').textContent=`${tags.length} of ${allTags().length}`;
    tagBox.innerHTML=tags.map(t=>`<button type="button" class="list-item ${S.selectedTags.has(t)?'active':''}" data-tag="${U.escapeHtml(t)}"><span class="checkmark">${S.selectedTags.has(t)?'✓':''}</span><span>${U.escapeHtml(tagName(t))}</span></button>`).join('')||'<div class="empty">No product type found.</div>';
    const all=allSeries(),series=all.filter(s=>U.smartMatch(seriesName(s),U.byId('seriesSearch')?.value||''));
    U.byId('seriesCount').textContent=`${series.length} of ${all.length}`;
    seriesBox.innerHTML=series.map(s=>`<button type="button" class="list-item ${S.selectedSeries.has(s)?'series-active':''}" data-series="${U.escapeHtml(s)}"><span class="checkmark">${S.selectedSeries.has(s)?'✓':''}</span><span>${U.escapeHtml(seriesName(s))} <b style="color:#0b7f4c">(${countSeries(s)})</b></span></button>`).join('')||'<div class="empty">No product series found.</div>';
  }
  function toggleTag(tag){S.selectedTags.has(tag)?S.selectedTags.delete(tag):S.selectedTags.add(tag);const allowed=new Set(allSeries());[...S.selectedSeries].forEach(s=>{if(!allowed.has(s))S.selectedSeries.delete(s)});render();window.runSelection()}
  function toggleSeries(series){S.selectedSeries.has(series)?S.selectedSeries.delete(series):S.selectedSeries.add(series);render();window.runSelection()}
  document.addEventListener('click',e=>{const tag=e.target.closest('[data-tag]');if(tag)toggleTag(tag.dataset.tag);const series=e.target.closest('[data-series]');if(series)toggleSeries(series.dataset.series)});
  window.VensisFilters={render,toggleTag,toggleSeries,tagName,seriesName};
})();
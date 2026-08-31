(function(){
  'use strict';
  if(!window.VensisCatalogManifestOnly)return;

  function cleanEmptyImages(){
    document.querySelectorAll('.series-card-image img').forEach(img=>{
      if(!String(img.getAttribute('src')||'').trim())img.remove();
    });
  }

  function placeholderIds(seriesId,count){
    return Array.from({length:count},(_,index)=>`manifest:${seriesId}:${index+1}`);
  }

  async function hydrateCounts(){
    try{
      const response=await fetch('api/catalog/vortice-counts.php?v=20260831-counts-r1',{cache:'no-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const counts=await response.json();
      const rows=window.VensisCatalog?.series||[];
      rows.forEach(series=>{
        const count=Number(counts?.[series.id]);
        if(!Number.isFinite(count)||count<0)return;
        series.modelCount=count;
        series.modelIds=placeholderIds(series.id,count);
      });
      window.VensisVorticeSeriesCounts=counts;
      window.VensisVorticeSeriesCountsReady=true;
      window.Catalog?.render?.();
      cleanEmptyImages();
    }catch(error){
      window.VensisVorticeSeriesCountsReady=false;
      console.warn('[Vensis] Vortice series counts could not be loaded.',error);
    }
  }

  function start(){
    cleanEmptyImages();
    hydrateCounts();
    window.addEventListener('vensis-language-changed',cleanEmptyImages);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();

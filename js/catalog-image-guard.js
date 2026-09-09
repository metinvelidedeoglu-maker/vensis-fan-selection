(function(){
  'use strict';

  const IMAGE_SELECTOR='.series-card-image img,.series-hero-image img,.model-card-head img,.model-dimension img';
  const PRODUCT_IMAGE_SELECTOR='.series-card-image img,.series-hero-image img,.model-card-head img';
  let raf=0;

  function text(value){return String(value??'').trim()}

  function rootUrl(value){
    const raw=text(value);
    if(!raw)return '';
    try{
      if(/^(?:data:|blob:|https?:|\/\/|\/)/i.test(raw))return new URL(raw,location.href).href;
      const clean=raw.replace(/^\.\//,'').replace(/^(?:\.\.\/)+/,'');
      return new URL('/'+clean,location.origin).href;
    }catch{return raw}
  }

  function catalogModel(id){
    const source=window.VensisCatalog;
    if(!source)return null;
    return (typeof source.getModel==='function'?source.getModel(id):null)||
      (source.models||[]).find(model=>String(model.id)===String(id))||null;
  }

  function catalogSeries(id){
    const source=window.VensisCatalog;
    if(!source)return null;
    return (typeof source.getSeries==='function'?source.getSeries(id):null)||
      (source.series||[]).find(series=>String(series.id)===String(id))||null;
  }

  function seriesFallback(img){
    const card=img.closest?.('.model-card');
    const id=card?.querySelector?.('[data-model-datasheet]')?.getAttribute('data-model-datasheet');
    const model=catalogModel(id);
    const series=catalogSeries(model?.seriesId);
    return rootUrl(series?.media?.image||'');
  }

  function markVisible(img){
    if(img.style.visibility==='hidden')img.style.visibility='visible';
    delete img.dataset.vensisCatalogImageFailed;
  }

  function normalizeImage(img){
    if(!(img instanceof HTMLImageElement)||!img.matches(IMAGE_SELECTOR))return;
    const raw=img.getAttribute('src');
    if(!raw)return;
    const absolute=rootUrl(raw);
    if(!absolute)return;
    if(img.src!==absolute){
      img.dataset.vensisCatalogRootTried='1';
      markVisible(img);
      img.src=absolute;
      return;
    }
    if(img.style.visibility==='hidden'&&img.dataset.vensisCatalogImageFailed!=='1')markVisible(img);
  }

  function onImageError(event){
    const img=event.target;
    if(!(img instanceof HTMLImageElement)||!img.matches(IMAGE_SELECTOR))return;

    const absolute=rootUrl(img.getAttribute('src'));
    if(absolute&&img.dataset.vensisCatalogRootTried!=='1'&&img.src!==absolute){
      event.stopImmediatePropagation();
      img.dataset.vensisCatalogRootTried='1';
      markVisible(img);
      img.src=absolute;
      return;
    }

    if(img.matches('.model-card-head img')&&img.dataset.vensisCatalogSeriesFallback!=='1'){
      const fallback=seriesFallback(img);
      if(fallback&&img.src!==fallback){
        event.stopImmediatePropagation();
        img.dataset.vensisCatalogSeriesFallback='1';
        markVisible(img);
        img.src=fallback;
        return;
      }
    }

    if(img.matches(PRODUCT_IMAGE_SELECTOR)){
      event.stopImmediatePropagation();
      img.dataset.vensisCatalogImageFailed='1';
      img.style.visibility='hidden';
    }
  }

  function onImageLoad(event){
    const img=event.target;
    if(!(img instanceof HTMLImageElement)||!img.matches(IMAGE_SELECTOR))return;
    markVisible(img);
  }

  function scan(){
    raf=0;
    document.querySelectorAll(IMAGE_SELECTOR).forEach(normalizeImage);
  }

  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(scan);
  }

  document.addEventListener('error',onImageError,true);
  document.addEventListener('load',onImageLoad,true);

  const start=()=>{
    scan();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','style']});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

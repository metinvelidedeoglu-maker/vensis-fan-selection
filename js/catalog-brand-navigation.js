(function(){
  'use strict';
  if(!location.pathname.toLowerCase().endsWith('catalog-brand.html'))return;

  function targetUrl(seriesId){
    const url=new URL(location.href);
    if(seriesId)url.searchParams.set('series',seriesId);
    else url.searchParams.delete('series');
    return url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():'');
  }

  document.addEventListener('click',event=>{
    const card=event.target.closest?.('[data-series]');
    if(card){
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(targetUrl(card.dataset.series));
      return;
    }
    const back=event.target.closest?.('.detail-back');
    if(back){
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(targetUrl(''));
    }
  },true);

  document.addEventListener('keydown',event=>{
    const card=event.target.closest?.('[data-series]');
    if(card&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(targetUrl(card.dataset.series));
    }
  },true);
})();

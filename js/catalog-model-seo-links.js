(function(){
  'use strict';

  const path=(location.pathname||'').toLowerCase();
  if(!path.endsWith('/catalog-brand.html')&&!path.endsWith('/catalog-vortice.html'))return;

  let raf=0;
  const text=value=>String(value??'').trim();
  const currentLang=()=>{
    const lang=new URLSearchParams(location.search).get('lang');
    return lang==='tr'||lang==='en'?lang:(document.documentElement.lang==='tr'?'tr':'en');
  };
  const modelIdentity=model=>text(model?.technical?.productCode||model?.model||model?.id);

  function modelById(id){
    const catalog=window.VensisCatalog;
    if(!catalog)return null;
    if(typeof catalog.getModel==='function')return catalog.getModel(id);
    return (catalog.models||[]).find(model=>String(model.id)===String(id))||null;
  }

  function routeFor(model){
    const identity=modelIdentity(model);
    if(!identity)return '';
    const url=new URL(location.href);
    url.hash='';
    if(model?.seriesId&&!url.searchParams.get('series'))url.searchParams.set('series',model.seriesId);
    url.searchParams.set('model',identity);
    url.searchParams.set('lang',currentLang());
    return url.href;
  }

  function scan(){
    raf=0;
    if(!window.VensisCatalog)return;
    document.querySelectorAll('.model-card').forEach(card=>{
      const button=card.querySelector('[data-model-datasheet]');
      const heading=card.querySelector('.model-card-head h3');
      if(!button||!heading||heading.querySelector('a.vensis-model-page-link'))return;
      const model=modelById(button.getAttribute('data-model-datasheet'));
      const href=routeFor(model);
      if(!href)return;
      const anchor=document.createElement('a');
      anchor.className='vensis-model-page-link';
      anchor.href=href;
      anchor.textContent=heading.textContent;
      anchor.setAttribute('aria-label',`${heading.textContent} product page`);
      anchor.style.color='inherit';
      anchor.style.textDecoration='none';
      heading.textContent='';
      heading.appendChild(anchor);
    });
  }

  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(scan);
  }

  const start=()=>{
    scan();
    setTimeout(scan,120);
    setTimeout(scan,420);
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('vensis-language-changed',()=>setTimeout(scan,80));
  window.addEventListener('popstate',()=>setTimeout(scan,80));
})();

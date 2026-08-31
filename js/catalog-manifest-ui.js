(function(){
  'use strict';
  if(!window.VensisCatalogManifestOnly)return;

  function language(){
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  }

  function apply(){
    const label=language()==='tr'?'Ürünler':'Products';
    document.querySelectorAll('.series-card-footer b').forEach(node=>{node.textContent=label});
    document.querySelectorAll('.series-card-image img').forEach(img=>{
      if(!String(img.getAttribute('src')||'').trim())img.remove();
    });
  }

  function start(){
    apply();
    const grid=document.getElementById('catalogGrid');
    if(grid)new MutationObserver(apply).observe(grid,{childList:true,subtree:true});
    window.addEventListener('vensis-language-changed',apply);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();

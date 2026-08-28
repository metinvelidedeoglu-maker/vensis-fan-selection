(function(){
  'use strict';
  const BUILD='20260828-custom-products-r1';
  const stamp=Date.now();

  function load(src,id,onload){
    const existing=document.getElementById(id);
    if(existing){
      if(onload){
        if(existing.dataset.loaded==='1') onload();
        else existing.addEventListener('load',onload,{once:true});
      }
      return existing;
    }
    const s=document.createElement('script');
    s.id=id;
    s.src=src+'?v='+BUILD+'-'+stamp;
    s.async=false;
    s.addEventListener('load',()=>{s.dataset.loaded='1';if(onload)onload();},{once:true});
    document.head.appendChild(s);
    return s;
  }

  function mountShell(){
    if(window.VensisSuiteShell?.mount){
      window.VensisSuiteShell.mount();
      load('js/project-nav-core.js','vensisProjectNavCoreScript');
      return;
    }
    load('js/suite-shell.js','vensisSuiteShellScript',()=>{
      window.VensisSuiteShell?.mount?.();
      load('js/project-nav-core.js','vensisProjectNavCoreScript');
    });
  }

  mountShell();
  load('js/custom-products-integration.js','vensisCustomProductsIntegrationScript');
})();

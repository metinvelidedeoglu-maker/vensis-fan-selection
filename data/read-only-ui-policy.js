(function(){
  'use strict';

  const catalog=window.VensisCatalog;
  const EDIT_SELECTORS=[
    '[data-add-model]',
    '[data-edit-series]',
    '[data-edit-model]',
    '.vensis-model-add',
    '.vensis-series-edit',
    '.vensis-model-edit'
  ].join(',');

  function normalizeAxfTrialName(){
    const canonical='AXF 35-2T-1';
    const fix=model=>{
      if(!model||typeof model!=='object')return;
      if(/^AXF 35-2T-1\s+deneme$/i.test(String(model.model||'').trim()))model.model=canonical;
      if(/^AXF 35-2T-1\s+deneme/i.test(String(model.display||'').trim()))model.display=String(model.display).replace(/^AXF 35-2T-1\s+deneme/i,canonical);
      if(model.standard&&/^AXF 35-2T-1\s+deneme$/i.test(String(model.standard.altModel||'').trim()))model.standard.altModel=canonical;
    };
    (catalog?.models||[]).forEach(fix);
    (window.models||[]).forEach(fix);
  }

  function removeEditControls(root=document){
    root.querySelectorAll?.(EDIT_SELECTORS).forEach(node=>node.remove());
  }

  normalizeAxfTrialName();
  window.VensisCatalogEditingDisabled=true;

  if(typeof document!=='undefined'){
    const apply=()=>removeEditControls(document);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
    else apply();
    new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes||[]){
          if(node?.nodeType===1){
            if(node.matches?.(EDIT_SELECTORS))node.remove();
            else removeEditControls(node);
          }
        }
      }
    }).observe(document.documentElement,{childList:true,subtree:true});
  }
})();

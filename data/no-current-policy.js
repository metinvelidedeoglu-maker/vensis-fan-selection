(function(){
  'use strict';

  const catalog=window.VensisCatalog;

  function removeCurrentFromStandardSchema(){
    if(!catalog)return;
    for(const model of catalog.models||[]){
      if(model?.standard&&Object.prototype.hasOwnProperty.call(model.standard,'current'))delete model.standard.current;
    }
    if(catalog.standard&&Array.isArray(catalog.standard.submodelFields)){
      catalog.standard.submodelFields=catalog.standard.submodelFields.filter(field=>field!=='current');
    }
  }

  function normalizedLabel(value){
    return String(value||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR');
  }

  function isCurrentLabel(value){
    const label=normalizedLabel(value);
    return label==='current'||label==='current (a)'||label==='a / current'||label==='akım'||label==='akım (a)'||label==='a / akım';
  }

  function hideCurrentEditFields(){
    document.querySelectorAll('.vensis-edit-field').forEach(label=>{
      const input=label.querySelector('[name="amps"]');
      if(input)label.hidden=true;
    });
    const custom=document.getElementById('custom-current');
    if(custom){
      const label=custom.closest('label');
      if(label)label.hidden=true;
    }
  }

  function pruneCatalogCurrentFields(){
    document.querySelectorAll('.model-field').forEach(field=>{
      const label=field.querySelector('span')?.textContent||'';
      if(isCurrentLabel(label))field.remove();
    });
  }

  function pruneCurrentSpecRows(){
    document.querySelectorAll('.spec-row').forEach(row=>{
      const label=row.querySelector('span')?.textContent||'';
      if(isCurrentLabel(label))row.remove();
    });
  }

  function pruneCurrentColumns(){
    document.querySelectorAll('table').forEach(table=>{
      let index=Number(table.dataset.vensisCurrentColumn);
      if(!Number.isInteger(index)||index<0){
        const headers=[...table.querySelectorAll('thead th')];
        index=headers.findIndex(th=>{
          const label=normalizedLabel(th.textContent);
          return isCurrentLabel(label)||(table.closest('.project-overview')&&label==='a');
        });
        if(index<0)return;
        table.dataset.vensisCurrentColumn=String(index);
        headers[index]?.remove();
      }
      table.querySelectorAll('tbody tr').forEach(row=>{
        if(row.dataset.vensisCurrentPruned==='1')return;
        row.children[index]?.remove();
        row.dataset.vensisCurrentPruned='1';
      });
    });
  }

  function applyVisiblePolicy(){
    removeCurrentFromStandardSchema();
    hideCurrentEditFields();
    pruneCatalogCurrentFields();
    pruneCurrentSpecRows();
    pruneCurrentColumns();
  }

  function installDatasheetPolicy(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      const renderer=window.VensisDatasheet;
      if(!renderer?.html){
        if(attempts>120)clearInterval(timer);
        return;
      }
      if(renderer.__noCurrentPolicy){clearInterval(timer);return;}
      clearInterval(timer);
      const originalHtml=renderer.html.bind(renderer);
      renderer.html=function(payload){
        let output=originalHtml(payload);
        output=output.replace(/<div class="spec-row"><span>(?:Current|Current \(A\)|Akım|Akım \(A\))<\/span><b>[\s\S]*?<\/b><\/div>/gi,'');
        return output;
      };
      renderer.__noCurrentPolicy=true;
    },0);
  }

  removeCurrentFromStandardSchema();
  installDatasheetPolicy();

  if(typeof document!=='undefined'){
    let scheduled=false;
    const schedule=()=>{
      if(scheduled)return;
      scheduled=true;
      Promise.resolve().then(()=>{
        scheduled=false;
        applyVisiblePolicy();
      });
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
    else schedule();
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  }
})();
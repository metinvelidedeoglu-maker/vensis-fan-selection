(function(){
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  function mountDesign(){
    const pageClass=path==='project.html'||path==='projects.html'?'app-project':path==='catalog.html'?'app-catalog':'app-selection';
    document.body.classList.add('app-shell',pageClass);
    if(!document.querySelector('link[href*="css/ui-polish.css"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='css/ui-polish.css?v=20260721-design-review';
      document.head.appendChild(link);
    }
    if(path==='project.html'&&!document.getElementById('vensisProjectStickyFix')){
      const style=document.createElement('style');
      style.id='vensisProjectStickyFix';
      style.textContent='.app-project .project-table th:nth-child(2),.app-project .project-table td:nth-child(2){left:74px}';
      document.head.appendChild(style);
    }
  }
  function projectId(){
    const store=window.VensisProjects;
    const requested=new URLSearchParams(location.search).get('project');
    if(requested&&store?.get?.(requested))return requested;
    return store?.activeId?.()||'';
  }
  function mountContact(){
    if(path!=='project.html'||document.getElementById('projectContact'))return;
    const store=window.VensisProjects;
    const metaBox=document.querySelector('.project-meta');
    const id=projectId();
    if(!store?.readMeta||!metaBox||!id)return;
    const style=document.createElement('style');
    style.id='projectContactStyles';
    style.textContent='.app-project .project-meta{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:900px){.app-project .project-meta{grid-template-columns:1fr 1fr}}@media(max-width:560px){.app-project .project-meta{grid-template-columns:1fr}}';
    document.head.appendChild(style);
    const label=document.createElement('label');
    label.innerHTML='Contact Person / İlgili<input id="projectContact" type="text" placeholder="Enter contact person">';
    metaBox.appendChild(label);
    const input=document.getElementById('projectContact');
    const fill=()=>{const meta=store.readMeta(id);if(document.activeElement!==input)input.value=meta.contact||''};
    const save=()=>store.writeMeta({contact:String(input.value||'').trim()},id);
    const patchQuotation=()=>{
      try{
        const quotation=JSON.parse(localStorage.getItem('vensis_active_quotation_v1')||'null');
        if(!quotation)return;
        quotation.project=quotation.project||{};
        quotation.project.contact=store.readMeta(id).contact||'';
        localStorage.setItem('vensis_active_quotation_v1',JSON.stringify(quotation));
      }catch{}
    };
    fill();
    input.addEventListener('input',save);
    document.addEventListener('click',event=>{if(event.target.closest('#convertQuotation,#printProject'))save()},true);
    setTimeout(()=>document.getElementById('convertQuotation')?.addEventListener('click',patchQuotation),0);
    window.addEventListener('storage',event=>{if(event.key===`${store.keys.metaPrefix}${id}`)fill()});
    window.VensisProjectContact={projectId:id,save,fill,patchQuotation};
  }
  function count(){
    const store=window.VensisProjects;
    if(store?.list)return store.list().length;
    try{const value=JSON.parse(localStorage.getItem('vensis_projects_v1')||'[]');return Array.isArray(value)?value.length:0}catch{return 0}
  }
  function update(){
    const total=count();
    document.querySelectorAll('[data-project-count]').forEach(node=>{node.textContent=String(total);node.hidden=total<1});
  }
  function toast(text){
    let node=document.getElementById('catalogProjectToast');
    if(!node){node=document.createElement('div');node.id='catalogProjectToast';node.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#173033;color:#fff;padding:11px 15px;border-radius:9px;font:700 13px Arial,Helvetica,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transform:translateY(8px);transition:.2s';document.body.appendChild(node)}
    node.textContent=text;node.style.opacity='1';node.style.transform='translateY(0)';clearTimeout(node._timer);node._timer=setTimeout(()=>{node.style.opacity='0';node.style.transform='translateY(8px)'},1800);
  }
  function addCatalogProduct(id,button){
    const store=window.VensisProjects,catalog=window.VensisCatalog;
    const model=catalog?.getModel?.(id)||(catalog?.models||[]).find(item=>String(item.id)===String(id));
    if(!store?.ensureActive||!model)return;
    const targetId=store.ensureActive();
    const items=store.readItems(targetId);
    const product=catalog?.product?.(id)||{};
    const series=catalog?.getSeries?.(model.seriesId)||(catalog?.series||[]).find(item=>String(item.id)===String(model.seriesId))||{};
    const productKey=model.id||model.model||id;
    const itemKey=`catalog|${productKey}`;
    const existing=items.find(item=>item.itemKey===itemKey);
    const speed=Number(model.motor?.speed)||0;
    const voltage=String(model.motor?.voltage||'').trim();
    const frequency=String(model.motor?.frequency||'').trim();
    const noise=Number(model.motor?.sound)||0;
    if(existing){
      existing.quantity=(Number(existing.quantity)||1)+1;
      existing.speed=Number(existing.speed)||speed;
      existing.voltage=existing.voltage||voltage;
      existing.frequency=existing.frequency||frequency;
      existing.noise=Number(existing.noise)||noise;
      existing.updatedAt=new Date().toISOString();
    }else items.push({itemKey,mode:'catalog',productKey,model:model.model||'',series:series.title||model.seriesTitle||'',manufacturer:series.manufacturer||model.manufacturer||'Vitlo',image:product.media?.image||series.media?.image||model.image||'',nominalAirflow:Number(model.performance?.nominalAirflow)||0,required:null,selected:null,motorPower:Number(model.motor?.power)||0,current:Number(model.motor?.current)||0,speed,voltage,frequency,noise,price:Number(model.pricing?.listPrice)||0,quantity:1,addedAt:new Date().toISOString()});
    store.writeItems(items,targetId);
    if(button){const old=button.innerHTML;button.innerHTML='✓';setTimeout(()=>{button.innerHTML=old},1100)}
    const name=store.readMeta(targetId).name||store.get(targetId)?.name||'active project';
    toast(existing?`${name} quantity increased.`:`Catalog model added to ${name}.`);
  }
  if(path==='catalog.html'){
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-add-catalog-project]');
      if(!button)return;
      event.preventDefault();event.stopImmediatePropagation();
      addCatalogProduct(button.dataset.addCatalogProject,button);
    },true);
    document.addEventListener('DOMContentLoaded',()=>{
      if(window.Catalog)window.Catalog.addCatalogToProject=addCatalogProduct;
    });
  }
  mountDesign();
  mountContact();
  window.addEventListener('storage',event=>{
    if(!event.key||event.key==='vensis_projects_v1'||event.key.startsWith('vensis_project_items_v2:')||event.key.startsWith('vensis_project_meta_v2:'))update();
  });
  window.addEventListener('vensis-project-updated',update);
  window.addEventListener('vensis-projects-updated',update);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mountContact();update()});else update();
  window.VensisProjectNav={update,addCatalogProduct};
})();
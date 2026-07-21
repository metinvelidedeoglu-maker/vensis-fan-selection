(function(){
  const catalog=window.VensisCatalog||{models:[],series:[]};
  function modelById(id){return catalog.getModel?.(id)||(catalog.models||[]).find(item=>String(item.id)===String(id))}
  function productById(id){return catalog.product?.(id)||null}
  function seriesFor(model){return catalog.getSeries?.(model?.seriesId)||(catalog.series||[]).find(item=>String(item.id)===String(model?.seriesId))||{}}
  function toast(text){
    let node=document.getElementById('catalogProjectToast');
    if(!node){node=document.createElement('div');node.id='catalogProjectToast';node.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#173033;color:#fff;padding:11px 15px;border-radius:9px;font:700 13px Arial,Helvetica,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transform:translateY(8px);transition:.2s';document.body.appendChild(node)}
    node.textContent=text;node.style.opacity='1';node.style.transform='translateY(0)';clearTimeout(node._timer);node._timer=setTimeout(()=>{node.style.opacity='0';node.style.transform='translateY(8px)'},1800);
  }
  function add(id,button){
    const store=window.VensisProjects;
    const model=modelById(id);
    if(!store?.ensureActive||!model)return;
    const projectId=store.ensureActive();
    const items=store.readItems(projectId);
    const product=productById(id)||{};
    const series=seriesFor(model);
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
    }else items.push({
      itemKey,mode:'catalog',productKey,model:model.model||'',series:series.title||model.seriesTitle||'',manufacturer:series.manufacturer||model.manufacturer||'Vitlo',image:product.media?.image||series.media?.image||model.image||'',nominalAirflow:Number(model.performance?.nominalAirflow)||0,required:null,selected:null,motorPower:Number(model.motor?.power)||0,current:Number(model.motor?.current)||0,speed,voltage,frequency,noise,price:Number(model.pricing?.listPrice)||0,quantity:1,addedAt:new Date().toISOString()
    });
    store.writeItems(items,projectId);
    if(button){const old=button.innerHTML;button.innerHTML='✓';setTimeout(()=>{button.innerHTML=old},1100)}
    const name=store.readMeta(projectId).name||store.get(projectId)?.name||'active project';
    toast(existing?`${name} quantity increased.`:`Catalog model added to ${name}.`);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-add-catalog-project]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    add(button.dataset.addCatalogProject,button);
  },true);
})();
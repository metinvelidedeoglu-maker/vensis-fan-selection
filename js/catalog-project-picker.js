(function(){
  const NEW_PROJECT='__new_project__';
  let pending=null;
  let lastChoice='';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const store=()=>window.VensisProjects;
  const catalog=()=>window.VensisCatalog||{models:[],series:[]};

  function requestedProject(){
    const id=new URLSearchParams(location.search).get('project');
    return id&&store()?.get?.(id)?id:'';
  }
  function activeProject(){
    const id=store()?.activeId?.();
    return id&&store()?.get?.(id)?id:'';
  }
  function nextProjectName(){
    const projects=store()?.list?.()||[];
    const names=new Set(projects.map(project=>String(store().readMeta(project.id)?.name||project.name||'').trim().toLowerCase()));
    if(!names.has('new project'))return 'New Project';
    let number=2;
    while(names.has(`new project ${number}`))number+=1;
    return `New Project ${number}`;
  }
  function modelById(id){
    const data=catalog();
    return data.getModel?.(id)||(data.models||[]).find(item=>String(item.id)===String(id));
  }
  function seriesFor(model){
    const data=catalog();
    return data.getSeries?.(model?.seriesId)||(data.series||[]).find(item=>String(item.id)===String(model?.seriesId))||{};
  }
  function totals(projectId){
    return (store()?.readItems?.(projectId)||[]).reduce((sum,item)=>sum+Math.max(1,Number(item.quantity)||1),0);
  }
  function addStyles(){
    if(document.getElementById('catalogProjectPickerStyles'))return;
    const style=document.createElement('style');
    style.id='catalogProjectPickerStyles';
    style.textContent=`.catalog-project-modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(13,34,38,.62);backdrop-filter:blur(4px)}.catalog-project-modal[hidden]{display:none}.catalog-project-dialog{width:min(620px,100%);max-height:calc(100vh - 36px);display:flex;flex-direction:column;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.3)}.catalog-project-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:19px 21px;border-bottom:1px solid #dfe8e5;background:linear-gradient(135deg,#f8fbfa,#edf7f2)}.catalog-project-head span{display:block;color:#087f4f;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}.catalog-project-head h2{margin:4px 0 0;font-size:22px}.catalog-project-head p{margin:5px 0 0;color:#64748b;font-size:12px}.catalog-project-close{width:35px;height:35px;border:0;border-radius:9px;background:#e2ebe8;color:#355259;font-size:22px;cursor:pointer}.catalog-project-list{display:grid;gap:9px;padding:16px 19px;overflow:auto}.catalog-project-choice{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:13px 14px;border:1px solid #dce5e3;border-radius:12px;background:#fff;cursor:pointer}.catalog-project-choice:has(input:checked){border-color:#7fbaa0;background:#f1faf5;box-shadow:0 0 0 3px rgba(8,127,79,.08)}.catalog-project-choice input{width:18px;height:18px;accent-color:#087f4f}.catalog-project-choice b,.catalog-project-choice small{display:block}.catalog-project-choice b{color:#173033}.catalog-project-choice small{margin-top:3px;color:#6b7c80;font-size:11px}.catalog-project-choice em{color:#087f4f;font-size:11px;font-style:normal;font-weight:800;white-space:nowrap}.catalog-project-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:13px 19px;border-top:1px solid #dfe8e5;background:#f8faf9}.catalog-project-footer button{border:0;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}.catalog-project-cancel{background:#eaf0ee;color:#52666b}.catalog-project-confirm{background:#087f4f;color:#fff}.catalog-project-empty{padding:18px;color:#64748b;text-align:center}@media(max-width:560px){.catalog-project-modal{padding:8px}.catalog-project-choice{grid-template-columns:auto 1fr}.catalog-project-choice em{grid-column:2}.catalog-project-footer{align-items:stretch;flex-direction:column-reverse}.catalog-project-footer button{width:100%}}`;
    document.head.appendChild(style);
  }
  function mountModal(){
    if(document.getElementById('catalogProjectModal'))return;
    addStyles();
    const modal=document.createElement('div');
    modal.id='catalogProjectModal';
    modal.className='catalog-project-modal';
    modal.hidden=true;
    modal.innerHTML=`<section class="catalog-project-dialog" role="dialog" aria-modal="true" aria-labelledby="catalogProjectTitle"><header class="catalog-project-head"><div><span>Add Catalog Product</span><h2 id="catalogProjectTitle">Select Project</h2><p id="catalogProjectProduct">Choose where this product will be added.</p></div><button id="catalogProjectClose" class="catalog-project-close" type="button" aria-label="Close">×</button></header><div id="catalogProjectList" class="catalog-project-list"></div><footer class="catalog-project-footer"><button id="catalogProjectCancel" class="catalog-project-cancel" type="button">Cancel</button><button id="catalogProjectConfirm" class="catalog-project-confirm" type="button">Add to Project</button></footer></section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{if(event.target===modal)closePicker()});
    document.getElementById('catalogProjectClose')?.addEventListener('click',closePicker);
    document.getElementById('catalogProjectCancel')?.addEventListener('click',closePicker);
    document.getElementById('catalogProjectConfirm')?.addEventListener('click',confirmSelection);
  }
  function choice(projectId,name,reference,units,checked=false){
    return `<label class="catalog-project-choice"><input type="radio" name="catalogProjectChoice" value="${esc(projectId)}" ${checked?'checked':''}><span><b>${esc(name)}</b><small>${esc(reference||'No customer or reference')}</small></span><em>${units} unit${units===1?'':'s'}</em></label>`;
  }
  function renderProjects(preferred){
    const list=document.getElementById('catalogProjectList');
    if(!list)return;
    const projects=store()?.list?.()||[];
    const selected=preferred&&projects.some(project=>project.id===preferred)?preferred:NEW_PROJECT;
    const newChoice=choice(NEW_PROJECT,'New Project','Create a separate project for this product',0,selected===NEW_PROJECT);
    const existing=projects.map(project=>{
      const meta=store().readMeta(project.id);
      return choice(project.id,meta.name||project.name||'Untitled Project',meta.reference||project.reference||'',totals(project.id),selected===project.id);
    }).join('');
    list.innerHTML=newChoice+existing;
  }
  function openPicker(modelId,button){
    const model=modelById(modelId);if(!model)return;
    mountModal();
    pending={modelId,button};
    const series=seriesFor(model);
    const productText=document.getElementById('catalogProjectProduct');
    if(productText)productText.textContent=`${model.model||'Catalog product'}${series.title?` — ${series.title}`:''}`;
    const preferred=lastChoice||requestedProject()||activeProject()||NEW_PROJECT;
    renderProjects(preferred);
    const modal=document.getElementById('catalogProjectModal');
    if(modal)modal.hidden=false;
    document.body.style.overflow='hidden';
  }
  function closePicker(){
    const modal=document.getElementById('catalogProjectModal');
    if(modal)modal.hidden=true;
    document.body.style.overflow='';
    pending=null;
  }
  function toast(text){
    let node=document.getElementById('catalogProjectToast');
    if(!node){node=document.createElement('div');node.id='catalogProjectToast';node.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#173033;color:#fff;padding:11px 15px;border-radius:9px;font:700 13px Arial,Helvetica,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transform:translateY(8px);transition:.2s';document.body.appendChild(node)}
    node.textContent=text;node.style.opacity='1';node.style.transform='translateY(0)';clearTimeout(node._timer);node._timer=setTimeout(()=>{node.style.opacity='0';node.style.transform='translateY(8px)'},1900);
  }
  function addCatalogProduct(modelId,button,projectId){
    const data=catalog();
    const model=modelById(modelId);if(!model||!store()?.get?.(projectId))return;
    store().setActive(projectId);
    const items=store().readItems(projectId);
    const product=data.product?.(modelId)||{};
    const series=seriesFor(model);
    const productKey=model.id||model.model||modelId;
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
    store().writeItems(items,projectId);
    if(button){const old=button.innerHTML;button.innerHTML='✓';setTimeout(()=>{button.innerHTML=old},1100)}
    const name=store().readMeta(projectId).name||store().get(projectId)?.name||'selected project';
    toast(existing?`${name} quantity increased.`:`Catalog model added to ${name}.`);
  }
  function confirmSelection(){
    if(!pending)return;
    const selected=document.querySelector('input[name="catalogProjectChoice"]:checked')?.value||NEW_PROJECT;
    let projectId=selected;
    if(selected===NEW_PROJECT){
      const project=store()?.create?.({name:nextProjectName()});
      projectId=project?.id||'';
    }
    if(!projectId)return;
    lastChoice=projectId;
    const current=pending;
    closePicker();
    addCatalogProduct(current.modelId,current.button,projectId);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-add-catalog-project]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPicker(button.dataset.addCatalogProject,button);
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('catalogProjectModal')?.hidden)closePicker()});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(window.Catalog)window.Catalog.addCatalogToProject=(id,button)=>openPicker(id,button)},0));
  window.addEventListener('vensis-projects-updated',()=>{if(!document.getElementById('catalogProjectModal')?.hidden)renderProjects(lastChoice||requestedProject()||activeProject())});
  window.VensisCatalogProjectPicker={open:openPicker,add:addCatalogProduct};
})();
(function(){
  const store=window.VensisProjects;
  const QUOTATION_KEY='vensis_active_quotation_v1';
  const catalog=window.VensisCatalog||{models:[]};
  const byId=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(number(value));
  const money=(value,showZero=false)=>{const n=number(value);return n>0||showZero?`€${fmt(n,2)}`:'-'};
  const point=value=>`${fmt(value?.q)} m³/h @ ${fmt(value?.p)} Pa`;
  const clampDiscount=value=>Math.min(100,Math.max(0,number(value)));
  const noteTimers=new Map();
  let editingIndex=null;

  function resolveProjectId(){
    if(!store)return '';
    const requested=new URLSearchParams(location.search).get('project');
    if(requested&&store.get(requested))return store.setActive(requested);
    const active=store.activeId();
    if(active&&store.get(active))return active;
    const first=store.list()[0];
    return first?store.setActive(first.id):'';
  }
  const PROJECT_ID=resolveProjectId();
  if(!PROJECT_ID){location.replace('projects.html');return}

  function modelForItem(item){
    if(item?.mode==='custom')return null;
    const direct=catalog.getModel?.(item?.productKey);
    if(direct)return direct;
    return (catalog.models||[]).find(model=>String(model.model||'')===String(item?.model||''))||null;
  }
  function enrichItems(items){
    let changed=false;
    items.forEach(item=>{
      if(item.mode==='custom')return;
      const model=modelForItem(item);
      const speed=number(item.speed)||number(model?.motor?.speed);
      const voltage=String(item.voltage||model?.motor?.voltage||'').trim();
      const frequency=String(item.frequency||model?.motor?.frequency||'').trim();
      const noise=number(item.noise)||number(model?.motor?.sound);
      if(!number(item.speed)&&speed>0){item.speed=speed;changed=true}
      if(!String(item.voltage||'').trim()&&voltage){item.voltage=voltage;changed=true}
      if(!String(item.frequency||'').trim()&&frequency){item.frequency=frequency;changed=true}
      if(!number(item.noise)&&noise>0){item.noise=noise;changed=true}
    });
    return changed;
  }
  function readItems(){
    const items=store.readItems(PROJECT_ID);
    if(enrichItems(items))store.writeItems(items,PROJECT_ID);
    return items;
  }
  function writeItems(items){store.writeItems(items,PROJECT_ID)}
  function readMeta(){return store.readMeta(PROJECT_ID)}
  function updateWorkspaceTitle(meta){
    const name=String(meta?.name||'').trim();
    const heading=byId('projectWorkspaceHeading');
    if(heading)heading.textContent=name||'Project Workspace';
    document.title=`${name||'Project Workspace'} | Vensis`;
  }
  function writeMeta(globalDiscount){
    const current=readMeta();
    const meta=store.writeMeta({
      name:byId('projectName')?.value.trim()||'',
      reference:byId('projectReference')?.value.trim()||'',
      globalDiscount:globalDiscount==null?clampDiscount(current.globalDiscount):clampDiscount(globalDiscount)
    },PROJECT_ID);
    updateWorkspaceTitle(meta);
    return meta;
  }
  function netUnitPrice(item){return number(item.price)*(1-clampDiscount(item.discountPercent)/100)}
  function totals(items){
    return items.reduce((sum,item)=>{
      const qty=Math.max(1,number(item.quantity)||1);
      const price=number(item.price);
      sum.units+=qty;
      if(price>0){sum.hasPrice=true;sum.listSubtotal+=price*qty;sum.netTotal+=netUnitPrice(item)*qty}
      return sum;
    },{units:0,listSubtotal:0,netTotal:0,hasPrice:false});
  }
  function quantityControl(index,quantity){return `<div class="qty-control"><button type="button" data-qty-minus="${index}" aria-label="Decrease quantity">−</button><b>${quantity}</b><button type="button" data-qty-plus="${index}" aria-label="Increase quantity">+</button></div>`}
  function discountControl(index,rate){return `<label class="line-discount"><input type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${rate}" data-line-discount="${index}" aria-label="Product discount percentage"><span>%</span></label>`}
  function pointCells(item){
    if(item.mode==='catalog'||item.mode==='custom'){
      const nominal=number(item.nominalAirflow);
      const label=item.mode==='custom'?'Custom Product':'Catalog Item';
      return `<td><span class="point" style="background:#eef3f4;color:#52666b">${label}</span></td><td>${nominal>0?`<span class="point selected">${fmt(nominal)} m³/h nominal</span>`:'-'}</td>`;
    }
    return `<td><span class="point required">${point(item.required)}</span></td><td><span class="point selected">${point(item.selected)}</span></td>`;
  }
  function supplyText(item){
    const voltage=String(item.voltage||'').trim();
    const frequency=String(item.frequency||'').trim();
    if(voltage&&frequency)return `${escapeHtml(voltage)} – ${escapeHtml(frequency)}`;
    return voltage||frequency?escapeHtml(voltage||frequency):'-';
  }
  function orderControls(index,total){return `<div class="order-controls"><button type="button" class="order-btn" data-move-up="${index}" ${index===0?'disabled':''} title="Move up" aria-label="Move product up">↑</button><button type="button" class="order-btn" data-move-down="${index}" ${index===total-1?'disabled':''} title="Move down" aria-label="Move product down">↓</button></div>`}
  function itemActions(item,index){
    const edit=item.mode==='custom'?`<button type="button" class="edit-btn" data-edit-product="${index}" title="Edit custom product" aria-label="Edit custom product">✎</button>`:'';
    return `<div class="item-actions">${edit}<button type="button" class="remove-btn" data-remove="${index}" title="Remove from project" aria-label="Remove from project">×</button></div>`;
  }
  function noteEditor(item,index){
    const stableKey=String(item.itemKey||`index-${index}`);
    return `<label class="product-note"><span>Free Note</span><textarea rows="2" data-product-note="${escapeHtml(stableKey)}" data-product-index="${index}" placeholder="Project-specific note shown in project and quotation outputs.">${escapeHtml(item.description||'')}</textarea></label>`;
  }
  function row(item,index,items){
    const qty=Math.max(1,number(item.quantity)||1);
    const price=number(item.price);
    const hasPrice=price>0;
    const rate=clampDiscount(item.discountPercent);
    const netUnit=netUnitPrice(item);
    const lineTotal=netUnit*qty;
    const image=item.image?`<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.model||'Fan')}" onerror="this.style.display='none'">`:'';
    return `<tr>
      <td class="order-column">${orderControls(index,items.length)}</td>
      <td><div class="product-cell">${image}<div class="product-info"><strong>${escapeHtml(item.model||'-')}</strong><span>${escapeHtml(item.series||'')}</span><small>${escapeHtml(item.manufacturer||'Vitlo')}</small>${noteEditor(item,index)}</div></div></td>
      ${pointCells(item)}
      <td>${supplyText(item)}</td>
      <td>${number(item.motorPower)>0?`${fmt(item.motorPower,2)} kW`:'-'}</td>
      <td>${number(item.speed)>0?`${fmt(item.speed)} rpm`:'-'}</td>
      <td>${number(item.current)>0?`${fmt(item.current,2)} A`:'-'}</td>
      <td>${number(item.noise)>0?`${fmt(item.noise)} dB(A)`:'-'}</td>
      <td>${money(price)}</td>
      <td>${discountControl(index,rate)}</td>
      <td><b>${hasPrice?money(netUnit,true):'-'}</b></td>
      <td>${quantityControl(index,qty)}</td>
      <td><b>${hasPrice?money(lineTotal,true):'-'}</b></td>
      <td class="actions-column">${itemActions(item,index)}</td>
    </tr>`;
  }
  function render(){
    const items=readItems();
    const table=byId('projectTable');
    const empty=byId('projectEmpty');
    const content=byId('projectContent');
    const count=byId('projectItemCount');
    const summary=totals(items);
    if(count)count.textContent=`${summary.units} unit${summary.units===1?'':'s'} in project`;
    if(byId('sumUnits'))byId('sumUnits').textContent=fmt(summary.units);
    if(byId('sumPrice'))byId('sumPrice').textContent=summary.hasPrice?money(summary.netTotal,true):'-';
    if(!items.length){if(empty)empty.hidden=false;if(content)content.hidden=true;return}
    if(empty)empty.hidden=true;
    if(content)content.hidden=false;
    const tbody=table?.querySelector('tbody');
    if(tbody)tbody.innerHTML=items.map((item,index)=>row(item,index,items)).join('');
  }
  function changeQuantity(index,delta){
    const items=readItems();const item=items[index];if(!item)return;
    item.quantity=Math.max(1,(number(item.quantity)||1)+delta);item.updatedAt=new Date().toISOString();writeItems(items);render();
  }
  function changeLineDiscount(index,value){
    const items=readItems();const item=items[index];if(!item)return;
    item.discountPercent=clampDiscount(value);item.updatedAt=new Date().toISOString();writeItems(items);render();
  }
  function findItemIndex(items,key,fallbackIndex){const found=items.findIndex(item=>String(item.itemKey||'')===String(key||''));return found>=0?found:Number(fallbackIndex)}
  function saveDescriptionField(field){
    if(!field)return;
    const key=String(field.dataset.productNote||'');const timer=noteTimers.get(key);if(timer)clearTimeout(timer);noteTimers.delete(key);
    const items=readItems();const index=findItemIndex(items,key,field.dataset.productIndex);if(!items[index])return;
    items[index].description=String(field.value||'').trim();items[index].updatedAt=new Date().toISOString();writeItems(items);
    field.classList.add('note-saved');setTimeout(()=>field.classList.remove('note-saved'),700);
  }
  function queueDescriptionSave(field){const key=String(field.dataset.productNote||field.dataset.productIndex||'');const previous=noteTimers.get(key);if(previous)clearTimeout(previous);noteTimers.set(key,setTimeout(()=>saveDescriptionField(field),400))}
  function flushAllNotes(){document.querySelectorAll('[data-product-note]').forEach(saveDescriptionField)}
  function applyGlobalDiscount(){
    const input=byId('globalDiscount');const rate=clampDiscount(input?.value);if(input)input.value=String(rate);
    const items=readItems();items.forEach(item=>{item.discountPercent=rate;item.updatedAt=new Date().toISOString()});writeItems(items);writeMeta(rate);
    const status=byId('discountStatus');if(status)status.textContent=`${fmt(rate,rate%1?1:0)}% applied to every product.`;render();
  }
  function quoteNumber(date){const pad=value=>String(value).padStart(2,'0');return `VNS-${String(date.getFullYear()).slice(-2)}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`}
  function convertToQuotation(){
    flushAllNotes();const items=readItems();if(!items.length){alert('Add at least one product before creating a quotation.');return}
    const meta=writeMeta();const now=new Date();
    const snapshot={version:2,quotationNumber:quoteNumber(now),createdAt:now.toISOString(),currency:'EUR',project:{id:PROJECT_ID,name:meta.name||'',reference:meta.reference||''},globalDiscount:clampDiscount(meta.globalDiscount),items:JSON.parse(JSON.stringify(items)),totals:totals(items)};
    localStorage.setItem(QUOTATION_KEY,JSON.stringify(snapshot));window.open('quotation.html','_blank');
  }
  function remove(index){const items=readItems();if(!items[index])return;items.splice(index,1);writeItems(items);render()}
  function moveItem(index,delta){flushAllNotes();const items=readItems();const target=index+delta;if(index<0||target<0||index>=items.length||target>=items.length)return;const [item]=items.splice(index,1);items.splice(target,0,item);writeItems(items);render()}
  function clearProject(){
    const items=readItems();if(!items.length)return;if(!confirm('Remove all products from this project?'))return;
    noteTimers.forEach(clearTimeout);noteTimers.clear();writeItems([]);render();
  }
  function loadMeta(){
    const meta=readMeta();if(byId('projectName'))byId('projectName').value=meta.name||'';if(byId('projectReference'))byId('projectReference').value=meta.reference||'';if(byId('globalDiscount'))byId('globalDiscount').value=String(clampDiscount(meta.globalDiscount));updateWorkspaceTitle(meta);
  }
  function formField(name){return byId(`custom-${name}`)}
  function setFormValue(name,value){const field=formField(name);if(field)field.value=value??''}
  function setCustomFieldsDisabled(disabled){document.querySelectorAll('[data-custom-core]').forEach(field=>{field.disabled=disabled});const note=byId('customProductModeNote');if(note)note.textContent=disabled?'This project product is linked to the fan database. Only the free description can be changed here.':'Enter a product that is not available in the selection program.'}
  function openProductEditor(index=null){
    flushAllNotes();const items=readItems();const item=index==null?null:items[index];editingIndex=index;const isExisting=Boolean(item);const isCustom=!item||item.mode==='custom';
    if(byId('customProductTitle'))byId('customProductTitle').textContent=isExisting?(isCustom?'Edit Custom Product':'Edit Product Description'):'Add Custom Product';
    if(byId('saveCustomProduct'))byId('saveCustomProduct').textContent=isExisting?'Save Changes':'Add to Project';setCustomFieldsDisabled(!isCustom);
    setFormValue('model',item?.model||'');setFormValue('series',item?.series||'');setFormValue('manufacturer',item?.manufacturer||'Vitlo');setFormValue('description',item?.description||'');setFormValue('nominalAirflow',number(item?.nominalAirflow)||'');setFormValue('voltage',item?.voltage||'');setFormValue('frequency',item?.frequency||'50 Hz');setFormValue('motorPower',number(item?.motorPower)||'');setFormValue('speed',number(item?.speed)||'');setFormValue('current',number(item?.current)||'');setFormValue('noise',number(item?.noise)||'');setFormValue('price',number(item?.price)||'');setFormValue('discountPercent',clampDiscount(item?.discountPercent));setFormValue('quantity',Math.max(1,number(item?.quantity)||1));setFormValue('image',item?.image||'');
    const modal=byId('customProductModal');if(modal)modal.hidden=false;document.body.classList.add('modal-open');setTimeout(()=>formField(isCustom?'model':'description')?.focus(),0);
  }
  function closeProductEditor(){const modal=byId('customProductModal');if(modal)modal.hidden=true;document.body.classList.remove('modal-open');editingIndex=null}
  function saveProductEditor(event){
    event.preventDefault();const items=readItems();const existing=editingIndex==null?null:items[editingIndex];
    if(existing&&existing.mode!=='custom'){existing.description=String(formField('description')?.value||'').trim();existing.updatedAt=new Date().toISOString();writeItems(items);closeProductEditor();render();return}
    const model=String(formField('model')?.value||'').trim();if(!model){formField('model')?.focus();return}
    const stamp=new Date().toISOString();const item=existing||{itemKey:`custom|${Date.now()}|${Math.random().toString(36).slice(2,8)}`,mode:'custom',productKey:'',required:null,selected:null,addedAt:stamp};
    Object.assign(item,{mode:'custom',model,series:String(formField('series')?.value||'').trim(),manufacturer:String(formField('manufacturer')?.value||'').trim()||'Vitlo',description:String(formField('description')?.value||'').trim(),nominalAirflow:number(formField('nominalAirflow')?.value),voltage:String(formField('voltage')?.value||'').trim(),frequency:String(formField('frequency')?.value||'').trim(),motorPower:number(formField('motorPower')?.value),speed:number(formField('speed')?.value),current:number(formField('current')?.value),noise:number(formField('noise')?.value),price:Math.max(0,number(formField('price')?.value)),discountPercent:clampDiscount(formField('discountPercent')?.value),quantity:Math.max(1,number(formField('quantity')?.value)||1),image:String(formField('image')?.value||'').trim(),updatedAt:stamp});
    if(existing)items[editingIndex]=item;else items.push(item);writeItems(items);closeProductEditor();render();
  }

  document.addEventListener('click',event=>{
    const plus=event.target.closest('[data-qty-plus]');const minus=event.target.closest('[data-qty-minus]');const removeButton=event.target.closest('[data-remove]');const moveUp=event.target.closest('[data-move-up]');const moveDown=event.target.closest('[data-move-down]');const edit=event.target.closest('[data-edit-product]');
    if(plus)changeQuantity(Number(plus.dataset.qtyPlus),1);if(minus)changeQuantity(Number(minus.dataset.qtyMinus),-1);if(removeButton)remove(Number(removeButton.dataset.remove));if(moveUp)moveItem(Number(moveUp.dataset.moveUp),-1);if(moveDown)moveItem(Number(moveDown.dataset.moveDown),1);if(edit)openProductEditor(Number(edit.dataset.editProduct));
  });
  document.addEventListener('input',event=>{const note=event.target.closest('[data-product-note]');if(note)queueDescriptionSave(note)});
  document.addEventListener('change',event=>{const discount=event.target.closest('[data-line-discount]');const note=event.target.closest('[data-product-note]');if(discount)changeLineDiscount(Number(discount.dataset.lineDiscount),discount.value);if(note)saveDescriptionField(note)});
  document.addEventListener('click',event=>{if(event.target.closest('#printProject,#convertQuotation'))flushAllNotes()},true);
  byId('applyGlobalDiscount')?.addEventListener('click',applyGlobalDiscount);byId('convertQuotation')?.addEventListener('click',convertToQuotation);byId('clearProject')?.addEventListener('click',clearProject);byId('printProject')?.addEventListener('click',()=>window.print());byId('addCustomProduct')?.addEventListener('click',()=>openProductEditor());byId('customProductForm')?.addEventListener('submit',saveProductEditor);byId('cancelCustomProduct')?.addEventListener('click',closeProductEditor);byId('closeCustomProduct')?.addEventListener('click',closeProductEditor);byId('customProductModal')?.addEventListener('click',event=>{if(event.target===byId('customProductModal'))closeProductEditor()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!byId('customProductModal')?.hidden)closeProductEditor()});
  byId('projectName')?.addEventListener('input',()=>writeMeta());byId('projectReference')?.addEventListener('input',()=>writeMeta());
  window.addEventListener('storage',event=>{if(!event.key||event.key===`${store.keys.itemsPrefix}${PROJECT_ID}`||event.key===`${store.keys.metaPrefix}${PROJECT_ID}`){loadMeta();render()}});
  window.addEventListener('vensis-project-cloud-applied',()=>{
    if(!store.get(PROJECT_ID)){location.replace('projects.html');return}
    loadMeta();render();
  });
  window.VensisQuotation={convert:convertToQuotation,key:QUOTATION_KEY};
  window.VensisProject={projectId:PROJECT_ID,render,readItems,writeItems,readMeta,writeMeta,openProductEditor,moveItem,flushAllNotes};
  loadMeta();render();
})();

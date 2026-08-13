(function(){
  const store=window.VensisProjects;
  const orders=window.VensisOrders;
  const U=window.VensisOrderUtils;
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const num=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value));
  let projectId='';
  let activeOrder=null;

  function resolveProject(){
    const requested=new URLSearchParams(location.search).get('project');
    if(requested&&store.get(requested)){store.setActive(requested);return requested}
    const active=store.activeId();
    return active&&store.get(active)?active:'';
  }
  function projectSnapshot(){
    const project=store.get(projectId)||{};
    const meta=store.readMeta(projectId);
    return {id:projectId,name:meta.name||project.name||'',reference:meta.reference||project.reference||'',contact:meta.contact||project.contact||''};
  }
  function ensureOrder(){
    const all=orders.list(projectId);
    const requested=new URLSearchParams(location.search).get('order');
    activeOrder=(requested?all.find(order=>order.id===requested):null)||all[0]||null;
    if(!activeOrder&&store.readItems(projectId).length)activeOrder=orders.create(projectId,{items:store.readItems(projectId)});
    if(activeOrder){
      const url=orders.url(projectId,activeOrder.id);
      history.replaceState(null,'',url);
    }
  }
  function field(id){return byId(id)}
  function value(id){return String(field(id)?.value||'').trim()}
  function setValue(id,next){if(field(id))field(id).value=next??''}
  function setText(id,next){if(field(id))field(id).textContent=next||'-'}
  function dateText(value){
    const timestamp=Date.parse(`${value||''}T00:00:00`);
    return Number.isFinite(timestamp)?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(timestamp)):'-';
  }
  function pointText(point){return point&&num(point.q)>=0&&num(point.p)>=0?`${fmt(point.q)} m³/h @ ${fmt(point.p)} Pa`:'-'}
  function dutyText(item){
    if(item.mode==='selection')return pointText(item.selected||item.required);
    return num(item.nominalAirflow)>0?`${fmt(item.nominalAirflow)} m³/h nominal`:'-';
  }
  function supplyText(item){
    const supply=[item.voltage,item.frequency].filter(Boolean).map(esc).join(' – ');
    const motor=[num(item.motorPower)>0?`${fmt(item.motorPower,2)} kW`:'',num(item.speed)>0?`${fmt(item.speed)} rpm`:''].filter(Boolean).join(' / ');
    return [supply,motor].filter(Boolean).join('<br>')||'-';
  }
  function orderChoice(item,index){
    return `<label class="choice"><input type="checkbox" data-order-item="${index}" ${item.included?'checked':''}><span><strong>${esc(item.model||'-')}</strong><span>${esc(item.series||'')}</span><small>${esc(item.manufacturer||'Vitlo')}</small></span><input type="number" min="1" step="1" value="${Math.max(1,num(item.quantity)||1)}" data-order-quantity="${index}" aria-label="${esc(item.model||'Ürün')} adedi"></label>`;
  }
  function fillOrderList(){
    const select=byId('orderSelect');
    const all=orders.list(projectId);
    select.innerHTML=all.map(order=>`<option value="${esc(order.id)}">${esc(order.orderNumber)} · ${esc(U.orderStatusLabel(order.status))}</option>`).join('');
    select.value=activeOrder?.id||'';
  }
  function fillForm(){
    if(!activeOrder)return;
    setValue('orderNumber',activeOrder.orderNumber);setValue('orderDate',activeOrder.orderDate);setValue('orderingCompany',activeOrder.orderingCompany);
    setValue('recipientType',activeOrder.recipientType);setValue('supplier',activeOrder.supplier);setValue('supplierContact',activeOrder.supplierContact);setValue('supplierEmail',activeOrder.supplierEmail);
    setValue('deliveryTime',activeOrder.deliveryTime);setValue('deliveryPlace',activeOrder.deliveryPlace);setValue('paymentTerms',activeOrder.paymentTerms);setValue('orderNote',activeOrder.note);
    byId('orderItemChoices').innerHTML=activeOrder.items.map(orderChoice).join('');
    byId('supplierOptions').innerHTML=U.suppliers(activeOrder).map(name=>`<option value="${esc(name)}"></option>`).join('');
    byId('editorTitle').textContent=activeOrder.orderNumber||'Sipariş Formu';
    renderStatus();
  }
  function draftFromForm(){
    if(!activeOrder)return null;
    const items=activeOrder.items.map((item,index)=>({
      ...item,
      included:Boolean(document.querySelector(`[data-order-item="${index}"]`)?.checked),
      quantity:Math.max(1,Math.round(num(document.querySelector(`[data-order-quantity="${index}"]`)?.value)||1))
    }));
    return U.normalizeOrder({
      ...activeOrder,
      orderNumber:value('orderNumber'),orderDate:value('orderDate'),orderingCompany:value('orderingCompany'),recipientType:value('recipientType'),
      supplier:value('supplier'),supplierContact:value('supplierContact'),supplierEmail:value('supplierEmail'),deliveryTime:value('deliveryTime'),
      deliveryPlace:value('deliveryPlace'),paymentTerms:value('paymentTerms'),note:value('orderNote'),project:projectSnapshot(),items
    });
  }
  function documentRow(item,index){
    const description=item.description?`<em>${esc(item.description)}</em>`:'';
    return `<tr><td class="center line-number">${index+1}</td><td class="line-product"><div class="doc-product"><strong>${esc(item.model||'-')}</strong><span>${esc(item.series||'')}</span><small>${esc(item.manufacturer||'Vitlo')}</small>${description}</div></td><td class="technical line-duty">${esc(dutyText(item))}</td><td class="technical line-supply">${supplyText(item)}</td><td class="center line-quantity"><b>${fmt(item.quantity)}</b></td></tr>`;
  }
  function renderStatus(){
    const label=U.orderStatusLabel(activeOrder?.status);
    const sent=activeOrder?.status==='sent';
    byId('orderStatusPill').textContent=label;byId('orderStatusPill').classList.toggle('sent',sent);
    byId('docStatus').textContent=label;byId('docStatus').classList.toggle('sent',sent);
    byId('markOrderSent').disabled=sent;byId('markOrderSent').textContent=sent?'Sipariş Verildi':'Sipariş Verildi';
  }
  function renderPreview(){
    const draft=draftFromForm();if(!draft)return;
    const included=U.includedItems(draft);
    setText('docOrderNumber',draft.orderNumber);setText('docOrderDate',dateText(draft.orderDate));setText('docQuotationNumber',draft.sourceQuotationNumber||'-');setText('docOrderingCompany',draft.orderingCompany);
    byId('docRecipientLabel').textContent=draft.recipientType==='distributor'?'Distribütör Firma':'İmalatçı Firma';
    setText('docSupplier',draft.supplier);setText('docSupplierContact',[draft.supplierContact,draft.supplierEmail].filter(Boolean).join(' / ')||'-');setText('docProject',draft.project.name);setText('docReference',draft.project.reference);
    byId('orderRows').innerHTML=included.length?included.map(documentRow).join(''):'<tr><td class="empty-lines" colspan="5">Siparişe dahil edilen ürün bulunmuyor.</td></tr>';
    setText('docDeliveryTime',draft.deliveryTime);setText('docDeliveryPlace',draft.deliveryPlace);setText('docPaymentTerms',draft.paymentTerms);setText('docTotalUnits',fmt(U.totalUnits(draft)));
    setText('docNote',draft.note);byId('docNoteBox').hidden=!draft.note;setText('docOrdererSignature',draft.orderingCompany);setText('docSupplierSignature',draft.supplier);
    document.title=`${draft.orderNumber||'Vensis'} Sipariş Formu`;
  }
  function statusMessage(message){byId('orderFormStatus').textContent=message}
  function save(event){
    event?.preventDefault();
    const draft=draftFromForm();if(!draft)return null;
    if(!draft.orderNumber){field('orderNumber').focus();return null}
    if(!draft.supplier){field('supplier').focus();return null}
    activeOrder=orders.update(projectId,activeOrder.id,draft);
    fillOrderList();renderStatus();renderPreview();statusMessage('Sipariş formu kaydedildi.');
    return activeOrder;
  }
  function markSent(){
    const saved=save();if(!saved)return;
    if(!U.includedItems(saved).length){alert('Sipariş verildi olarak işaretlemek için en az bir ürün seçin.');return}
    if(!confirm(`${saved.orderNumber} numaralı siparişi "Sipariş Verildi" olarak işaretlemek istiyor musunuz?`))return;
    activeOrder=orders.markSent(projectId,saved.id,saved);fillOrderList();renderStatus();renderPreview();statusMessage('Sipariş verildi olarak işaretlendi.');
  }
  function printOrder(){
    const saved=save();if(!saved)return;
    if(!U.includedItems(saved).length){alert('Yazdırmak için en az bir ürün seçin.');return}
    window.print();
  }
  function newOrder(){
    const created=orders.create(projectId,{items:store.readItems(projectId)});
    location.assign(orders.url(projectId,created.id));
  }

  function init(){
    projectId=resolveProject();
    if(!projectId){byId('orderEmpty').hidden=false;return}
    ensureOrder();
    if(!activeOrder){byId('orderEmpty').hidden=false;return}
    byId('orderWorkspace').hidden=false;byId('backToProject').href=store.projectUrl(projectId);
    fillOrderList();fillForm();renderPreview();
  }
  byId('orderForm')?.addEventListener('submit',save);
  byId('orderForm')?.addEventListener('input',renderPreview);
  byId('orderForm')?.addEventListener('change',renderPreview);
  byId('markOrderSent')?.addEventListener('click',markSent);
  byId('printOrder')?.addEventListener('click',printOrder);
  byId('newOrder')?.addEventListener('click',newOrder);
  byId('orderSelect')?.addEventListener('change',event=>location.assign(orders.url(projectId,event.target.value)));
  window.addEventListener('vensis-project-cloud-applied',()=>{const refreshed=orders.find(projectId,activeOrder?.id);if(refreshed){activeOrder=refreshed;fillOrderList();fillForm();renderPreview()}});
  init();
})();

(function(){
  const store=window.VensisProjects;
  const orders=window.VensisOrders;
  const utils=window.VensisOrderUtils;
  const quotationKey=window.VensisAccess?.storageKey?.('vensis_active_quotation_v1')||'vensis_active_quotation_v1';
  if(!store||!orders||!utils)return;

  function openWindow(projectId,order){window.open(orders.url(projectId,order.id),'_blank')}
  function currentQuotation(){
    try{return JSON.parse(localStorage.getItem(quotationKey)||'null')}catch{return null}
  }
  function createFromProject(){
    window.VensisProject?.flushAllNotes?.();
    window.VensisProjectContact?.save?.();
    const projectId=window.VensisProject?.projectId||store.activeId();
    const items=store.readItems(projectId);
    if(!items.length){alert('Sipariş formu oluşturmak için projede en az bir ürün olmalıdır.');return}
    const quotation=currentQuotation();
    const meta=store.readMeta(projectId);
    const usableQuotation=quotation?.project?.id===projectId
      ? quotation
      : meta.lastQuotationNumber?{quotationNumber:meta.lastQuotationNumber,items}:null;
    const order=orders.createOrReuse(projectId,{quotation:usableQuotation,items:usableQuotation?.items||items});
    openWindow(projectId,order);
    renderProjectStatus();
  }
  function createFromQuotation(){
    window.VensisQuotationEditor?.save?.({silent:true});
    const quotation=currentQuotation();
    const projectId=quotation?.project?.id;
    if(!quotation||!projectId||!store.get(projectId)){alert('Siparişe dönüştürülecek proje bulunamadı.');return}
    if(!Array.isArray(quotation.items)||!quotation.items.length){alert('Siparişe dönüştürülecek ürün bulunamadı.');return}
    const order=orders.createOrReuse(projectId,{quotation,items:quotation.items});
    openWindow(projectId,order);
  }
  function renderProjectStatus(){
    const badge=document.getElementById('projectStatusBadge');
    const projectId=window.VensisProject?.projectId||store.activeId();
    if(!badge||!projectId)return;
    const status=store.readMeta(projectId).status;
    badge.textContent=utils.projectStatusLabel(status);
    badge.dataset.status=utils.projectStatus(status);
    const select=document.getElementById('projectStatus');
    if(select&&document.activeElement!==select)select.value=utils.projectStatus(status);
  }

  function quotationLanguage(){
    const active=window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'';
    if(active==='tr'||active==='en')return active;
    try{
      const saved=localStorage.getItem('vensis_language_v1');
      return saved==='tr'?'tr':'en';
    }catch{return 'en'}
  }

  function quotationTableLabels(){
    if(quotationLanguage()==='tr'){
      return {
        fan:['Ürün','Seçilen Debi / Basınç','Voltaj','Güç','Devir','Birim Fiyat','Adet','Toplam'],
        electrical:['Ürün','Güç','Lümen','Voltaj','IP Sınıfı','Birim Fiyat','Adet','Toplam'],
        fanGroup:'Fan Ürünleri',
        electricalGroup:'Elektrik Ürünleri'
      };
    }
    return {
      fan:['Product','Selected Airflow / Pressure','Voltage','Power','Speed','Unit Price','Quantity','Total'],
      electrical:['Product','Power','Lumen','Voltage','IP Rating','Unit Price','Quantity','Total'],
      fanGroup:'Fan Products',
      electricalGroup:'Electrical Products'
    };
  }

  function isElectricalQuotationTable(table,index,format){
    const title=String(table.closest('.quote-product-group')?.querySelector('.quote-product-group-title')?.textContent||'').toLowerCase();
    if(/elektrik|electrical/.test(title))return true;
    if(/fan/.test(title))return false;
    if(format==='electrical')return true;
    if(format==='fan')return false;
    return format==='mixed'&&index>0;
  }

  function applyQuotationTableLabels(){
    const root=document.getElementById('quotationProductTables');
    if(!root)return;
    const text=quotationTableLabels();
    const format=document.body.dataset.quotationFormat||'fan';
    root.querySelectorAll('.quote-table').forEach((table,index)=>{
      const electrical=isElectricalQuotationTable(table,index,format);
      const headers=electrical?text.electrical:text.fan;
      table.querySelectorAll('thead th').forEach((th,headerIndex)=>{
        const next=headers[headerIndex];
        if(next&&th.textContent!==next)th.textContent=next;
      });
      const groupTitle=table.closest('.quote-product-group')?.querySelector('.quote-product-group-title');
      if(groupTitle){
        const next=electrical?text.electricalGroup:text.fanGroup;
        if(groupTitle.textContent!==next)groupTitle.textContent=next;
      }
      if(!electrical){
        table.querySelectorAll('tbody tr').forEach(row=>{
          const duty=row.children[1]?.querySelector('.technical');
          if(!duty)return;
          if(quotationLanguage()==='tr'&&/ nominal$/i.test(duty.textContent))duty.textContent=duty.textContent.replace(/ nominal$/i,' anma');
          if(quotationLanguage()==='en'&&/ anma$/i.test(duty.textContent))duty.textContent=duty.textContent.replace(/ anma$/i,' nominal');
        });
      }
    });
  }

  document.getElementById('createOrder')?.addEventListener('click',createFromProject);
  document.getElementById('createOrderFromQuotation')?.addEventListener('click',createFromQuotation);
  window.addEventListener('storage',renderProjectStatus);
  window.addEventListener('vensis-project-updated',renderProjectStatus);
  window.addEventListener('vensis-project-cloud-applied',renderProjectStatus);
  window.addEventListener('vensis-language-changed',applyQuotationTableLabels);

  const quotationTables=document.getElementById('quotationProductTables');
  if(quotationTables){
    new MutationObserver(applyQuotationTableLabels).observe(quotationTables,{childList:true,subtree:true});
    applyQuotationTableLabels();
  }

  renderProjectStatus();
})();

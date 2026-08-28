(function(){
  const store=window.VensisProjects;
  const orders=window.VensisOrders;
  const utils=window.VensisOrderUtils;
  const quotationKey=window.VensisAccess?.storageKey?.('vensis_active_quotation_v1')||'vensis_active_quotation_v1';
  const formats=window.VensisQuotationFormats||{split:items=>({fan:items||[],electrical:[]})};
  if(!store||!orders||!utils)return;

  function openWindow(projectId,order){window.open(orders.url(projectId,order.id),'_blank')}
  function currentQuotation(){
    try{return JSON.parse(localStorage.getItem(quotationKey)||'null')}catch{return null}
  }
  function createFromProject(){
    window.VensisProjectPrint?.flushInlineEditors?.();
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

  function num(value){const n=Number(value);return Number.isFinite(n)?n:0}
  function fmt(value,digits=0){return new Intl.NumberFormat(quotationLanguage()==='tr'?'tr-TR':'en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value))}
  function selectedDuty(item){
    const q=Number(item?.selected?.q);const p=Number(item?.selected?.p);
    if(Number.isFinite(q)&&q>0&&Number.isFinite(p)&&p>=0)return `${fmt(q)} m³/h @ ${fmt(p)} Pa`;
    const nominal=num(item?.nominalAirflow);
    return nominal>0?`${fmt(nominal)} m³/h`:'-';
  }
  function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
  function setWrapped(cell,value,className){
    if(!cell)return;
    if(value==='-'){if(cell.textContent!=='-')cell.textContent='-';return}
    let span=cell.querySelector(`.${className}`);
    if(!span){cell.textContent='';span=document.createElement('span');span.className=className;cell.appendChild(span)}
    setText(span,value);
  }
  function quotationItems(){return window.VensisQuotationEditor?.draft?.()||currentQuotation()}
  function tableItems(quotation,electrical,format){
    const items=Array.isArray(quotation?.items)?quotation.items:[];
    if(format!=='mixed')return items;
    const groups=formats.split(items);
    return electrical?(groups.electrical||[]):(groups.fan||[]);
  }
  function applyProjectSourceValues(table,electrical,format,quotation){
    const items=tableItems(quotation,electrical,format);
    table.querySelectorAll('tbody tr').forEach((row,rowIndex)=>{
      const item=items[rowIndex];if(!item)return;
      if(electrical){
        const power=String(item.power||'').trim()||'-';
        const lumen=String(item.lumen||'').trim()||'-';
        const voltage=String(item.voltage||'').trim()||'-';
        const ip=String(item.ip||'').trim()||'-';
        setWrapped(row.children[1],power,'electrical-spec');
        setWrapped(row.children[2],lumen,'electrical-spec');
        setWrapped(row.children[3],voltage,'technical');
        setWrapped(row.children[4],ip,'electrical-spec');
        return;
      }
      setWrapped(row.children[1],selectedDuty(item),'technical');
      setWrapped(row.children[2],String(item.voltage||'').trim()||'-','technical');
      setText(row.children[3],num(item.motorPower)>0?`${fmt(item.motorPower,2)} kW`:'-');
      setText(row.children[4],num(item.speed)>0?`${fmt(item.speed)} rpm`:'-');
    });
  }

  function applyQuotationTableLabels(){
    const root=document.getElementById('quotationProductTables');
    if(!root)return;
    const text=quotationTableLabels();
    const format=document.body.dataset.quotationFormat||'fan';
    const quotation=quotationItems();
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
      applyProjectSourceValues(table,electrical,format,quotation);
    });
  }

  document.addEventListener('input',event=>{if(event.target.closest('.project-inline-note[data-product-note]'))event.stopPropagation()},true);
  document.addEventListener('change',event=>{if(event.target.closest('.project-inline-note[data-product-note]')){window.VensisProjectPrint?.flushInlineEditors?.();event.stopPropagation()}},true);

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

if(document.getElementById('customProductForm')&&!document.querySelector('script[data-custom-product-editor]')){
  const script=document.createElement('script');
  script.src='js/custom-product-editor.js?v=20260828-custom-product-library-r2';
  script.dataset.customProductEditor='1';
  document.head.appendChild(script);
}

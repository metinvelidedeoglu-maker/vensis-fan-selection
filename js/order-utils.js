if(typeof document!=='undefined'&&typeof window!=='undefined'&&!window.VensisI18n&&!document.getElementById('vensisLanguageScript')){
  const languageScript=document.createElement('script');
  languageScript.id='vensisLanguageScript';
  languageScript.src='js/language.js?v=20260825-all-pages-r1';
  document.head.appendChild(languageScript);
}

(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VensisOrderUtils=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const PROJECT_STATUSES=['draft','quoted','won','ordered','lost'];
  const ORDER_STATUSES=['draft','sent'];
  const RECIPIENT_TYPES=['manufacturer','distributor'];
  const PROJECT_STATUS_LABELS={draft:'Taslak',quoted:'Teklif Verildi',won:'Kazanıldı',ordered:'Sipariş Verildi',lost:'Kaybedildi'};
  const ORDER_STATUS_LABELS={draft:'Taslak',sent:'Sipariş Verildi'};

  function text(value){return String(value??'').trim()}
  function number(value){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}
  function positiveInteger(value){return Math.max(1,Math.round(number(value))||1)}
  function localDate(value=new Date()){
    const date=value instanceof Date?value:new Date(value);
    const pad=part=>String(part).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  }
  function isoDate(value,fallbackDate=new Date()){
    const candidate=text(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(candidate)?candidate:localDate(fallbackDate);
  }
  function timestamp(value,fallback=''){
    const parsed=Date.parse(value||'');
    return Number.isFinite(parsed)?new Date(parsed).toISOString():fallback;
  }
  function point(value){
    if(!value||typeof value!=='object')return null;
    return {q:Math.max(0,number(value.q)),p:Math.max(0,number(value.p))};
  }
  function projectStatus(value){return PROJECT_STATUSES.includes(value)?value:'draft'}
  function orderStatus(value){return ORDER_STATUSES.includes(value)?value:'draft'}
  function recipientType(value){return RECIPIENT_TYPES.includes(value)?value:'manufacturer'}
  function projectStatusLabel(value){return PROJECT_STATUS_LABELS[projectStatus(value)]}
  function orderStatusLabel(value){return ORDER_STATUS_LABELS[orderStatus(value)]}

  function orderItem(value,index=0){
    const source=value&&typeof value==='object'?value:{};
    return {
      itemKey:text(source.itemKey)||`line-${index+1}`,
      mode:['selection','catalog','custom'].includes(source.mode)?source.mode:'selection',
      productType:text(source.productType)==='electrical'?'electrical':'fan',
      productKey:text(source.productKey),
      model:text(source.model),
      series:text(source.series),
      manufacturer:text(source.manufacturer)||'Vitlo',
      description:text(source.description),
      category:text(source.category),
      orderCode:text(source.orderCode),
      nominalAirflow:Math.max(0,number(source.nominalAirflow)),
      required:point(source.required),
      selected:point(source.selected),
      voltage:text(source.voltage),
      frequency:text(source.frequency),
      power:text(source.power),
      currentText:text(source.currentText),
      phase:text(source.phase),
      ip:text(source.ip),
      insulation:text(source.insulation),
      lumen:text(source.lumen),
      operatingTemperature:text(source.operatingTemperature),
      motorPower:Math.max(0,number(source.motorPower)),
      current:Math.max(0,number(source.current)),
      speed:Math.max(0,number(source.speed)),
      quantity:positiveInteger(source.quantity),
      included:source.included!==false
    };
  }

  function normalizeOrder(value){
    const source=value&&typeof value==='object'?value:{};
    const createdAt=timestamp(source.createdAt,new Date().toISOString());
    const project=source.project&&typeof source.project==='object'?source.project:{};
    return {
      id:text(source.id),
      orderNumber:text(source.orderNumber),
      sourceQuotationNumber:text(source.sourceQuotationNumber),
      status:orderStatus(source.status),
      orderDate:isoDate(source.orderDate,new Date(createdAt)),
      createdAt,
      updatedAt:timestamp(source.updatedAt,createdAt),
      sentAt:source.sentAt?timestamp(source.sentAt,''):'',
      orderingCompany:text(source.orderingCompany)||'Vensis Havalandırma Ltd. Şti.',
      recipientType:recipientType(source.recipientType),
      supplier:text(source.supplier),
      supplierContact:text(source.supplierContact),
      supplierEmail:text(source.supplierEmail),
      deliveryTime:text(source.deliveryTime),
      deliveryPlace:text(source.deliveryPlace),
      paymentTerms:text(source.paymentTerms),
      note:text(source.note),
      project:{
        id:text(project.id),
        name:text(project.name),
        reference:text(project.reference),
        contact:text(project.contact)
      },
      items:(Array.isArray(source.items)?source.items:[]).map(orderItem)
    };
  }

  function dailyPrefix(date){
    const pad=value=>String(value).padStart(2,'0');
    return `VNS-SIP-${String(date.getFullYear()).slice(-2)}${pad(date.getMonth()+1)}${pad(date.getDate())}`;
  }
  function nextOrderNumber(orders=[],date=new Date()){
    const prefix=dailyPrefix(date);
    const sequence=(Array.isArray(orders)?orders:[]).reduce((highest,order)=>{
      const match=text(order?.orderNumber).match(new RegExp(`^${prefix}-(\\d+)$`));
      return match?Math.max(highest,Number(match[1])||0):highest;
    },0)+1;
    return `${prefix}-${String(sequence).padStart(2,'0')}`;
  }
  function orderId(date=new Date(),random=Math.random){return `ord_${date.getTime().toString(36)}_${random().toString(36).slice(2,8)}`}
  function deliveryTimeFromQuotation(quotation){return text(quotation?.settings?.summary?.deliveryTime)}

  function createOrder(options={}){
    const now=options.now instanceof Date?options.now:new Date(options.now||Date.now());
    const project=options.project&&typeof options.project==='object'?options.project:{};
    const quotation=options.quotation&&typeof options.quotation==='object'?options.quotation:null;
    const items=(Array.isArray(options.items)?options.items:quotation?.items||[]).map(orderItem);
    const manufacturers=[...new Set(items.map(item=>item.manufacturer).filter(Boolean))];
    return normalizeOrder({
      id:orderId(now,options.random||Math.random),
      orderNumber:nextOrderNumber(options.existingOrders,now),
      sourceQuotationNumber:text(quotation?.quotationNumber),
      status:'draft',
      orderDate:localDate(now),
      createdAt:now.toISOString(),
      updatedAt:now.toISOString(),
      orderingCompany:'Vensis Havalandırma Ltd. Şti.',
      recipientType:'manufacturer',
      supplier:manufacturers.length===1?manufacturers[0]:manufacturers[0]||'',
      deliveryTime:deliveryTimeFromQuotation(quotation),
      project:{id:project.id,name:project.name,reference:project.reference,contact:project.contact},
      items
    });
  }

  function includedItems(order){return normalizeOrder(order).items.filter(item=>item.included)}
  function totalUnits(order){return includedItems(order).reduce((sum,item)=>sum+positiveInteger(item.quantity),0)}
  function suppliers(order){return [...new Set(normalizeOrder(order).items.map(item=>item.manufacturer).filter(Boolean))]}

  return {
    PROJECT_STATUSES,ORDER_STATUSES,RECIPIENT_TYPES,PROJECT_STATUS_LABELS,ORDER_STATUS_LABELS,
    createOrder,includedItems,nextOrderNumber,normalizeOrder,orderItem,orderStatusLabel,
    projectStatus,projectStatusLabel,recipientType,suppliers,totalUnits
  };
});

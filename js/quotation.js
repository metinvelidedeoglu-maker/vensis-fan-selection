(function(){
  document.body.classList.add('app-shell','app-quotation');
  if(!document.querySelector('link[href*="css/ui-polish.css"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/ui-polish.css?v=20260813-document-editors';
    document.head.appendChild(link);
  }

  const KEY=window.VensisAccess?.storageKey?.('vensis_active_quotation_v1')||'vensis_active_quotation_v1';
  const catalog=window.VensisCatalog||{models:[]};
  const formats=window.VensisQuotationFormats||{detect:()=> 'fan',split:items=>({fan:items||[],electrical:[]}),preference:value=>value||'auto'};
  const byId=id=>document.getElementById(id);
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const clampDiscount=value=>Math.min(100,Math.max(0,number(value)));
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(number(value));
  const currencySymbol=value=>({EUR:'€',USD:'$',TRY:'₺'}[String(value||'EUR').toUpperCase()]||String(value||'EUR'));
  const money=(value,currency='EUR')=>`${currencySymbol(currency)}${fmt(value,2)}`;
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const point=value=>`${fmt(value?.q)} m³/h @ ${fmt(value?.p)} Pa`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const lines=value=>String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  let activeQuotation=null;

  function readQuotation(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
  }
  function writeQuotation(value){
    localStorage.setItem(KEY,JSON.stringify(value));
    return value;
  }
  function getPath(object,path){return path.split('.').reduce((value,key)=>value==null?undefined:value[key],object)}
  function setPath(object,path,value){
    const keys=path.split('.');
    const last=keys.pop();
    const target=keys.reduce((value,key)=>(value[key]||(value[key]={})),object);
    target[last]=value;
  }
  function modelFor(item){
    if(item?.mode==='custom')return null;
    const direct=catalog.getModel?.(item?.productKey);
    if(direct)return direct;
    return (catalog.models||[]).find(model=>String(model.model||'')===String(item?.model||''))||null;
  }
  function netUnit(item){return number(item.price)*(1-clampDiscount(item.discountPercent)/100)}
  function dutyMarkup(item){
    if(item.mode==='catalog'||item.mode==='custom'){
      const nominal=number(item.nominalAirflow);
      return nominal>0?`<span class="technical">${fmt(nominal)} m³/h nominal</span>`:'-';
    }
    return `<span class="technical">${point(item.selected||{})}</span>`;
  }
  function supplyMarkup(item,model){
    const voltage=String(item.voltage||model?.motor?.voltage||'').trim();
    const frequency=String(item.frequency||model?.motor?.frequency||'').trim();
    if(voltage&&frequency)return `<span class="technical">${escapeHtml(voltage)} – ${escapeHtml(frequency)}</span>`;
    return voltage||frequency?`<span class="technical">${escapeHtml(voltage||frequency)}</span>`:'-';
  }
  function productMarkup(item){
    const image=item.image?`<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.model||'Product')}" onerror="this.style.display='none'">`:'';
    const description=String(item.description||'').trim();
    const safety=String(item.safetyWarning||'').trim();
    return `<div class="product">${image}<div><strong>${escapeHtml(item.model||'-')}</strong><span>${escapeHtml(item.series||'')}</span><small>${escapeHtml(item.manufacturer||'Vitlo')}</small>${safety?`<em style="display:block;margin-top:4px;color:#9a3412;font-size:9.5px;font-weight:750;line-height:1.35">${escapeHtml(safety)}</em>`:''}${description?`<em class="product-description">${escapeHtml(description)}</em>`:''}</div></div>`;
  }
  function fanRow(item,currency){
    const model=modelFor(item);
    const qty=Math.max(1,Math.round(number(item.quantity)||1));
    const net=netUnit(item);
    const total=net*qty;
    const power=number(item.motorPower)||number(model?.motor?.power);
    const speed=number(item.speed)||number(model?.motor?.speed);
    const hasPrice=number(item.price)>0;
    return `<tr><td>${productMarkup(item)}</td><td>${dutyMarkup(item)}</td><td>${supplyMarkup(item,model)}</td><td class="num technical">${power>0?`${fmt(power,2)} kW`:'-'}</td><td class="num technical">${speed>0?`${fmt(speed)} rpm`:'-'}</td><td class="num unit-price">${hasPrice?money(net,currency):'-'}</td><td class="num">${fmt(qty)}</td><td class="num"><b>${hasPrice?money(total,currency):'-'}</b></td></tr>`;
  }
  function electricalRow(item,currency){
    const qty=Math.max(1,Math.round(number(item.quantity)||1));
    const net=netUnit(item);
    const total=net*qty;
    const hasPrice=number(item.price)>0;
    const powerCurrent=[item.power||'',item.currentText||((number(item.current)>0)?`${fmt(item.current,2)} A`:'')].filter(Boolean);
    const protection=[item.ip||'',item.phase||''].filter(Boolean);
    const otherSpecs=[item.lumen||'',item.operatingTemperature||'',item.insulation||''].filter(Boolean);
    return `<tr><td>${productMarkup(item)}</td><td class="technical">${escapeHtml(item.orderCode||'-')}</td><td>${supplyMarkup(item,null)}</td><td>${powerCurrent.length?powerCurrent.map(value=>`<span class="electrical-spec">${escapeHtml(value)}</span>`).join(''):'-'}</td><td>${protection.length?protection.map(value=>`<span class="electrical-spec">${escapeHtml(value)}</span>`).join(''):'-'}</td><td>${otherSpecs.length?otherSpecs.map(value=>`<span class="electrical-spec">${escapeHtml(value)}</span>`).join(''):'-'}</td><td class="num unit-price">${hasPrice?money(net,currency):'-'}</td><td class="num">${fmt(qty)}</td><td class="num"><b>${hasPrice?money(total,currency):'-'}</b></td></tr>`;
  }
  function tableMarkup(type,items,currency,title=''){
    const electrical=type==='electrical';
    const headers=electrical?['Product','Order Code','V / Hz','Power / Current','IP / Phase','Other Specs','Unit Price','Qty','Total']:['Product','Selected / Nominal','V / Hz','kW','rpm','Unit Price','Qty','Total'];
    const rows=items.map(item=>electrical?electricalRow(item,currency):fanRow(item,currency)).join('');
    const numericStart=electrical?6:3;
    return `<section class="quote-product-group">${title?`<h2 class="quote-product-group-title">${escapeHtml(title)}</h2>`:''}<div class="quote-table-wrap"><table class="quote-table"><thead><tr>${headers.map((header,index)=>`<th${index>=numericStart?' class="num"':''}>${header}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }
  function productTables(items,currency,format){
    if(format==='electrical')return tableMarkup('electrical',items,currency);
    if(format==='fan')return tableMarkup('fan',items,currency);
    const groups=formats.split(items);
    return `${groups.fan.length?tableMarkup('fan',groups.fan,currency,'Fan Ürünleri'):''}${groups.electrical.length?tableMarkup('electrical',groups.electrical,currency,'Elektrik Ürünleri'):''}`;
  }
  function totals(items){
    return items.reduce((sum,item)=>{
      const qty=Math.max(1,Math.round(number(item.quantity)||1));
      sum.units+=qty;
      if(number(item.price)>0){sum.hasPrice=true;sum.total+=netUnit(item)*qty}
      return sum;
    },{units:0,total:0,hasPrice:false});
  }
  function setAll(selector,value){document.querySelectorAll(selector).forEach(node=>{node.textContent=value})}
  function ensureContactRow(){
    if(byId('quoteContact'))return;
    const reference=byId('quoteReference');
    const sourceRow=reference?.closest('.meta-row');
    if(!sourceRow)return;
    const contactRow=document.createElement('div');
    contactRow.className='meta-row';
    contactRow.innerHTML='<span>Contact Person / İlgili</span><b id="quoteContact">-</b>';
    sourceRow.insertAdjacentElement('afterend',contactRow);
  }
  function listMarkup(items,ordered=false){
    const tag=ordered?'ol':'ul';
    const rows=(Array.isArray(items)?items:[]).filter(Boolean).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
    return `<${tag}>${rows}</${tag}>`;
  }
  function paragraphMarkup(value){
    return String(value||'').split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean).map(text=>`<p>${escapeHtml(text).replace(/\n/g,'<br>')}</p>`).join('');
  }
  function settingsFor(quotation){
    const format=formats.detect(quotation?.items||[],quotation?.format||'auto');
    const value=quotation?.settings||window.VensisQuotationSettings?.forFormat?.(format)||window.VensisQuotationSettings?.read?.()||window.VensisQuotationSettings?.defaults||{};
    return clone(value);
  }
  function renderSettings(settings){
    const pages=[...document.querySelectorAll('.quote-page')];
    const summary=settings.summary||{};
    const scope=settings.scope||{};
    const terms=settings.terms||{};
    const cards=pages[0]?.querySelectorAll('.term-card b')||[];
    const deliveryTime=summary.deliveryTime===undefined?window.VensisQuotationSettings?.defaults?.summary?.deliveryTime:summary.deliveryTime;
    [summary.payment,summary.exchangeRate,summary.validity,deliveryTime,summary.deliveryPlace,summary.vat,summary.commissioning].forEach((value,index)=>{if(cards[index])cards[index].textContent=value||'-'});
    const firstNote=pages[0]?.querySelector('.quote-note');
    if(firstNote)firstNote.innerHTML=`<b>Teklif Notu</b>${escapeHtml(summary.quotationNote||'').replace(/\n/g,'<br>')}`;
    const scopeBodies=pages[1]?.querySelectorAll('.content-block .body')||[];
    if(scopeBodies[0])scopeBodies[0].innerHTML=paragraphMarkup(scope.included);
    if(scopeBodies[1])scopeBodies[1].innerHTML=listMarkup(scope.exclusions);
    if(scopeBodies[2])scopeBodies[2].innerHTML=listMarkup(scope.deliveryControl);
    const suitability=pages[1]?.querySelector('.notice');
    if(suitability)suitability.innerHTML=`<b>Proje uygunluğu:</b> ${escapeHtml(scope.suitability||'').replace(/\n/g,'<br>')}`;
    const termBodies=pages[2]?.querySelectorAll('.content-block .body')||[];
    [terms.priceCurrency,terms.payment,terms.delivery,terms.standard].forEach((items,index)=>{if(termBodies[index])termBodies[index].innerHTML=listMarkup(items,true)});
    const acceptance=pages[2]?.querySelector('.notice');
    if(acceptance)acceptance.textContent=terms.acceptance||'';
    const signatures=pages[2]?.querySelectorAll('.signature-box')||[];
    if(signatures[0]){const title=signatures[0].querySelector('b'),line=signatures[0].querySelector('span');if(title)title.textContent=terms.preparedTitle||'';if(line)line.textContent=terms.preparedLine||''}
    if(signatures[1]){const title=signatures[1].querySelector('b'),line=signatures[1].querySelector('span');if(title)title.textContent=terms.customerTitle||'';if(line)line.textContent=terms.customerLine||''}
  }
  function dateValue(quotation){
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(quotation?.date||'')))return quotation.date;
    const date=new Date(quotation?.createdAt||Date.now());
    const pad=value=>String(value).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  }
  function dateText(value){
    const date=new Date(`${value||''}T00:00:00`);
    return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date):'-';
  }
  function renderPreview(quotation){
    ensureContactRow();
    const total=totals(quotation.items||[]);
    const quotationNumber=quotation.quotationNumber||'-';
    const currency=String(quotation.currency||'EUR').toUpperCase();
    const format=formats.detect(quotation.items||[],quotation.format||'auto');
    document.body.dataset.quotationFormat=format;
    byId('quoteDocumentTitle').textContent=format==='fan'?'FAN QUOTATION':format==='electrical'?'ELECTRICAL QUOTATION':'COMMERCIAL QUOTATION';
    byId('quoteDocumentSubtitle').textContent=format==='fan'?'Fan Commercial Offer':format==='electrical'?'Electrical Commercial Offer':'Fan & Electrical Commercial Offer';
    byId('quoteProject').textContent=quotation.project?.name||'-';
    byId('quoteReference').textContent=quotation.project?.reference||'-';
    byId('quoteContact').textContent=quotation.project?.contact||'-';
    byId('quoteNumber').textContent=quotationNumber;
    setAll('[data-quote-number]',quotationNumber);
    byId('quoteDate').textContent=dateText(dateValue(quotation));
    byId('quoteCurrency').textContent=currency;
    byId('quotationProductTables').innerHTML=productTables(quotation.items||[],currency,format);
    byId('quoteUnits').textContent=fmt(total.units);
    byId('quoteTotal').textContent=total.hasPrice?money(total.total,currency):'-';
    renderSettings(settingsFor(quotation));
    const back=document.querySelector('.toolbar .back');
    if(back&&quotation.project?.id)back.href=`project.html?project=${encodeURIComponent(quotation.project.id)}`;
    byId('quotationEditorTitle').textContent=quotationNumber;
    document.title=`${quotationNumber==='-'?'Vensis':quotationNumber} Quotation`;
  }
  function itemEditor(item,index){
    const qty=Math.max(1,Math.round(number(item.quantity)||1));
    return `<article class="quote-item-editor"><div class="quote-item-editor-head"><div><strong>${escapeHtml(item.model||'-')}</strong><span>${escapeHtml(item.series||'')}</span></div><b>${index+1}</b></div><div class="quote-item-editor-grid"><label>Adet<input type="number" min="1" step="1" value="${qty}" data-quote-item-quantity="${index}"></label><label>Liste Fiyatı<input type="number" min="0" step="0.01" value="${number(item.price)}" data-quote-item-price="${index}"></label><label>İskonto %<input type="number" min="0" max="100" step="0.1" value="${clampDiscount(item.discountPercent)}" data-quote-item-discount="${index}"></label></div><label class="wide">Ürün Notu<textarea rows="2" data-quote-item-description="${index}">${escapeHtml(item.description||'')}</textarea></label></article>`;
  }
  function fillEditor(quotation){
    byId('editQuotationNumber').value=quotation.quotationNumber||'';
    byId('editQuotationDate').value=dateValue(quotation);
    byId('editQuotationCurrency').value=String(quotation.currency||'EUR').toUpperCase();
    byId('editQuotationFormat').value=formats.preference(quotation.format||'auto');
    byId('editQuotationProject').value=quotation.project?.name||'';
    byId('editQuotationReference').value=quotation.project?.reference||'';
    byId('editQuotationContact').value=quotation.project?.contact||'';
    byId('quotationItemEditors').innerHTML=(quotation.items||[]).map(itemEditor).join('');
    const settings=settingsFor(quotation);
    document.querySelectorAll('[data-quote-setting]').forEach(field=>{
      const value=getPath(settings,field.dataset.quoteSetting);
      field.value=field.dataset.quoteSettingType==='list'?(Array.isArray(value)?value.join('\n'):String(value||'')):String(value||'');
    });
  }
  function collectSettings(quotation){
    const settings=settingsFor(quotation);
    document.querySelectorAll('[data-quote-setting]').forEach(field=>{
      setPath(settings,field.dataset.quoteSetting,field.dataset.quoteSettingType==='list'?lines(field.value):String(field.value||'').trim());
    });
    return settings;
  }
  function collectEditor(){
    const quotation=clone(activeQuotation||readQuotation()||{});
    quotation.quotationNumber=String(byId('editQuotationNumber')?.value||'').trim();
    quotation.date=String(byId('editQuotationDate')?.value||'').trim();
    quotation.currency=String(byId('editQuotationCurrency')?.value||'EUR').toUpperCase();
    quotation.format=formats.preference(byId('editQuotationFormat')?.value||'auto');
    quotation.resolvedFormat=formats.detect(quotation.items||[],quotation.format);
    quotation.project={...(quotation.project||{}),name:String(byId('editQuotationProject')?.value||'').trim(),reference:String(byId('editQuotationReference')?.value||'').trim(),contact:String(byId('editQuotationContact')?.value||'').trim()};
    quotation.items=(Array.isArray(quotation.items)?quotation.items:[]).map((item,index)=>{
      const price=Math.max(0,number(document.querySelector(`[data-quote-item-price="${index}"]`)?.value));
      const priceChanged=price!==Math.max(0,number(item.price));
      return {
        ...item,
        quantity:Math.max(1,Math.round(number(document.querySelector(`[data-quote-item-quantity="${index}"]`)?.value)||1)),
        price,
        priceSource:priceChanged?'manual':item.priceSource,
        priceCurrency:priceChanged?quotation.currency:item.priceCurrency,
        discountPercent:clampDiscount(document.querySelector(`[data-quote-item-discount="${index}"]`)?.value),
        description:String(document.querySelector(`[data-quote-item-description="${index}"]`)?.value||'').trim()
      };
    });
    quotation.settings=collectSettings(quotation);
    quotation.totals=totals(quotation.items);
    quotation.updatedAt=new Date().toISOString();
    return quotation;
  }
  function syncProject(quotation){
    const store=window.VensisProjects;
    const projectId=quotation?.project?.id;
    if(!store?.get?.(projectId))return false;
    const currentMeta=store.readMeta(projectId);
    store.writeMeta({name:quotation.project?.name||'',reference:quotation.project?.reference||'',contact:quotation.project?.contact||'',lastQuotationNumber:quotation.quotationNumber||currentMeta.lastQuotationNumber,status:currentMeta.status},projectId);
    const projectItems=store.readItems(projectId);
    const updated=projectItems.map((item,index)=>{
      const quoteItem=item.itemKey?(quotation.items||[]).find(candidate=>candidate.itemKey===item.itemKey):(quotation.items||[])[index];
      if(!quoteItem)return item;
      return {...item,quantity:Math.max(1,Math.round(number(quoteItem.quantity)||1)),price:Math.max(0,number(quoteItem.price)),priceSource:String(quoteItem.priceSource||item.priceSource||''),priceCurrency:String(quoteItem.priceCurrency||item.priceCurrency||''),discountPercent:clampDiscount(quoteItem.discountPercent),description:String(quoteItem.description||'').trim(),updatedAt:new Date().toISOString()};
    });
    store.writeItems(updated,projectId);
    return true;
  }
  function setEditorStatus(text,className=''){
    const status=byId('quotationEditorStatus');
    if(!status)return;
    status.textContent=text;
    status.className=`quotation-editor-status${className?` ${className}`:''}`;
  }
  function saveQuotation(options={}){
    if(!activeQuotation)return null;
    activeQuotation=collectEditor();
    writeQuotation(activeQuotation);
    const synced=syncProject(activeQuotation);
    renderPreview(activeQuotation);
    if(!options.silent)setEditorStatus(synced?'Teklif ve proje kaydedildi.':'Teklif kaydedildi.','saved');
    return activeQuotation;
  }
  function updateDraft(){
    if(!activeQuotation)return;
    activeQuotation=collectEditor();
    renderPreview(activeQuotation);
    setEditorStatus('Kaydedilmemiş değişiklikler var.','dirty');
  }
  function showTab(name){
    document.querySelectorAll('[data-quotation-editor-tab]').forEach(button=>button.classList.toggle('active',button.dataset.quotationEditorTab===name));
    document.querySelectorAll('[data-quotation-editor-panel]').forEach(panel=>{panel.hidden=panel.dataset.quotationEditorPanel!==name});
  }
  function render(){
    activeQuotation=readQuotation();
    const empty=byId('quotationEmpty');
    const workspace=byId('quotationWorkspace');
    if(!activeQuotation||!Array.isArray(activeQuotation.items)||!activeQuotation.items.length){
      empty.hidden=false;
      workspace.hidden=true;
      return;
    }
    if(window.VensisPricing?.enrichItems?.(activeQuotation.items)){
      activeQuotation.totals=totals(activeQuotation.items);
      activeQuotation.updatedAt=new Date().toISOString();
      writeQuotation(activeQuotation);
      syncProject(activeQuotation);
    }
    empty.hidden=true;
    workspace.hidden=false;
    fillEditor(activeQuotation);
    renderPreview(activeQuotation);
  }

  byId('quotationEditorForm')?.addEventListener('submit',event=>{event.preventDefault();saveQuotation()});
  byId('quotationEditorForm')?.addEventListener('input',updateDraft);
  byId('quotationEditorForm')?.addEventListener('change',event=>{
    if(event.target.id==='editQuotationFormat'&&activeQuotation){
      activeQuotation.format=formats.preference(event.target.value);
      activeQuotation.resolvedFormat=formats.detect(activeQuotation.items||[],activeQuotation.format);
      activeQuotation.settings=window.VensisQuotationSettings?.forFormat?.(activeQuotation.resolvedFormat)||activeQuotation.settings;
      fillEditor(activeQuotation);renderPreview(activeQuotation);setEditorStatus('Teklif formatı ve ilgili metinler güncellendi.','dirty');return;
    }
    if(event.target.matches('select,input[type="date"]'))updateDraft();
  });
  document.querySelectorAll('[data-quotation-editor-tab]').forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.quotationEditorTab)));
  byId('printQuotation')?.addEventListener('click',()=>{saveQuotation({silent:true});window.print()});
  byId('createOrderFromQuotation')?.addEventListener('click',()=>saveQuotation({silent:true}),true);
  window.addEventListener('beforeprint',()=>saveQuotation({silent:true}));
  window.addEventListener('storage',event=>{if(event.key===KEY)render()});
  window.VensisQuotationEditor={key:KEY,save:saveQuotation,draft:()=>activeQuotation};
  render();
})();

(function(){
  document.body.classList.add('app-shell','app-quotation');
  if(!document.querySelector('link[href*="css/ui-polish.css"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/ui-polish.css?v=20260721-design-review';
    document.head.appendChild(link);
  }
  const KEY='vensis_active_quotation_v1';
  const catalog=window.VensisCatalog||{models:[]};
  const byId=id=>document.getElementById(id);
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const clampDiscount=value=>Math.min(100,Math.max(0,number(value)));
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(number(value));
  const money=value=>`€${fmt(value,2)}`;
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const point=value=>`${fmt(value?.q)} m³/h @ ${fmt(value?.p)} Pa`;

  function readQuotation(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
  }
  function modelFor(item){
    if(item?.mode==='custom')return null;
    const direct=catalog.getModel?.(item?.productKey);
    if(direct)return direct;
    return (catalog.models||[]).find(model=>String(model.model||'')===String(item?.model||''))||null;
  }
  function netUnit(item){
    return number(item.price)*(1-clampDiscount(item.discountPercent)/100);
  }
  function productMarkup(item){
    const image=item.image?`<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.model||'Product')}" onerror="this.style.display='none'">`:'';
    const description=String(item.description||'').trim();
    return `<div class="product">${image}<div><strong>${escapeHtml(item.model||'-')}</strong><span>${escapeHtml(item.series||'')}</span><small>${escapeHtml(item.manufacturer||'Vitlo')}</small>${description?`<em class="product-description">${escapeHtml(description)}</em>`:''}</div></div>`;
  }
  function technicalDetailsMarkup(item,model){
    const resolved=window.VensisTechnicalDetails?.forItem?.(item,model,catalog);
    if(resolved){
      const details=(resolved.details||[]).map(detail=>`<div class="technical-detail"><span>${escapeHtml(detail.label)}</span><b>${escapeHtml(detail.value)}</b></div>`).join('');
      return `<div class="technical-details"><em>${escapeHtml(resolved.typeLabel||'Technical Details')}</em>${details||'<span class="technical-empty">No technical details entered.</span>'}</div>`;
    }
    const fallback=[];
    if(item.mode==='selection')fallback.push(['Selected Point',point(item.selected||{})]);
    else if(number(item.nominalAirflow)>0)fallback.push(['Airflow',`${fmt(item.nominalAirflow)} m³/h`]);
    const voltage=String(item.voltage||model?.motor?.voltage||'').trim();
    const frequency=String(item.frequency||model?.motor?.frequency||'').trim();
    if(voltage||frequency)fallback.push(['Supply',voltage&&frequency?`${voltage} – ${frequency}`:voltage||frequency]);
    const power=number(item.motorPower)||number(model?.motor?.power);
    const speed=number(item.speed)||number(model?.motor?.speed);
    if(power>0)fallback.push(['Motor Power',`${fmt(power,2)} kW`]);
    if(speed>0)fallback.push(['Speed',`${fmt(speed)} rpm`]);
    return `<div class="technical-details">${fallback.map(([label,value])=>`<div class="technical-detail"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')||'-'}</div>`;
  }
  function row(item){
    const model=modelFor(item);
    const qty=Math.max(1,number(item.quantity)||1);
    const net=netUnit(item);
    const total=net*qty;
    const hasPrice=number(item.price)>0;
    return `<tr><td>${productMarkup(item)}</td><td>${technicalDetailsMarkup(item,model)}</td><td class="num unit-price">${hasPrice?money(net):'-'}</td><td class="num">${fmt(qty)}</td><td class="num"><b>${hasPrice?money(total):'-'}</b></td></tr>`;
  }
  function totals(items){
    return items.reduce((sum,item)=>{
      const qty=Math.max(1,number(item.quantity)||1);
      sum.units+=qty;
      if(number(item.price)>0){sum.hasPrice=true;sum.total+=netUnit(item)*qty}
      return sum;
    },{units:0,total:0,hasPrice:false});
  }
  function setAll(selector,value){
    document.querySelectorAll(selector).forEach(node=>{node.textContent=value});
  }
  function ensureContactRow(){
    if(byId('quoteContact'))return;
    const reference=byId('quoteReference');
    const row=reference?.closest('.meta-row');
    if(!row)return;
    const contactRow=document.createElement('div');
    contactRow.className='meta-row';
    contactRow.innerHTML='<span>Contact Person / İlgili</span><b id="quoteContact">-</b>';
    row.insertAdjacentElement('afterend',contactRow);
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
    if(quotation?.settings)return quotation.settings;
    return window.VensisQuotationSettings?.read?.()||window.VensisQuotationSettings?.defaults||{};
  }
  function renderSettings(settings){
    const pages=[...document.querySelectorAll('.quote-page')];
    const summary=settings.summary||{};
    const scope=settings.scope||{};
    const terms=settings.terms||{};

    const cards=pages[0]?.querySelectorAll('.term-card b')||[];
    const deliveryTime=summary.deliveryTime===undefined
      ? window.VensisQuotationSettings?.defaults?.summary?.deliveryTime
      : summary.deliveryTime;
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
  function render(){
    const quotation=readQuotation();
    const empty=byId('quotationEmpty');
    const content=byId('quotationContent');
    if(!quotation||!Array.isArray(quotation.items)||!quotation.items.length){
      empty.hidden=false;
      content.hidden=true;
      return;
    }
    empty.hidden=true;
    content.hidden=false;
    ensureContactRow();
    const created=new Date(quotation.createdAt||Date.now());
    const total=totals(quotation.items);
    const quotationNumber=quotation.quotationNumber||'-';
    byId('quoteProject').textContent=quotation.project?.name||'-';
    byId('quoteReference').textContent=quotation.project?.reference||'-';
    byId('quoteContact').textContent=quotation.project?.contact||'-';
    byId('quoteNumber').textContent=quotationNumber;
    setAll('[data-quote-number]',quotationNumber);
    byId('quoteDate').textContent=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}).format(created);
    byId('quoteCurrency').textContent=quotation.currency||'EUR';
    byId('quotationRows').innerHTML=quotation.items.map(row).join('');
    byId('quoteUnits').textContent=fmt(total.units);
    byId('quoteTotal').textContent=total.hasPrice?money(total.total):'-';
    renderSettings(settingsFor(quotation));
    const back=document.querySelector('.toolbar .back');
    if(back&&quotation.project?.id)back.href=`project.html?project=${encodeURIComponent(quotation.project.id)}`;
    document.title=`${quotation.quotationNumber||'Vensis'} Quotation`;
  }
  byId('printQuotation')?.addEventListener('click',()=>window.print());
  render();
})();

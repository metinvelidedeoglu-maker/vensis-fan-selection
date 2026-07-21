(function(){
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
    const direct=catalog.getModel?.(item?.productKey);
    if(direct)return direct;
    return (catalog.models||[]).find(model=>String(model.model||'')===String(item?.model||''))||null;
  }
  function netUnit(item){
    return number(item.price)*(1-clampDiscount(item.discountPercent)/100);
  }
  function dutyMarkup(item){
    if(item.mode==='catalog'){
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
    return `<div class="product">${image}<div><strong>${escapeHtml(item.model||'-')}</strong><span>${escapeHtml(item.series||'')}</span><small>${escapeHtml(item.manufacturer||'Vitlo')}</small></div></div>`;
  }
  function row(item){
    const model=modelFor(item);
    const qty=Math.max(1,number(item.quantity)||1);
    const net=netUnit(item);
    const total=net*qty;
    const power=number(item.motorPower)||number(model?.motor?.power);
    const speed=number(item.speed)||number(model?.motor?.speed);
    const hasPrice=number(item.price)>0;
    return `<tr><td>${productMarkup(item)}</td><td>${dutyMarkup(item)}</td><td>${supplyMarkup(item,model)}</td><td class="num technical">${power>0?`${fmt(power,2)} kW`:'-'}</td><td class="num technical">${speed>0?`${fmt(speed)} rpm`:'-'}</td><td class="num unit-price">${hasPrice?money(net):'-'}</td><td class="num">${fmt(qty)}</td><td class="num"><b>${hasPrice?money(total):'-'}</b></td></tr>`;
  }
  function totals(items){
    return items.reduce((sum,item)=>{
      const qty=Math.max(1,number(item.quantity)||1);
      sum.units+=qty;
      if(number(item.price)>0){sum.hasPrice=true;sum.total+=netUnit(item)*qty}
      return sum;
    },{units:0,total:0,hasPrice:false});
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
    const created=new Date(quotation.createdAt||Date.now());
    const total=totals(quotation.items);
    byId('quoteProject').textContent=quotation.project?.name||'-';
    byId('quoteReference').textContent=quotation.project?.reference||'-';
    byId('quoteNumber').textContent=quotation.quotationNumber||'-';
    byId('quoteDate').textContent=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}).format(created);
    byId('quoteCurrency').textContent=quotation.currency||'EUR';
    byId('quotationRows').innerHTML=quotation.items.map(row).join('');
    byId('quoteUnits').textContent=fmt(total.units);
    byId('quoteTotal').textContent=total.hasPrice?money(total.total):'-';
    document.title=`${quotation.quotationNumber||'Vensis'} Quotation`;
  }
  byId('printQuotation')?.addEventListener('click',()=>window.print());
  render();
})();
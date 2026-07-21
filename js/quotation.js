(function(){
  const KEY='vensis_active_quotation_v1';
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
  function netUnit(item){
    return number(item.price)*(1-clampDiscount(item.discountPercent)/100);
  }
  function dutyMarkup(item){
    if(item.mode==='catalog'){
      const nominal=number(item.nominalAirflow);
      return nominal>0?`<div class="duty"><b>${fmt(nominal)} m³/h nominal</b><small>Catalog item</small></div>`:'-';
    }
    const selected=item.selected||{};
    const required=item.required||{};
    return `<div class="duty"><b>${point(selected)}</b><small>Required: ${point(required)}</small></div>`;
  }
  function productMarkup(item){
    const image=item.image?`<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.model||'Product')}" onerror="this.style.display='none'">`:'';
    return `<div class="product">${image}<div><strong>${escapeHtml(item.model||'-')}</strong><span>${escapeHtml(item.series||'')}</span><small>${escapeHtml(item.manufacturer||'Vitlo')}</small></div></div>`;
  }
  function row(item){
    const qty=Math.max(1,number(item.quantity)||1);
    const unit=number(item.price);
    const discount=clampDiscount(item.discountPercent);
    const net=netUnit(item);
    const total=net*qty;
    return `<tr><td>${productMarkup(item)}</td><td>${dutyMarkup(item)}</td><td class="num">${unit>0?money(unit):'-'}</td><td class="num discount">${fmt(discount,discount%1?1:0)}%</td><td class="num">${unit>0?money(net):'-'}</td><td class="num">${fmt(qty)}</td><td class="num"><b>${unit>0?money(total):'-'}</b></td></tr>`;
  }
  function totals(items){
    return items.reduce((sum,item)=>{
      const qty=Math.max(1,number(item.quantity)||1);
      const price=number(item.price);
      if(price>0){
        sum.hasPrice=true;
        sum.subtotal+=price*qty;
        sum.net+=netUnit(item)*qty;
      }
      return sum;
    },{subtotal:0,net:0,hasPrice:false});
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
    const discountAmount=Math.max(0,total.subtotal-total.net);
    byId('quoteProject').textContent=quotation.project?.name||'-';
    byId('quoteReference').textContent=quotation.project?.reference||'-';
    byId('quoteNumber').textContent=quotation.quotationNumber||'-';
    byId('quoteDate').textContent=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}).format(created);
    byId('quoteCurrency').textContent=quotation.currency||'EUR';
    byId('quotationRows').innerHTML=quotation.items.map(row).join('');
    byId('quoteSubtotal').textContent=total.hasPrice?money(total.subtotal):'-';
    byId('quoteDiscount').textContent=total.hasPrice?`− ${money(discountAmount)}`:'-';
    byId('quoteTotal').textContent=total.hasPrice?money(total.net):'-';
    document.title=`${quotation.quotationNumber||'Vensis'} Quotation`;
  }
  byId('printQuotation')?.addEventListener('click',()=>window.print());
  render();
})();
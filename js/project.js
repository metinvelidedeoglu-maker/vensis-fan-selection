(function(){
  const KEY='vensis_project_items_v1';
  const META_KEY='vensis_project_meta_v1';
  const QUOTATION_KEY='vensis_active_quotation_v1';
  const catalog=window.VensisCatalog||{models:[]};
  const byId=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(number(value));
  const money=(value,showZero=false)=>{const n=number(value);return n>0||showZero?`€${fmt(n,2)}`:'-'};
  const point=value=>`${fmt(value?.q)} m³/h @ ${fmt(value?.p)} Pa`;
  const clampDiscount=value=>Math.min(100,Math.max(0,number(value)));

  function modelForItem(item){
    const direct=catalog.getModel?.(item?.productKey);
    if(direct)return direct;
    return (catalog.models||[]).find(model=>String(model.model||'')===String(item?.model||''))||null;
  }
  function enrichItems(items){
    let changed=false;
    items.forEach(item=>{
      const model=modelForItem(item);
      const speed=number(item.speed)||number(model?.motor?.speed);
      const voltage=String(item.voltage||model?.motor?.voltage||'').trim();
      const noise=number(item.noise)||number(model?.motor?.sound);
      if(!number(item.speed)&&speed>0){item.speed=speed;changed=true}
      if(!String(item.voltage||'').trim()&&voltage){item.voltage=voltage;changed=true}
      if(!number(item.noise)&&noise>0){item.noise=noise;changed=true}
    });
    return changed;
  }
  function readItems(){
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||'[]');
      const items=Array.isArray(value)?value:[];
      if(enrichItems(items))localStorage.setItem(KEY,JSON.stringify(items));
      return items;
    }catch{return []}
  }
  function writeItems(items){
    localStorage.setItem(KEY,JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('vensis-project-updated'));
  }
  function readMeta(){
    try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')||{}}catch{return {}}
  }
  function writeMeta(globalDiscount){
    const current=readMeta();
    localStorage.setItem(META_KEY,JSON.stringify({
      name:byId('projectName')?.value.trim()||'',
      reference:byId('projectReference')?.value.trim()||'',
      globalDiscount:globalDiscount==null?clampDiscount(current.globalDiscount):clampDiscount(globalDiscount)
    }));
  }
  function netUnitPrice(item){
    const price=number(item.price);
    return price*(1-clampDiscount(item.discountPercent)/100);
  }
  function totals(items){
    return items.reduce((sum,item)=>{
      const qty=Math.max(1,number(item.quantity)||1);
      const price=number(item.price);
      const hasPrice=price>0;
      sum.units+=qty;
      if(hasPrice){
        sum.hasPrice=true;
        sum.listSubtotal+=price*qty;
        sum.netTotal+=netUnitPrice(item)*qty;
      }
      return sum;
    },{units:0,listSubtotal:0,netTotal:0,hasPrice:false});
  }
  function quantityControl(index,quantity){
    return `<div class="qty-control"><button type="button" data-qty-minus="${index}" aria-label="Decrease quantity">−</button><b>${quantity}</b><button type="button" data-qty-plus="${index}" aria-label="Increase quantity">+</button></div>`;
  }
  function discountControl(index,rate){
    return `<label class="line-discount"><input type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${rate}" data-line-discount="${index}" aria-label="Product discount percentage"><span>%</span></label>`;
  }
  function pointCells(item){
    if(item.mode==='catalog'){
      const nominal=number(item.nominalAirflow);
      return `<td><span class="point" style="background:#eef3f4;color:#52666b">Catalog Item</span></td><td>${nominal>0?`<span class="point selected">${fmt(nominal)} m³/h nominal</span>`:'-'}</td>`;
    }
    return `<td><span class="point required">${point(item.required)}</span></td><td><span class="point selected">${point(item.selected)}</span></td>`;
  }
  function row(item,index){
    const qty=Math.max(1,number(item.quantity)||1);
    const price=number(item.price);
    const hasPrice=price>0;
    const rate=clampDiscount(item.discountPercent);
    const netUnit=netUnitPrice(item);
    const lineTotal=netUnit*qty;
    const voltage=String(item.voltage||'').trim();
    const image=item.image?`<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.model||'Fan')}" onerror="this.style.display='none'">`:'';
    return `<tr>
      <td><div class="product-cell">${image}<div><strong>${escapeHtml(item.model||'-')}</strong><span>${escapeHtml(item.series||'')}</span><small>${escapeHtml(item.manufacturer||'Vitlo')}</small></div></div></td>
      ${pointCells(item)}
      <td>${number(item.motorPower)>0?`${fmt(item.motorPower,2)} kW`:'-'}</td>
      <td>${number(item.current)>0?`${fmt(item.current,2)} A`:'-'}</td>
      <td>${number(item.speed)>0?`${fmt(item.speed)} rpm`:'-'}</td>
      <td>${voltage?escapeHtml(voltage):'-'}</td>
      <td>${number(item.noise)>0?`${fmt(item.noise)} dB(A)`:'-'}</td>
      <td>${money(price)}</td>
      <td>${discountControl(index,rate)}</td>
      <td><b>${hasPrice?money(netUnit,true):'-'}</b></td>
      <td>${quantityControl(index,qty)}</td>
      <td><b>${hasPrice?money(lineTotal,true):'-'}</b></td>
      <td><button type="button" class="remove-btn" data-remove="${index}" title="Remove from project" aria-label="Remove from project">×</button></td>
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
    byId('sumUnits').textContent=fmt(summary.units);
    byId('sumPrice').textContent=summary.hasPrice?money(summary.netTotal,true):'-';
    if(!items.length){
      empty.hidden=false;
      content.hidden=true;
      return;
    }
    empty.hidden=true;
    content.hidden=false;
    table.querySelector('tbody').innerHTML=items.map(row).join('');
  }
  function changeQuantity(index,delta){
    const items=readItems();
    const item=items[index];
    if(!item)return;
    item.quantity=Math.max(1,(number(item.quantity)||1)+delta);
    item.updatedAt=new Date().toISOString();
    writeItems(items);
    render();
  }
  function changeLineDiscount(index,value){
    const items=readItems();
    const item=items[index];
    if(!item)return;
    item.discountPercent=clampDiscount(value);
    item.updatedAt=new Date().toISOString();
    writeItems(items);
    render();
  }
  function applyGlobalDiscount(){
    const input=byId('globalDiscount');
    const rate=clampDiscount(input?.value);
    if(input)input.value=String(rate);
    const items=readItems();
    items.forEach(item=>{item.discountPercent=rate;item.updatedAt=new Date().toISOString()});
    writeItems(items);
    writeMeta(rate);
    const status=byId('discountStatus');
    if(status)status.textContent=`${fmt(rate,rate%1?1:0)}% applied to every product.`;
    render();
  }
  function quoteNumber(date){
    const pad=value=>String(value).padStart(2,'0');
    return `VNS-${String(date.getFullYear()).slice(-2)}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }
  function convertToQuotation(){
    const items=readItems();
    if(!items.length){alert('Add at least one product before creating a quotation.');return}
    writeMeta();
    const meta=readMeta();
    const now=new Date();
    const snapshot={
      version:1,
      quotationNumber:quoteNumber(now),
      createdAt:now.toISOString(),
      currency:'EUR',
      project:{name:meta.name||'',reference:meta.reference||''},
      globalDiscount:clampDiscount(meta.globalDiscount),
      items:JSON.parse(JSON.stringify(items)),
      totals:totals(items)
    };
    localStorage.setItem(QUOTATION_KEY,JSON.stringify(snapshot));
    window.open('quotation.html','_blank');
  }
  function remove(index){
    const items=readItems();
    if(!items[index])return;
    items.splice(index,1);
    writeItems(items);
    render();
  }
  function clearProject(){
    const items=readItems();
    if(!items.length)return;
    if(!confirm('Remove all products from this project?'))return;
    writeItems([]);
    render();
  }
  function loadMeta(){
    const meta=readMeta();
    byId('projectName').value=meta.name||'';
    byId('projectReference').value=meta.reference||'';
    byId('globalDiscount').value=String(clampDiscount(meta.globalDiscount));
  }
  document.addEventListener('click',event=>{
    const plus=event.target.closest('[data-qty-plus]');
    const minus=event.target.closest('[data-qty-minus]');
    const removeButton=event.target.closest('[data-remove]');
    if(plus)changeQuantity(Number(plus.dataset.qtyPlus),1);
    if(minus)changeQuantity(Number(minus.dataset.qtyMinus),-1);
    if(removeButton)remove(Number(removeButton.dataset.remove));
  });
  document.addEventListener('change',event=>{
    const discount=event.target.closest('[data-line-discount]');
    if(discount)changeLineDiscount(Number(discount.dataset.lineDiscount),discount.value);
  });
  byId('applyGlobalDiscount')?.addEventListener('click',applyGlobalDiscount);
  byId('convertQuotation')?.addEventListener('click',convertToQuotation);
  byId('clearProject')?.addEventListener('click',clearProject);
  byId('printProject')?.addEventListener('click',()=>window.print());
  byId('projectName')?.addEventListener('input',()=>writeMeta());
  byId('projectReference')?.addEventListener('input',()=>writeMeta());
  window.addEventListener('storage',event=>{if(event.key===KEY)render()});
  window.VensisQuotation={convert:convertToQuotation,key:QUOTATION_KEY};
  loadMeta();
  render();
})();
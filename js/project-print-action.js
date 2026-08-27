(function(){
  const PRINT_KEY=window.VensisAccess?.storageKey?.('vensis_project_print_snapshot_v1')||'vensis_project_print_snapshot_v1';
  const store=window.VensisProjects;
  const formats=window.VensisQuotationFormats||{itemType:item=>item?.productType==='electrical'?'electrical':'fan'};
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const clampDiscount=value=>Math.min(100,Math.max(0,num(value)));

  function projectId(){return window.VensisProject?.projectId||store?.activeId?.()||''}
  function language(){
    const active=window.VensisI18n?.getLanguage?.()||'';
    if(active==='tr'||active==='en')return active;
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  }
  function labels(){
    if(language()==='tr')return {
      fanGroup:'Havalandırma Ürünleri',electricalGroup:'Elektrik Ürünleri',
      fan:['Ürün','Not','İstenen Debi / Basınç','Seçilen Debi / Basınç','Voltaj','Güç','Devir','Birim Fiyat','İskonto','Net Birim Fiyat','Adet','Toplam','İşlemler'],
      electrical:['Ürün','Not','Güç','Lümen','Voltaj','IP Sınıfı','Birim Fiyat','İskonto','Net Birim Fiyat','Adet','Toplam','İşlemler']
    };
    return {
      fanGroup:'Ventilation Products',electricalGroup:'Electrical Products',
      fan:['Product','Note','Required Airflow / Pressure','Selected Airflow / Pressure','Voltage','Power','Speed','Unit Price','Discount','Net Unit Price','Quantity','Total','Actions'],
      electrical:['Product','Note','Power','Lumen','Voltage','IP Rating','Unit Price','Discount','Net Unit Price','Quantity','Total','Actions']
    };
  }
  function fmt(value,digits=0){return new Intl.NumberFormat(language()==='tr'?'tr-TR':'en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value))}
  function money(value){return `€${fmt(value,2)}`}
  function itemType(item){return formats.itemType?.(item)==='electrical'?'electrical':'fan'}
  function netUnit(item){return num(item.price)*(1-clampDiscount(item.discountPercent)/100)}
  function input(index,field,value,options={}){
    const type=options.type||'text';
    const attrs=type==='number'?` min="${options.min??0}"${options.max!=null?` max="${options.max}"`:''} step="${options.step||'any'}" inputmode="decimal"`:'';
    return `<label class="project-inline-input${options.compact?' compact':''}"><input type="${type}"${attrs} value="${esc(value??'')}" data-project-inline="${index}" data-project-field="${esc(field)}" aria-label="${esc(options.label||field)}">${options.unit?`<span>${esc(options.unit)}</span>`:''}</label>`;
  }
  function pointEditor(index,field,value){
    const rawQ=value&&Number.isFinite(Number(value.q))?Number(value.q):null;
    const q=rawQ==null?'':field==='selected'?Math.round(rawQ):rawQ;
    const p=value&&Number.isFinite(Number(value.p))?value.p:'';
    return `<div class="project-point-editor">${input(index,`${field}.q`,q,{type:'number',min:0,step:1,unit:'m³/h',label:`${field} airflow`})}${input(index,`${field}.p`,p,{type:'number',min:0,step:1,unit:'Pa',label:`${field} pressure`})}</div>`;
  }
  function productMarkup(item){
    const image=item.image?`<img src="${esc(item.image)}" alt="${esc(item.model||'Product')}">`:'';
    const safety=String(item.safetyWarning||'').trim();
    return `<div class="project-cell-product">${image}<div><strong>${esc(item.model||'-')}</strong><span>${esc(item.series||'')}</span><small>${esc(item.manufacturer||'Vitlo')}</small>${safety?`<em>${esc(safety)}</em>`:''}</div></div>`;
  }
  function noteEditor(item,index){
    const stableKey=String(item.itemKey||`index-${index}`);
    return `<textarea class="project-inline-note" rows="3" data-product-note="${esc(stableKey)}" data-product-index="${index}" placeholder="${language()==='tr'?'Ürün notu':'Product note'}">${esc(item.description||'')}</textarea>`;
  }
  function priceDisplay(item){return num(item.price)>0?`<span class="project-list-price">${money(item.price)}</span>`:'-'}
  function discountEditor(index,item){return input(index,'discountPercent',clampDiscount(item.discountPercent),{type:'number',min:0,max:100,step:'0.1',unit:'%',label:'Discount',compact:true})}
  function netPriceEditor(index,item){
    const price=num(item.price);if(price<=0)return '-';
    return `<label class="project-inline-input compact project-net-price"><input type="number" min="0" max="${price}" step="0.01" inputmode="decimal" value="${netUnit(item).toFixed(2)}" data-project-net-unit="${index}" data-list-price="${price}" aria-label="Net unit price"><span>€</span></label>`;
  }
  function quantityEditor(index,item){return input(index,'quantity',Math.max(1,Math.round(num(item.quantity)||1)),{type:'number',min:1,step:1,label:'Quantity',compact:true})}
  function actions(index){return `<button type="button" class="project-inline-remove" data-remove="${index}" title="Remove" aria-label="Remove">×</button>`}
  function fanRow(item,index){
    const net=netUnit(item);const qty=Math.max(1,Math.round(num(item.quantity)||1));const hasPrice=num(item.price)>0;
    return `<tr data-project-edit-row="${index}" data-project-kind="fan"><td>${productMarkup(item)}</td><td>${noteEditor(item,index)}</td><td>${pointEditor(index,'required',item.required)}</td><td>${pointEditor(index,'selected',item.selected)}</td><td>${input(index,'voltage',item.voltage||'',{label:'Voltage'})}</td><td>${input(index,'motorPower',num(item.motorPower)||'',{type:'number',min:0,step:'0.01',unit:'kW',label:'Power'})}</td><td>${input(index,'speed',num(item.speed)||'',{type:'number',min:0,step:1,unit:'rpm',label:'Speed'})}</td><td>${priceDisplay(item)}</td><td>${discountEditor(index,item)}</td><td>${netPriceEditor(index,item)}</td><td>${quantityEditor(index,item)}</td><td class="project-derived"><b>${hasPrice?money(net*qty):'-'}</b></td><td class="project-inline-actions">${actions(index)}</td></tr>`;
  }
  function electricalRow(item,index){
    const net=netUnit(item);const qty=Math.max(1,Math.round(num(item.quantity)||1));const hasPrice=num(item.price)>0;
    return `<tr data-project-edit-row="${index}" data-project-kind="electrical"><td>${productMarkup(item)}</td><td>${noteEditor(item,index)}</td><td>${input(index,'power',item.power||'',{label:'Power'})}</td><td>${input(index,'lumen',item.lumen||'',{label:'Lumen'})}</td><td>${input(index,'voltage',item.voltage||'',{label:'Voltage'})}</td><td>${input(index,'ip',item.ip||'',{label:'IP rating'})}</td><td>${priceDisplay(item)}</td><td>${discountEditor(index,item)}</td><td>${netPriceEditor(index,item)}</td><td>${quantityEditor(index,item)}</td><td class="project-derived"><b>${hasPrice?money(net*qty):'-'}</b></td><td class="project-inline-actions">${actions(index)}</td></tr>`;
  }
  function groupMarkup(type,entries){
    if(!entries.length)return '';
    const text=labels();const headers=type==='electrical'?text.electrical:text.fan;const title=type==='electrical'?text.electricalGroup:text.fanGroup;
    const rows=entries.map(({item,index})=>type==='electrical'?electricalRow(item,index):fanRow(item,index)).join('');
    return `<section class="project-edit-group project-edit-${type}"><h2>${esc(title)}</h2><div class="project-edit-scroll"><table class="project-edit-table"><thead><tr>${headers.map(header=>`<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }
  function ensureStyles(){
    if(document.getElementById('projectEditableTableStyles'))return;
    const style=document.createElement('style');style.id='projectEditableTableStyles';style.textContent=`
      #projectContent.table-card{overflow:visible;background:transparent;border:0}.project-edit-root{display:grid;gap:14px}.project-edit-group{background:#fff;border:1px solid #d8e3e5;border-radius:14px;overflow:hidden}.project-edit-group>h2{margin:0;padding:12px 14px;background:#edf6f1;color:#087f4f;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.project-edit-scroll{overflow:auto}.project-edit-table{width:100%;border-collapse:collapse;min-width:1740px}.project-edit-electrical .project-edit-table{min-width:1510px}.project-edit-table th{padding:10px 8px;background:#f7faf9;color:#52666b;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:.025em;white-space:nowrap}.project-edit-table td{padding:9px 8px;border-top:1px solid #e3eaeb;font-size:11px;vertical-align:middle}.project-cell-product{display:flex;align-items:center;gap:9px;min-width:245px}.project-cell-product img{width:52px;height:52px;object-fit:contain;border:1px solid #e2e9e5;border-radius:7px;padding:3px;background:#fff;flex:0 0 52px}.project-cell-product strong,.project-cell-product span,.project-cell-product small{display:block}.project-cell-product strong{font-size:12px}.project-cell-product span{margin-top:2px;color:#52666b}.project-cell-product small{margin-top:3px;color:#087f4f;font-weight:800}.project-cell-product em{display:block;margin-top:3px;color:#9a3412;font-size:9px;font-style:normal;font-weight:750;line-height:1.25}.project-inline-note{width:210px;min-height:58px;border:1px solid #cfdadc;border-radius:7px;padding:7px 8px;background:#fbfdfd;color:#29484d;font:600 10.5px/1.35 Arial,Helvetica,sans-serif;resize:vertical}.project-inline-input{display:flex;align-items:center;border:1px solid #cfdadc;border-radius:7px;background:#fff;overflow:hidden;min-width:112px}.project-inline-input input{width:100%;min-width:0;border:0;outline:0;padding:8px 7px;color:#173033;background:#fff;font:700 11px Arial,Helvetica,sans-serif}.project-inline-input span{padding:0 7px 0 2px;color:#64748b;font-size:9px;font-weight:800;white-space:nowrap}.project-inline-input.compact{min-width:92px}.project-net-price{border-color:#86b9a2;background:#f7fcf9}.project-net-price input{background:#f7fcf9}.project-list-price{display:inline-block;min-width:82px;padding:8px 9px;border-radius:7px;background:#f1f4f4;color:#52666b;font-weight:850;white-space:nowrap}.project-point-editor{display:grid;gap:5px;min-width:150px}.project-point-editor .project-inline-input{min-width:145px}.project-derived{white-space:nowrap;color:#173033}.project-inline-actions{text-align:center}.project-inline-remove{width:32px;height:32px;border:0;border-radius:7px;background:#fff0ef;color:#b8322c;font-size:20px;font-weight:800;cursor:pointer}.project-edit-fan th:nth-child(1){min-width:250px}.project-edit-fan th:nth-child(2){min-width:225px}.project-edit-electrical th:nth-child(1){min-width:250px}.project-edit-electrical th:nth-child(2){min-width:225px}@media(max-width:900px){.project-edit-table,.project-edit-electrical .project-edit-table{min-width:1450px}}
    `;document.head.appendChild(style);
  }
  function migrateElectricalItems(items){
    let changed=false;
    items.forEach(item=>{
      if(itemType(item)!=='electrical'||item.mode!=='catalog')return;
      const description=String(item.description||'').trim();
      const series=String(item.series||'').trim();
      const seriesLooksLikeCode=/^[A-Z0-9][A-Z0-9._/-]*$/i.test(series);
      if(description&&seriesLooksLikeCode){
        item.series=description;
        item.description='';
        item.updatedAt=new Date().toISOString();
        changed=true;
      }
    });
    return changed;
  }
  function renderProjectTables(){
    const wrap=document.querySelector('#projectContent .table-wrap');const id=projectId();if(!wrap||!store||!id)return;
    ensureStyles();const items=store.readItems(id);
    if(migrateElectricalItems(items)){store.writeItems(items,id);return}
    const fan=[],electrical=[];
    items.forEach((item,index)=>(itemType(item)==='electrical'?electrical:fan).push({item,index}));
    wrap.innerHTML=`<div class="project-edit-root">${groupMarkup('fan',fan)}${groupMarkup('electrical',electrical)}</div>`;
  }
  function valueOf(row,field){return row.querySelector(`[data-project-field="${field}"]`)?.value??''}
  function pointFromRow(row,field){
    const qText=String(valueOf(row,`${field}.q`)).trim();const pText=String(valueOf(row,`${field}.p`)).trim();
    if(!qText&&!pText)return null;
    const q=Math.max(0,num(qText));
    return {q:field==='selected'?Math.round(q):q,p:Math.max(0,num(pText))};
  }
  function updateItemFromRow(item,row){
    if(!item||!row)return;
    const type=row.dataset.projectKind||itemType(item);
    const note=row.querySelector('[data-product-note]');if(note)item.description=String(note.value||'').trim();
    item.discountPercent=clampDiscount(valueOf(row,'discountPercent'));item.quantity=Math.max(1,Math.round(num(valueOf(row,'quantity'))||1));
    item.voltage=String(valueOf(row,'voltage')||'').trim();
    if(type==='electrical'){
      item.power=String(valueOf(row,'power')||'').trim();item.lumen=String(valueOf(row,'lumen')||'').trim();item.ip=String(valueOf(row,'ip')||'').trim();
    }else{
      item.required=pointFromRow(row,'required');item.selected=pointFromRow(row,'selected');
      item.motorPower=Math.max(0,num(valueOf(row,'motorPower')));item.speed=Math.max(0,num(valueOf(row,'speed')));
    }
    item.updatedAt=new Date().toISOString();
  }
  function commitRows(rows){
    const id=projectId();if(!id||!store)return;
    const items=store.readItems(id);let changed=false;
    rows.forEach(row=>{const index=Number(row.dataset.projectEditRow);if(Number.isInteger(index)&&items[index]){updateItemFromRow(items[index],row);changed=true}});
    if(!changed)return;
    store.writeItems(items,id);window.VensisProject?.render?.();renderProjectTables();
  }
  function syncNetDiscount(row){
    if(!row)return;
    const netControl=row.querySelector('[data-project-net-unit]');
    const discountControl=row.querySelector('[data-project-field="discountPercent"]');
    if(!netControl||!discountControl)return;
    const listPrice=Math.max(0,num(netControl.dataset.listPrice));
    if(listPrice<=0){discountControl.value='0';return}
    const requested=Math.min(listPrice,Math.max(0,num(netControl.value)));
    const rate=clampDiscount((1-requested/listPrice)*100);
    discountControl.value=String(Math.round(rate*1000)/1000);
  }
  function flushInlineEditors(){
    const rows=[...document.querySelectorAll('[data-project-edit-row]')];
    rows.forEach(row=>{if(row.querySelector('[data-project-net-unit]:focus'))syncNetDiscount(row)});
    commitRows(rows);
  }

  function technicalItem(item){
    return {
      itemKey:item.itemKey||'',mode:item.mode||'selection',productType:item.productType||'',productKey:item.productKey||'',model:item.model||'',series:item.series||'',manufacturer:item.manufacturer||'Vitlo',image:item.image||'',description:item.description||'',category:item.category||'',orderCode:item.orderCode||'',nominalAirflow:Number(item.nominalAirflow)||0,required:item.required||null,selected:item.selected||null,motorPower:Number(item.motorPower)||0,power:String(item.power||''),current:Number(item.current)||0,currentText:String(item.currentText||''),speed:Number(item.speed)||0,voltage:String(item.voltage||''),frequency:String(item.frequency||''),phase:String(item.phase||''),ip:String(item.ip||''),insulation:String(item.insulation||''),lumen:String(item.lumen||''),operatingTemperature:String(item.operatingTemperature||''),noise:Number(item.noise)||0,price:Math.max(0,Number(item.price)||0),discountPercent:clampDiscount(item.discountPercent),priceCurrency:String(item.priceCurrency||'EUR'),quantity:Math.max(1,Number(item.quantity)||1)
    };
  }
  function openProjectPrint(){
    flushInlineEditors();window.VensisProjectContact?.save?.();
    const id=projectId();const items=store?.readItems?.(id)||[];
    if(!Array.isArray(items)||!items.length){alert('Add at least one product before printing the project.');return}
    const savedMeta=store?.readMeta?.(id)||{};
    const meta={id:id||'',name:document.getElementById('projectName')?.value.trim()||savedMeta.name||'',reference:document.getElementById('projectReference')?.value.trim()||savedMeta.reference||'',contact:document.getElementById('projectContact')?.value.trim()||savedMeta.contact||''};
    localStorage.setItem(PRINT_KEY,JSON.stringify({version:7,createdAt:new Date().toISOString(),project:meta,items:items.map(technicalItem)}));
    window.open('project-print.html?print=1','_blank');
  }

  document.addEventListener('input',event=>{const net=event.target.closest('[data-project-net-unit]');if(net)syncNetDiscount(net.closest('[data-project-edit-row]'))});
  document.addEventListener('change',event=>{
    const net=event.target.closest('[data-project-net-unit]');
    if(net){const row=net.closest('[data-project-edit-row]');syncNetDiscount(row);if(row)commitRows([row]);return}
    const control=event.target.closest('[data-project-inline]');if(control){const row=control.closest('[data-project-edit-row]');if(row)commitRows([row])}
  });
  document.addEventListener('click',event=>{if(event.target.closest('#convertQuotation,#createOrder'))flushInlineEditors()},true);
  window.addEventListener('vensis-project-updated',renderProjectTables);
  window.addEventListener('vensis-project-cloud-applied',renderProjectTables);
  window.addEventListener('vensis-language-changed',renderProjectTables);
  window.addEventListener('storage',event=>{const id=projectId();if(!event.key||event.key===`${store?.keys?.itemsPrefix||''}${id}`)renderProjectTables()});

  const current=document.getElementById('printProject');
  if(current){const replacement=current.cloneNode(true);current.replaceWith(replacement);replacement.addEventListener('click',openProjectPrint)}
  window.VensisProjectPrint={open:openProjectPrint,key:PRINT_KEY,flushInlineEditors};
  renderProjectTables();
})();
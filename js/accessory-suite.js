(function(){
  'use strict';

  const BUILD='20260908-empty-image-r1';
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const core=window.VensisAccessoryCore;
  if(!core)return;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value));
  const isAccessory=core.isAccessory;

  function storageKey(key){
    if(window.VensisAccess?.storageKey)return window.VensisAccess.storageKey(key);
    try{return localStorage.getItem('vensis_access_mode_v1')==='guest'?String(key).replace(/^vensis_/,'vensis_guest_'):key}catch{return key}
  }
  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  function itemType(item){return window.VensisQuotationFormats?.itemType?.(item)==='electrical'?'electrical':'fan'}

  let fullPrintSnapshot=null;
  let printSnapshotKey='';
  if(page==='project-print.html'){
    printSnapshotKey=storageKey('vensis_project_print_snapshot_v1');
    const snapshot=readJson(printSnapshotKey);
    if(snapshot&&Array.isArray(snapshot.items)&&snapshot.items.some(isAccessory)){
      fullPrintSnapshot=snapshot;
      window.__VENSIS_ACCESSORY_PRINT_FULL__=snapshot;
      writeJson(printSnapshotKey,{...snapshot,items:core.technicalItems(snapshot.items)});
      window.addEventListener('beforeunload',()=>{if(fullPrintSnapshot)writeJson(printSnapshotKey,fullPrintSnapshot)});
    }
  }

  function ensureStyles(){
    if(document.getElementById('vensisAccessorySuiteStyles'))return;
    const style=document.createElement('style');
    style.id='vensisAccessorySuiteStyles';
    style.textContent=`
      .vensis-add-accessory{display:inline-flex;align-items:center;margin-top:7px;border:1px solid #9dcab5;border-radius:7px;padding:6px 8px;background:#f4fbf7;color:#087f4f;font:850 10px/1 Arial,Helvetica,sans-serif;cursor:pointer;white-space:nowrap}
      .vensis-add-accessory:hover{background:#e8f6ef;border-color:#68ad8c}
      .vensis-accessory-row{background:#fbfdfc}.vensis-accessory-row>td{border-top:1px dashed #c9d9d4!important}.vensis-accessory-row [data-project-reorder-cell],.vensis-accessory-row .project-reorder-controls{visibility:hidden!important}
      .vensis-accessory-project-cell{padding-left:20px!important;white-space:normal!important}.vensis-accessory-project{display:flex;align-items:center;min-width:310px}
      .vensis-accessory-project strong,.vensis-accessory-project span,.vensis-accessory-project small{display:block}.vensis-accessory-project strong{font-size:11.5px}.vensis-accessory-project span{margin-top:2px;color:#52666b}.vensis-accessory-project small{margin-top:3px;color:#087f4f;font-weight:800}.vensis-accessory-badge{display:inline-flex!important;width:max-content;margin-bottom:4px;padding:3px 6px;border-radius:999px;background:#e8f6ef;color:#087f4f!important;font-size:8px!important;font-weight:900!important;text-transform:uppercase;letter-spacing:.04em}
      .quote-table tr.vensis-accessory-quote-row td{background:#fbfdfc;border-top:1px dashed #c9d9d4}.vensis-accessory-quote{display:flex;align-items:flex-start;gap:7px;padding-left:12px;white-space:normal}.vensis-accessory-quote b,.vensis-accessory-quote span,.vensis-accessory-quote small{display:block}.vensis-accessory-quote b{font-size:9.5px}.vensis-accessory-quote span{margin-top:2px;color:#52666b;font-size:8px}.vensis-accessory-quote small{margin-top:2px;color:#087f4f;font-size:7.5px;font-weight:800}.quote-item-editor.vensis-accessory-editor{border-left:3px solid #8bc4a8;background:#f7fcf9}
      .project-table tr.vensis-accessory-print-row td{background:#fbfdfc;border-top:1px dashed #c9d9d4}.vensis-accessory-print{display:flex;align-items:center;gap:6px;padding-left:8px}.vensis-accessory-print b,.vensis-accessory-print span,.vensis-accessory-print small{display:block}.vensis-accessory-print b{font-size:8.2px}.vensis-accessory-print span{margin-top:1px;color:#52666b;font-size:7.2px}.vensis-accessory-print small{margin-top:1px;color:#087f4f;font-size:6.8px;font-weight:800}
      @media print{.vensis-add-accessory{display:none!important}.quote-table tr.vensis-accessory-quote-row td,.project-table tr.vensis-accessory-print-row td{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `;
    document.head.appendChild(style);
  }

  function projectContext(){
    const store=window.VensisProjects;
    const projectId=window.VensisProject?.projectId||store?.activeId?.()||'';
    return {store,projectId};
  }

  function ensureParentKey(index){
    const {store,projectId}=projectContext();
    if(!store?.readItems||!store?.writeItems||!projectId)return '';
    const items=store.readItems(projectId);const item=items[index];
    if(!item||isAccessory(item))return '';
    if(String(item.itemKey||'').trim())return String(item.itemKey);
    item.itemKey=`fan|${Date.now()}|${index}|${Math.random().toString(36).slice(2,7)}`;
    item.updatedAt=new Date().toISOString();store.writeItems(items,projectId);return item.itemKey;
  }

  function accessoryProjectMarkup(item){
    return `<div class="vensis-accessory-project"><div><span class="vensis-accessory-badge">Aksesuar</span><strong>${esc(item.model||'Aksesuar')}</strong><span>${esc(item.series||'')}</span><small>${esc(item.manufacturer||'')}</small></div></div>`;
  }

  function simplifyAccessoryProjectRow(row,item){
    if(row.classList.contains('vensis-accessory-row'))return;
    const reorder=row.querySelector(':scope > td[data-project-reorder-cell]');
    const cells=[...row.children];const offset=reorder?1:0;const product=cells[offset];if(!product)return;
    product.classList.add('vensis-accessory-project-cell');product.colSpan=7;product.innerHTML=accessoryProjectMarkup(item);
    for(let logical=1;logical<=6;logical++){const cell=cells[offset+logical];if(cell&&cell!==product)cell.remove()}
    row.classList.add('vensis-accessory-row');row.dataset.projectKind='accessory';
  }

  function decorateProject(){
    const {store,projectId}=projectContext();if(!store?.readItems||!projectId)return;
    ensureStyles();const items=store.readItems(projectId);
    document.querySelectorAll('.project-edit-fan tbody tr[data-project-edit-row]').forEach(row=>{
      const index=Number(row.dataset.projectEditRow);const item=items[index];if(!item)return;
      if(isAccessory(item)){simplifyAccessoryProjectRow(row,item);return}
      if(itemType(item)==='electrical')return;
      const host=row.querySelector('.project-cell-product>div')||row.querySelector('.project-cell-product');
      if(host&&!host.querySelector('[data-vensis-add-accessory]')){
        const button=document.createElement('button');button.type='button';button.className='vensis-add-accessory';button.dataset.vensisAddAccessory=String(index);button.textContent='+ Aksesuar Ekle';host.appendChild(button);
      }
    });
    const parents=items.filter(item=>!isAccessory(item)&&itemType(item)!=='electrical');
    parents.forEach((item,position)=>{
      const index=items.indexOf(item);const row=document.querySelector(`.project-edit-fan tbody tr[data-project-edit-row="${index}"]`);if(!row)return;
      const up=row.querySelector('[data-project-reorder="-1"]');const down=row.querySelector('[data-project-reorder="1"]');if(up)up.disabled=position===0;if(down)down.disabled=position===parents.length-1;
    });
  }

  function moveFanBlock(row,direction){
    const {store,projectId}=projectContext();const index=Number(row?.dataset.projectEditRow);
    if(!store?.readItems||!store?.writeItems||!projectId||!Number.isInteger(index))return false;
    window.VensisProjectPrint?.flushInlineEditors?.();
    let items=store.readItems(projectId);let item=items[index];if(!item||isAccessory(item)||itemType(item)==='electrical')return false;
    const key=String(item.itemKey||'').trim()||ensureParentKey(index);items=store.readItems(projectId);item=items[index];if(!key||!item)return true;
    const next=core.reorderFanBlock(items,key,direction,itemType);if(JSON.stringify(next)===JSON.stringify(items))return true;
    const stamp=new Date().toISOString();next.forEach(current=>{if(current)current.updatedAt=stamp});store.writeItems(next,projectId);window.VensisProject?.render?.();scheduleProject();return true;
  }

  function removeParentWithAccessories(row){
    const {store,projectId}=projectContext();const index=Number(row?.dataset.projectEditRow);
    if(!store?.readItems||!store?.writeItems||!projectId||!Number.isInteger(index))return false;
    const items=store.readItems(projectId);const item=items[index];if(!item||isAccessory(item)||itemType(item)==='electrical')return false;
    const key=String(item.itemKey||'');const hasChildren=items.some(child=>isAccessory(child)&&String(child.parentItemKey||'')===key);if(!hasChildren)return false;
    const next=items.filter((current,currentIndex)=>currentIndex!==index&&!(isAccessory(current)&&String(current.parentItemKey||'')===key));
    store.writeItems(next,projectId);window.VensisProject?.render?.();scheduleProject();return true;
  }

  let projectQueued=false;
  function scheduleProject(){if(projectQueued)return;projectQueued=true;requestAnimationFrame(()=>{projectQueued=false;decorateProject()})}
  function startProject(){
    ensureStyles();scheduleProject();const root=document.getElementById('projectContent')||document.body;new MutationObserver(scheduleProject).observe(root,{childList:true,subtree:true});
    document.addEventListener('click',event=>{
      const add=event.target.closest('[data-vensis-add-accessory]');
      if(add){event.preventDefault();event.stopImmediatePropagation();const index=Number(add.dataset.vensisAddAccessory);const key=ensureParentKey(index);const {projectId}=projectContext();if(key&&projectId)location.href=`accessories.html?project=${encodeURIComponent(projectId)}&parent=${encodeURIComponent(key)}`;return}
      const remove=event.target.closest('[data-remove]');
      if(remove){const row=remove.closest('tr[data-project-edit-row]');if(removeParentWithAccessories(row)){event.preventDefault();event.stopImmediatePropagation();return}}
      const reorder=event.target.closest('[data-project-reorder]');if(!reorder)return;
      const row=reorder.closest('tr[data-project-edit-row]');const direction=Number(reorder.dataset.projectReorder);if(moveFanBlock(row,direction)){event.preventDefault();event.stopImmediatePropagation()}
    },true);
  }

  function quoteKey(){return storageKey('vensis_active_quotation_v1')}
  function quoteItemKey(item,index){return String(item?.itemKey||`quote-index-${index}`)}
  function quoteAccessoryMarkup(item){return `<div class="vensis-accessory-quote"><div><b>${esc(item.model||'Aksesuar')}</b><span>${esc(item.series||'Aksesuar')}</span><small>${esc(item.manufacturer||'')}</small></div></div>`}
  function quoteAccessoryRow(row,item,currency='EUR'){
    if(row.classList.contains('vensis-accessory-quote-row'))return;
    const symbol={EUR:'€',USD:'$',TRY:'₺'}[String(currency).toUpperCase()]||String(currency||'€');const qty=Math.max(1,Math.round(num(item.quantity)||1));const discount=Math.min(100,Math.max(0,num(item.discountPercent)));const net=num(item.price)*(1-discount/100);const total=net*qty;const hasPrice=num(item.price)>0;
    row.classList.add('vensis-accessory-quote-row');row.innerHTML=`<td colspan="5">${quoteAccessoryMarkup(item)}</td><td class="num unit-price">${hasPrice?`${esc(symbol)}${fmt(net,2)}`:'-'}</td><td class="num">${fmt(qty)}</td><td class="num"><b>${hasPrice?`${esc(symbol)}${fmt(total,2)}`:'-'}</b></td>`;
  }

  let quoteBusy=false;
  function decorateQuotation(){
    if(quoteBusy)return;quoteBusy=true;
    try{
      ensureStyles();const quotation=readJson(quoteKey());const root=document.getElementById('quotationProductTables');if(!quotation||!Array.isArray(quotation.items)||!root||!root.querySelector('tbody tr'))return;
      const items=quotation.items;const formats=window.VensisQuotationFormats;const format=formats?.detect?.(items,quotation.format||'auto')||'fan';let sequences=[];
      if(format==='mixed'){const groups=formats.split(items);sequences=[groups.fan,groups.electrical]}else sequences=[items];
      const tables=[...root.querySelectorAll('.quote-product-group tbody')];
      sequences.forEach((sequence,tableIndex)=>{
        const tbody=tables[tableIndex];if(!tbody)return;const rows=[...tbody.querySelectorAll(':scope > tr')];if(rows.length!==sequence.length)return;
        const rowMap=new Map();
        const alreadyKeyed=rows.every(row=>row.dataset.vensisQuoteKey);
        if(alreadyKeyed)rows.forEach(row=>rowMap.set(row.dataset.vensisQuoteKey,row));
        else sequence.forEach((item,index)=>{const key=quoteItemKey(item,index);const row=rows[index];row.dataset.vensisQuoteKey=key;rowMap.set(key,row)});
        sequence.forEach((item,index)=>{const row=rowMap.get(quoteItemKey(item,index));if(row&&isAccessory(item))quoteAccessoryRow(row,item,quotation.currency||'EUR')});
        const parents=sequence.filter(item=>!isAccessory(item));const desired=[];
        parents.forEach((parent,parentIndex)=>{const row=rowMap.get(quoteItemKey(parent,sequence.indexOf(parent)));if(row)desired.push(row);sequence.forEach((child,childIndex)=>{if(isAccessory(child)&&String(child.parentItemKey||'')===String(parent.itemKey||'')){const childRow=rowMap.get(quoteItemKey(child,childIndex));if(childRow)desired.push(childRow)}})});
        sequence.forEach((item,index)=>{if(isAccessory(item)&&!parents.some(parent=>String(parent.itemKey||'')===String(item.parentItemKey||''))){const row=rowMap.get(quoteItemKey(item,index));if(row)desired.push(row)}});
        const current=[...tbody.children];if(desired.length===current.length&&desired.some((row,index)=>row!==current[index]))desired.forEach(row=>tbody.appendChild(row));
      });
      document.querySelectorAll('#quotationItemEditors .quote-item-editor').forEach((editor,index)=>{const item=items[index];if(!item||!isAccessory(item))return;editor.classList.add('vensis-accessory-editor');const head=editor.querySelector('.quote-item-editor-head>div');if(head&&!head.querySelector('.vensis-accessory-badge'))head.insertAdjacentHTML('afterbegin','<span class="vensis-accessory-badge">Aksesuar</span>')});
    }finally{quoteBusy=false}
  }

  let quoteQueued=false;
  function scheduleQuotation(){if(quoteQueued)return;quoteQueued=true;requestAnimationFrame(()=>{quoteQueued=false;decorateQuotation()})}
  function startQuotation(){ensureStyles();scheduleQuotation();const root=document.getElementById('quotationWorkspace')||document.body;new MutationObserver(scheduleQuotation).observe(root,{childList:true,subtree:true});window.addEventListener('storage',scheduleQuotation)}

  function printAccessoryMarkup(item){return `<div class="vensis-accessory-print"><div><b>${esc(item.model||'Aksesuar')}</b><span>${esc(item.series||'Aksesuar')}</span><small>${esc(item.manufacturer||'')}</small></div></div>`}
  function decorateProjectPrint(){
    const full=fullPrintSnapshot||window.__VENSIS_ACCESSORY_PRINT_FULL__;const root=document.getElementById('projectPrintRoot');if(!full||!Array.isArray(full.items)||!root?.querySelector('.project-overview'))return false;
    ensureStyles();const technical=core.technicalItems(full.items);const tbody=root.querySelector('.project-overview .project-table tbody');if(!tbody)return false;
    const fanRows=[...tbody.querySelectorAll(':scope > tr')];const rowByKey=new Map();technical.forEach((item,index)=>{const row=fanRows[index];if(row)rowByKey.set(String(item.itemKey||`technical-${index}`),row)});
    technical.forEach((parent,index)=>{const row=rowByKey.get(String(parent.itemKey||`technical-${index}`));if(!row)return;tbody.appendChild(row);full.items.filter(item=>isAccessory(item)&&String(item.parentItemKey||'')===String(parent.itemKey||'')).forEach(item=>{const child=document.createElement('tr');child.className='vensis-accessory-print-row';child.innerHTML=`<td colspan="8">${printAccessoryMarkup(item)}</td><td><b>${Math.max(1,Math.round(num(item.quantity)||1))}</b></td>`;tbody.appendChild(child)})});
    full.items.filter(item=>isAccessory(item)&&!technical.some(parent=>String(parent.itemKey||'')===String(item.parentItemKey||''))).forEach(item=>{const child=document.createElement('tr');child.className='vensis-accessory-print-row';child.innerHTML=`<td colspan="8">${printAccessoryMarkup(item)}</td><td><b>${Math.max(1,Math.round(num(item.quantity)||1))}</b></td>`;tbody.appendChild(child)});
    const note=root.querySelector('.project-overview .project-note');if(note)note.innerHTML='<b>Technical Project Output</b>Fan technical datasheets are included on the following pages. Accessories are listed under their related fan on this overview page and do not create a separate technical datasheet.';
    const sheets=[...root.querySelectorAll('.datasheet-page')];sheets.forEach((sheet,index)=>{const meta=sheet.querySelector('.pdf-footer-meta');if(meta)meta.textContent=`Project Datasheet Appendix • Page ${index+2} / ${sheets.length+1}`});
    writeJson(printSnapshotKey,full);fullPrintSnapshot=null;window.__VENSIS_ACCESSORY_PRINT_FULL__=null;return true;
  }
  function startProjectPrint(){ensureStyles();if(decorateProjectPrint())return;const root=document.getElementById('projectPrintRoot')||document.body;const observer=new MutationObserver(()=>{if(decorateProjectPrint())observer.disconnect()});observer.observe(root,{childList:true,subtree:true});setTimeout(()=>{decorateProjectPrint();observer.disconnect();if(fullPrintSnapshot){writeJson(printSnapshotKey,fullPrintSnapshot);fullPrintSnapshot=null}},5000)}

  function start(){
    if(page==='project.html')startProject();else if(page==='quotation.html')startQuotation();else if(page==='project-print.html')startProjectPrint();
    window.VensisAccessorySuite={build:BUILD,refresh:()=>{if(page==='project.html')scheduleProject();if(page==='quotation.html')scheduleQuotation();if(page==='project-print.html')decorateProjectPrint()}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

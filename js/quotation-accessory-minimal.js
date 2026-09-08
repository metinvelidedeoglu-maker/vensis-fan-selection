(function(root){
  'use strict';

  const isAccessory=item=>String(item?.productType||'').trim().toLowerCase()==='accessory'||String(item?.mode||'').trim().toLowerCase()==='accessory';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const storageKey=key=>root.VensisAccess?.storageKey?.(key)||key;

  function readQuotation(){
    try{return JSON.parse(root.localStorage?.getItem(storageKey('vensis_active_quotation_v1'))||'null')}catch{return null}
  }

  function sequencesFor(items,selected){
    const formats=root.VensisQuotationFormats;
    const format=formats?.detect?.(items,selected||'auto')||'fan';
    if(format==='mixed'){
      const groups=formats?.split?.(items)||{fan:items,electrical:[]};
      return [groups.fan||[],groups.electrical||[]];
    }
    return [items];
  }

  function simplifyRow(row,item){
    if(!row||!isAccessory(item))return false;
    const cells=[...row.children];
    if(!cells.length)return false;

    const first=cells[0];
    const desired=`<strong class="vensis-accessory-name-only">${esc(item.model||'Aksesuar')}</strong>`;
    let changed=false;

    if(first.colSpan!==5){first.colSpan=5;changed=true}
    if(first.innerHTML!==desired){first.innerHTML=desired;changed=true}

    while(row.children.length>4){
      row.removeChild(row.children[1]);
      changed=true;
    }

    if(!row.classList.contains('vensis-accessory-quote-row')){
      row.classList.add('vensis-accessory-quote-row');
      changed=true;
    }
    return changed;
  }

  function apply(){
    const quotation=readQuotation();
    const host=root.document?.getElementById('quotationProductTables');
    if(!quotation||!Array.isArray(quotation.items)||!host)return false;

    const sequences=sequencesFor(quotation.items,quotation.format);
    const tables=[...host.querySelectorAll('.quote-product-group tbody')];
    let changed=false;

    sequences.forEach((sequence,tableIndex)=>{
      const tbody=tables[tableIndex];
      if(!tbody)return;
      const rows=[...tbody.querySelectorAll(':scope > tr')];
      if(rows.length!==sequence.length)return;
      sequence.forEach((item,index)=>{if(simplifyRow(rows[index],item))changed=true});
    });
    return changed;
  }

  function start(){
    apply();
    const host=root.document?.getElementById('quotationProductTables');
    if(root.MutationObserver&&host){
      let queued=false;
      new root.MutationObserver(()=>{
        if(queued)return;
        queued=true;
        (root.requestAnimationFrame||root.setTimeout)(()=>{queued=false;apply()},0);
      }).observe(host,{childList:true,subtree:true});
    }
    root.addEventListener?.('beforeprint',apply);
  }

  if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  root.VensisQuotationAccessoryMinimal={isAccessory,simplifyRow,apply};
})(typeof window!=='undefined'?window:globalThis);

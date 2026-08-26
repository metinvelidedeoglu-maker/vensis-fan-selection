(function(){
  'use strict';
  const KEY=window.VensisAccess?.storageKey?.('vensis_pending_project_v1')||'vensis_pending_project_v1';
  const root=()=>String(location.pathname||'').toLowerCase().includes('/electrical/')?'../':'';
  function cleanItem(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const item=JSON.parse(JSON.stringify(value));
    item.itemKey=String(item.itemKey||`${item.productType||'product'}|${item.productKey||item.model||Date.now()}`);
    item.quantity=Math.max(1,Math.round(Number(item.quantity)||1));
    return item;
  }
  function read(){
    try{
      const value=JSON.parse(sessionStorage.getItem(KEY)||'null');
      if(!value||!Array.isArray(value.items))return null;
      return {...value,items:value.items.map(cleanItem).filter(Boolean).slice(0,100)};
    }catch{return null}
  }
  function stage(items,source=''){
    const rows=(Array.isArray(items)?items:[items]).map(cleanItem).filter(Boolean).slice(0,100);
    if(!rows.length)return null;
    const value={items:rows,source:String(source||''),createdAt:new Date().toISOString()};
    sessionStorage.setItem(KEY,JSON.stringify(value));
    return value;
  }
  function clear(){sessionStorage.removeItem(KEY)}
  function open(items,source=''){
    if(!stage(items,source))return false;
    location.assign(`${root()}projects.html?new=1`);
    return true;
  }
  window.VensisPendingProject={key:KEY,read,stage,clear,open};
})();

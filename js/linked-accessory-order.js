(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.VensisLinkedAccessoryOrder=api;
    api.install(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=value=>String(value??'').trim();
  const lower=value=>text(value).toLowerCase();

  function isAccessory(item){
    return lower(item?.productType)==='accessory'||lower(item?.mode)==='accessory';
  }

  function normalizeItems(items){
    const source=Array.isArray(items)?items:[];
    const children=new Map();
    const parents=[];
    const orphans=[];

    source.forEach(item=>{
      if(isAccessory(item)){
        const key=text(item?.parentItemKey);
        if(!children.has(key))children.set(key,[]);
        children.get(key).push(item);
      }else parents.push(item);
    });

    const parentKeys=new Set(parents.map(item=>text(item?.itemKey)).filter(Boolean));
    children.forEach((rows,key)=>{if(!key||!parentKeys.has(key))orphans.push(...rows)});

    const result=[];
    parents.forEach(parent=>{
      result.push(parent);
      const key=text(parent?.itemKey);
      if(key&&children.has(key))result.push(...children.get(key));
    });
    result.push(...orphans);
    return result;
  }

  function orderChanged(before,after){
    if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length)return true;
    return before.some((item,index)=>item!==after[index]);
  }

  function patchFormats(api){
    if(!api||api.__vensisLinkedAccessoryOrder)return api;
    const originalItemType=typeof api.itemType==='function'?api.itemType.bind(api):(()=> 'fan');
    const originalPreference=typeof api.preference==='function'?api.preference.bind(api):(value=>lower(value)||'auto');

    api.itemType=item=>isAccessory(item)?'fan':originalItemType(item);
    api.split=items=>(Array.isArray(items)?items:[]).reduce((groups,item)=>{
      groups[api.itemType(item)==='electrical'?'electrical':'fan'].push(item);
      return groups;
    },{fan:[],electrical:[]});
    api.detect=(items,selected='auto')=>{
      const chosen=originalPreference(selected);
      if(chosen!=='auto')return chosen;
      const groups=api.split(items);
      if(groups.fan.length&&groups.electrical.length)return 'mixed';
      return groups.electrical.length?'electrical':'fan';
    };
    Object.defineProperty(api,'__vensisLinkedAccessoryOrder',{value:true,configurable:true});
    return api;
  }

  function installFormatTrap(root){
    if(root.VensisQuotationFormats){patchFormats(root.VensisQuotationFormats);return}
    let value;
    try{
      Object.defineProperty(root,'VensisQuotationFormats',{
        configurable:true,
        enumerable:true,
        get(){return value},
        set(api){
          value=patchFormats(api);
          Object.defineProperty(root,'VensisQuotationFormats',{configurable:true,enumerable:true,writable:true,value});
        }
      });
    }catch{}
  }

  function storageKey(root,key){
    return root.VensisAccess?.storageKey?.(key)||key;
  }

  function normalizeQuotationStorage(root){
    const key=storageKey(root,'vensis_active_quotation_v1');
    try{
      const quotation=JSON.parse(root.localStorage?.getItem(key)||'null');
      if(!quotation||!Array.isArray(quotation.items))return false;
      const next=normalizeItems(quotation.items);
      if(!orderChanged(quotation.items,next))return false;
      quotation.items=next;
      quotation.updatedAt=new Date().toISOString();
      root.localStorage.setItem(key,JSON.stringify(quotation));
      return true;
    }catch{return false}
  }

  function activeProjectId(root,store){
    try{
      const requested=new URLSearchParams(root.location?.search||'').get('project');
      if(requested&&store?.get?.(requested))return requested;
    }catch{}
    return root.VensisProject?.projectId||store?.activeId?.()||'';
  }

  function normalizeProjectStore(root){
    const store=root.VensisProjects;
    if(!store?.readItems||!store?.writeItems)return false;
    const projectId=activeProjectId(root,store);
    if(!projectId)return false;
    const items=store.readItems(projectId);
    const next=normalizeItems(items);
    if(!orderChanged(items,next))return false;
    store.writeItems(next,projectId);
    root.VensisProject?.render?.();
    return true;
  }

  function install(root){
    installFormatTrap(root);
    const page=(String(root.location?.pathname||'').split('/').pop()||'').toLowerCase();
    if(page==='quotation.html')normalizeQuotationStorage(root);
    if(page==='project.html'){
      const run=()=>{
        normalizeProjectStore(root);
        root.setTimeout?.(()=>normalizeProjectStore(root),0);
      };
      if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',run,{once:true});
      else run();
    }
  }

  return {isAccessory,normalizeItems,patchFormats,normalizeQuotationStorage,normalizeProjectStore,install};
});

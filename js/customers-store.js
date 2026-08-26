(function(){
  'use strict';

  const GUEST_MODE=(window.VensisAccess?.mode?.()||window.VENSIS_ACCESS_BOOT_MODE)==='guest';
  const scoped=key=>GUEST_MODE?key.replace(/^vensis_/,'vensis_guest_'):key;
  const KEY=scoped('vensis_customers_v2');
  const LEGACY_KEY=scoped('vensis_customers_v1');
  const API_BASE='api/customers';
  const cloud={state:'checking',authenticated:false,csrf:'',message:'Checking customer cloud…',lastSyncedAt:''};
  let syncPromise=null;
  let saveTimer=null;

  function readJson(key,fallback){
    try{const value=JSON.parse(localStorage.getItem(key)||'');return value==null?fallback:value}catch{return fallback}
  }
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function now(){return new Date().toISOString()}
  function clean(value){return String(value??'').trim()}
  function id(){return `cus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
  function timestamp(value,fallback=''){
    const text=clean(value);
    return text&&!Number.isNaN(Date.parse(text))?new Date(text).toISOString():fallback;
  }
  function normalize(value,fallbackTime=''){
    const source=value&&typeof value==='object'?value:{};
    const createdAt=timestamp(source.createdAt,fallbackTime||now());
    return {
      id:clean(source.id)||id(),
      companyName:clean(source.companyName),
      taxOffice:clean(source.taxOffice),
      taxNo:clean(source.taxNo),
      contact:clean(source.contact),
      phone:clean(source.phone),
      email:clean(source.email),
      address:clean(source.address),
      history:Array.isArray(source.history)?source.history.slice(0,100):[],
      createdAt,
      updatedAt:timestamp(source.updatedAt,createdAt)
    };
  }
  function read(){
    const value=readJson(KEY,[]);
    return Array.isArray(value)?value.map(item=>normalize(item)).filter(item=>item.id):[];
  }
  function write(items){
    const rows=(Array.isArray(items)?items:[]).map(item=>normalize(item)).filter(item=>item.id);
    writeJson(KEY,rows);
    return rows;
  }
  function migrateLegacy(){
    if(localStorage.getItem(KEY)!==null)return read();
    const legacy=readJson(LEGACY_KEY,[]);
    const stamp=now();
    return write(Array.isArray(legacy)?legacy.map(item=>normalize(item,stamp)):[]);
  }
  function list(){return read()}
  function get(customerId){return list().find(item=>item.id===String(customerId||''))||null}
  function findByName(name){
    const target=clean(name).toLocaleLowerCase('tr-TR');
    return list().find(item=>item.companyName.toLocaleLowerCase('tr-TR')===target)||null;
  }
  function emit(){window.dispatchEvent(new CustomEvent('vensis-customers-updated'))}
  function cloudState(){return {...cloud}}
  function setCloudStatus(state,message,authenticated=cloud.authenticated){
    cloud.state=state;
    cloud.message=message;
    cloud.authenticated=Boolean(authenticated);
    if(state==='synced')cloud.lastSyncedAt=now();
    window.dispatchEvent(new CustomEvent('vensis-customer-cloud-status',{detail:cloudState()}));
  }
  async function request(path,options={}){
    const headers={Accept:'application/json',...(options.headers||{})};
    if(options.body!==undefined)headers['Content-Type']='application/json';
    if(options.csrf&&cloud.csrf)headers['X-CSRF-Token']=cloud.csrf;
    let response;
    try{
      response=await fetch(`${API_BASE}/${path}`,{
        method:options.method||'GET',credentials:'same-origin',cache:'no-store',headers,
        body:options.body===undefined?undefined:JSON.stringify(options.body)
      });
    }catch{
      const error=new Error('Customer cloud could not be reached.');error.status=0;throw error;
    }
    let payload={};
    try{payload=await response.json()}catch{}
    if(!response.ok||payload.ok===false){
      const error=new Error(payload.error||'Customer cloud request failed.');error.status=response.status;throw error;
    }
    return payload;
  }
  async function refreshCloudSession(){
    if(GUEST_MODE){setCloudStatus('local','Guest — saved only in this browser.',false);return false}
    let response;
    try{
      response=await fetch('api/edit/session.php',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    }catch{
      setCloudStatus('error','Cloud connection failed; customers remain in this browser.',false);
      return false;
    }
    let payload={};
    try{payload=await response.json()}catch{}
    cloud.authenticated=Boolean(response.ok&&payload.configured&&payload.persistentConfigReady&&payload.authenticated);
    cloud.csrf=cloud.authenticated?String(payload.csrf||''):'';
    if(!cloud.authenticated)setCloudStatus('local','Browser only — sign in to sync.',false);
    return cloud.authenticated;
  }
  function handleCloudError(error){
    if(error?.status===401||error?.status===403){
      cloud.csrf='';
      setCloudStatus('local','Browser only — sign in to sync.',false);
      return;
    }
    setCloudStatus('error','Sync failed; customers remain in this browser.',cloud.authenticated);
  }
  function merge(localRows,remoteRows){
    const merged=new Map();
    [...remoteRows,...localRows].forEach(row=>{
      const item=normalize(row);
      const current=merged.get(item.id);
      if(!current||item.updatedAt>=current.updatedAt)merged.set(item.id,item);
    });
    return [...merged.values()].sort((a,b)=>a.companyName.localeCompare(b.companyName,'tr'));
  }
  async function syncCloud(){
    if(syncPromise)return syncPromise;
    syncPromise=(async()=>{
      setCloudStatus('checking','Checking customer cloud…',cloud.authenticated);
      if(!await refreshCloudSession())return false;
      setCloudStatus('syncing','Syncing browser customers with cloud…',true);
      try{
        const remote=await request('list.php');
        const merged=merge(list(),Array.isArray(remote.customers)?remote.customers:[]);
        write(merged);
        const saved=await request('sync.php',{method:'POST',body:{customers:merged},csrf:true});
        write(merge(merged,Array.isArray(saved.customers)?saved.customers:[]));
        emit();
        setCloudStatus('synced','Customer cloud synced',true);
        return true;
      }catch(error){handleCloudError(error);return false}
    })().finally(()=>{syncPromise=null});
    return syncPromise;
  }
  function scheduleSync(delay=450){
    clearTimeout(saveTimer);
    if(!cloud.authenticated)return;
    saveTimer=setTimeout(syncCloud,delay);
  }
  function save(items){
    const rows=write(items);
    emit();
    scheduleSync();
    return rows;
  }
  function upsert(customer){
    const rows=list();
    const customerId=clean(customer?.id);
    const index=customerId?rows.findIndex(item=>item.id===customerId):-1;
    const current=index>=0?rows[index]:null;
    const stamp=now();
    const item=normalize({
      ...(current||{}),...(customer||{}),id:current?.id||customerId||id(),
      createdAt:current?.createdAt||customer?.createdAt||stamp,updatedAt:stamp
    });
    if(index>=0)rows[index]=item;else rows.push(item);
    save(rows);
    return item;
  }

  migrateLegacy();
  window.addEventListener('vensis-edit-session-changed',event=>{
    if(event.detail?.authenticated&&!GUEST_MODE)syncCloud();
    else{cloud.authenticated=false;cloud.csrf='';setCloudStatus('local','Browser only — sign in to sync.',false)}
  });
  window.VensisCustomers={list,get,findByName,upsert,save,sync:syncCloud,cloudState,key:KEY};
  if(GUEST_MODE)setCloudStatus('local','Guest — saved only in this browser.',false);else setTimeout(syncCloud,0);
})();

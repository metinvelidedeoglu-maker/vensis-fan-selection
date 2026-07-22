(function(){
  const INDEX_KEY='vensis_projects_v1';
  const ACTIVE_KEY='vensis_active_project_id_v1';
  const MIGRATION_KEY='vensis_projects_legacy_migrated_v1';
  const TOMBSTONES_KEY='vensis_project_tombstones_v1';
  const LEGACY_ITEMS_KEY='vensis_project_items_v1';
  const LEGACY_META_KEY='vensis_project_meta_v1';
  const ITEM_PREFIX='vensis_project_items_v2:';
  const META_PREFIX='vensis_project_meta_v2:';
  const API_BASE='api/projects';
  const saveTimers=new Map();
  const deleteTimers=new Map();
  const cloud={state:'checking',authenticated:false,csrf:'',message:'Checking cloud storage…',pending:0,lastSyncedAt:''};
  let syncPromise=null;

  function readJson(key,fallback){
    try{const value=JSON.parse(localStorage.getItem(key)||'');return value==null?fallback:value}catch{return fallback}
  }
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function now(){return new Date().toISOString()}
  function id(){return `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
  function itemsKey(projectId){return `${ITEM_PREFIX}${projectId}`}
  function metaKey(projectId){return `${META_PREFIX}${projectId}`}
  function cleanText(value){return String(value??'').trim()}
  function normalizeMeta(value){
    const source=value&&typeof value==='object'?value:{};
    return {
      name:cleanText(source.name),
      reference:cleanText(source.reference),
      contact:cleanText(source.contact),
      globalDiscount:Math.min(100,Math.max(0,Number(source.globalDiscount)||0))
    };
  }
  function normalizeEntry(value){
    const source=value&&typeof value==='object'?value:{};
    return {
      id:cleanText(source.id),
      name:cleanText(source.name),
      reference:cleanText(source.reference),
      contact:cleanText(source.contact),
      createdAt:source.createdAt||now(),
      updatedAt:source.updatedAt||source.createdAt||now()
    };
  }
  function rawList(){
    const value=readJson(INDEX_KEY,[]);
    return Array.isArray(value)?value.map(normalizeEntry).filter(entry=>entry.id):[];
  }
  function saveList(list){writeJson(INDEX_KEY,list.map(normalizeEntry))}
  function readTombstones(){
    const value=readJson(TOMBSTONES_KEY,{});
    if(!value||typeof value!=='object'||Array.isArray(value))return {};
    return Object.fromEntries(Object.entries(value).filter(([projectId,timestamp])=>projectId&&typeof timestamp==='string'));
  }
  function saveTombstones(value){writeJson(TOMBSTONES_KEY,value)}
  function emit(type='vensis-projects-updated',projectId=activeId()){
    window.dispatchEvent(new CustomEvent(type,{detail:{projectId}}));
  }
  function emitCloudApplied(projectId=activeId()){emit('vensis-project-cloud-applied',projectId)}
  function setCloudStatus(state,message,authenticated=cloud.authenticated){
    cloud.state=state;
    cloud.message=message;
    cloud.authenticated=Boolean(authenticated);
    if(state==='synced')cloud.lastSyncedAt=now();
    window.dispatchEvent(new CustomEvent('vensis-project-cloud-status',{detail:cloudState()}));
  }
  function cloudState(){
    return {state:cloud.state,message:cloud.message,authenticated:cloud.authenticated,lastSyncedAt:cloud.lastSyncedAt};
  }
  function migrateLegacy(){
    let rows=rawList();
    if(rows.length||localStorage.getItem(MIGRATION_KEY)==='1')return rows;
    const legacyItems=readJson(LEGACY_ITEMS_KEY,[]);
    const legacyMeta=normalizeMeta(readJson(LEGACY_META_KEY,{}));
    const hasItems=Array.isArray(legacyItems)&&legacyItems.length>0;
    const hasMeta=Boolean(legacyMeta.name||legacyMeta.reference||legacyMeta.contact||legacyMeta.globalDiscount);
    localStorage.setItem(MIGRATION_KEY,'1');
    if(!hasItems&&!hasMeta)return rows;
    const projectId=id();
    const stamp=now();
    const migratedMeta={...legacyMeta,name:legacyMeta.name||'Existing Project'};
    const entry={id:projectId,name:migratedMeta.name,reference:migratedMeta.reference||'',contact:migratedMeta.contact||'',createdAt:stamp,updatedAt:stamp};
    writeJson(itemsKey(projectId),hasItems?legacyItems:[]);
    writeJson(metaKey(projectId),migratedMeta);
    rows=[entry];
    saveList(rows);
    localStorage.setItem(ACTIVE_KEY,projectId);
    return rows;
  }
  function list(){return migrateLegacy().slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))}
  function get(projectId){return list().find(entry=>entry.id===String(projectId||''))||null}
  function activeId(){
    const current=cleanText(localStorage.getItem(ACTIVE_KEY));
    if(current&&rawList().some(entry=>entry.id===current))return current;
    return '';
  }
  function setActive(projectId){
    const project=get(projectId);
    if(!project)return '';
    localStorage.setItem(ACTIVE_KEY,project.id);
    emit('vensis-active-project-changed',project.id);
    return project.id;
  }
  function readItems(projectId=activeId()){
    if(!projectId)return [];
    const value=readJson(itemsKey(projectId),[]);
    return Array.isArray(value)?value:[];
  }
  function readMeta(projectId=activeId()){
    if(!projectId)return normalizeMeta({});
    return normalizeMeta(readJson(metaKey(projectId),{}));
  }
  function snapshot(projectId){
    const entry=rawList().find(item=>item.id===projectId);
    if(!entry)return null;
    const meta=readMeta(projectId);
    return {
      ...entry,
      name:meta.name||entry.name||'Untitled Project',
      reference:meta.reference||entry.reference||'',
      contact:meta.contact||entry.contact||'',
      meta,
      items:JSON.parse(JSON.stringify(readItems(projectId)))
    };
  }
  function cleanupActive(){
    const current=cleanText(localStorage.getItem(ACTIVE_KEY));
    const rows=rawList();
    if(current&&rows.some(entry=>entry.id===current))return;
    if(rows[0])localStorage.setItem(ACTIVE_KEY,rows[0].id);else localStorage.removeItem(ACTIVE_KEY);
  }
  function removeLocal(projectId){
    localStorage.removeItem(itemsKey(projectId));
    localStorage.removeItem(metaKey(projectId));
    saveList(rawList().filter(entry=>entry.id!==projectId));
    cleanupActive();
  }
  function applyRemoteProject(project){
    if(!project||!project.id)return;
    const entry=normalizeEntry(project);
    const rows=rawList().filter(item=>item.id!==entry.id);
    rows.push(entry);
    saveList(rows);
    writeJson(metaKey(entry.id),normalizeMeta(project.meta||project));
    writeJson(itemsKey(entry.id),Array.isArray(project.items)?project.items:[]);
  }
  function later(left,right){
    if(!left)return right||'';
    if(!right)return left;
    return left>=right?left:right;
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
      const error=new Error('Project cloud could not be reached.');error.status=0;throw error;
    }
    let payload={};
    try{payload=await response.json()}catch{}
    if(!response.ok||payload.ok===false){
      const error=new Error(payload.error||'Project cloud request failed.');error.status=response.status;throw error;
    }
    return payload;
  }
  async function refreshCloudSession(){
    let response;
    try{
      response=await fetch('api/edit/session.php',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    }catch{
      setCloudStatus('error','Cloud connection failed; projects remain in this browser.',false);
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
    setCloudStatus('error','Sync failed; your projects are still safe in this browser.',cloud.authenticated);
  }
  function beginWrite(){cloud.pending+=1;setCloudStatus('syncing','Saving projects to cloud…',true)}
  function endWrite(){
    cloud.pending=Math.max(0,cloud.pending-1);
    if(cloud.pending===0&&cloud.authenticated&&cloud.state==='syncing')setCloudStatus('synced','Cloud synced',true);
  }
  function reconcileSaveResult(projectId,payload){
    const local=snapshot(projectId);
    const localTime=String(local?.updatedAt||'');
    const deletedAt=String(payload?.deletedAt||'');
    const remoteProject=payload?.project;
    if(deletedAt&&(!localTime||deletedAt>=localTime)){
      removeLocal(projectId);
      const tombstones=readTombstones();tombstones[projectId]=deletedAt;saveTombstones(tombstones);
      emit('vensis-projects-updated',activeId());
      emitCloudApplied(activeId());
      return;
    }
    if(remoteProject&&String(remoteProject.updatedAt||'')>localTime){
      applyRemoteProject(remoteProject);
      emit('vensis-projects-updated',projectId);
      emitCloudApplied(projectId);
    }
  }
  async function saveRemote(projectId){
    if(!cloud.authenticated)return;
    const project=snapshot(projectId);if(!project)return;
    beginWrite();
    try{
      const payload=await request('save.php',{method:'POST',body:{project},csrf:true});
      reconcileSaveResult(projectId,payload);
    }catch(error){handleCloudError(error)}finally{endWrite()}
  }
  async function deleteRemote(projectId,deletedAt){
    if(!cloud.authenticated)return;
    beginWrite();
    try{
      const payload=await request('delete.php',{method:'POST',body:{projectId,deletedAt},csrf:true});
      if(payload.project&&String(payload.project.updatedAt||'')>String(payload.deletedAt||'')){
        applyRemoteProject(payload.project);
        const tombstones=readTombstones();delete tombstones[projectId];saveTombstones(tombstones);
        emit('vensis-projects-updated',projectId);
        emitCloudApplied(projectId);
      }
    }catch(error){handleCloudError(error)}finally{endWrite()}
  }
  function scheduleSave(projectId,delay=450){
    clearTimeout(saveTimers.get(projectId));
    clearTimeout(deleteTimers.get(projectId));
    if(!cloud.authenticated)return;
    saveTimers.set(projectId,setTimeout(()=>{saveTimers.delete(projectId);saveRemote(projectId)},delay));
  }
  function scheduleDelete(projectId,deletedAt,delay=50){
    clearTimeout(saveTimers.get(projectId));
    clearTimeout(deleteTimers.get(projectId));
    if(!cloud.authenticated)return;
    deleteTimers.set(projectId,setTimeout(()=>{deleteTimers.delete(projectId);deleteRemote(projectId,deletedAt)},delay));
  }

  async function syncCloud(){
    if(syncPromise)return syncPromise;
    syncPromise=(async()=>{
      setCloudStatus('checking','Checking cloud storage…',cloud.authenticated);
      if(!await refreshCloudSession())return false;
      setCloudStatus('syncing','Syncing browser projects with cloud…',true);
      let remote;
      try{remote=await request('list.php')}catch(error){handleCloudError(error);return false}
      const remoteProjects=new Map((Array.isArray(remote.projects)?remote.projects:[]).filter(project=>project?.id).map(project=>[project.id,project]));
      const remoteTombstones=remote.tombstones&&typeof remote.tombstones==='object'?remote.tombstones:{};
      const localProjects=new Map(rawList().map(entry=>[entry.id,snapshot(entry.id)]));
      const localTombstones=readTombstones();
      const mergedTombstones={...localTombstones};
      const saveIds=[];
      const deleteRows=[];
      const ids=new Set([...localProjects.keys(),...remoteProjects.keys(),...Object.keys(localTombstones),...Object.keys(remoteTombstones)]);

      for(const projectId of ids){
        const localProject=localProjects.get(projectId)||null;
        const remoteProject=remoteProjects.get(projectId)||null;
        const localProjectTime=String(localProject?.updatedAt||'');
        const remoteProjectTime=String(remoteProject?.updatedAt||'');
        const projectTime=later(localProjectTime,remoteProjectTime);
        const localDelete=String(localTombstones[projectId]||'');
        const remoteDelete=String(remoteTombstones[projectId]||'');
        const deleteTime=later(localDelete,remoteDelete);

        if(deleteTime&&(!projectTime||deleteTime>=projectTime)){
          removeLocal(projectId);
          mergedTombstones[projectId]=deleteTime;
          if(localDelete&&localDelete>remoteDelete)deleteRows.push([projectId,localDelete]);
          continue;
        }

        delete mergedTombstones[projectId];
        if(remoteProject&&remoteProjectTime>=localProjectTime){
          applyRemoteProject(remoteProject);
        }else if(localProject&&(!remoteProject||localProjectTime>remoteProjectTime)){
          saveIds.push(projectId);
        }
      }
      saveTombstones(mergedTombstones);
      cleanupActive();
      emit('vensis-projects-updated',activeId());
      emit('vensis-project-updated',activeId());
      emitCloudApplied(activeId());

      try{
        for(const projectId of saveIds){
          const project=snapshot(projectId);if(project)reconcileSaveResult(projectId,await request('save.php',{method:'POST',body:{project},csrf:true}));
        }
        for(const [projectId,deletedAt] of deleteRows){
          await request('delete.php',{method:'POST',body:{projectId,deletedAt},csrf:true});
        }
      }catch(error){handleCloudError(error);return false}
      setCloudStatus('synced','Cloud synced',true);
      return true;
    })().finally(()=>{syncPromise=null});
    return syncPromise;
  }

  function create(input={}){
    const projectId=id();
    const stamp=now();
    const meta=normalizeMeta(input);
    const entry={id:projectId,name:meta.name||'Untitled Project',reference:meta.reference,contact:meta.contact,createdAt:stamp,updatedAt:stamp};
    const rows=rawList();rows.push(entry);saveList(rows);
    writeJson(itemsKey(projectId),[]);writeJson(metaKey(projectId),meta);
    const tombstones=readTombstones();delete tombstones[projectId];saveTombstones(tombstones);
    localStorage.setItem(ACTIVE_KEY,projectId);
    emit('vensis-projects-updated',projectId);
    scheduleSave(projectId);
    return entry;
  }
  function ensureActive(){
    const current=activeId();if(current)return current;
    const rows=list();if(rows.length)return setActive(rows[0].id);
    return create({name:'Untitled Project'}).id;
  }
  function touch(projectId,patch={}){
    const rows=rawList();const index=rows.findIndex(entry=>entry.id===projectId);if(index<0)return null;
    rows[index]={...rows[index],...patch,updatedAt:now()};saveList(rows);return rows[index];
  }
  function writeItems(items,projectId=activeId()){
    if(!projectId)projectId=ensureActive();
    writeJson(itemsKey(projectId),Array.isArray(items)?items:[]);touch(projectId);
    emit('vensis-project-updated',projectId);emit('vensis-projects-updated',projectId);
    scheduleSave(projectId);
    return projectId;
  }
  function writeMeta(value,projectId=activeId()){
    if(!projectId)projectId=ensureActive();
    const current=readMeta(projectId);const meta=normalizeMeta({...current,...value});
    writeJson(metaKey(projectId),meta);
    touch(projectId,{name:meta.name||'Untitled Project',reference:meta.reference,contact:meta.contact});
    emit('vensis-project-updated',projectId);emit('vensis-projects-updated',projectId);
    scheduleSave(projectId);
    return meta;
  }
  function remove(projectId){
    const project=get(projectId);if(!project)return false;
    const deletedAt=now();
    const tombstones=readTombstones();tombstones[project.id]=deletedAt;saveTombstones(tombstones);
    removeLocal(project.id);
    emit('vensis-projects-updated',activeId());
    scheduleDelete(project.id,deletedAt);
    return true;
  }
  function duplicate(projectId){
    const source=get(projectId);if(!source)return null;
    const meta=readMeta(source.id);
    const copy=create({name:`${meta.name||source.name||'Project'} Copy`,reference:meta.reference,contact:meta.contact,globalDiscount:meta.globalDiscount});
    writeItems(JSON.parse(JSON.stringify(readItems(source.id))),copy.id);
    return get(copy.id);
  }
  function projectUrl(projectId){return `project.html?project=${encodeURIComponent(projectId)}`}
  function open(projectId){const selected=setActive(projectId);if(selected)location.assign(projectUrl(selected))}

  migrateLegacy();
  window.addEventListener('vensis-edit-session-changed',event=>{
    if(event.detail?.authenticated)syncCloud();
    else{cloud.authenticated=false;cloud.csrf='';setCloudStatus('local','Browser only — sign in to sync.',false)}
  });
  window.VensisProjects={
    keys:{index:INDEX_KEY,active:ACTIVE_KEY,tombstones:TOMBSTONES_KEY,itemsPrefix:ITEM_PREFIX,metaPrefix:META_PREFIX},
    list,get,create,remove,duplicate,activeId,setActive,ensureActive,readItems,writeItems,readMeta,writeMeta,projectUrl,open,
    sync:syncCloud,cloudState
  };
  setTimeout(syncCloud,0);
})();

(function(){
  const INDEX_KEY='vensis_projects_v1';
  const ACTIVE_KEY='vensis_active_project_id_v1';
  const MIGRATION_KEY='vensis_projects_legacy_migrated_v1';
  const LEGACY_ITEMS_KEY='vensis_project_items_v1';
  const LEGACY_META_KEY='vensis_project_meta_v1';
  const ITEM_PREFIX='vensis_project_items_v2:';
  const META_PREFIX='vensis_project_meta_v2:';

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
      globalDiscount:Math.min(100,Math.max(0,Number(source.globalDiscount)||0))
    };
  }
  function normalizeEntry(value){
    const source=value&&typeof value==='object'?value:{};
    return {
      id:cleanText(source.id),
      name:cleanText(source.name),
      reference:cleanText(source.reference),
      createdAt:source.createdAt||now(),
      updatedAt:source.updatedAt||source.createdAt||now()
    };
  }
  function rawList(){
    const value=readJson(INDEX_KEY,[]);
    return Array.isArray(value)?value.map(normalizeEntry).filter(entry=>entry.id):[];
  }
  function saveList(list){writeJson(INDEX_KEY,list.map(normalizeEntry));}
  function emit(type='vensis-projects-updated',projectId=activeId()){
    window.dispatchEvent(new CustomEvent(type,{detail:{projectId}}));
  }
  function migrateLegacy(){
    let list=rawList();
    if(list.length||localStorage.getItem(MIGRATION_KEY)==='1')return list;
    const legacyItems=readJson(LEGACY_ITEMS_KEY,[]);
    const legacyMeta=normalizeMeta(readJson(LEGACY_META_KEY,{}));
    const hasItems=Array.isArray(legacyItems)&&legacyItems.length>0;
    const hasMeta=Boolean(legacyMeta.name||legacyMeta.reference||legacyMeta.globalDiscount);
    localStorage.setItem(MIGRATION_KEY,'1');
    if(!hasItems&&!hasMeta)return list;
    const projectId=id();
    const stamp=now();
    const entry={id:projectId,name:legacyMeta.name||'Existing Project',reference:legacyMeta.reference||'',createdAt:stamp,updatedAt:stamp};
    writeJson(itemsKey(projectId),hasItems?legacyItems:[]);
    writeJson(metaKey(projectId),legacyMeta);
    list=[entry];
    saveList(list);
    localStorage.setItem(ACTIVE_KEY,projectId);
    return list;
  }
  function list(){
    const rows=migrateLegacy();
    return rows.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
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
  function create(input={}){
    const projectId=id();
    const stamp=now();
    const meta=normalizeMeta(input);
    const entry={id:projectId,name:meta.name||'Untitled Project',reference:meta.reference,createdAt:stamp,updatedAt:stamp};
    const rows=rawList();
    rows.push(entry);
    saveList(rows);
    writeJson(itemsKey(projectId),[]);
    writeJson(metaKey(projectId),meta);
    localStorage.setItem(ACTIVE_KEY,projectId);
    emit('vensis-projects-updated',projectId);
    return entry;
  }
  function ensureActive(){
    const current=activeId();
    if(current)return current;
    const rows=list();
    if(rows.length)return setActive(rows[0].id);
    return create({name:'Untitled Project'}).id;
  }
  function readItems(projectId=activeId()){
    if(!projectId)return [];
    const value=readJson(itemsKey(projectId),[]);
    return Array.isArray(value)?value:[];
  }
  function touch(projectId,patch={}){
    const rows=rawList();
    const index=rows.findIndex(entry=>entry.id===projectId);
    if(index<0)return;
    rows[index]={...rows[index],...patch,updatedAt:now()};
    saveList(rows);
  }
  function writeItems(items,projectId=activeId()){
    if(!projectId)projectId=ensureActive();
    writeJson(itemsKey(projectId),Array.isArray(items)?items:[]);
    touch(projectId);
    emit('vensis-project-updated',projectId);
    emit('vensis-projects-updated',projectId);
    return projectId;
  }
  function readMeta(projectId=activeId()){
    if(!projectId)return normalizeMeta({});
    return normalizeMeta(readJson(metaKey(projectId),{}));
  }
  function writeMeta(value,projectId=activeId()){
    if(!projectId)projectId=ensureActive();
    const current=readMeta(projectId);
    const meta=normalizeMeta({...current,...value});
    writeJson(metaKey(projectId),meta);
    touch(projectId,{name:meta.name||'Untitled Project',reference:meta.reference});
    emit('vensis-project-updated',projectId);
    emit('vensis-projects-updated',projectId);
    return meta;
  }
  function remove(projectId){
    const project=get(projectId);if(!project)return false;
    localStorage.removeItem(itemsKey(project.id));
    localStorage.removeItem(metaKey(project.id));
    const rows=rawList().filter(entry=>entry.id!==project.id);
    saveList(rows);
    if(activeId()===project.id){
      if(rows[0])localStorage.setItem(ACTIVE_KEY,rows[0].id);else localStorage.removeItem(ACTIVE_KEY);
    }
    emit('vensis-projects-updated',rows[0]?.id||'');
    return true;
  }
  function duplicate(projectId){
    const source=get(projectId);if(!source)return null;
    const meta=readMeta(source.id);
    const copy=create({name:`${meta.name||source.name||'Project'} Copy`,reference:meta.reference,globalDiscount:meta.globalDiscount});
    const items=JSON.parse(JSON.stringify(readItems(source.id)));
    writeItems(items,copy.id);
    return get(copy.id);
  }
  function projectUrl(projectId){return `project.html?project=${encodeURIComponent(projectId)}`}
  function open(projectId){
    const selected=setActive(projectId);
    if(selected)location.assign(projectUrl(selected));
  }

  migrateLegacy();
  window.VensisProjects={
    keys:{index:INDEX_KEY,active:ACTIVE_KEY,itemsPrefix:ITEM_PREFIX,metaPrefix:META_PREFIX},
    list,get,create,remove,duplicate,activeId,setActive,ensureActive,readItems,writeItems,readMeta,writeMeta,projectUrl,open
  };
})();
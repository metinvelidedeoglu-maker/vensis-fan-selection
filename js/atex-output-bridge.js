(function(){
  'use strict';

  const ATEX_LINES=[
    'ATEX: Zone 1 Gas / Zone 21 Dust',
    'II 2G Ex db IIC T4 Gb',
    'II 2D Ex tb IIIC T125°C Db'
  ];
  const ATEX_TEXT=ATEX_LINES.join('\n');
  let applying=false;

  function isVitloAtex(item){
    const manufacturer=String(item?.manufacturer||'').trim().toUpperCase();
    if(manufacturer!=='VITLO')return false;
    const identity=`${item?.series||''} ${item?.model||''}`;
    return /\/ATEX\b/i.test(identity)||/\bEX[\s-]?PROOF\b/i.test(identity);
  }

  function markedSafety(item){
    const current=String(item?.safetyWarning||'').trim();
    if(!isVitloAtex(item))return current;
    if(/Zone 1 Gas/i.test(current)&&/Zone 21 Dust/i.test(current)&&/II\s*2G/i.test(current)&&/II\s*2D/i.test(current))return current;
    return current?`${current}\n${ATEX_TEXT}`:ATEX_TEXT;
  }

  function projectContext(){
    const project=window.VensisProject;
    const store=window.VensisProjects;
    const id=project?.projectId||store?.activeId?.()||'';
    return {project,store,id};
  }

  function applyToProjectItems(){
    if(applying)return false;
    const {store,id}=projectContext();
    if(!store?.readItems||!store?.writeItems||!id)return false;
    const items=store.readItems(id);
    if(!Array.isArray(items)||!items.length)return false;
    let changed=false;
    items.forEach(item=>{
      if(!isVitloAtex(item))return;
      const next=markedSafety(item);
      if(next===String(item.safetyWarning||'').trim())return;
      item.safetyWarning=next;
      item.updatedAt=new Date().toISOString();
      changed=true;
    });
    if(!changed)return false;
    applying=true;
    try{store.writeItems(items,id)}finally{applying=false}
    return true;
  }

  function technicalSnapshot(event){
    const button=event.target.closest?.('#printProject');
    if(!button)return;
    const {project,store,id}=projectContext();
    if(!project||!store?.readItems||!store?.readMeta||!id)return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.VensisProjectPrint?.flushInlineEditors?.();
    applyToProjectItems();

    const items=store.readItems(id).map(item=>{
      const copy=JSON.parse(JSON.stringify(item));
      if(isVitloAtex(copy))copy.safetyWarning=markedSafety(copy);
      return copy;
    });
    if(!items.length){alert('Add at least one product before printing the project.');return}

    const savedMeta=store.readMeta(id)||{};
    const meta={
      id,
      name:document.getElementById('projectName')?.value.trim()||savedMeta.name||'',
      reference:document.getElementById('projectReference')?.value.trim()||savedMeta.reference||'',
      contact:document.getElementById('projectContact')?.value.trim()||savedMeta.contact||''
    };
    const key=window.VensisAccess?.storageKey?.('vensis_project_print_snapshot_v1')||'vensis_project_print_snapshot_v1';
    localStorage.setItem(key,JSON.stringify({version:8,createdAt:new Date().toISOString(),project:meta,items}));
    window.open('project-print.html?print=1','_blank');
  }

  function init(){
    applyToProjectItems();
    document.addEventListener('click',technicalSnapshot,true);
    window.addEventListener('vensis-project-updated',applyToProjectItems);
    window.addEventListener('vensis-project-cloud-applied',applyToProjectItems);
    window.addEventListener('storage',event=>{
      const {store,id}=projectContext();
      if(!id)return;
      const key=`${store?.keys?.itemsPrefix||''}${id}`;
      if(!event.key||event.key===key)applyToProjectItems();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.VensisAtexOutput={lines:ATEX_LINES.slice(),text:ATEX_TEXT,apply:applyToProjectItems,isVitloAtex};
})();

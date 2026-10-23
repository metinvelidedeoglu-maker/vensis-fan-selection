(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VensisQuotationFormats=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const FORMATS=['auto','fan','electrical','mixed'];
  function text(value){return String(value??'').trim().toLowerCase()}
  function preference(value){return FORMATS.includes(text(value))?text(value):'auto'}
  function itemType(item){
    const source=item&&typeof item==='object'?item:{};
    const explicit=text(source.productType||source.catalogType);
    if(explicit==='electrical')return 'electrical';
    if(explicit==='fan')return 'fan';
    if(text(source.itemKey).startsWith('electrical|'))return 'electrical';
    if(text(source.manufacturer)==='zonex')return 'electrical';
    if(source.orderCode||source.ip||source.lumen||source.operatingTemperature)return 'electrical';
    return 'fan';
  }
  function split(items){
    return (Array.isArray(items)?items:[]).reduce((groups,item)=>{groups[itemType(item)].push(item);return groups},{fan:[],electrical:[]});
  }
  function detect(items,selected='auto'){
    const chosen=preference(selected);
    if(chosen!=='auto')return chosen;
    const groups=split(items);
    if(groups.fan.length&&groups.electrical.length)return 'mixed';
    return groups.electrical.length?'electrical':'fan';
  }
  function label(value){return ({auto:'Otomatik',fan:'Fan',electrical:'Elektrik',mixed:'Karma'}[preference(value)]||'Otomatik')}
  return {FORMATS,detect,itemType,label,preference,split};
});

(function(root){
  'use strict';
  if(typeof document==='undefined'||!root.VensisQuotationFormats)return;

  const formats=root.VensisQuotationFormats;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const storageKey=key=>root.VensisAccess?.storageKey?.(key)||key;
  const QUOTATION_KEY=storageKey('vensis_active_quotation_v1');
  const PRINT_KEY=storageKey('vensis_project_print_snapshot_v1');

  function currentLanguage(){
    const runtime=root.VensisI18n?.getLanguage?.();
    if(runtime==='tr'||runtime==='en')return runtime;
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  }
  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}

  function stampQuotation(lang){
    const quotation=readJson(QUOTATION_KEY);
    if(!quotation||!Array.isArray(quotation.items))return;
    const format=formats.detect(quotation.items,quotation.format||'auto');
    quotation.outputLanguage=lang;
    quotation.resolvedFormat=format;
    writeJson(QUOTATION_KEY,quotation);
  }
  function stampProjectPrint(lang){
    const snapshot=readJson(PRINT_KEY);
    if(!snapshot||!Array.isArray(snapshot.items))return;
    snapshot.outputLanguage=lang;
    writeJson(PRINT_KEY,snapshot);
  }
  function appendLanguage(url,lang){
    try{
      const parsed=new URL(String(url||''),location.href);
      parsed.searchParams.set('lang',lang);
      return parsed.origin===location.origin?`${parsed.pathname}${parsed.search}${parsed.hash}`:parsed.href;
    }catch{return url}
  }

  if(page==='project.html'){
    const nativeOpen=root.open.bind(root);
    root.open=function(url,target,features){
      const raw=String(url||'');
      const lang=currentLanguage();
      if(/(?:^|\/)quotation\.html(?:[?#]|$)/i.test(raw)){
        stampQuotation(lang);
        url=appendLanguage(raw,lang);
      }else if(/(?:^|\/)project-print\.html(?:[?#]|$)/i.test(raw)){
        stampProjectPrint(lang);
        url=appendLanguage(raw,lang);
      }
      return nativeOpen(url,target,features);
    };
    return;
  }

  if(page==='quotation.html'){
    const quotation=readJson(QUOTATION_KEY);
    const requested=new URLSearchParams(location.search).get('lang');
    const saved=quotation?.outputLanguage;
    const lang=requested==='tr'||requested==='en'?requested:(saved==='tr'||saved==='en'?saved:currentLanguage());
    root.VensisOutputLanguage=lang;
    document.documentElement.lang=lang;
    try{localStorage.setItem('vensis_language_v1',lang)}catch{}
    if(quotation){quotation.outputLanguage=lang;writeJson(QUOTATION_KEY,quotation)}
  }
})(typeof window!=='undefined'?window:globalThis);

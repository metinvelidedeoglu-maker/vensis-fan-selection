(function(){
  'use strict';

  const SITE='https://select.vensis.com.tr';
  const STORAGE_KEY='vensis_language_v1';
  const PUBLIC_PATHS=[
    '/catalog-hub.html','/catalog-ventilation.html','/catalog-brand.html',
    '/catalog-vortice-stable.html','/catalog-vortice.html','/electrical/index.html'
  ];
  const valid=value=>value==='tr'||value==='en'?value:'';
  const stripLocale=pathname=>{
    const clean=String(pathname||'/').replace(/\/+/g,'/');
    const stripped=clean.replace(/^\/(tr|en)(?=\/)/i,'');
    return stripped||'/';
  };
  const localeFromPath=pathname=>{
    const match=String(pathname||'').match(/^\/(tr|en)(?:\/|$)/i);
    return match?match[1].toLowerCase():'';
  };
  const isCleanFanPath=pathname=>/^\/fan\/(?:vitlo|soler-palau|vortice)(?:\/|$)/i.test(stripLocale(pathname));
  const isPublicPath=pathname=>{
    const clean=stripLocale(pathname).toLowerCase();
    return isCleanFanPath(clean)||PUBLIC_PATHS.some(item=>clean.endsWith(item));
  };
  const currentLanguage=()=>{
    const query=new URLSearchParams(location.search);
    return valid(localeFromPath(location.pathname))||
      valid(query.get('lang'))||
      valid(String(document.documentElement.lang||'').slice(0,2).toLowerCase())||
      (()=>{try{return valid(localStorage.getItem(STORAGE_KEY)||'')}catch{return ''}})()||'en';
  };

  function localeUrl(value,language=currentLanguage()){
    let url;
    try{url=new URL(value,location.href)}catch{return value}
    const lang=valid(language)||'en';
    if(url.origin!==SITE||!isPublicPath(url.pathname))return url.href;
    url.searchParams.delete('lang');
    if(isCleanFanPath(url.pathname)){
      url.searchParams.delete('brand');
      url.searchParams.delete('series');
      url.searchParams.delete('model');
    }
    url.pathname=`/${lang}${stripLocale(url.pathname)}`.replace(/\/+/g,'/');
    return url.href;
  }

  function setAlternate(hreflang,href){
    let node=document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if(!node){
      node=document.createElement('link');
      node.rel='alternate';
      node.hreflang=hreflang;
      document.head.appendChild(node);
    }
    node.href=href;
  }

  function setMetaProperty(property,content){
    let node=document.head.querySelector(`meta[property="${property}"]`);
    if(!node){node=document.createElement('meta');node.setAttribute('property',property);document.head.appendChild(node)}
    node.setAttribute('content',content);
  }

  function patchCanonical(language){
    let canonical=document.head.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
    const source=canonical.href||location.href;
    const own=localeUrl(source,language);
    const en=localeUrl(own,'en');
    const tr=localeUrl(own,'tr');
    canonical.href=own;
    setAlternate('en',en);
    setAlternate('tr',tr);
    setAlternate('x-default',en);
    setMetaProperty('og:url',own);
    setMetaProperty('og:locale',language==='tr'?'tr_TR':'en_US');
    setMetaProperty('og:locale:alternate',language==='tr'?'en_US':'tr_TR');
  }

  function patchLinks(language){
    document.querySelectorAll('a[href]').forEach(anchor=>{
      let url;
      try{url=new URL(anchor.href,location.href)}catch{return}
      if(url.origin!==SITE||!isPublicPath(url.pathname))return;
      const next=localeUrl(url.href,language);
      if(anchor.href!==next)anchor.href=next;
    });
  }

  function patchJsonLd(language){
    const node=document.getElementById('vensisSeoJsonLd');
    if(!node?.textContent)return;
    const before=node.textContent;
    let data;
    try{data=JSON.parse(before)}catch{return}
    const visit=value=>{
      if(Array.isArray(value)){value.forEach(visit);return}
      if(!value||typeof value!=='object')return;
      for(const [key,item] of Object.entries(value)){
        if(typeof item==='string'&&/^https:\/\/select\.vensis\.com\.tr\//i.test(item)){
          try{
            const url=new URL(item);
            if(isPublicPath(url.pathname))value[key]=localeUrl(url.href,language);
          }catch{}
        }else if(item&&typeof item==='object')visit(item);
      }
    };
    visit(data);
    const after=JSON.stringify(data);
    if(after!==before)node.textContent=after;
  }

  function syncAddress(language){
    if(!isPublicPath(location.pathname))return;
    const next=localeUrl(location.href,language);
    if(next!==location.href)history.replaceState(history.state,'',next);
  }

  function exposeApi(){
    const old=window.VensisSeoLanguage||{};
    window.VensisSeoLanguage={...old,currentLanguage,withLanguage:localeUrl};
    window.VensisLocaleUrls={currentLanguage,localeUrl,stripLocale,isPublicPath,isCleanFanPath,apply};
  }

  function apply(forcedLanguage=''){
    const language=valid(forcedLanguage)||currentLanguage();
    document.documentElement.lang=language;
    try{localStorage.setItem(STORAGE_KEY,language)}catch{}
    syncAddress(language);
    patchCanonical(language);
    patchLinks(language);
    patchJsonLd(language);
    exposeApi();
  }

  let timer=0;
  function schedule(delay=180,language=''){
    clearTimeout(timer);
    timer=setTimeout(()=>apply(language),delay);
  }

  exposeApi();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(220),{once:true});
  else schedule(120);
  window.addEventListener('load',()=>schedule(220),{once:true});
  window.addEventListener('vensis-language-changed',event=>{
    const language=valid(event.detail?.language)||valid(event.detail?.lang)||'';
    schedule(220,language);
  });
  window.addEventListener('vensis-electrical-route-changed',()=>schedule(220));
  window.addEventListener('popstate',()=>schedule(120));
  new MutationObserver(()=>schedule(180)).observe(document.documentElement,{childList:true,subtree:true});
})();

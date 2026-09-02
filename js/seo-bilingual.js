(function(){
  'use strict';

  const SITE='https://select.vensis.com.tr';
  const STORAGE_KEY='vensis_language_v1';
  const INDEXABLE_PATHS=[
    '/catalog-hub.html','/catalog-ventilation.html','/catalog-brand.html',
    '/catalog-vortice-stable.html','/catalog-vortice.html','/electrical/index.html'
  ];
  const path=(location.pathname||'/').replace(/\/+/g,'/');
  const isIndexable=INDEXABLE_PATHS.some(item=>path.toLowerCase().endsWith(item));
  if(!isIndexable)return;

  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const validLang=value=>value==='tr'||value==='en'?value:'';
  const query=()=>new URLSearchParams(location.search);
  const isCatalogPath=value=>INDEXABLE_PATHS.some(item=>String(value||'').toLowerCase().endsWith(item));
  const meta=(selector,attrs)=>{
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement('meta');document.head.appendChild(node)}
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));
    return node;
  };
  const setName=(name,content)=>meta(`meta[name="${name}"]`,{name,content});
  const setProperty=(property,content)=>meta(`meta[property="${property}"]`,{property,content});

  function storedLanguage(){
    try{return validLang(localStorage.getItem(STORAGE_KEY)||'')}catch{return ''}
  }
  function currentLanguage(){
    return validLang(query().get('lang'))||
      validLang(window.VensisI18n?.getLanguage?.())||
      validLang(String(document.documentElement.lang||'').slice(0,2).toLowerCase())||
      storedLanguage()||'en';
  }
  function withLanguage(value,lang=currentLanguage()){
    let url;
    try{url=new URL(value,location.href)}catch{return value}
    if(url.origin!==SITE||!isCatalogPath(url.pathname))return url.href;
    url.searchParams.set('lang',validLang(lang)||'en');
    return url.href;
  }
  function syncLocationLanguage(lang=currentLanguage()){
    const normalized=validLang(lang)||'en';
    const url=new URL(location.href);
    if(url.searchParams.get('lang')!==normalized){
      url.searchParams.set('lang',normalized);
      history.replaceState(history.state,'',url.href);
    }
    document.documentElement.lang=normalized;
    try{localStorage.setItem(STORAGE_KEY,normalized)}catch{}
    return normalized;
  }
  function setAlternate(hreflang,href){
    let node=document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if(!node){node=document.createElement('link');node.rel='alternate';node.hreflang=hreflang;document.head.appendChild(node)}
    node.href=href;
  }
  function setCanonicalAndAlternates(lang){
    let canonical=document.head.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
    const source=canonical.href||location.href;
    canonical.href=withLanguage(source,lang);
    const base=new URL(canonical.href);
    base.searchParams.delete('lang');
    const en=withLanguage(base.href,'en');
    const tr=withLanguage(base.href,'tr');
    setAlternate('en',en);
    setAlternate('tr',tr);
    setAlternate('x-default',en);
    setProperty('og:url',canonical.href);
    setProperty('og:locale',lang==='tr'?'tr_TR':'en_US');
    setProperty('og:locale:alternate',lang==='tr'?'en_US':'tr_TR');
  }
  function patchInternalLinks(lang){
    document.querySelectorAll('a[href]').forEach(anchor=>{
      let url;
      try{url=new URL(anchor.href,location.href)}catch{return}
      if(url.origin!==SITE||!isCatalogPath(url.pathname))return;
      const localized=withLanguage(url.href,lang);
      if(anchor.href!==localized)anchor.href=localized;
    });
  }
  function patchJsonLd(lang){
    const node=document.getElementById('vensisSeoJsonLd');
    if(!node?.textContent)return;
    let data;
    try{data=JSON.parse(node.textContent)}catch{return}
    const trNames={
      'Product Catalog':'Ürün Kataloğu','Ventilation':'Havalandırma','Electrical':'Elektrik',
      'Ventilation Catalog':'Havalandırma Kataloğu','Electrical Catalog':'Elektrik Kataloğu'
    };
    const visit=value=>{
      if(Array.isArray(value)){value.forEach(visit);return}
      if(!value||typeof value!=='object')return;
      const type=value['@type'];
      if(type&&['CollectionPage','ProductGroup','Product','BreadcrumbList','ItemList','WebPage'].includes(type)){
        value.inLanguage=lang==='tr'?'tr-TR':'en';
      }
      for(const [key,item] of Object.entries(value)){
        if(typeof item==='string'){
          if(/^https:\/\/select\.vensis\.com\.tr\//i.test(item)){
            try{
              const url=new URL(item);
              if(isCatalogPath(url.pathname))value[key]=withLanguage(url.href,lang);
            }catch{}
          }else if(lang==='tr'&&key==='name'&&trNames[item])value[key]=trNames[item];
        }else visit(item);
      }
    };
    visit(data);
    node.textContent=JSON.stringify(data);
  }
  function categoryTr(value){
    const map={
      'Axial Fan':'Aksiyel Fan','Centrifugal Fan':'Santrifüj Fan','Roof Fan':'Çatı Fanı',
      'Duct Fan':'Kanal Tipi Fan','Mixed Flow Fan':'Karışık Akışlı Fan','EC Fan':'EC Fan',
      'Quiet Fan':'Sessiz Fan','Smoke Exhaust Fan':'Duman Tahliye Fanı','Extract Fan':'Egzoz Fanı',
      'Residential Fan':'Konut Tipi Fan','Cabinet Fan':'Kabin Fanı','Wall-Mounted Fan':'Duvar Tipi Fan',
      'Explosion-Proof / ATEX Fan':'Exproof / ATEX Fan'
    };
    return map[text(value)]||text(value);
  }
  function fanSeriesCopy(lang){
    if(!(path.endsWith('/catalog-brand.html')||path.endsWith('/catalog-vortice.html')))return null;
    const params=query();
    const seriesId=text(params.get('series'));
    if(!seriesId)return null;
    const catalog=window.VensisCatalog;
    const series=catalog?.getSeries?catalog.getSeries(seriesId):(catalog?.series||[]).find(row=>String(row.id)===seriesId);
    if(!series)return null;
    const manufacturer=text(series.manufacturer||'Vensis');
    const code=text(series.code||series.id||seriesId);
    const models=(series.modelIds||[]).map(id=>catalog?.getModel?.(id)).filter(Boolean);
    const requested=text(params.get('model'));
    const selected=requested?models.find(model=>
      String(model.id)===requested||text(model.technical?.productCode)===requested||text(model.model)===requested
    ):null;
    if(lang==='en')return null;
    if(selected){
      const modelName=text(selected.model||selected.technical?.productCode||selected.id);
      const bits=[
        Number(selected.performance?.nominalAirflow)>0?`${Number(selected.performance.nominalAirflow)} m³/h debi`:'',
        Number(selected.motor?.power)>0?`${Number(selected.motor.power)} kW`:'',
        text(selected.technical?.fireRating||''),text(selected.technical?.ipClass||'')
      ].filter(Boolean);
      return {
        title:`${modelName} | ${manufacturer} ${code} | Vensis Ürün Kataloğu`,
        description:`${manufacturer} ${modelName}${bits.length?' · '+bits.join(' · '):''}. Vensis kataloğunda teknik özellikler, performans verileri ve ürün bilgileri.`
      };
    }
    const categories=(series.categories||[]).map(categoryTr).filter(Boolean).slice(0,3);
    return {
      title:`${code} | ${manufacturer} Fan Serisi | Vensis`,
      description:`${manufacturer} ${code} fan serisi${categories.length?' · '+categories.join(' · '):''}. Teknik özellikler, performans verileri, model seçenekleri ve ürün bilgilerini inceleyin.`
    };
  }
  function staticCopy(lang){
    if(lang!=='tr')return null;
    const params=query();
    if(path.endsWith('/catalog-hub.html'))return {
      title:'Endüstriyel Ürün Kataloğu | Vensis',
      description:'Vensis endüstriyel havalandırma ve elektrik ürünlerini teknik veriler, model seçenekleri ve mühendislik odaklı ürün bilgileriyle inceleyin.'
    };
    if(path.endsWith('/catalog-ventilation.html'))return {
      title:'Endüstriyel Havalandırma Fan Kataloğu | Vensis',
      description:'Vitlo, Vortice ve Soler & Palau fan serilerini, teknik özellikleri, performans verilerini ve model seçeneklerini Vensis havalandırma kataloğunda inceleyin.'
    };
    if(path.endsWith('/catalog-vortice-stable.html'))return {
      title:'Vortice Fan Kataloğu | Vensis',
      description:'Vortice konut tipi egzoz fanları, kanal tipi fanlar, çatı fanları, karışık akışlı fanlar ve ATEX ürünlerini teknik katalog verileriyle inceleyin.'
    };
    if(path.endsWith('/catalog-brand.html')&&!params.get('series')){
      const brand=params.get('brand')==='sp'?'Soler & Palau':'Vitlo';
      return {
        title:`${brand} Fan Kataloğu | Vensis`,
        description:`${brand} havalandırma ürünlerini, fan serilerini, teknik özellikleri, performans verilerini ve model seçeneklerini Vensis ürün kataloğunda inceleyin.`
      };
    }
    if(path.endsWith('/electrical/index.html')&&!params.get('series'))return {
      title:'Endüstriyel Elektrik Ürün Kataloğu | Vensis',
      description:'Exproof aydınlatma, buat, pano, kumanda ve saha elektrik ürünlerini teknik özellikler, model seçenekleri ve fiyat bilgileriyle inceleyin.'
    };
    return fanSeriesCopy(lang);
  }
  function setCopy(copy){
    if(!copy)return;
    document.title=copy.title;
    setName('description',copy.description);
    setProperty('og:title',copy.title);
    setProperty('og:description',copy.description);
    setName('twitter:title',copy.title);
    setName('twitter:description',copy.description);
  }
  function apply(){
    const lang=syncLocationLanguage(currentLanguage());
    setCanonicalAndAlternates(lang);
    setCopy(staticCopy(lang)||fanSeriesCopy(lang));
    patchInternalLinks(lang);
    patchJsonLd(lang);
  }
  function schedule(delay=100){setTimeout(apply,delay)}

  window.VensisSeoLanguage={apply,currentLanguage,withLanguage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(140),{once:true});
  else schedule(140);
  window.addEventListener('load',()=>schedule(80),{once:true});
  window.addEventListener('vensis-language-changed',event=>{
    const lang=validLang(event.detail?.language);
    if(lang)syncLocationLanguage(lang);
    schedule(140);
  });
  window.addEventListener('vensis-electrical-route-changed',()=>schedule(120));
  window.addEventListener('popstate',()=>schedule(80));
})();

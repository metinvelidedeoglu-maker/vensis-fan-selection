(function(){
  'use strict';

  const SITE='https://select.vensis.com.tr';
  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const brandSlugs={vitlo:'vitlo',sp:'soler-palau',vortice:'vortice'};
  const brandLabels={vitlo:'Vitlo',sp:'Soler & Palau',vortice:'Vortice'};
  const slugify=value=>text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/ı/g,'i').replace(/İ/g,'I').replace(/ş/gi,'s').replace(/ğ/gi,'g').replace(/ç/gi,'c').replace(/ö/gi,'o').replace(/ü/gi,'u')
    .toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');

  function routeFromLocation(){
    if(window.VENSIS_CLEAN_FAN_ROUTE)return {...window.VENSIS_CLEAN_FAN_ROUTE,clean:true};
    const pathname=location.pathname||'/';
    const lower=pathname.toLowerCase();
    const locale=lower.match(/^\/(tr|en)(?:\/|$)/)?.[1]||'';
    const language=locale||(document.documentElement.lang==='tr'?'tr':'en');
    const params=new URLSearchParams(location.search);
    let brandKey='';
    if(lower.endsWith('/catalog-brand.html'))brandKey=params.get('brand')==='sp'?'sp':'vitlo';
    else if(lower.endsWith('/catalog-vortice.html')||lower.endsWith('/catalog-vortice-stable.html'))brandKey='vortice';
    else return null;
    return {
      language,
      brandKey,
      brandSlug:brandSlugs[brandKey],
      seriesSlug:slugify(params.get('series')),
      modelSlug:slugify(params.get('model')),
      pathname,
      clean:false
    };
  }

  const route=routeFromLocation();
  if(!route)return;

  function currentLanguage(){
    const html=String(document.documentElement.lang||'').toLowerCase();
    if(html.startsWith('tr'))return 'tr';
    if(html.startsWith('en'))return 'en';
    return (location.pathname||'').toLowerCase().match(/^\/(tr|en)(?:\/|$)/)?.[1]||route.language||'en';
  }
  function catalog(){return window.VensisCatalog||null}
  function seriesById(id){
    const source=catalog();
    if(!source)return null;
    return (typeof source.getSeries==='function'?source.getSeries(id):null)||
      (source.series||[]).find(item=>String(item.id)===String(id))||null;
  }
  function modelsForSeries(series){
    const source=catalog();
    if(!source||!series)return [];
    if(typeof source.modelsForSeries==='function')return source.modelsForSeries(series.id)||[];
    return (series.modelIds||[]).map(id=>source.getModel?.(id)).filter(Boolean);
  }
  function resolveSeries(){
    if(!route.seriesSlug)return null;
    const rows=catalog()?.series||[];
    return rows.find(series=>[
      series.id,series.code,series.title,
      `${series.manufacturer||''}-${series.code||series.id||''}`
    ].some(value=>slugify(value)===route.seriesSlug))||null;
  }
  function modelIdentity(model){return text(model?.technical?.productCode||model?.model||model?.id)}
  function resolveModel(series){
    if(!series||!route.modelSlug)return null;
    return modelsForSeries(series).find(model=>[
      modelIdentity(model),model?.model,model?.id
    ].some(value=>slugify(value)===route.modelSlug))||null;
  }
  function cleanUrl(series=null,model=null,language=currentLanguage()){
    const brand=brandSlugs[route.brandKey]||route.brandSlug||'vitlo';
    const parts=[language,'fan',brand];
    if(series)parts.push(slugify(series.code||series.id));
    if(model)parts.push(slugify(modelIdentity(model)));
    return `${SITE}/${parts.join('/')}/`;
  }
  function setMeta(selector,attrs){
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement('meta');document.head.appendChild(node)}
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));
  }
  function setCanonical(href){
    let node=document.head.querySelector('link[rel="canonical"]');
    if(!node){node=document.createElement('link');node.rel='canonical';document.head.appendChild(node)}
    node.href=href;
  }
  function setAlternate(hreflang,href){
    let node=document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if(!node){node=document.createElement('link');node.rel='alternate';node.hreflang=hreflang;document.head.appendChild(node)}
    node.href=href;
  }
  function setJsonLd(data){
    let node=document.getElementById('vensisSeoJsonLd');
    if(!node){node=document.createElement('script');node.id='vensisSeoJsonLd';node.type='application/ld+json';document.head.appendChild(node)}
    node.textContent=JSON.stringify(data);
  }
  function productDescription(series,model){
    const manufacturer=text(series?.manufacturer||brandLabels[route.brandKey]||'Vensis');
    const code=text(series?.code||series?.id);
    const language=currentLanguage();
    if(model){
      const facts=[];
      if(Number(model.performance?.nominalAirflow)>0)facts.push(`${Number(model.performance.nominalAirflow)} m³/h`);
      if(Number(model.motor?.power)>0)facts.push(`${Number(model.motor.power)} kW`);
      if(Number(model.motor?.speed)>0)facts.push(`${Number(model.motor.speed)} rpm`);
      const modelName=text(model.model||modelIdentity(model));
      if(language==='tr'){
        const base=`${manufacturer} ${modelName}, ${code} fan serisi`;
        return facts.length?`${base}. Katalog verileri: ${facts.join(', ')}. Teknik özellikleri ve ürün verilerini inceleyin.`:`${base}. Teknik özellikleri ve ürün verilerini inceleyin.`;
      }
      const base=`${manufacturer} ${modelName}, ${code} fan series`;
      return facts.length?`${base}. Catalog data: ${facts.join(', ')}. Review technical specifications and product data.`:`${base}. Review technical specifications and product data.`;
    }
    return language==='tr'
      ?`${manufacturer} ${code} fan serisi, teknik özellikler, model seçenekleri ve ürün verileri.`
      :`${manufacturer} ${code} fan series, technical specifications, model options and product data.`;
  }
  function applyRootSeo(){
    const own=cleanUrl();
    const en=cleanUrl(null,null,'en');
    const tr=cleanUrl(null,null,'tr');
    setCanonical(own);
    setAlternate('en',en);
    setAlternate('tr',tr);
    setAlternate('x-default',en);
    setMeta('meta[property="og:url"]',{property:'og:url',content:own});
  }
  function markUnresolved(series=null){
    const fallback=series?cleanUrl(series):cleanUrl();
    setMeta('meta[name="robots"]',{name:'robots',content:'noindex,follow'});
    setCanonical(fallback);
    setMeta('meta[property="og:url"]',{property:'og:url',content:fallback});
  }
  function applySeo(series,model){
    if(!series)return;
    const language=currentLanguage();
    const manufacturer=text(series.manufacturer||brandLabels[route.brandKey]||'Vensis');
    const code=text(series.code||series.id);
    const own=cleanUrl(series,model,language);
    const en=cleanUrl(series,model,'en');
    const tr=cleanUrl(series,model,'tr');
    const description=productDescription(series,model);
    const title=model
      ?`${text(model.model||modelIdentity(model))} | ${manufacturer} ${code} | Vensis`
      :language==='tr'?`${manufacturer} ${code} Fan Serisi | Vensis`:`${manufacturer} ${code} Fan Series | Vensis`;
    document.title=title;
    setMeta('meta[name="description"]',{name:'description',content:description});
    setMeta('meta[name="robots"]',{name:'robots',content:'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'});
    setMeta('meta[property="og:title"]',{property:'og:title',content:title});
    setMeta('meta[property="og:description"]',{property:'og:description',content:description});
    setMeta('meta[property="og:url"]',{property:'og:url',content:own});
    setCanonical(own);
    setAlternate('en',en);
    setAlternate('tr',tr);
    setAlternate('x-default',en);

    const seriesUrl=cleanUrl(series,null,language);
    const crumbs=[
      {'@type':'ListItem',position:1,name:language==='tr'?'Ürün Kataloğu':'Product Catalog',item:`${SITE}/${language}/catalog-hub.html`},
      {'@type':'ListItem',position:2,name:language==='tr'?'Havalandırma':'Ventilation',item:`${SITE}/${language}/catalog-ventilation.html`},
      {'@type':'ListItem',position:3,name:manufacturer,item:cleanUrl(null,null,language)},
      {'@type':'ListItem',position:4,name:code,item:seriesUrl}
    ];
    if(model)crumbs.push({'@type':'ListItem',position:5,name:text(model.model||modelIdentity(model)),item:own});
    const graph=[
      {'@type':'Organization','@id':SITE+'/#organization',name:'Vensis',url:SITE+'/'},
      {'@type':'BreadcrumbList',itemListElement:crumbs},
      {'@type':'ProductGroup','@id':seriesUrl+'#product-group',name:`${manufacturer} ${code}`,productGroupID:code,brand:{'@type':'Brand',name:manufacturer},url:seriesUrl,description:productDescription(series,null),inLanguage:language==='tr'?'tr-TR':'en'}
    ];
    if(model){
      const item={'@type':'Product','@id':own+'#product',name:text(model.model||modelIdentity(model)),sku:modelIdentity(model),brand:{'@type':'Brand',name:manufacturer},url:own,isVariantOf:{'@id':seriesUrl+'#product-group'},description,inLanguage:language==='tr'?'tr-TR':'en'};
      const price=Number(model.pricing?.listPrice);
      if(Number.isFinite(price)&&price>0)item.offers={'@type':'Offer',url:own,price:price.toFixed(2),priceCurrency:text(model.pricing?.currency||'EUR'),seller:{'@id':SITE+'/#organization'}};
      graph.push(item);
    }
    setJsonLd({'@context':'https://schema.org','@graph':graph});
  }
  function selectModel(series,model){
    if(!series||!model)return;
    document.querySelectorAll('.model-card').forEach(card=>{
      const id=card.querySelector('[data-model-datasheet]')?.getAttribute('data-model-datasheet');
      card.hidden=String(id)!==String(model.id);
    });
    const count=document.querySelector('.models-section .catalog-count');
    if(count)count.textContent='1 Model';
  }
  function installLinks(series){
    const source=catalog();
    if(!source)return;
    document.querySelectorAll('.series-card[data-series]').forEach(card=>{
      const row=seriesById(card.dataset.series);
      if(!row)return;
      let link=card.querySelector(':scope > a.vensis-clean-series-link');
      if(!link){
        link=document.createElement('a');
        link.className='vensis-clean-series-link';
        link.style.cssText='position:absolute;inset:0;z-index:2;text-indent:-9999px;overflow:hidden;border-radius:inherit';
        card.style.position=card.style.position||'relative';
        card.appendChild(link);
      }
      link.href=cleanUrl(row);
      link.setAttribute('aria-label',text(card.querySelector('h2')?.textContent||row.code||row.id));
    });
    if(!series)return;
    for(const card of document.querySelectorAll('.model-card')){
      const id=card.querySelector('[data-model-datasheet]')?.getAttribute('data-model-datasheet');
      const model=(typeof source.getModel==='function'?source.getModel(id):null);
      const heading=card.querySelector('.model-card-head h3');
      if(!model||!heading)continue;
      let link=heading.querySelector('a.vensis-clean-model-link');
      if(!link){
        link=document.createElement('a');
        link.className='vensis-clean-model-link';
        link.style.color='inherit';link.style.textDecoration='none';
        link.textContent=heading.textContent;
        heading.textContent='';heading.appendChild(link);
      }
      link.href=cleanUrl(series,model);
    }
  }
  function cleanAddress(series,model){
    let target='';
    const language=currentLanguage();
    if(route.seriesSlug){
      if(!series)return;
      if(route.modelSlug&&!model)return;
      target=cleanUrl(series,model||null,language);
    }else target=cleanUrl(null,null,language);
    const url=new URL(target);
    const next=url.pathname+(location.hash||'');
    if(location.pathname+location.search+(location.hash||'')!==next)history.replaceState(history.state,'',next);
  }
  function apply(){
    const source=catalog();
    if(!source||!window.Catalog){setTimeout(apply,80);return}
    const series=resolveSeries();
    let model=null;
    if(route.seriesSlug){
      if(!series){installLinks(null);markUnresolved(null);return}
      if(typeof window.Catalog.showSeries==='function')window.Catalog.showSeries(series.id);
      model=resolveModel(series);
      installLinks(series);
      if(route.modelSlug&&!model){markUnresolved(series);return}
      if(model)selectModel(series,model);
      applySeo(series,model);
    }else{
      installLinks(null);
      applyRootSeo();
    }
    cleanAddress(series,model);
  }

  document.addEventListener('click',event=>{
    const card=event.target.closest?.('.series-card[data-series]');
    if(card){
      const row=seriesById(card.dataset.series);
      if(row){event.preventDefault();event.stopImmediatePropagation();location.assign(cleanUrl(row));}
      return;
    }
    const back=event.target.closest?.('.detail-back');
    if(back){event.preventDefault();event.stopImmediatePropagation();location.assign(cleanUrl());}
  },true);

  document.addEventListener('keydown',event=>{
    const card=event.target.closest?.('.series-card[data-series]');
    if(card&&(event.key==='Enter'||event.key===' ')){
      const row=seriesById(card.dataset.series);
      if(row){event.preventDefault();event.stopImmediatePropagation();location.assign(cleanUrl(row));}
    }
  },true);

  window.VensisCatalogRoutes={slugify,cleanUrl,currentLanguage,route};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  window.addEventListener('vensis-language-changed',()=>setTimeout(apply,80));
})();

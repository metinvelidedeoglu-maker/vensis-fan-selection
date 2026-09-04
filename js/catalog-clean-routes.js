(function(){
  'use strict';

  const SITE='https://select.vensis.com.tr';
  const route=window.VENSIS_CLEAN_FAN_ROUTE;
  if(!route)return;

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

  function catalog(){return window.VensisCatalog||null}
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
  function cleanUrl(series=null,model=null,language=route.language){
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
    if(model){
      const facts=[];
      if(Number(model.performance?.nominalAirflow)>0)facts.push(`${Number(model.performance.nominalAirflow)} m³/h`);
      if(Number(model.motor?.power)>0)facts.push(`${Number(model.motor.power)} kW`);
      if(Number(model.motor?.speed)>0)facts.push(`${Number(model.motor.speed)} rpm`);
      const base=`${manufacturer} ${text(model.model||modelIdentity(model))}, ${text(series.code||series.id)} fan series`;
      return facts.length?`${base}. ${facts.join(', ')}. Technical specifications and catalog data.`:`${base}. Technical specifications and catalog data.`;
    }
    return `${manufacturer} ${text(series?.code||series?.id)} fan series, technical specifications, model options and product data.`;
  }
  function applySeo(series,model){
    if(!series)return;
    const manufacturer=text(series.manufacturer||brandLabels[route.brandKey]||'Vensis');
    const code=text(series.code||series.id);
    const own=cleanUrl(series,model,route.language);
    const en=cleanUrl(series,model,'en');
    const tr=cleanUrl(series,model,'tr');
    const description=productDescription(series,model);
    const title=model
      ?`${text(model.model||modelIdentity(model))} | ${manufacturer} ${code} | Vensis`
      :`${manufacturer} ${code} Fan Series | Vensis`;
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

    const seriesUrl=cleanUrl(series,null,route.language);
    const crumbs=[
      {'@type':'ListItem',position:1,name:'Product Catalog',item:`${SITE}/${route.language}/catalog-hub.html`},
      {'@type':'ListItem',position:2,name:'Ventilation',item:`${SITE}/${route.language}/catalog-ventilation.html`},
      {'@type':'ListItem',position:3,name:manufacturer,item:`${SITE}/${route.language}/fan/${brandSlugs[route.brandKey]||route.brandSlug}/`},
      {'@type':'ListItem',position:4,name:code,item:seriesUrl}
    ];
    if(model)crumbs.push({'@type':'ListItem',position:5,name:text(model.model||modelIdentity(model)),item:own});
    const graph=[
      {'@type':'Organization','@id':SITE+'/#organization',name:'Vensis',url:SITE+'/'},
      {'@type':'BreadcrumbList',itemListElement:crumbs},
      {'@type':'ProductGroup','@id':seriesUrl+'#product-group',name:`${manufacturer} ${code}`,productGroupID:code,brand:{'@type':'Brand',name:manufacturer},url:seriesUrl,description:productDescription(series,null)}
    ];
    if(model){
      const item={'@type':'Product','@id':own+'#product',name:text(model.model||modelIdentity(model)),sku:modelIdentity(model),brand:{'@type':'Brand',name:manufacturer},url:own,isVariantOf:{'@id':seriesUrl+'#product-group'}};
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
      const row=(typeof source.getSeries==='function'?source.getSeries(card.dataset.series):null)||
        (source.series||[]).find(item=>String(item.id)===String(card.dataset.series));
      if(!row)return;
      let link=card.querySelector(':scope > a.vensis-clean-series-link');
      if(!link){
        link=document.createElement('a');
        link.className='vensis-clean-series-link';
        link.style.cssText='position:absolute;inset:0;z-index:1;text-indent:-9999px;overflow:hidden;border-radius:inherit';
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
      if(!model||!heading)return;
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
  function cleanAddress(){
    const clean=route.pathname+(location.hash||'');
    if(location.pathname+location.search+(location.hash||'')!==clean)history.replaceState(history.state,'',clean);
  }
  function apply(){
    const source=catalog();
    if(!source||!window.Catalog){setTimeout(apply,80);return}
    const series=resolveSeries();
    if(route.seriesSlug&&series){
      window.Catalog.showSeries(series.id);
      const model=resolveModel(series);
      if(route.modelSlug&&model)selectModel(series,model);
      installLinks(series);
      applySeo(series,model);
    }else{
      installLinks(null);
    }
    cleanAddress();
  }

  document.addEventListener('click',event=>{
    const card=event.target.closest?.('.series-card[data-series]');
    if(card){
      const row=(typeof catalog()?.getSeries==='function'?catalog().getSeries(card.dataset.series):null);
      if(row){event.preventDefault();event.stopImmediatePropagation();location.assign(cleanUrl(row));}
      return;
    }
    const back=event.target.closest?.('.detail-back');
    if(back){event.preventDefault();event.stopImmediatePropagation();location.assign(`${SITE}/${route.language}/fan/${brandSlugs[route.brandKey]||route.brandSlug}/`);}
  },true);

  document.addEventListener('keydown',event=>{
    const card=event.target.closest?.('.series-card[data-series]');
    if(card&&(event.key==='Enter'||event.key===' ')){
      const row=(typeof catalog()?.getSeries==='function'?catalog().getSeries(card.dataset.series):null);
      if(row){event.preventDefault();event.stopImmediatePropagation();location.assign(cleanUrl(row));}
    }
  },true);

  window.VensisCatalogRoutes={slugify,cleanUrl,route};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  window.addEventListener('vensis-language-changed',()=>setTimeout(apply,60));
})();

(function(){
  'use strict';

  const SITE='https://select.vensis.com.tr';
  const path=(location.pathname||'/').replace(/\/+/g,'/');
  const params=new URLSearchParams(location.search);
  const abs=value=>{
    const raw=String(value||'').trim();
    if(!raw)return '';
    try{return new URL(raw,SITE+path).href}catch{return ''}
  };
  const text=value=>String(value||'').replace(/\s+/g,' ').trim();
  const first=items=>Array.isArray(items)&&items.length?text(items[0]):'';
  const language=()=>window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'en';
  const brandLabels={vitlo:'Vitlo',sp:'Soler & Palau',vortice:'Vortice'};
  let retries=0;

  function meta(selector,attributes){
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement('meta');document.head.appendChild(node)}
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
    return node;
  }
  function setName(name,content){meta(`meta[name="${name}"]`,{name,content})}
  function setProperty(property,content){meta(`meta[property="${property}"]`,{property,content})}
  function canonical(url){
    let link=document.head.querySelector('link[rel="canonical"]');
    if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}
    link.href=url;
  }
  function jsonLd(data){
    let script=document.getElementById('vensisSeoJsonLd');
    if(!script){script=document.createElement('script');script.id='vensisSeoJsonLd';script.type='application/ld+json';document.head.appendChild(script)}
    script.textContent=JSON.stringify(data);
  }
  function setPage({title,description,url,image,type='website'}){
    document.title=title;
    setName('description',description);
    setName('robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    canonical(url);
    setProperty('og:site_name','Vensis Engineering Suite');
    setProperty('og:type',type);
    setProperty('og:title',title);
    setProperty('og:description',description);
    setProperty('og:url',url);
    if(image)setProperty('og:image',image);
    setName('twitter:card',image?'summary_large_image':'summary');
    setName('twitter:title',title);
    setName('twitter:description',description);
    if(image)setName('twitter:image',image);
  }
  function organization(){return {'@type':'Organization','@id':SITE+'/#organization',name:'Vensis',url:SITE+'/',logo:abs('/assets/vensis-logo.png')};}
  function collectionSchema(name,description,url,items=[]){
    const data={
      '@context':'https://schema.org',
      '@graph':[
        organization(),
        {'@type':'CollectionPage','@id':url+'#page',name,description,url,isPartOf:{'@id':SITE+'/#website'}},
        {'@type':'WebSite','@id':SITE+'/#website',name:'Vensis Engineering Suite',url:SITE+'/',publisher:{'@id':SITE+'/#organization'}}
      ]
    };
    if(items.length){
      data['@graph'].push({'@type':'ItemList','@id':url+'#items',itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,url:item.url}))});
    }
    return data;
  }
  function cleanCanonical(extra={}){
    const url=new URL(SITE+path);
    Object.entries(extra).forEach(([key,value])=>{if(value)url.searchParams.set(key,value)});
    return url.href;
  }
  function physicalModels(series,catalog){
    const rows=(series.modelIds||[]).map(id=>catalog.getModel?catalog.getModel(id):(catalog.models||[]).find(row=>String(row.id)===String(id))).filter(Boolean);
    const unique=new Map();
    for(const model of rows){
      const key=text(model.technical?.productCode||model.model||model.id);
      if(!key||unique.has(key))continue;
      unique.set(key,model);
      if(unique.size>=60)break;
    }
    return [...unique.values()];
  }
  function property(name,value,unitText){
    if(value===undefined||value===null||value===''||Number.isNaN(value))return null;
    const out={'@type':'PropertyValue',name,value:String(value)};
    if(unitText)out.unitText=unitText;
    return out;
  }
  function productVariant(model,series,url,index){
    const price=Number(model.pricing?.listPrice);
    const currency=text(model.pricing?.currency||'EUR');
    const productCode=text(model.technical?.productCode||model.model||model.id);
    const image=abs(model.media?.image||series.media?.image||'');
    const props=[
      property('Airflow',Number(model.performance?.nominalAirflow)||null,'m³/h'),
      property('Power',Number(model.motor?.power)||null,'kW'),
      property('Speed',Number(model.motor?.speed)||null,'rpm'),
      property('Current',Number(model.motor?.current)||null,'A'),
      property('Voltage',text(model.motor?.voltage||'')),
      property('Noise',Number(model.motor?.sound)||null,'dB(A)'),
      property('IP Class',text(model.technical?.ipClass||'')),
      property('Fire Rating',text(model.technical?.fireRating||'')),
      property('Fan Type',text(model.technical?.fanType||'')),
      property('Mount Type',text(model.technical?.mountType||''))
    ].filter(Boolean);
    const item={
      '@type':'Product',
      '@id':`${url}#variant-${index+1}`,
      name:text(`${series.code||series.id||''} ${model.model||productCode}`),
      sku:productCode,
      brand:{'@type':'Brand',name:text(series.manufacturer||model.manufacturer||'Vensis')},
      category:text(model.technical?.productGroup||(series.categories||[]).join(' / ')),
      url,
      isVariantOf:{'@id':url+'#product-group'}
    };
    if(image)item.image=image;
    if(props.length)item.additionalProperty=props;
    if(Number.isFinite(price)&&price>0){
      item.offers={
        '@type':'Offer',
        url,
        priceCurrency:currency||'EUR',
        price:price.toFixed(2),
        seller:{'@id':SITE+'/#organization'}
      };
    }
    return item;
  }
  function seriesSeo(series,catalog,url){
    const manufacturer=text(series.manufacturer||'Vensis');
    const code=text(series.code||series.id||'');
    const titleText=text(series.title||code);
    const description=first(series.description?.general)||`${manufacturer} ${code} fan series, technical specifications, model options and product data.`;
    const pageTitle=`${code} ${titleText&&titleText!==code?'| '+titleText+' ':''}| Vensis Product Catalog`.replace(/\s+\|/g,' |').trim();
    const image=abs(series.media?.image||'');
    setPage({title:pageTitle,description,url,image,type:'product'});
    const variants=physicalModels(series,catalog);
    const group={
      '@type':'ProductGroup',
      '@id':url+'#product-group',
      name:text(`${manufacturer} ${code} ${titleText}`),
      productGroupID:code||text(series.id),
      brand:{'@type':'Brand',name:manufacturer},
      category:text((series.categories||[]).join(' / ')),
      description,
      url
    };
    if(image)group.image=image;
    if(variants.length)group.hasVariant=variants.map((model,index)=>productVariant(model,series,url,index));
    jsonLd({'@context':'https://schema.org','@graph':[organization(),group]});
  }
  function catalogSeriesLinks(catalog,baseUrl){
    return (catalog.series||[]).slice(0,120).map(series=>{
      const url=new URL(baseUrl);
      url.searchParams.set('series',series.id);
      return {name:text(`${series.manufacturer||''} ${series.code||series.id} ${series.title||''}`),url:url.href};
    });
  }
  function installCrawlableFanLinks(){
    const brand=window.VensisCatalogBrand||params.get('brand')||'';
    document.querySelectorAll('.series-card[data-series]').forEach(card=>{
      if(card.querySelector(':scope > a.vensis-seo-card-link'))return;
      const id=card.getAttribute('data-series');
      if(!id)return;
      let href='';
      if(path.endsWith('/catalog-brand.html')){
        const url=new URL(SITE+'/catalog-brand.html');
        if(brand)url.searchParams.set('brand',brand);
        url.searchParams.set('series',id);
        href=url.href;
      }else if(path.endsWith('/catalog-vortice-stable.html')){
        const url=new URL(SITE+'/catalog-vortice.html');url.searchParams.set('series',id);href=url.href;
      }
      if(!href)return;
      card.style.position=card.style.position||'relative';
      const link=document.createElement('a');
      link.className='vensis-seo-card-link';
      link.href=href;
      link.setAttribute('aria-label',text(card.querySelector('h2')?.textContent||id));
      link.style.cssText='position:absolute;inset:0;z-index:1;text-indent:-9999px;overflow:hidden;border-radius:inherit';
      card.appendChild(link);
    });
  }
  function runFanCatalog(){
    const catalog=window.VensisCatalog;
    if(!catalog||!Array.isArray(catalog.series))return false;
    const seriesId=params.get('series');
    if(seriesId){
      const series=catalog.getSeries?catalog.getSeries(seriesId):catalog.series.find(row=>String(row.id)===String(seriesId));
      if(!series)return false;
      const brand=path.endsWith('/catalog-brand.html')?(window.VensisCatalogBrand||params.get('brand')||'vitlo'):'';
      const url=path.endsWith('/catalog-brand.html')?cleanCanonical({brand,series:seriesId}):cleanCanonical({series:seriesId});
      seriesSeo(series,catalog,url);
      return true;
    }
    const brand=window.VensisCatalogBrand||params.get('brand')||'vitlo';
    const label=brandLabels[brand]||text(catalog.series[0]?.manufacturer||'Ventilation');
    const url=cleanCanonical({brand:path.endsWith('/catalog-brand.html')?brand:''});
    const description=`Browse ${label} ventilation products, fan series, technical specifications, performance data and model information in the Vensis product catalog.`;
    setPage({title:`${label} Fan Catalog | Vensis`,description,url,image:abs(catalog.series[0]?.media?.image||'/assets/vensis-logo.png')});
    jsonLd(collectionSchema(`${label} Fan Catalog`,description,url,catalogSeriesLinks(catalog,url)));
    installCrawlableFanLinks();
    setTimeout(installCrawlableFanLinks,250);
    return true;
  }
  function runVorticeStable(){
    const manifest=Array.isArray(window.VensisVorticeSeriesManifest)?window.VensisVorticeSeriesManifest:[];
    const url=cleanCanonical();
    const description='Browse Vortice ventilation fan series, residential extract fans, mixed-flow fans, roof fans and ATEX products with technical catalog data.';
    setPage({title:'Vortice Fan Catalog | Vensis',description,url,image:abs(manifest[0]?.image||'/assets/vensis-logo.png')});
    const items=manifest.map(item=>{const target=new URL(SITE+'/catalog-vortice.html');target.searchParams.set('series',item.id);return {name:text(item.title||item.id),url:target.href};});
    jsonLd(collectionSchema('Vortice Fan Catalog',description,url,items));
    installCrawlableFanLinks();setTimeout(installCrawlableFanLinks,250);
    return true;
  }
  function runElectrical(){
    const products=Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[];
    const url=cleanCanonical();
    const description='Browse industrial electrical products, Ex-proof equipment, lighting, plugs, sockets and field products in the Vensis electrical catalog.';
    setPage({title:'Industrial Electrical Product Catalog | Vensis',description,url,image:abs('/assets/vensis-logo.png')});
    const items=products.slice(0,120).map(product=>({name:text(`${product.brand||''} ${product.modelName||''}`),url}));
    jsonLd(collectionSchema('Industrial Electrical Product Catalog',description,url,items));
    return true;
  }
  function runStatic(){
    if(path.endsWith('/catalog-hub.html')){
      const url=cleanCanonical();
      const description='Explore Vensis industrial ventilation and electrical product catalogs with technical data, model options and engineering-focused product information.';
      setPage({title:'Industrial Product Catalog | Vensis',description,url,image:abs('/assets/vensis-logo.png')});
      jsonLd(collectionSchema('Vensis Industrial Product Catalog',description,url,[{name:'Ventilation Catalog',url:SITE+'/catalog-ventilation.html'},{name:'Electrical Catalog',url:SITE+'/electrical/index.html'}]));
      return true;
    }
    if(path.endsWith('/catalog-ventilation.html')){
      const url=cleanCanonical();
      const description='Explore Vitlo, Vortice and Soler & Palau ventilation products, fan series and technical model data in the Vensis ventilation catalog.';
      setPage({title:'Industrial Ventilation Fan Catalog | Vensis',description,url,image:abs('/assets/vensis-logo.png')});
      jsonLd(collectionSchema('Industrial Ventilation Fan Catalog',description,url,[
        {name:'Vitlo Fan Catalog',url:SITE+'/catalog-brand.html?brand=vitlo'},
        {name:'Vortice Fan Catalog',url:SITE+'/catalog-vortice-stable.html'},
        {name:'Soler & Palau Fan Catalog',url:SITE+'/catalog-brand.html?brand=sp'}
      ]));
      return true;
    }
    return false;
  }
  function run(){
    let done=runStatic();
    if(!done&&path.endsWith('/catalog-vortice-stable.html'))done=runVorticeStable();
    if(!done&&(path.endsWith('/catalog-brand.html')||path.endsWith('/catalog-vortice.html')))done=runFanCatalog();
    if(!done&&path.endsWith('/electrical/index.html'))done=runElectrical();
    if(!done&&retries<20){retries++;setTimeout(run,75);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  window.addEventListener('vensis-language-changed',()=>setTimeout(run,0));
})();

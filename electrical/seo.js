(function(){
  'use strict';

  const SITE='https://select.vensis.com.tr';
  const products=()=>Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[];
  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const language=()=>String(document.documentElement.lang||'en').toLowerCase().startsWith('tr')?'tr':'en';
  const absolute=value=>{
    const raw=text(value);
    if(!raw)return '';
    try{return new URL(raw,SITE+'/electrical/index.html').href}catch{return ''}
  };

  function meta(selector,attrs){
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement('meta');document.head.appendChild(node)}
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));
    return node;
  }
  function setName(name,content){meta(`meta[name="${name}"]`,{name,content})}
  function setProperty(property,content){meta(`meta[property="${property}"]`,{property,content})}
  function setCanonical(url){
    let link=document.head.querySelector('link[rel="canonical"]');
    if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}
    link.href=url;
  }
  function setJsonLd(data){
    let node=document.getElementById('vensisSeoJsonLd');
    if(!node){node=document.createElement('script');node.id='vensisSeoJsonLd';node.type='application/ld+json';document.head.appendChild(node)}
    node.textContent=JSON.stringify(data);
  }
  function setPage({title,description,url,image,type='website'}){
    document.title=title;
    setName('description',description);
    setName('robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setCanonical(url);
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
  function organization(){
    return {'@type':'Organization','@id':SITE+'/#organization',name:'Vensis',url:SITE+'/',logo:absolute('../assets/vensis-logo.png')};
  }
  function routeUrl(series='',model=''){
    const url=new URL(SITE+'/electrical/index.html');
    if(series)url.searchParams.set('series',series);
    if(model)url.searchParams.set('model',model);
    return url.href;
  }
  function parsePrice(value){
    const raw=text(value).replace(',','.');
    const amount=Number((raw.match(/\d+(?:\.\d+)?/)||[])[0]);
    if(!Number.isFinite(amount)||amount<=0)return null;
    const upper=raw.toUpperCase();
    const currency=upper.includes('USD')||raw.includes('$')?'USD':upper.includes('TRY')||raw.includes('₺')?'TRY':'EUR';
    return {amount,currency};
  }
  function property(name,value){
    const clean=text(value);
    return clean?{'@type':'PropertyValue',name,value:clean}:null;
  }
  function productDescription(product,model){
    const lang=language();
    if(lang==='tr'){
      const parts=[`${product.brand||'ZONEX'} ${model?.model||product.modelName}`,model?.subcategory||product.category,model?.power?`Güç: ${model.power}`:'',model?.voltage?`Gerilim: ${model.voltage}`:'',model?.ip?`Koruma: ${model.ip}`:''].filter(Boolean);
      return parts.join('. ')+'.';
    }
    const parts=[`${product.brand||'ZONEX'} ${model?.model||product.modelName}`,model?.subcategory||product.category,model?.power?`Power: ${model.power}`:'',model?.voltage?`Voltage: ${model.voltage}`:'',model?.ip?`Protection: ${model.ip}`:''].filter(Boolean);
    return parts.join('. ')+'.';
  }
  function variantSchema(product,model,seriesUrl){
    const identity=text(model.orderCode||model.model);
    const url=routeUrl(product.modelName,identity);
    const price=parsePrice(model.price);
    const props=[
      property('Power',model.power),property('Current',model.current),property('Voltage',model.voltage),
      property('Frequency',model.frequency),property('Phase',model.phase),property('IP Class',model.ip),
      property('Insulation',model.insulation),property('Lumen',model.lumen),property('Operating Temperature',model.operatingTemperature)
    ].filter(Boolean);
    const out={
      '@type':'Product',
      '@id':url+'#product',
      name:text(model.model||identity),
      description:productDescription(product,model),
      sku:identity,
      mpn:text(model.model||identity),
      brand:{'@type':'Brand',name:text(product.brand||'ZONEX')},
      category:text(model.subcategory||product.category),
      image:absolute(product.image),
      url,
      isVariantOf:{'@id':seriesUrl+'#product-group'}
    };
    if(props.length)out.additionalProperty=props;
    if(price){
      out.offers={
        '@type':'Offer',url,price:price.amount.toFixed(2),priceCurrency:price.currency,
        seller:{'@id':SITE+'/#organization'}
      };
    }
    return out;
  }
  function breadcrumb(items){
    return {
      '@type':'BreadcrumbList',
      itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:item.url}))
    };
  }
  function collectionSeo(){
    const lang=language();
    const url=routeUrl();
    const list=products();
    const title=lang==='tr'?'Endüstriyel Elektrik Ürün Kataloğu | Vensis':'Industrial Electrical Product Catalog | Vensis';
    const description=lang==='tr'?'Ex-proof aydınlatma, buat, pano, kumanda ve saha elektrik ürünlerini teknik özellikler, model seçenekleri ve fiyat bilgileriyle inceleyin.':'Browse industrial electrical products including Ex-proof lighting, junction boxes, panels, control equipment and field products with technical specifications and model options.';
    setPage({title,description,url,image:absolute('../assets/vensis-logo.png')});
    setJsonLd({
      '@context':'https://schema.org',
      '@graph':[
        organization(),
        {'@type':'CollectionPage','@id':url+'#page',name:title.replace(' | Vensis',''),description,url},
        {'@type':'ItemList','@id':url+'#items',itemListElement:list.map((product,index)=>({'@type':'ListItem',position:index+1,name:text(`${product.brand||'ZONEX'} ${product.modelName}`),url:routeUrl(product.modelName)}))},
        breadcrumb([{name:lang==='tr'?'Ürün Kataloğu':'Product Catalog',url:SITE+'/catalog-hub.html'},{name:lang==='tr'?'Elektrik':'Electrical',url}])
      ]
    });
  }
  function seriesSeo(product,requestedModel){
    const lang=language();
    const seriesUrl=routeUrl(product.modelName);
    const models=Array.isArray(product.submodels)?product.submodels:[];
    const selected=requestedModel?models.find(model=>String(model.orderCode||'')===requestedModel||String(model.model||'')===requestedModel):null;
    const selectedIdentity=selected?text(selected.orderCode||selected.model):'';
    const pageUrl=selected?routeUrl(product.modelName,selectedIdentity):seriesUrl;
    const image=absolute(product.image);
    const title=selected
      ?`${text(selected.model||selectedIdentity)} | ${product.modelName} | Vensis`
      :`${product.brand||'ZONEX'} ${product.modelName} | ${product.category||'Electrical'} | Vensis`;
    const description=selected
      ?productDescription(product,selected)
      :(lang==='tr'?text(product.description)||`${product.brand||'ZONEX'} ${product.modelName} ürün serisi, teknik özellikler, model seçenekleri ve fiyat bilgileri.`:`${product.brand||'ZONEX'} ${product.modelName} product series with technical specifications, model options and list pricing.`);
    setPage({title,description,url:pageUrl,image,type:'product'});
    const group={
      '@type':'ProductGroup',
      '@id':seriesUrl+'#product-group',
      name:text(`${product.brand||'ZONEX'} ${product.modelName}`),
      description:lang==='tr'?(text(product.description)||description):`${product.brand||'ZONEX'} ${product.modelName} industrial electrical product series.`,
      productGroupID:text(product.modelName),
      brand:{'@type':'Brand',name:text(product.brand||'ZONEX')},
      category:text(product.category),
      image,
      url:seriesUrl,
      hasVariant:models.map(model=>variantSchema(product,model,seriesUrl))
    };
    const crumbs=[
      {name:lang==='tr'?'Ürün Kataloğu':'Product Catalog',url:SITE+'/catalog-hub.html'},
      {name:lang==='tr'?'Elektrik':'Electrical',url:routeUrl()},
      {name:text(product.modelName),url:seriesUrl}
    ];
    if(selected)crumbs.push({name:text(selected.model||selectedIdentity),url:pageUrl});
    setJsonLd({'@context':'https://schema.org','@graph':[organization(),group,breadcrumb(crumbs)]});
  }
  function hiddenLink(host,href,label,kind){
    if(host.querySelector(`a[data-electrical-seo-link="${kind}"]`))return;
    const link=document.createElement('a');
    link.dataset.electricalSeoLink=kind;
    link.href=href;
    link.textContent=label;
    link.tabIndex=-1;
    link.setAttribute('aria-hidden','true');
    link.style.cssText='position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;pointer-events:none!important';
    host.style.position=host.style.position||'relative';
    host.appendChild(link);
  }
  function installCrawlableLinks(){
    const list=products();
    document.querySelectorAll('.series-card[data-series]').forEach(card=>{
      const product=list.find(item=>item.modelName===card.dataset.series);
      if(product)hiddenLink(card,routeUrl(product.modelName),`${product.brand||'ZONEX'} ${product.modelName}`,'series');
    });
    const route=new URLSearchParams(location.search);
    const series=String(route.get('series')||'');
    const product=list.find(item=>item.modelName===series);
    if(!product)return;
    document.querySelectorAll('.model-card[data-electrical-model]').forEach(card=>{
      const identity=String(card.dataset.electricalModel||'');
      const model=(product.submodels||[]).find(item=>String(item.orderCode||item.model)===identity);
      if(model)hiddenLink(card,routeUrl(series,identity),`${product.brand||'ZONEX'} ${model.model||identity}`,'model');
    });
  }
  function run(){
    const list=products();
    if(!list.length)return;
    const query=new URLSearchParams(location.search);
    const series=String(query.get('series')||'').trim();
    const model=String(query.get('model')||'').trim();
    const product=list.find(item=>item.modelName===series);
    if(product)seriesSeo(product,model);else collectionSeo();
    installCrawlableLinks();
    setTimeout(installCrawlableLinks,80);
  }

  window.VensisElectricalSEO={run,routeUrl};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('vensis-electrical-route-changed',()=>setTimeout(run,0));
  window.addEventListener('vensis-language-changed',()=>setTimeout(run,25));
  window.addEventListener('popstate',()=>setTimeout(run,0));
})();
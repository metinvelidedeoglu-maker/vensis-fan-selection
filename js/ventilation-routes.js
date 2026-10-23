(function(){
  'use strict';
  const C=window.VensisCatalog;if(!C)return;
  const language=()=>window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'en';
  const params=()=>new URLSearchParams(location.search);
  const selectedSeries=()=>C.resolveSeries(params().get('series'),params().get('brand'));
  const identity=model=>model?.technical?.productCode||model?.model||model?.id||'';
  const selectedModel=series=>{const value=params().get('model');return value&&series?C.modelsForSeries(series.id).find(m=>[m.id,m.model,identity(m),C.modelSlug(m)].some(v=>String(v)===value||C.slug(v)===C.slug(value)))||null:null;};
  function url(series=null,model=null,lang=language()){
    const brand=C.brand(series?.manufacturer||params().get('brand'));
    if(!brand)return `${location.origin}/${lang}/catalog.html`;
    let path=`/${lang}/fan/${brand.slug}/`;
    if(series)path+=C.slug(series.code||series.id)+'/';
    if(model)path+=C.modelSlug(model)+'/';
    return location.origin+path;
  }
  function navigationUrl(series,model=null){
    const target=new URL(url(series,model));
    // Project destination is part of the user workflow, not the canonical URL.
    for(const key of ['project','return'])if(params().has(key))target.searchParams.set(key,params().get(key));
    return target.href;
  }
  function meta(name,content,property=false){
    const attr=property?'property':'name';
    let node=document.head.querySelector(`meta[${attr}="${name}"]`);
    if(!node){node=document.createElement('meta');node.setAttribute(attr,name);document.head.appendChild(node);}
    if(node.content!==content)node.content=content;
  }
  function link(rel,href,lang=''){
    const selector=`link[rel="${rel}"]`+(lang?`[hreflang="${lang}"]`:'');
    let node=document.head.querySelector(selector);
    if(!node){node=document.createElement('link');node.rel=rel;if(lang)node.hreflang=lang;document.head.appendChild(node);}
    if(node.href!==href)node.href=href;
  }
  function apply(){
    const series=selectedSeries(),model=selectedModel(series),q=params(),tr=language()==='tr';
    const invalid=Boolean(q.get('series')&&!series||q.get('model')&&!model||q.get('brand')&&!C.brand(q.get('brand')));
    const brand=C.brand(series?.manufacturer||q.get('brand'));
    const label=model?.model||series?.code||(brand?brand.name+' ':'')+(tr?'Havalandırma Kataloğu':'Ventilation Catalog');
    const title=label+' | Vensis';
    document.title=title;
    const description=series
      ?`${series.manufacturer} ${model?.model||series.code}. ${(series.description.general||[]).map(line=>window.VensisProductLanguage?.text(line,language())||line).join(' ').slice(0,240)}`
      :tr?'Havalandırma ürünlerini marka, kategori ve teknik özelliklerine göre inceleyin.':'Browse ventilation products by manufacturer, category and technical specifications.';
    const canonical=url(series,model);
    meta('description',description);meta('og:title',title,true);meta('og:description',description,true);meta('og:url',canonical,true);
    meta('robots',invalid?'noindex,follow':'index,follow,max-image-preview:large');
    link('canonical',canonical);link('alternate',url(series,model,'tr'),'tr');link('alternate',url(series,model,'en'),'en');link('alternate',url(series,model,'en'),'x-default');
    if(invalid){
      document.getElementById('catalogLayout').hidden=true;
      const detail=document.getElementById('detailPage');detail.hidden=false;
      detail.replaceChildren();const message=document.createElement('p');message.textContent=tr?'Ürün veya seri bulunamadı.':'Product or series not found.';detail.appendChild(message);
      const back=document.createElement('a');back.href='/catalog.html';back.textContent=tr?'Havalandırma kataloğu':'Ventilation catalog';detail.appendChild(back);
      return;
    }
    const content=document.getElementById('detailPage');
    if(series&&content){
      content.querySelectorAll('.model-card').forEach(card=>{
        const key=card.dataset.modelId||card.querySelector('[data-model-datasheet]')?.dataset.modelDatasheet;
        const entry=C.getModel(key);if(!entry)return;
        card.hidden=Boolean(model&&model.id!==entry.id);
        const h3=card.querySelector('h3');
        let anchor=h3?.querySelector('a');
        if(h3&&!anchor){anchor=document.createElement('a');anchor.textContent=h3.textContent;anchor.style.color='inherit';anchor.style.textDecoration='none';h3.replaceChildren(anchor);}
        if(anchor)anchor.href=navigationUrl(series,entry);
      });
      if(model){const count=content.querySelector('.catalog-count');if(count)count.textContent=tr?'1 model':'1 model';}
    }
    let breadcrumb=document.getElementById('ventilationBreadcrumb');
    if(!breadcrumb){breadcrumb=document.createElement('nav');breadcrumb.id='ventilationBreadcrumb';breadcrumb.setAttribute('aria-label','Breadcrumb');breadcrumb.style.cssText='padding:12px 22px;font-size:13px';document.querySelector('.catalog-top')?.after(breadcrumb);}
    breadcrumb.replaceChildren();
    const root=document.createElement('a');root.href=`/${language()}/catalog.html`+(q.has('project')?'?project='+encodeURIComponent(q.get('project')):'');root.textContent=tr?'Havalandırma':'Ventilation';breadcrumb.appendChild(root);
    for(const part of [brand?.name,series?.code,model?.model].filter(Boolean)){const span=document.createElement('span');span.textContent=' / '+part;breadcrumb.appendChild(span);}
    let json=document.getElementById('vensisVentilationJsonLd');
    if(!json){json=document.createElement('script');json.type='application/ld+json';json.id='vensisVentilationJsonLd';document.head.appendChild(json);}
    json.textContent=JSON.stringify(model?{'@context':'https://schema.org','@type':'Product',name:model.model,brand:{'@type':'Brand',name:series.manufacturer},image:new URL(model.media?.image||series.media?.image||'',location.origin).href,description,inLanguage:tr?'tr-TR':'en',url:canonical}:{'@context':'https://schema.org','@type':'CollectionPage',name:title,description,inLanguage:tr?'tr-TR':'en',url:canonical});
  }
  window.VensisVentilationRoutes={url,navigationUrl,apply};
  apply();
  window.addEventListener('vensis-language-changed',()=>{
    if(/^\/(tr|en)\//.test(location.pathname))history.replaceState(history.state,'',location.pathname.replace(/^\/(tr|en)\//,'/'+language()+'/')+location.search+location.hash);
    apply();
  });
})();

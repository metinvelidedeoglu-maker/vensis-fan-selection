(function(){
  'use strict';

  const SITE='https://select.vensis.com.tr';
  const path=(location.pathname||'/').toLowerCase();
  const indexable=[
    '/catalog-hub.html','/catalog-ventilation.html','/catalog-brand.html',
    '/catalog-vortice-stable.html','/catalog-vortice.html','/electrical/index.html'
  ];
  if(!indexable.some(item=>path.endsWith(item)))return;

  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const params=()=>new URLSearchParams(location.search);
  const lang=()=>{
    const value=params().get('lang');
    return value==='tr'||value==='en'?value:(String(document.documentElement.lang||'en').toLowerCase().startsWith('tr')?'tr':'en');
  };
  const labels={
    en:{catalog:'Product Catalog',ventilation:'Ventilation',electrical:'Electrical'},
    tr:{catalog:'Ürün Kataloğu',ventilation:'Havalandırma',electrical:'Elektrik'}
  };

  function localized(value,language=lang()){
    const url=new URL(value,SITE+'/');
    if(url.origin===SITE&&indexable.some(item=>url.pathname.toLowerCase().endsWith(item)))url.searchParams.set('lang',language);
    return url.href;
  }

  function fanSeries(){
    const seriesId=text(params().get('series'));
    if(!seriesId)return null;
    const catalog=window.VensisCatalog;
    if(!catalog)return {id:seriesId,code:seriesId,title:seriesId};
    return (typeof catalog.getSeries==='function'?catalog.getSeries(seriesId):null)||
      (catalog.series||[]).find(item=>String(item.id)===seriesId)||{id:seriesId,code:seriesId,title:seriesId};
  }

  function fanModel(series){
    const requested=text(params().get('model'));
    if(!requested||!series)return null;
    const catalog=window.VensisCatalog;
    const models=(series.modelIds||[]).map(id=>catalog?.getModel?.(id)).filter(Boolean);
    return models.find(model=>
      String(model.id)===requested||
      text(model.technical?.productCode)===requested||
      text(model.model)===requested
    )||{model:requested};
  }

  function electricalProduct(){
    const series=text(params().get('series'));
    if(!series)return null;
    return (Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[])
      .find(item=>String(item.modelName)===series)||{modelName:series,submodels:[]};
  }

  function electricalModel(product){
    const requested=text(params().get('model'));
    if(!requested||!product)return null;
    return (product.submodels||[]).find(model=>String(model.orderCode||model.model)===requested)||{model:requested};
  }

  function fanBrand(){
    if(path.endsWith('/catalog-vortice.html')||path.endsWith('/catalog-vortice-stable.html'))return {key:'vortice',name:'Vortice',url:SITE+'/catalog-vortice-stable.html'};
    const brand=params().get('brand')==='sp'?'sp':'vitlo';
    return {key:brand,name:brand==='sp'?'Soler & Palau':'Vitlo',url:SITE+`/catalog-brand.html?brand=${brand}`};
  }

  function build(){
    const language=lang();
    const t=labels[language];
    const items=[];
    const push=(name,url='',current=false)=>items.push({name,url:url?localized(url,language):'',current});

    if(path.endsWith('/catalog-hub.html')){
      push(t.catalog,'',true);
      return items;
    }
    push(t.catalog,SITE+'/catalog-hub.html');

    if(path.endsWith('/catalog-ventilation.html')){
      push(t.ventilation,'',true);
      return items;
    }

    if(path.endsWith('/electrical/index.html')){
      const product=electricalProduct();
      const model=electricalModel(product);
      const root=SITE+'/electrical/index.html';
      if(!product){push(t.electrical,'',true);return items;}
      push(t.electrical,root);
      const seriesUrl=new URL(root);
      seriesUrl.searchParams.set('series',product.modelName);
      if(!model){push(text(product.modelName),'',true);return items;}
      push(text(product.modelName),seriesUrl.href);
      push(text(model.model||model.orderCode||params().get('model')),'',true);
      return items;
    }

    push(t.ventilation,SITE+'/catalog-ventilation.html');
    const brand=fanBrand();
    const series=fanSeries();
    const model=fanModel(series);
    if(!series){push(brand.name,'',true);return items;}
    push(brand.name,brand.url);
    const seriesUrl=new URL(path.endsWith('/catalog-vortice.html')?SITE+'/catalog-vortice.html':SITE+'/catalog-brand.html');
    if(!path.endsWith('/catalog-vortice.html'))seriesUrl.searchParams.set('brand',brand.key);
    seriesUrl.searchParams.set('series',series.id||params().get('series'));
    if(!model){push(text(series.code||series.title||series.id),'',true);return items;}
    push(text(series.code||series.title||series.id),seriesUrl.href);
    push(text(model.model||model.technical?.productCode||params().get('model')),'',true);
    return items;
  }

  function installStyle(){
    if(document.getElementById('vensisBreadcrumbStyle'))return;
    const style=document.createElement('style');
    style.id='vensisBreadcrumbStyle';
    style.textContent=`
      .vensis-breadcrumb{max-width:100%;margin:0 0 14px;color:#6c7d80;font-size:12px;line-height:1.35}
      .vensis-breadcrumb ol{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
      .vensis-breadcrumb li{display:flex;align-items:center;gap:6px;min-width:0}
      .vensis-breadcrumb li:not(:last-child)::after{content:'›';color:#9aabaa;font-weight:800}
      .vensis-breadcrumb a{color:#49686a;text-decoration:none;font-weight:700}
      .vensis-breadcrumb a:hover{text-decoration:underline}
      .vensis-breadcrumb [aria-current="page"]{color:#173033;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:360px}
      @media(max-width:620px){.vensis-breadcrumb{font-size:11px;margin-bottom:11px}.vensis-breadcrumb [aria-current="page"]{max-width:190px}}
    `;
    document.head.appendChild(style);
  }

  function host(){
    if(path.endsWith('/catalog-hub.html')||path.endsWith('/catalog-ventilation.html'))return document.querySelector('.hero');
    const detail=document.querySelector('#detailPage:not([hidden]) .series-hero, .detail-page:not([hidden]) .series-hero, .series-hero');
    if(params().get('series')&&detail)return detail;
    return document.querySelector('.catalog-content .catalog-head, .catalog-head');
  }

  function render(){
    const target=host();
    if(!target)return false;
    installStyle();
    document.querySelectorAll('.vensis-breadcrumb').forEach(node=>node.remove());
    const items=build();
    if(!items.length)return true;
    const nav=document.createElement('nav');
    nav.className='vensis-breadcrumb';
    nav.setAttribute('aria-label',lang()==='tr'?'İçerik yolu':'Breadcrumb');
    const ol=document.createElement('ol');
    for(const item of items){
      const li=document.createElement('li');
      if(item.url&&!item.current){
        const a=document.createElement('a');a.href=item.url;a.textContent=item.name;li.appendChild(a);
      }else{
        const span=document.createElement('span');span.textContent=item.name;if(item.current)span.setAttribute('aria-current','page');li.appendChild(span);
      }
      ol.appendChild(li);
    }
    nav.appendChild(ol);
    target.insertAdjacentElement('beforebegin',nav);
    return true;
  }

  function schedule(delay=80){setTimeout(()=>{if(!render())setTimeout(render,180)},delay)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(),{once:true});else schedule();
  window.addEventListener('load',()=>schedule(20),{once:true});
  window.addEventListener('vensis-language-changed',()=>schedule(120));
  window.addEventListener('vensis-electrical-route-changed',()=>schedule(60));
  window.addEventListener('popstate',()=>schedule(60));
})();

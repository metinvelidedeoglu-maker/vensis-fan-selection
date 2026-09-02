(function(){
  'use strict';

  const path=(location.pathname||'/').toLowerCase();
  const supported=[
    '/catalog-ventilation.html','/catalog-brand.html','/catalog-vortice-stable.html',
    '/catalog-vortice.html','/electrical/index.html'
  ];
  if(!supported.some(item=>path.endsWith(item)))return;

  const params=()=>new URLSearchParams(location.search);
  const language=()=>{
    const requested=String(params().get('lang')||'').toLowerCase();
    if(requested==='tr'||requested==='en')return requested;
    return String(document.documentElement.lang||'en').toLowerCase().startsWith('tr')?'tr':'en';
  };
  const copy={
    en:{catalog:'Product Catalog',ventilation:'Ventilation',electrical:'Electrical'},
    tr:{catalog:'Ürün Kataloğu',ventilation:'Havalandırma',electrical:'Elektrik'}
  };
  const brandLabels={vitlo:'Vitlo',sp:'Soler & Palau',vortice:'Vortice'};

  function installStyle(){
    if(document.getElementById('vensisCatalogBreadcrumbStyle'))return;
    const style=document.createElement('style');
    style.id='vensisCatalogBreadcrumbStyle';
    style.textContent=`
      .vensis-catalog-breadcrumbs{position:relative;z-index:3;padding:9px 20px;border-bottom:1px solid #dde7e5;background:rgba(255,255,255,.92);color:#64748b;font-size:12px}
      .vensis-catalog-breadcrumbs-inner{width:min(1640px,100%);margin:0 auto;display:flex;align-items:center;gap:7px;overflow:auto;scrollbar-width:none;white-space:nowrap}
      .vensis-catalog-breadcrumbs-inner::-webkit-scrollbar{display:none}
      .vensis-catalog-breadcrumbs a{color:#087f4f;text-decoration:none;font-weight:800}
      .vensis-catalog-breadcrumbs a:hover{text-decoration:underline}
      .vensis-catalog-breadcrumbs [aria-current="page"]{color:#29484d;font-weight:800}
      .vensis-catalog-breadcrumbs-sep{color:#a3b0b2}
      @media(max-width:620px){.vensis-catalog-breadcrumbs{padding:8px 10px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function cleanParams(remove=[]){
    const out=params();
    remove.forEach(key=>out.delete(key));
    return out;
  }
  function href(file,mutate){
    const out=cleanParams([]);
    if(typeof mutate==='function')mutate(out);
    const query=out.toString();
    const base=path.includes('/electrical/')&&file.startsWith('../')?file:file;
    return base+(query?'?'+query:'');
  }
  function rootHref(){
    const out=cleanParams(['brand','series','model']);
    return (path.includes('/electrical/')?'../catalog-hub.html':'catalog-hub.html')+(out.toString()?'?'+out.toString():'');
  }
  function ventilationHref(){
    const out=cleanParams(['brand','series','model']);
    return (path.includes('/electrical/')?'../catalog-ventilation.html':'catalog-ventilation.html')+(out.toString()?'?'+out.toString():'');
  }
  function electricalHref(){
    const out=cleanParams(['brand','series','model']);
    return 'index.html'+(out.toString()?'?'+out.toString():'');
  }
  function brandHref(brand){
    const out=cleanParams(['series','model']);
    if(brand==='vortice'){
      out.delete('brand');
      return 'catalog-vortice-stable.html'+(out.toString()?'?'+out.toString():'');
    }
    out.set('brand',brand);
    return 'catalog-brand.html?'+out.toString();
  }
  function seriesHref(brand,series){
    const out=cleanParams(['model']);
    out.set('series',series);
    if(path.endsWith('/electrical/index.html'))return 'index.html?'+out.toString();
    if(brand==='vortice'){
      out.delete('brand');
      return 'catalog-vortice.html?'+out.toString();
    }
    out.set('brand',brand);
    return 'catalog-brand.html?'+out.toString();
  }

  function fanSeriesLabel(seriesId){
    const catalog=window.VensisCatalog;
    const series=catalog?.getSeries?catalog.getSeries(seriesId):(catalog?.series||[]).find(row=>String(row.id)===String(seriesId));
    return String(series?.code||series?.title||seriesId||'').trim();
  }
  function fanModelLabel(seriesId,identity){
    const catalog=window.VensisCatalog;
    const series=catalog?.getSeries?catalog.getSeries(seriesId):(catalog?.series||[]).find(row=>String(row.id)===String(seriesId));
    const models=(series?.modelIds||[]).map(id=>catalog?.getModel?.(id)).filter(Boolean);
    const model=models.find(row=>
      String(row.id)===identity||
      String(row.technical?.productCode||'')===identity||
      String(row.model||'')===identity
    );
    return String(model?.model||model?.technical?.productCode||identity||'').trim();
  }
  function electricalSeriesLabel(seriesId){
    const series=(window.VENSIS_ELECTRICAL_PRODUCTS||[]).find(row=>String(row.modelName)===String(seriesId));
    return String(series?.modelName||seriesId||'').trim();
  }
  function electricalModelLabel(seriesId,identity){
    const series=(window.VENSIS_ELECTRICAL_PRODUCTS||[]).find(row=>String(row.modelName)===String(seriesId));
    const model=(series?.submodels||[]).find(row=>String(row.orderCode||row.model)===String(identity)||String(row.model)===String(identity));
    return String(model?.model||identity||'').trim();
  }

  function items(){
    const c=copy[language()];
    const p=params();
    const series=p.get('series')||'';
    const model=p.get('model')||'';
    const out=[{label:c.catalog,href:rootHref()}];

    if(path.endsWith('/catalog-ventilation.html')){
      out.push({label:c.ventilation});
      return out;
    }
    if(path.endsWith('/catalog-brand.html')){
      const brand=p.get('brand')==='sp'?'sp':'vitlo';
      out.push({label:c.ventilation,href:ventilationHref()},{label:brandLabels[brand],href:series?brandHref(brand):''});
      if(series)out.push({label:fanSeriesLabel(series),href:model?seriesHref(brand,series):''});
      if(model)out.push({label:fanModelLabel(series,model)});
      return out;
    }
    if(path.endsWith('/catalog-vortice-stable.html')){
      out.push({label:c.ventilation,href:ventilationHref()},{label:'Vortice'});
      return out;
    }
    if(path.endsWith('/catalog-vortice.html')){
      out.push({label:c.ventilation,href:ventilationHref()},{label:'Vortice',href:brandHref('vortice')});
      if(series)out.push({label:fanSeriesLabel(series),href:model?seriesHref('vortice',series):''});
      if(model)out.push({label:fanModelLabel(series,model)});
      return out;
    }
    if(path.endsWith('/electrical/index.html')){
      out.push({label:c.electrical,href:series?electricalHref():''});
      if(series)out.push({label:electricalSeriesLabel(series),href:model?seriesHref('electrical',series):''});
      if(model)out.push({label:electricalModelLabel(series,model)});
      return out;
    }
    return out;
  }

  function mountPoint(){
    const existing=document.querySelector('.vensis-catalog-breadcrumbs');
    if(existing)return existing;
    const nav=document.createElement('nav');
    nav.className='vensis-catalog-breadcrumbs';
    nav.setAttribute('aria-label',language()==='tr'?'İçerik yolu':'Breadcrumb');
    nav.innerHTML='<div class="vensis-catalog-breadcrumbs-inner"></div>';
    const header=document.querySelector('.catalog-top,.top');
    if(header)header.insertAdjacentElement('afterend',nav);
    else{
      const layout=document.querySelector('#electricalCatalogLayout,.catalog-layout');
      if(layout)layout.insertAdjacentElement('beforebegin',nav);
      else document.body.prepend(nav);
    }
    return nav;
  }

  function render(){
    installStyle();
    const nav=mountPoint();
    nav.setAttribute('aria-label',language()==='tr'?'İçerik yolu':'Breadcrumb');
    const inner=nav.querySelector('.vensis-catalog-breadcrumbs-inner');
    const list=items();
    inner.textContent='';
    list.forEach((item,index)=>{
      if(index){
        const sep=document.createElement('span');
        sep.className='vensis-catalog-breadcrumbs-sep';
        sep.textContent='›';
        sep.setAttribute('aria-hidden','true');
        inner.appendChild(sep);
      }
      const isLast=index===list.length-1;
      if(item.href&&!isLast){
        const link=document.createElement('a');
        link.href=item.href;
        link.textContent=item.label;
        inner.appendChild(link);
      }else{
        const span=document.createElement('span');
        span.textContent=item.label;
        if(isLast)span.setAttribute('aria-current','page');
        inner.appendChild(span);
      }
    });
  }

  function schedule(delay=0){setTimeout(render,delay)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(100),{once:true});
  else schedule(100);
  window.addEventListener('load',()=>schedule(120),{once:true});
  window.addEventListener('vensis-language-changed',()=>schedule(170));
  window.addEventListener('vensis-electrical-route-changed',()=>schedule(80));
  window.addEventListener('popstate',()=>schedule(80));
  setTimeout(render,500);
})();

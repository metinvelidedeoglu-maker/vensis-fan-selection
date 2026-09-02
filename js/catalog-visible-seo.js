(function(){
  'use strict';

  const path=(location.pathname||'/').toLowerCase();
  const scriptBase=path.includes('/electrical/')?'../':'';
  if(!document.querySelector('script[data-vensis-catalog-breadcrumbs]')){
    const breadcrumbs=document.createElement('script');
    breadcrumbs.src=scriptBase+'js/catalog-breadcrumbs.js?v=20260902-r1';
    breadcrumbs.dataset.vensisCatalogBreadcrumbs='1';
    document.head.appendChild(breadcrumbs);
  }
  const params=()=>new URLSearchParams(location.search);
  const lang=()=>{
    const requested=String(params().get('lang')||'').toLowerCase();
    if(requested==='tr'||requested==='en')return requested;
    return String(document.documentElement.lang||'en').toLowerCase().startsWith('tr')?'tr':'en';
  };

  const copies={
    hub:{
      en:{h1:'Industrial Product Catalog',p:'Browse industrial ventilation fans and electrical products with technical specifications, model options and engineering-focused product data.'},
      tr:{h1:'Endüstriyel Ürün Kataloğu',p:'Endüstriyel havalandırma fanlarını ve elektrik ürünlerini teknik özellikler, model seçenekleri ve mühendislik odaklı ürün verileriyle inceleyin.'}
    },
    ventilation:{
      en:{h1:'Industrial Ventilation Fan Catalog',p:'Choose Vitlo, Vortice or Soler & Palau to browse axial, centrifugal, duct, roof, smoke extract and ATEX / Ex-proof fan series.'},
      tr:{h1:'Endüstriyel Havalandırma Fan Kataloğu',p:'Vitlo, Vortice veya Soler & Palau seçerek aksiyel, santrifüj, kanal tipi, çatı tipi, duman tahliye ve ATEX / Exproof fan serilerini inceleyin.'}
    },
    vitlo:{
      en:{h1:'Vitlo Industrial Fan Series',p:'Browse Vitlo axial, centrifugal, smoke extract, roof, duct and ATEX / Ex-proof fan series with model-level airflow, motor, performance and dimensional data.'},
      tr:{h1:'Vitlo Endüstriyel Fan Serileri',p:'Vitlo aksiyel, santrifüj, duman tahliye, çatı, kanal tipi ve ATEX / Exproof fan serilerini model bazında debi, motor, performans ve ölçü verileriyle inceleyin.'}
    },
    sp:{
      en:{h1:'Soler & Palau Fan Series',p:'Browse Soler & Palau industrial and commercial fan series including axial, duct, roof, mixed-flow and ATEX / Ex-proof products with technical model data.'},
      tr:{h1:'Soler & Palau Fan Serileri',p:'Soler & Palau endüstriyel ve ticari aksiyel, kanal tipi, çatı tipi, karışık akışlı ve ATEX / Exproof fan serilerini teknik model verileriyle inceleyin.'}
    },
    vortice:{
      en:{h1:'Vortice Ventilation Fan Series',p:'Browse Vortice residential, duct, mixed-flow, roof, smoke extract and ATEX ventilation fan series with technical catalog and model information.'},
      tr:{h1:'Vortice Havalandırma Fan Serileri',p:'Vortice konut tipi, kanal tipi, karışık akışlı, çatı tipi, duman tahliye ve ATEX fan serilerini teknik katalog ve model bilgileriyle inceleyin.'}
    },
    electrical:{
      en:{h1:'ZONEX Industrial Electrical Product Series',p:'Browse industrial and Ex-proof electrical products including lighting, junction boxes, control equipment, plugs, sockets and field products with technical specifications and model options.'},
      tr:{h1:'ZONEX Endüstriyel Elektrik Ürün Serileri',p:'Endüstriyel ve Exproof aydınlatma, buat, kumanda ekipmanları, fiş, priz ve saha elektrik ürünlerini teknik özellikler ve model seçenekleriyle inceleyin.'}
    }
  };

  function installStyle(){
    if(document.getElementById('vensisVisibleSeoStyle'))return;
    const style=document.createElement('style');
    style.id='vensisVisibleSeoStyle';
    style.textContent=`
      .vensis-seo-summary{margin:-4px 0 18px;padding:13px 15px;border:1px solid #dfe9e6;border-radius:11px;background:#f8fbfa;color:#52666b;font-size:13px;line-height:1.55}
      .vensis-seo-summary strong{color:#173033}
      @media(max-width:620px){.vensis-seo-summary{margin-bottom:14px;padding:12px;font-size:12px}}
    `;
    document.head.appendChild(style);
  }

  function copyForPage(){
    const language=lang();
    if(path.endsWith('/catalog-hub.html'))return {kind:'hero',copy:copies.hub[language]};
    if(path.endsWith('/catalog-ventilation.html'))return {kind:'hero',copy:copies.ventilation[language]};
    if(path.endsWith('/catalog-vortice-stable.html'))return {kind:'list',copy:copies.vortice[language]};
    if(path.endsWith('/catalog-brand.html')&&!params().get('series')){
      const brand=params().get('brand')==='sp'?'sp':'vitlo';
      return {kind:'list',copy:copies[brand][language]};
    }
    if(path.endsWith('/electrical/index.html')&&!params().get('series'))return {kind:'list',copy:copies.electrical[language]};
    return null;
  }

  function applyHero(copy){
    const hero=document.querySelector('.hero');
    const heading=hero?.querySelector('h1');
    const paragraph=hero?.querySelector('p');
    if(heading)heading.textContent=copy.h1;
    if(paragraph)paragraph.textContent=copy.p;
  }

  function applyList(copy){
    const head=document.querySelector('.catalog-content .catalog-head');
    const heading=head?.querySelector('h1');
    if(!head||!heading)return;
    heading.textContent=copy.h1;
    let summary=document.querySelector('.catalog-content .vensis-seo-summary');
    if(!summary){
      summary=document.createElement('p');
      summary.className='vensis-seo-summary';
      head.insertAdjacentElement('afterend',summary);
    }
    summary.textContent=copy.p;
  }

  function clearListSummary(){
    document.querySelector('.catalog-content .vensis-seo-summary')?.remove();
  }

  function apply(){
    const state=copyForPage();
    if(!state){clearListSummary();return}
    installStyle();
    if(state.kind==='hero')applyHero(state.copy);
    else applyList(state.copy);
  }

  function schedule(delay=0){setTimeout(apply,delay)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(80),{once:true});
  else schedule(80);
  window.addEventListener('load',()=>schedule(40),{once:true});
  window.addEventListener('vensis-language-changed',()=>schedule(160));
  window.addEventListener('vensis-electrical-route-changed',()=>schedule(100));
  window.addEventListener('popstate',()=>schedule(100));
})();

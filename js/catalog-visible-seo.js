(function(){
  'use strict';

  const path=(location.pathname||'/').toLowerCase();
  const params=()=>new URLSearchParams(location.search);
  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
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
      .vensis-seo-detail-summary{margin:14px 0 18px;background:#fbfdfc}
      @media(max-width:620px){.vensis-seo-summary{margin-bottom:14px;padding:12px;font-size:12px}.vensis-seo-detail-summary{margin-top:11px}}
    `;
    document.head.appendChild(style);
  }

  function fanDetailCopy(){
    if(!path.endsWith('/catalog-brand.html')&&!path.endsWith('/catalog-vortice.html'))return null;
    const seriesId=text(params().get('series'));
    if(!seriesId)return null;
    const catalog=window.VensisCatalog;
    if(!catalog)return null;
    const series=(typeof catalog.getSeries==='function'?catalog.getSeries(seriesId):null)||
      (catalog.series||[]).find(row=>String(row.id)===seriesId);
    if(!series)return null;
    const models=(series.modelIds||[]).map(id=>catalog.getModel?.(id)).filter(Boolean);
    const requested=text(params().get('model'));
    const selected=requested?models.find(model=>
      String(model.id)===requested||
      text(model.technical?.productCode)===requested||
      text(model.model)===requested
    ):null;
    const language=lang();
    const manufacturer=text(series.manufacturer||selected?.manufacturer||'Vensis');
    const code=text(series.code||series.id||seriesId);
    const group=text(selected?.technical?.productGroup||series.categories?.[0]||'');
    const isAtex=Boolean(selected?.technical?.atex)||/atex|ex-?proof|explosion/i.test(`${group} ${(series.categories||[]).join(' ')}`);

    if(selected){
      const modelName=text(selected.model||selected.technical?.productCode||selected.id);
      const facts=[];
      if(Number(selected.performance?.nominalAirflow)>0)facts.push(`${Number(selected.performance.nominalAirflow).toLocaleString(language==='tr'?'tr-TR':'en-US')} m³/h`);
      if(Number(selected.motor?.power)>0)facts.push(`${Number(selected.motor.power)} kW`);
      if(Number(selected.motor?.speed)>0)facts.push(`${Number(selected.motor.speed)} rpm`);
      if(Number(selected.motor?.current)>0)facts.push(`${Number(selected.motor.current)} A`);
      if(text(selected.technical?.ipClass))facts.push(text(selected.technical.ipClass));
      if(language==='tr'){
        return `${manufacturer} ${modelName}, ${code} serisindeki${group?' '+group.toLocaleLowerCase('tr-TR'): ' endüstriyel fan'} modelidir.${facts.length?' Temel katalog verileri: '+facts.join(', ')+'.':''} Debi, motor, performans eğrisi ve teknik özellikleri karşılaştırabilirsiniz.${isAtex?' Bu model ATEX / Exproof ürün grubundadır; kesin sertifika işaretleri yalnız katalogda mevcut olduğu modellerde gösterilir.':''}`;
      }
      return `${manufacturer} ${modelName} is a${group?' '+group.toLowerCase():'n industrial fan'} model in the ${code} series.${facts.length?' Key catalog data: '+facts.join(', ')+'.':''} Review airflow, motor data, performance curve and technical specifications.${isAtex?' This model belongs to the ATEX / explosion-proof product group; exact certification markings are shown only where catalog data is available.':''}`;
    }

    const category=text(series.categories?.[0]||group||'');
    if(language==='tr'){
      return `${manufacturer} ${code}${category?' '+category:''} serisinde ${models.length} katalog modeli bulunuyor. Modelleri debi, motor gücü, devir, akım, ses seviyesi ve performans verilerine göre karşılaştırabilirsiniz.${isAtex?' ATEX / Exproof modellerde kesin sertifika işaretleri yalnız doğrulanmış katalog verisi bulunduğunda gösterilir.':''}`;
    }
    return `${manufacturer} ${code}${category?' '+category:''} series contains ${models.length} catalog models. Compare models by airflow, motor power, speed, current, noise and performance data.${isAtex?' Exact ATEX / explosion-proof certification markings are shown only when verified catalog data is available.':''}`;
  }

  function electricalDetailCopy(){
    if(!path.endsWith('/electrical/index.html'))return null;
    const seriesName=text(params().get('series'));
    if(!seriesName)return null;
    const products=Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[];
    const product=products.find(item=>String(item.modelName)===seriesName);
    if(!product)return null;
    const requested=text(params().get('model'));
    const selected=requested?(product.submodels||[]).find(model=>String(model.orderCode||model.model)===requested):null;
    const language=lang();
    if(selected){
      const facts=[selected.power,selected.voltage,selected.ip].map(text).filter(Boolean);
      return language==='tr'
        ?`${product.brand||'ZONEX'} ${selected.model||selected.orderCode} modeli, ${product.modelName} ürün serisinin bir varyantıdır.${facts.length?' Temel katalog verileri: '+facts.join(', ')+'.':''} Teknik özellikleri ve model seçeneklerini inceleyebilirsiniz.`
        :`${product.brand||'ZONEX'} ${selected.model||selected.orderCode} is a variant in the ${product.modelName} product series.${facts.length?' Key catalog data: '+facts.join(', ')+'.':''} Review technical specifications and model options.`;
    }
    const count=Array.isArray(product.submodels)?product.submodels.length:0;
    return language==='tr'
      ?`${product.brand||'ZONEX'} ${product.modelName} serisinde ${count} model seçeneği bulunuyor. Güç, gerilim, koruma sınıfı ve diğer teknik özellikleri model bazında karşılaştırabilirsiniz.`
      :`${product.brand||'ZONEX'} ${product.modelName} series contains ${count} model options. Compare power, voltage, protection class and other technical specifications by model.`;
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
    const detail=fanDetailCopy()||electricalDetailCopy();
    return detail?{kind:'detail',copy:{p:detail}}:null;
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
    let summary=document.querySelector('.catalog-content .vensis-seo-summary:not(.vensis-seo-detail-summary)');
    if(!summary){
      summary=document.createElement('p');
      summary.className='vensis-seo-summary';
      head.insertAdjacentElement('afterend',summary);
    }
    summary.textContent=copy.p;
  }

  function applyDetail(copy){
    const hero=document.querySelector('#detailPage:not([hidden]) .series-hero, .detail-page:not([hidden]) .series-hero, .series-hero');
    if(!hero)return;
    let summary=document.querySelector('.vensis-seo-detail-summary');
    if(!summary){
      summary=document.createElement('p');
      summary.className='vensis-seo-summary vensis-seo-detail-summary';
      hero.insertAdjacentElement('afterend',summary);
    }
    summary.textContent=copy.p;
  }

  function clearSummaries(){
    document.querySelectorAll('.vensis-seo-summary').forEach(node=>node.remove());
  }

  function apply(){
    const state=copyForPage();
    if(!state){clearSummaries();return}
    installStyle();
    if(state.kind==='hero'){document.querySelector('.vensis-seo-detail-summary')?.remove();applyHero(state.copy);}
    else if(state.kind==='list'){document.querySelector('.vensis-seo-detail-summary')?.remove();applyList(state.copy);}
    else {document.querySelector('.catalog-content .vensis-seo-summary:not(.vensis-seo-detail-summary)')?.remove();applyDetail(state.copy);}
  }

  function schedule(delay=0){setTimeout(apply,delay)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(80),{once:true});
  else schedule(80);
  window.addEventListener('load',()=>schedule(40),{once:true});
  window.addEventListener('vensis-language-changed',()=>schedule(160));
  window.addEventListener('vensis-electrical-route-changed',()=>schedule(100));
  window.addEventListener('popstate',()=>schedule(100));
})();

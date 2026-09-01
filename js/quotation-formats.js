(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VensisQuotationFormats=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const FORMATS=['auto','fan','electrical','mixed'];
  function text(value){return String(value??'').trim().toLowerCase()}
  function preference(value){return FORMATS.includes(text(value))?text(value):'auto'}
  function itemType(item){
    const source=item&&typeof item==='object'?item:{};
    const explicit=text(source.productType||source.catalogType);
    if(explicit==='electrical')return 'electrical';
    if(explicit==='fan')return 'fan';
    if(text(source.itemKey).startsWith('electrical|'))return 'electrical';
    if(text(source.manufacturer)==='zonex')return 'electrical';
    if(source.orderCode||source.ip||source.lumen||source.operatingTemperature)return 'electrical';
    return 'fan';
  }
  function split(items){
    return (Array.isArray(items)?items:[]).reduce((groups,item)=>{groups[itemType(item)].push(item);return groups},{fan:[],electrical:[]});
  }
  function detect(items,selected='auto'){
    const chosen=preference(selected);
    if(chosen!=='auto')return chosen;
    const groups=split(items);
    if(groups.fan.length&&groups.electrical.length)return 'mixed';
    return groups.electrical.length?'electrical':'fan';
  }
  function label(value){return ({auto:'Otomatik',fan:'Fan',electrical:'Elektrik',mixed:'Karma'}[preference(value)]||'Otomatik')}
  return {FORMATS,detect,itemType,label,preference,split};
});

(function(root){
  'use strict';
  if(typeof document==='undefined'||!root.VensisQuotationFormats)return;

  const formats=root.VensisQuotationFormats;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const storageKey=key=>root.VensisAccess?.storageKey?.(key)||key;
  const QUOTATION_KEY=storageKey('vensis_active_quotation_v1');
  const PRINT_KEY=storageKey('vensis_project_print_snapshot_v1');
  const clone=value=>JSON.parse(JSON.stringify(value));

  function currentLanguage(){
    const runtime=root.VensisI18n?.getLanguage?.();
    if(runtime==='tr'||runtime==='en')return runtime;
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  }
  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}

  const EN_BASE={
    summary:{
      payment:'Cash in advance with order',
      exchangeRate:'The Türkiye Vakıflar Bankası Euro selling rate on the invoice date shall apply.',
      validity:'7 days',
      deliveryTime:'8 weeks',
      deliveryPlace:'Ex Vensis warehouse',
      vat:'VAT is not included in our prices.',
      commissioning:'Commissioning service is not included in the quotation price.',
      quotationNote:'Our quotation has been prepared based on the survey and technical information provided to us. The customer is responsible for verifying that the offered products are suitable for the project and application conditions.'
    },
    scope:{
      included:'Our quotation covers the sale of the equipment and devices whose models and quantities are clearly stated in the product table on the first page.\n\nProducts, accessories, services and site works not expressly stated in the quotation are not included in the scope.',
      exclusions:[
        'On-site installation labour for devices and equipment.',
        'Main electrical supply, power and MCC panels, and all cabling works.',
        'Supply of nuts, bolts, anchors, brackets and fixing materials required for fan installation.',
        'Freight, crane, unloading and on-site handling services unless expressly stated in the quotation.',
        'Accessories, automation components and devices not expressly listed in the quotation table.',
        'Commissioning, site testing, balancing checks and automation connections.'
      ],
      deliveryControl:[
        'Delivery periods are evaluated in working days; Saturdays, Sundays and public holidays are excluded.',
        'Products must be checked for packaging condition, damage and missing quantities upon receipt.',
        'Damage arising from storage, handling or installation after delivery is the customer’s responsibility.'
      ],
      suitability:'Product selection has been prepared according to the information and operating points provided to us. Final system suitability, layout, duct resistance, electrical infrastructure and installation conditions must be verified by the customer or project designer.'
    },
    terms:{
      priceCurrency:[
        'Prices are in Euro and exclude VAT.',
        'Invoicing shall be made using the Euro selling rate specified in the quotation on the invoice date.',
        'The quotation is valid for the joint order of the stated products and quantities.',
        'Changes in product quantities, technical specifications or delivery conditions may require a price revision.'
      ],
      payment:[
        'The order becomes valid upon receipt of the advance payment and written order confirmation.',
        'Production or procurement will not commence before the advance payment is received.',
        'In the event of delayed payments, exchange-rate differences and any resulting financing costs will be evaluated separately.'
      ],
      delivery:[
        'The delivery period starts after the order and payment conditions have been completed.',
        'Prices and delivery periods will be reconfirmed after the quotation validity period expires.',
        'Delays arising from force majeure, supply-chain disruptions or decisions of public authorities will be evaluated separately.'
      ],
      standard:[
        'This quotation is subject to Vensis standard sales, delivery and technical use conditions.',
        'Products must be used within the operating, installation and maintenance limits stated in the catalogues.',
        'The manufacturer reserves the right to make product improvements required for technical reasons while maintaining equivalent performance.'
      ],
      acceptance:'Signing this quotation or converting it into a written order constitutes acceptance of the product table, commercial summary, scope, exclusions and the conditions on this page as a whole.',
      preparedTitle:'Prepared By',
      preparedLine:'Name / Surname   Signature   Date',
      customerTitle:'Customer Approval',
      customerLine:'Company / Authorized Person   Stamp / Signature   Date'
    }
  };

  function englishSettings(format){
    const value=clone(EN_BASE);
    if(format==='electrical'){
      value.summary.quotationNote='Our quotation has been prepared based on the specified electrical products and the technical information provided to us. Zone classification, certification and site suitability must be verified by the customer.';
      value.scope.included='Our quotation covers the sale of the equipment whose models, product codes and quantities are stated in the electrical products table on the first page.\n\nAccessories, installation and site services not expressly stated in the quotation are excluded.';
      value.scope.exclusions=['On-site electrical installation, cabling and connection labour.','Cables, glands, blanking plugs and installation accessories unless separately stated in the quotation table.','Panel work, automation, programming and commissioning services.','Freight and on-site handling unless separately stated in the quotation.'];
      value.scope.suitability='Final product suitability must be verified by the customer or project designer with respect to Zone classification, gas/dust group, temperature class, IP protection, cable entries, voltage and certification requirements.';
    }else if(format==='mixed'){
      value.summary.quotationNote='Our quotation has been prepared based on the survey and technical information provided for the fan and electrical products. Project and site suitability of each product group must be verified by the customer.';
      value.scope.included='Our quotation covers the sale of the equipment whose models and quantities are stated in the Fan Products and Electrical Products tables on the first page.\n\nProducts, accessories and services not expressly stated in the quotation are excluded.';
      value.scope.exclusions=['On-site installation labour for devices and equipment.','Fan installation hardware, duct connections and vibration isolators unless separately stated.','Electrical cabling, glands, connection components, panels and automation works unless separately stated.','Freight, crane, unloading and on-site handling unless separately stated.','Commissioning, site testing and automation connections.'];
      value.scope.suitability='Fan operating points and the Zone, voltage, IP and certification suitability of electrical products must be jointly verified by the customer or project designer.';
    }
    return value;
  }

  function stampQuotation(lang){
    const quotation=readJson(QUOTATION_KEY);
    if(!quotation||!Array.isArray(quotation.items))return;
    const previous=quotation.outputLanguage;
    const format=formats.detect(quotation.items,quotation.format||'auto');
    quotation.outputLanguage=lang;
    quotation.resolvedFormat=format;
    if(lang==='en'&&(previous!=='en'||!quotation.settings))quotation.settings=englishSettings(format);
    writeJson(QUOTATION_KEY,quotation);
  }
  function stampProjectPrint(lang){
    const snapshot=readJson(PRINT_KEY);
    if(!snapshot||!Array.isArray(snapshot.items))return;
    snapshot.outputLanguage=lang;
    writeJson(PRINT_KEY,snapshot);
  }
  function appendLanguage(url,lang){
    try{
      const parsed=new URL(String(url||''),location.href);
      parsed.searchParams.set('lang',lang);
      return parsed.origin===location.origin?`${parsed.pathname}${parsed.search}${parsed.hash}`:parsed.href;
    }catch{return url}
  }

  if(page==='project.html'){
    const nativeOpen=root.open.bind(root);
    root.open=function(url,target,features){
      const raw=String(url||'');
      const lang=currentLanguage();
      if(/(?:^|\/)quotation\.html(?:[?#]|$)/i.test(raw)){
        stampQuotation(lang);
        url=appendLanguage(raw,lang);
      }else if(/(?:^|\/)project-print\.html(?:[?#]|$)/i.test(raw)){
        stampProjectPrint(lang);
        url=appendLanguage(raw,lang);
      }
      return nativeOpen(url,target,features);
    };
    return;
  }

  function installInnerHtmlFilter(element,replacements){
    if(!element)return;
    const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
    if(!descriptor?.get||!descriptor?.set)return;
    Object.defineProperty(element,'innerHTML',{
      configurable:true,
      get(){return descriptor.get.call(this)},
      set(value){
        let text=String(value??'');
        replacements.forEach(([from,to])=>{text=text.split(from).join(to)});
        descriptor.set.call(this,text);
      }
    });
  }

  function setPageReference(node){
    if(!node)return;
    const old=node.querySelector('[data-quote-number]');
    const value=old?.textContent||'-';
    node.textContent='Quotation No.: ';
    const span=document.createElement('span');
    span.dataset.quoteNumber='';
    span.textContent=value;
    node.appendChild(span);
  }

  function localizeEnglishQuotationShell(){
    const pages=[...document.querySelectorAll('#quotationContent .quote-page')];
    if(pages.length<3)return;
    const page1=pages[0],page2=pages[1],page3=pages[2];

    const termLabels=['Payment','Exchange Rate','Validity','Delivery Time','Delivery Place','VAT','Commissioning'];
    page1.querySelectorAll('.term-card span').forEach((node,index)=>{if(termLabels[index])node.textContent=termLabels[index]});

    const reference=document.getElementById('quoteReference');
    if(reference&&!document.getElementById('quoteContact')){
      const sourceRow=reference.closest('.meta-row');
      if(sourceRow){
        const row=document.createElement('div');
        row.className='meta-row';
        row.innerHTML='<span>Contact Person</span><b id="quoteContact">-</b>';
        sourceRow.insertAdjacentElement('afterend',row);
      }
    }

    const page2Title=page2.querySelector('.section-title h1');
    const page2Sub=page2.querySelector('.section-title p');
    if(page2Title)page2Title.textContent='QUOTATION SCOPE';
    if(page2Sub)page2Sub.textContent='Scope & Exclusions';
    setPageReference(page2.querySelector('.page-ref'));
    ['Quotation Scope','Excluded Works','Delivery and Control'].forEach((text,index)=>{const node=page2.querySelectorAll('.content-block h2')[index];if(node)node.textContent=text});

    const page3Title=page3.querySelector('.section-title h1');
    const page3Sub=page3.querySelector('.section-title p');
    if(page3Title)page3Title.textContent='COMMERCIAL TERMS';
    if(page3Sub)page3Sub.textContent='General Sales and Approval Conditions';
    setPageReference(page3.querySelector('.page-ref'));
    ['Price and Currency','Payment Terms','Delivery Terms','Standard Conditions'].forEach((text,index)=>{const node=page3.querySelectorAll('.content-block h2')[index];if(node)node.textContent=text});

    installInnerHtmlFilter(document.getElementById('quotationProductTables'),[
      ['Voltaj / Voltage','Voltage'],['Fan Ürünleri','Fan Products'],['Elektrik Ürünleri','Electrical Products']
    ]);
    installInnerHtmlFilter(page1.querySelector('.quote-note'),[['Teklif Notu','Quotation Note']]);
    installInnerHtmlFilter(page2.querySelector('.notice'),[['Proje uygunluğu:','Project suitability:']]);
  }

  function installEnglishSettingsTrap(){
    function wrap(api){
      if(!api||api.__vensisEnglishOutput)return api;
      api.__vensisEnglishOutput=true;
      api.defaults=englishSettings('fan');
      api.read=()=>englishSettings('fan');
      api.forFormat=format=>englishSettings(format);
      return api;
    }
    if(root.VensisQuotationSettings){wrap(root.VensisQuotationSettings);return}
    let value;
    try{
      Object.defineProperty(root,'VensisQuotationSettings',{
        configurable:true,enumerable:true,
        get(){return value},
        set(api){
          value=wrap(api);
          Object.defineProperty(root,'VensisQuotationSettings',{configurable:true,enumerable:true,writable:true,value});
        }
      });
    }catch{}
  }

  if(page==='quotation.html'){
    const quotation=readJson(QUOTATION_KEY);
    const requested=new URLSearchParams(location.search).get('lang');
    const lang=quotation?.outputLanguage==='tr'||quotation?.outputLanguage==='en'?quotation.outputLanguage:(requested==='tr'||requested==='en'?requested:currentLanguage());
    root.VensisOutputLanguage=lang;
    document.documentElement.lang=lang;
    if(quotation){
      const previous=quotation.outputLanguage;
      quotation.outputLanguage=lang;
      if(lang==='en'&&(previous!=='en'||!quotation.settings))quotation.settings=englishSettings(formats.detect(quotation.items||[],quotation.format||'auto'));
      writeJson(QUOTATION_KEY,quotation);
    }
    if(lang==='en'){
      localizeEnglishQuotationShell();
      installEnglishSettingsTrap();
    }
  }
})(typeof window!=='undefined'?window:globalThis);

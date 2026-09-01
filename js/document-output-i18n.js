(function(){
  'use strict';

  const PAGE=(location.pathname.split('/').pop()||'').toLowerCase();
  const language=()=>{
    const runtime=window.VensisDocumentLanguage?.getLanguage?.()||window.VensisI18n?.getLanguage?.();
    if(runtime==='tr'||runtime==='en')return runtime;
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  };
  const lang=language();
  const tr=lang==='tr';
  const locale=tr?'tr-TR':'en-GB';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const lines=value=>String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  const getPath=(object,path)=>path.split('.').reduce((value,key)=>value==null?undefined:value[key],object);
  const setPath=(object,path,value)=>{const keys=path.split('.');const last=keys.pop();const target=keys.reduce((value,key)=>(value[key]||(value[key]={})),object);target[last]=value};
  const merge=(base,custom)=>{
    if(Array.isArray(base))return Array.isArray(custom)?custom.slice():base.slice();
    if(base&&typeof base==='object'){
      const out={};Object.keys(base).forEach(key=>{out[key]=merge(base[key],custom&&typeof custom==='object'?custom[key]:undefined)});return out;
    }
    return custom===undefined||custom===null?base:custom;
  };

  const DEFAULTS={
    tr:{
      summary:{
        payment:'Siparişte peşin',
        exchangeRate:'Fatura tarihindeki Türkiye Vakıflar Bankası Euro satış kuru esas alınacaktır.',
        validity:'7 gün',deliveryTime:'8 hafta',deliveryPlace:'Vensis depo teslim',
        vat:'Fiyatlarımıza KDV dahil değildir.',
        commissioning:'Devreye alma hizmeti teklif fiyatına dahil değildir.',
        quotationNote:'Teklifimiz tarafımıza iletilen keşif ve teknik bilgilere göre hazırlanmıştır. Teklif edilen ürünlerin proje ve uygulama koşullarına uygunluğunun müşteri tarafından kontrol edilmesi gerekmektedir.'
      },
      scope:{
        included:'Teklifimiz, birinci sayfadaki ürün tablosunda model ve adetleri açıkça belirtilen cihaz ve ekipmanların satışını kapsamaktadır.\n\nTeklifte yazılı olarak belirtilmeyen ürün, aksesuar, hizmet ve saha uygulamaları teklif kapsamına dahil değildir.',
        exclusions:['Cihaz ve ekipmanların sahada montaj işçiliği.','Ana elektrik beslemesi, güç ve MCC panoları ile her türlü kablolama işi.','Fan montajı için gerekli somun, cıvata, dübel, konsol ve ankraj malzemelerinin temini.','Nakliye, vinç, indirme ve saha içi taşıma hizmetleri; teklifte ayrıca belirtilmedikçe.','Teklif tablosunda açıkça belirtilmeyen aksesuar, otomasyon elemanı ve cihazlar.','Devreye alma, saha testi, balans kontrolü ve otomasyon bağlantıları.'],
        deliveryControl:['Teslim süreleri iş günü olarak değerlendirilir; cumartesi, pazar ve resmî tatiller süreye dahil değildir.','Ürünler teslim alınırken ambalaj, hasar ve eksik adet açısından kontrol edilmelidir.','Teslim sonrasında oluşabilecek depolama, taşıma ve montaj kaynaklı hasarlar müşteri sorumluluğundadır.'],
        suitability:'Ürün seçimi, tarafımıza iletilen bilgi ve çalışma noktalarına göre hazırlanmıştır. Nihai sistem uygunluğu, yerleşim, kanal dirençleri, elektrik altyapısı ve montaj koşulları müşteri veya proje müellifi tarafından doğrulanmalıdır.'
      },
      terms:{
        priceCurrency:['Fiyatlar Euro bazında ve KDV hariçtir.','Faturalama, fatura tarihindeki teklif üzerinde belirtilen Euro satış kuru üzerinden yapılacaktır.','Teklif, belirtilen ürün ve adetlerin birlikte sipariş edilmesi için geçerlidir.','Ürün miktarı, teknik özellik veya teslim koşullarındaki değişiklikler fiyat revizyonuna neden olabilir.'],
        payment:['Sipariş, avans ödemesinin alınması ve yazılı sipariş onayının verilmesiyle geçerlilik kazanır.','Avans alınmadan üretim veya tedarik süreci başlamaz.','Ödemelerin gecikmesi halinde kur farkı ve doğabilecek finansman giderleri ayrıca değerlendirilir.'],
        delivery:['Teslim süresi, sipariş ve ödeme koşullarının tamamlanmasından sonra başlar.','Teklif geçerlilik süresi sonrasında fiyatlar ve teslim süreleri yeniden teyit edilir.','Mücbir sebepler, tedarik zinciri kesintileri ve resmî makam kararlarından kaynaklanan gecikmeler ayrıca değerlendirilir.'],
        standard:['Bu teklif, Vensis standart satış, teslimat ve teknik kullanım koşullarına tabidir.','Ürünler kataloglarda belirtilen çalışma, montaj ve bakım sınırları içerisinde kullanılmalıdır.','Üretici, teknik zorunluluk halinde eşdeğer performansı koruyacak ürün geliştirmeleri yapma hakkını saklı tutar.'],
        acceptance:'Bu teklifin imzalanması veya yazılı siparişe dönüştürülmesi; ürün tablosu, ticari özet, kapsam, hariç işler ve bu sayfadaki şartların birlikte kabul edildiği anlamına gelir.',
        preparedTitle:'Teklifi Hazırlayan',preparedLine:'Ad / Soyad   İmza   Tarih',customerTitle:'Müşteri Onayı',customerLine:'Firma / Yetkili   Kaşe / İmza   Tarih'
      }
    },
    en:{
      summary:{
        payment:'Cash in advance with order',
        exchangeRate:'The Türkiye Vakıflar Bankası Euro selling rate on the invoice date shall apply.',
        validity:'7 days',deliveryTime:'8 weeks',deliveryPlace:'Ex Vensis warehouse',
        vat:'VAT is not included in our prices.',
        commissioning:'Commissioning service is not included in the quotation price.',
        quotationNote:'Our quotation has been prepared based on the survey and technical information provided to us. The customer is responsible for verifying that the offered products are suitable for the project and application conditions.'
      },
      scope:{
        included:'Our quotation covers the sale of the equipment and devices whose models and quantities are clearly stated in the product table on the first page.\n\nProducts, accessories, services and site works not expressly stated in the quotation are not included in the scope.',
        exclusions:['On-site installation labour for devices and equipment.','Main electrical supply, power and MCC panels, and all cabling works.','Supply of nuts, bolts, anchors, brackets and fixing materials required for fan installation.','Freight, crane, unloading and on-site handling services unless expressly stated in the quotation.','Accessories, automation components and devices not expressly listed in the quotation table.','Commissioning, site testing, balancing checks and automation connections.'],
        deliveryControl:['Delivery periods are evaluated in working days; Saturdays, Sundays and public holidays are excluded.','Products must be checked for packaging condition, damage and missing quantities upon receipt.','Damage arising from storage, handling or installation after delivery is the customer’s responsibility.'],
        suitability:'Product selection has been prepared according to the information and operating points provided to us. Final system suitability, layout, duct resistance, electrical infrastructure and installation conditions must be verified by the customer or project designer.'
      },
      terms:{
        priceCurrency:['Prices are in Euro and exclude VAT.','Invoicing shall be made using the Euro selling rate specified in the quotation on the invoice date.','The quotation is valid for the joint order of the stated products and quantities.','Changes in product quantities, technical specifications or delivery conditions may require a price revision.'],
        payment:['The order becomes valid upon receipt of the advance payment and written order confirmation.','Production or procurement will not commence before the advance payment is received.','In the event of delayed payments, exchange-rate differences and any resulting financing costs will be evaluated separately.'],
        delivery:['The delivery period starts after the order and payment conditions have been completed.','Prices and delivery periods will be reconfirmed after the quotation validity period expires.','Delays arising from force majeure, supply-chain disruptions or decisions of public authorities will be evaluated separately.'],
        standard:['This quotation is subject to Vensis standard sales, delivery and technical use conditions.','Products must be used within the operating, installation and maintenance limits stated in the catalogues.','The manufacturer reserves the right to make product improvements required for technical reasons while maintaining equivalent performance.'],
        acceptance:'Signing this quotation or converting it into a written order constitutes acceptance of the product table, commercial summary, scope, exclusions and the conditions on this page as a whole.',
        preparedTitle:'Prepared By',preparedLine:'Name / Surname   Signature   Date',customerTitle:'Customer Approval',customerLine:'Company / Authorized Person   Stamp / Signature   Date'
      }
    }
  };

  const FORMAT={
    tr:{
      electrical:{note:'Teklifimiz, belirtilen elektrik ürünleri ve tarafımıza iletilen teknik bilgilere göre hazırlanmıştır. Zone sınıfı, sertifika ve saha uygunluğu müşteri tarafından doğrulanmalıdır.',included:'Teklifimiz, birinci sayfadaki elektrik ürünleri tablosunda model, ürün kodu ve adetleri belirtilen ekipmanların satışını kapsamaktadır.\n\nTeklifte açıkça belirtilmeyen aksesuar, montaj ve saha hizmetleri kapsam dışındadır.',exclusions:['Sahadaki elektrik montajı, kablolama ve bağlantı işçiliği.','Kablo, rakor, kör tapa ve montaj aksesuarları; teklif tablosunda ayrıca belirtilmedikçe.','Pano içi uygulama, otomasyon, programlama ve devreye alma hizmetleri.','Nakliye ve saha içi taşıma; teklifte ayrıca belirtilmedikçe.'],suitability:'Nihai ürün uygunluğu; Zone sınıfı, gaz/toz grubu, sıcaklık sınıfı, IP koruması, kablo girişleri, gerilim ve sertifika şartlarına göre müşteri veya proje müellifi tarafından doğrulanmalıdır.'},
      mixed:{note:'Teklifimiz, fan ve elektrik ürünleri için tarafımıza iletilen keşif ve teknik bilgilere göre hazırlanmıştır. Her ürün grubunun proje ve saha uygunluğu müşteri tarafından doğrulanmalıdır.',included:'Teklifimiz, birinci sayfadaki Fan Ürünleri ve Elektrik Ürünleri tablolarında model ve adetleri belirtilen ekipmanların satışını kapsamaktadır.\n\nTeklifte açıkça belirtilmeyen ürün, aksesuar ve hizmetler kapsam dışındadır.',exclusions:['Cihaz ve ekipmanların sahada montaj işçiliği.','Fan montaj elemanları, kanal bağlantıları ve titreşim izolatörleri; ayrıca belirtilmedikçe.','Elektrik kablolaması, rakorlar, bağlantı elemanları, pano ve otomasyon işleri; ayrıca belirtilmedikçe.','Nakliye, vinç, indirme ve saha içi taşıma; ayrıca belirtilmedikçe.','Devreye alma, saha testi ve otomasyon bağlantıları.'],suitability:'Fan çalışma noktaları ile elektrik ürünlerinin Zone, gerilim, IP ve sertifika uygunluğu müşteri veya proje müellifi tarafından birlikte doğrulanmalıdır.'}
    },
    en:{
      electrical:{note:'Our quotation has been prepared based on the specified electrical products and the technical information provided to us. Zone classification, certification and site suitability must be verified by the customer.',included:'Our quotation covers the sale of the equipment whose models, product codes and quantities are stated in the electrical products table on the first page.\n\nAccessories, installation and site services not expressly stated in the quotation are excluded.',exclusions:['On-site electrical installation, cabling and connection labour.','Cables, glands, blanking plugs and installation accessories unless separately stated in the quotation table.','Panel work, automation, programming and commissioning services.','Freight and on-site handling unless separately stated in the quotation.'],suitability:'Final product suitability must be verified by the customer or project designer with respect to Zone classification, gas/dust group, temperature class, IP protection, cable entries, voltage and certification requirements.'},
      mixed:{note:'Our quotation has been prepared based on the survey and technical information provided for the fan and electrical products. Project and site suitability of each product group must be verified by the customer.',included:'Our quotation covers the sale of the equipment whose models and quantities are stated in the Fan Products and Electrical Products tables on the first page.\n\nProducts, accessories and services not expressly stated in the quotation are excluded.',exclusions:['On-site installation labour for devices and equipment.','Fan installation hardware, duct connections and vibration isolators unless separately stated.','Electrical cabling, glands, connection components, panels and automation works unless separately stated.','Freight, crane, unloading and on-site handling unless separately stated.','Commissioning, site testing and automation connections.'],suitability:'Fan operating points and the Zone, voltage, IP and certification suitability of electrical products must be jointly verified by the customer or project designer.'}
    }
  };

  function baseSettingsKey(){return window.VensisAccess?.storageKey?.('vensis_quotation_settings_v1')||'vensis_quotation_settings_v1'}
  function profileKey(code){return `${baseSettingsKey()}_${code}`}
  function loadProfile(code){
    const defaults=DEFAULTS[code];
    try{
      const saved=JSON.parse(localStorage.getItem(profileKey(code))||'null');
      if(saved)return merge(defaults,saved);
      if(code==='tr'){
        const legacy=JSON.parse(localStorage.getItem(baseSettingsKey())||'null');
        const migrated=legacy?merge(defaults,legacy):clone(defaults);
        localStorage.setItem(profileKey(code),JSON.stringify(migrated));
        return migrated;
      }
    }catch{}
    const value=clone(defaults);
    try{localStorage.setItem(profileKey(code),JSON.stringify(value))}catch{}
    return value;
  }
  function saveProfile(code,value){
    const normalized=merge(DEFAULTS[code],value||{});
    try{localStorage.setItem(profileKey(code),JSON.stringify(normalized))}catch{}
    return normalized;
  }
  function forFormat(base,format,code){
    const value=clone(base);
    const override=FORMAT[code]?.[format];
    if(override){value.summary.quotationNote=override.note;value.scope.included=override.included;value.scope.exclusions=override.exclusions.slice();value.scope.suitability=override.suitability}
    return value;
  }

  const PAIRS=[
    ['← Back to Project','← Projeye Dön'],['Print Project','Projeyi Yazdır'],['Print Quotation','Teklifi Yazdır'],['Siparişe Dönüştür','Convert to Order'],
    ['No quotation found','Teklif bulunamadı'],['Return to the project and choose Print Quotation.','Projeye dönüp Teklifi Yazdır seçeneğini kullanın.'],
    ['Quotation Editor','Teklif Editörü'],['Quotation','Teklif'],['Quotation and Project Information','Teklif ve Proje Bilgileri'],['Quotation No.','Teklif No'],['Quotation Date','Teklif Tarihi'],['Currency','Para Birimi'],['Quotation Format','Teklif Formatı'],['Automatic','Otomatik'],['Electrical','Elektrik'],['Mixed','Karma'],['Project Name','Proje Adı'],['Customer / Reference','Müşteri / Referans'],['Contact Person','İlgili Kişi'],['Products','Ürünler'],['Quantity','Adet'],['List Price','Liste Fiyatı'],['Discount %','İskonto %'],['Product Note','Ürün Notu'],['Commercial Summary','Ticari Özet'],['Scope & Exclusions','Kapsam ve Hariçler'],['Commercial Terms','Ticari Şartlar'],['Save Quotation','Teklifi Kaydet'],
    ['Project Information','Proje Bilgileri'],['Quotation Information','Teklif Bilgileri'],['Date','Tarih'],['Total Units','Toplam Adet'],['Quotation Total','Teklif Toplamı'],
    ['Payment','Ödeme'],['Exchange Rate','Kur'],['Validity','Opsiyon'],['Delivery Time','Teslim Süresi'],['Delivery Place','Teslim Yeri'],['VAT','KDV'],['Commissioning','Devreye Alma'],['Quotation Note','Teklif Notu'],
    ['QUOTATION SCOPE','TEKLİF KAPSAMI'],['Scope and exclusions','Kapsam ve hariç işler'],['Quotation Scope','Teklif Kapsamı'],['Excluded Works','Teklif Harici İşler'],['Delivery and Control','Teslimat ve Kontrol'],['Project suitability:','Proje uygunluğu:'],
    ['COMMERCIAL TERMS','TİCARİ ŞARTLAR'],['General sales and approval conditions','Genel satış ve onay koşulları'],['Price and Currency','Fiyat ve Kur'],['Payment Terms','Ödeme'],['Delivery Terms','Teslim Süresi'],['Standard Conditions','Standart Koşullar'],
    ['Product','Ürün'],['Selected / Nominal','Seçilen / Nominal'],['Voltage','Voltaj'],['Unit Price','Birim Fiyat'],['Qty','Adet'],['Total','Toplam'],['Power','Güç'],['Lumen','Lümen'],['Fan Products','Fan Ürünleri'],['Electrical Products','Elektrik Ürünleri'],
    ['PROJECT TECHNICAL DOCUMENT','PROJE TEKNİK DOKÜMANI'],['Project list and product datasheets','Proje listesi ve ürün teknik föyleri'],['Required / Source','İstenen / Kaynak'],['Technical Project Output','Teknik Proje Çıktısı'],['Project Description','Proje Açıklaması'],['Brand:','Marka:'],['Required / Program Selected Point','İstenen / Program Seçim Noktası'],
    ['CUSTOM PRODUCT TECHNICAL SHEET','ÖZEL ÜRÜN TEKNİK FÖYÜ'],['Custom Product','Özel Ürün'],['Project-defined product','Proje tanımlı ürün'],['No product image','Ürün görseli yok'],['PROJECT SPECIFICATIONS','PROJE TEKNİK ÖZELLİKLERİ'],['Selected / Nominal Airflow','Seçilen / Nominal Debi'],['Voltage / Frequency','Voltaj / Frekans'],['Motor Power','Motor Gücü'],['Speed','Devir'],['Current','Akım'],['Sound Level','Ses Seviyesi'],['Document Note','Doküman Notu'],
    ['Required Point','İstenen Nokta'],['Program Selected Point','Program Seçim Noktası'],['Fan Performance Curve','Fan Performans Eğrisi'],['Air Flow (m³/h)','Debi (m³/h)'],['Static Pressure (Pa)','Statik Basınç (Pa)'],['No performance curve data available.','Performans eğrisi verisi bulunmuyor.'],['No information available.','Bilgi bulunmuyor.'],['Specifications','Teknik Özellikler'],['Performance','Performans'],['General Features','Genel Özellikler'],['Motor','Motor'],['Areas of Usage','Kullanım Alanları']
  ];
  const MAP={en:new Map(),tr:new Map()};
  PAIRS.forEach(([en,trText])=>{MAP.en.set(en,en);MAP.en.set(trText,en);MAP.tr.set(en,trText);MAP.tr.set(trText,trText)});

  function translateTextNodes(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(['SCRIPT','STYLE','TEXTAREA'].includes(node.parentElement?.tagName))return;
      const raw=node.nodeValue||'';const clean=raw.trim();if(!clean)return;
      const next=MAP[lang].get(clean);if(next&&next!==clean)node.nodeValue=raw.replace(clean,next);
    });
  }

  function listMarkup(items,ordered=false){const tag=ordered?'ol':'ul';return `<${tag}>${(items||[]).filter(Boolean).map(item=>`<li>${esc(item)}</li>`).join('')}</${tag}>`}
  function paragraphMarkup(value){return String(value||'').split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean).map(text=>`<p>${esc(text).replace(/\n/g,'<br>')}</p>`).join('')}

  function applySettingsToQuotation(settings){
    const pages=[...document.querySelectorAll('.quote-page')];if(pages.length<3)return;
    const summary=settings.summary||{},scope=settings.scope||{},terms=settings.terms||{};
    const cards=pages[0].querySelectorAll('.term-card');
    const cardLabels=tr?['Ödeme','Kur','Opsiyon','Teslim Süresi','Teslim Yeri','KDV','Devreye Alma']:['Payment','Exchange Rate','Validity','Delivery Time','Delivery Place','VAT','Commissioning'];
    const values=[summary.payment,summary.exchangeRate,summary.validity,summary.deliveryTime,summary.deliveryPlace,summary.vat,summary.commissioning];
    cards.forEach((card,index)=>{const label=card.querySelector('span'),value=card.querySelector('b');if(label)label.textContent=cardLabels[index]||'';if(value)value.textContent=values[index]||'-'});
    const note=pages[0].querySelector('.quote-note');if(note)note.innerHTML=`<b>${tr?'Teklif Notu':'Quotation Note'}</b>${esc(summary.quotationNote||'').replace(/\n/g,'<br>')}`;
    const scopeBlocks=pages[1].querySelectorAll('.content-block');
    const scopeTitles=tr?['Teklif Kapsamı','Teklif Harici İşler','Teslimat ve Kontrol']:['Quotation Scope','Excluded Works','Delivery and Control'];
    scopeBlocks.forEach((block,index)=>{const h=block.querySelector('h2');if(h)h.textContent=scopeTitles[index]||h.textContent});
    const scopeBodies=pages[1].querySelectorAll('.content-block .body');if(scopeBodies[0])scopeBodies[0].innerHTML=paragraphMarkup(scope.included);if(scopeBodies[1])scopeBodies[1].innerHTML=listMarkup(scope.exclusions);if(scopeBodies[2])scopeBodies[2].innerHTML=listMarkup(scope.deliveryControl);
    const suitability=pages[1].querySelector('.notice');if(suitability)suitability.innerHTML=`<b>${tr?'Proje uygunluğu:':'Project suitability:'}</b> ${esc(scope.suitability||'').replace(/\n/g,'<br>')}`;
    const termBlocks=pages[2].querySelectorAll('.content-block');const termTitles=tr?['Fiyat ve Kur','Ödeme','Teslim Süresi','Standart Koşullar']:['Price and Currency','Payment Terms','Delivery Terms','Standard Conditions'];termBlocks.forEach((block,index)=>{const h=block.querySelector('h2');if(h)h.textContent=termTitles[index]||h.textContent});
    const termBodies=pages[2].querySelectorAll('.content-block .body');[terms.priceCurrency,terms.payment,terms.delivery,terms.standard].forEach((items,index)=>{if(termBodies[index])termBodies[index].innerHTML=listMarkup(items,true)});
    const acceptance=pages[2].querySelector('.notice');if(acceptance)acceptance.textContent=terms.acceptance||'';
    const signatures=pages[2].querySelectorAll('.signature-box');if(signatures[0]){signatures[0].querySelector('b').textContent=terms.preparedTitle||'';signatures[0].querySelector('span').textContent=terms.preparedLine||''}if(signatures[1]){signatures[1].querySelector('b').textContent=terms.customerTitle||'';signatures[1].querySelector('span').textContent=terms.customerLine||''}
  }

  function collectQuoteProfile(fallback){
    const value=clone(fallback);
    document.querySelectorAll('[data-quote-setting]').forEach(field=>{setPath(value,field.dataset.quoteSetting,field.dataset.quoteSettingType==='list'?lines(field.value):String(field.value||'').trim())});
    return value;
  }
  function fillQuoteFields(settings){
    document.querySelectorAll('[data-quote-setting]').forEach(field=>{const value=getPath(settings,field.dataset.quoteSetting);field.value=field.dataset.quoteSettingType==='list'?(Array.isArray(value)?value.join('\n'):String(value||'')):String(value||'')});
    document.querySelectorAll('[data-setting]').forEach(field=>{const value=getPath(settings,field.dataset.setting);field.value=field.dataset.settingType==='list'?(Array.isArray(value)?value.join('\n'):String(value||'')):String(value||'')});
  }

  function quotationLabels(format){
    const title=document.getElementById('quoteDocumentTitle'),subtitle=document.getElementById('quoteDocumentSubtitle');
    if(title)title.textContent=tr?(format==='fan'?'FAN TEKLİFİ':format==='electrical'?'ELEKTRİK TEKLİFİ':'TİCARİ TEKLİF'):(format==='fan'?'FAN QUOTATION':format==='electrical'?'ELECTRICAL QUOTATION':'COMMERCIAL QUOTATION');
    if(subtitle)subtitle.textContent=tr?(format==='fan'?'Fan Ticari Teklifi':format==='electrical'?'Elektrik Ticari Teklifi':'Fan & Elektrik Ticari Teklifi'):(format==='fan'?'Fan Commercial Offer':format==='electrical'?'Electrical Commercial Offer':'Fan & Electrical Commercial Offer');
    const pages=[...document.querySelectorAll('.quote-page')];
    if(pages[1]){const h=pages[1].querySelector('.section-title h1'),p=pages[1].querySelector('.section-title p');if(h)h.textContent=tr?'TEKLİF KAPSAMI':'QUOTATION SCOPE';if(p)p.textContent=tr?'Kapsam ve hariç işler':'Scope and exclusions'}
    if(pages[2]){const h=pages[2].querySelector('.section-title h1'),p=pages[2].querySelector('.section-title p');if(h)h.textContent=tr?'TİCARİ ŞARTLAR':'COMMERCIAL TERMS';if(p)p.textContent=tr?'Genel satış ve onay koşulları':'General sales and approval conditions'}
    document.querySelectorAll('.page-ref').forEach(node=>{const span=node.querySelector('[data-quote-number]');const number=span?.textContent||'-';node.innerHTML=`${tr?'Teklif No':'Quotation No.'}: <span data-quote-number>${esc(number)}</span>`});
    const footers=document.querySelectorAll('.quote-page .footer');if(footers[0])footers[0].textContent=`Vensis Engineering Suite • ${tr?'Ticari Teklif':'Commercial Quotation'} • ${tr?'Sayfa':'Page'} 1 / 3`;if(footers[1])footers[1].textContent=`Vensis Engineering Suite • ${tr?'Teklif Kapsamı':'Quotation Scope'} • ${tr?'Sayfa':'Page'} 2 / 3`;if(footers[2])footers[2].textContent=`Vensis Engineering Suite • ${tr?'Ticari Şartlar':'Commercial Terms'} • ${tr?'Sayfa':'Page'} 3 / 3`;
    const metaHeads=document.querySelectorAll('.quote-page:first-child .meta-head');if(metaHeads[0])metaHeads[0].textContent=tr?'Proje Bilgileri':'Project Information';if(metaHeads[1])metaHeads[1].textContent=tr?'Teklif Bilgileri':'Quotation Information';
    document.querySelectorAll('.quote-page:first-child .meta-row span').forEach(node=>{const clean=node.textContent.trim();const map=tr?{'Project Name':'Proje Adı','Customer / Reference':'Müşteri / Referans','Contact Person / İlgili':'İlgili Kişi','Contact Person':'İlgili Kişi','Quotation No.':'Teklif No','Date':'Tarih','Currency':'Para Birimi'}:{'Proje Adı':'Project Name','Müşteri / Referans':'Customer / Reference','Contact Person / İlgili':'Contact Person','İlgili Kişi':'Contact Person','Teklif No':'Quotation No.','Tarih':'Date','Para Birimi':'Currency'};if(map[clean])node.textContent=map[clean]});
    const totals=document.querySelectorAll('.totals .total-row span');if(totals[0])totals[0].textContent=tr?'Toplam Adet':'Total Units';if(totals[1])totals[1].textContent=tr?'Teklif Toplamı':'Quotation Total';
  }

  function localizeQuotation(){
    const editor=window.VensisQuotationEditor;const draft=editor?.draft?.();if(!draft||!document.querySelector('.quote-page'))return false;
    document.documentElement.lang=lang;
    const format=window.VensisQuotationFormats?.detect?.(draft.items||[],draft.format||'auto')||'fan';
    const profile=loadProfile(lang);const settings=forFormat(profile,format,lang);
    draft.settings=clone(settings);draft.outputLanguage=lang;
    fillQuoteFields(settings);applySettingsToQuotation(settings);quotationLabels(format);translateTextNodes(document.body);
    const date=document.getElementById('quoteDate');if(date){const raw=/^\d{4}-\d{2}-\d{2}$/.test(String(draft.date||''))?draft.date:'';if(raw){const d=new Date(`${raw}T00:00:00`);if(Number.isFinite(d.getTime()))date.textContent=new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}}
    document.title=`${draft.quotationNumber||'Vensis'} ${tr?'Teklif':'Quotation'}`;
    let timer;
    const sync=()=>{clearTimeout(timer);timer=setTimeout(()=>{const current=collectQuoteProfile(loadProfile(lang));saveProfile(lang,current);draft.settings=forFormat(current,format,lang);draft.outputLanguage=lang;applySettingsToQuotation(draft.settings);translateTextNodes(document.body)},80)};
    document.querySelectorAll('[data-quote-setting],[data-setting]').forEach(field=>{if(!field.dataset.documentI18nBound){field.dataset.documentI18nBound='1';field.addEventListener('input',sync);field.addEventListener('change',sync)}});
    window.addEventListener('beforeprint',()=>{sync();applySettingsToQuotation(draft.settings||settings);quotationLabels(format);translateTextNodes(document.body)},{once:true});
    return true;
  }

  function localizeProjectPrint(){
    const root=document.getElementById('projectPrintRoot');if(!root||!root.children.length)return false;
    document.documentElement.lang=lang;
    translateTextNodes(document.body);
    const back=document.querySelector('.toolbar .back'),print=document.getElementById('printProjectDocument');if(back)back.textContent=tr?'← Projeye Dön':'← Back to Project';if(print)print.textContent=tr?'Projeyi Yazdır':'Print Project';
    const overview=root.querySelector('.project-overview');if(overview){
      const h=overview.querySelector('.project-title h1');if(h)h.textContent=tr?'PROJE TEKNİK DOKÜMANI':'PROJECT TECHNICAL DOCUMENT';
      const meta=overview.querySelectorAll('.meta-card span');const labels=tr?['Proje Adı','Müşteri / Referans','İlgili Kişi']:['Project Name','Customer / Reference','Contact Person'];meta.forEach((node,index)=>{if(labels[index])node.textContent=labels[index]});
      const note=overview.querySelector('.project-note');if(note)note.innerHTML=tr?'<b>Teknik Proje Çıktısı</b>Bu dokümanda birim fiyat, iskonto ve ticari toplamlar özellikle gösterilmemektedir. Aşağıda her proje kalemi için ürün teknik föyü veya özel teknik föy yer almaktadır.':'<b>Technical Project Output</b>This document intentionally excludes unit prices, discounts and commercial totals. A product datasheet or custom technical sheet is included for every project line below.';
      const footer=overview.querySelector('.project-footer');if(footer)footer.textContent=`Vensis Engineering Suite • ${tr?'Teknik Proje Çıktısı':'Technical Project Print'} • www.vensis.com.tr`;
    }
    root.querySelectorAll('.pdf-footer-meta').forEach(node=>{const match=node.textContent.match(/Page\s+(\d+)\s*\/\s*(\d+)|Sayfa\s+(\d+)\s*\/\s*(\d+)/i);if(match){const a=match[1]||match[3],b=match[2]||match[4];const custom=/Custom Product|Özel Ürün/i.test(node.textContent);node.textContent=`${custom?(tr?'Özel Ürün Eki':'Custom Product Appendix'):(tr?'Proje Teknik Föy Eki':'Project Datasheet Appendix')} • ${tr?'Sayfa':'Page'} ${a} / ${b}`}});
    root.querySelectorAll('.product-brand').forEach(node=>{const value=node.textContent.replace(/^Brand:\s*|^Marka:\s*/i,'');node.textContent=`${tr?'Marka':'Brand'}: ${value}`});
    translateTextNodes(root);
    return true;
  }

  function start(){
    let attempts=0;const run=()=>{
      attempts++;
      const done=PAGE==='quotation.html'?localizeQuotation():PAGE==='project-print.html'?localizeProjectPrint():true;
      if(!done&&attempts<80)setTimeout(run,50);
    };run();
    if(PAGE==='project-print.html'){
      const root=document.getElementById('projectPrintRoot');if(root)new MutationObserver(()=>localizeProjectPrint()).observe(root,{childList:true,subtree:true});
    }
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();

(function(){
  'use strict';

  const uiPairs=new Map([
    ['Back to Series','Serilere Dön'],
    ['← Back to Series','← Serilere Dön'],
    ['View Series →','Seriyi Gör →'],
    ['Curve available · selection ready','Eğri mevcut · seçime hazır'],
    ['Available · selection ready','Mevcut · seçime hazır'],
    ['Catalog only','Yalnızca katalog'],
    ['Catalog Only','Yalnızca Katalog'],
    ['Catalog Operating Points','Katalog Çalışma Noktaları'],
    ['Dimension Drawing','Ölçü Çizimi'],
    ['Safety:','Güvenlik:'],
    ['No data','Veri yok'],
    ['No information available.','Bilgi bulunmuyor.'],
    ['Product Code','Ürün Kodu'],
    ['Availability','Kullanılabilirlik'],
    ['Control Levels','Kontrol Seviyeleri'],
    ['Performance Curve','Performans Eğrisi'],
    ['Duct Ø','Kanal Ø'],
    ['Duct Connection','Kanal Bağlantısı'],
    ['Phase','Faz'],
    ['Poles','Kutup Sayısı'],
    ['Power','Güç'],
    ['Speed','Devir'],
    ['Current','Akım'],
    ['Voltage','Gerilim'],
    ['Frequency','Frekans'],
    ['Airflow','Debi'],
    ['Max Pressure','Maks. Basınç'],
    ['Noise','Ses'],
    ['Noise · Inlet','Ses · Emiş'],
    ['Noise · Radiated','Ses · Yayılım'],
    ['Noise · Outlet','Ses · Atış'],
    ['Weight','Ağırlık'],
    ['Fire Rating','Yangın Dayanımı'],
    ['Continuous Air Limit','Sürekli Hava Sıcaklığı'],
    ['Operating Temperature','Çalışma Sıcaklığı'],
    ['Approx. Air Temperature','Yaklaşık Hava Sıcaklığı'],
    ['Inlet Ø','Emiş Ø'],
    ['ATEX Gas Marking','ATEX Gaz İşaretlemesi'],
    ['ATEX Dust Marking','ATEX Toz İşaretlemesi'],
    ['Hazardous Area','Tehlikeli Bölge'],
    ['Speed Controller','Hız Kontrol Cihazı'],
    ['Timer','Zamanlayıcı'],
    ['Humidity Sensor','Nem Sensörü'],
    ['Presence Sensor','Varlık Sensörü'],
    ['Long-Life Motor','Uzun Ömürlü Motor'],
    ['Reversible','Tersinir'],
    ['Fan Type','Fan Tipi'],
    ['Mount Type','Montaj Tipi'],
    ['IP Class','IP Sınıfı'],
    ['Price','Fiyat'],
    ['Control','Kontrol'],
    ['Preview','Önizleme'],
    ['Add to project','Projeye ekle'],
    ['Yes','Evet'],
    ['No','Hayır']
  ]);

  const titlePairs=new Map([
    ['Tunnel Type Axial Fan','Tünel Tipi Aksiyel Fan'],
    ['Axial Mobile Ex-proof Fan','Aksiyel Mobil Ex-proof Fan'],
    ['Axial Cell Type Smoke Extract Fans','Aksiyel Hücreli Duman Tahliye Fanları'],
    ['Axial Roof Type Smoke Extract Fans','Aksiyel Çatı Tipi Duman Tahliye Fanları'],
    ['Axial Duct Type Ex-proof Fan','Aksiyel Kanal Tipi Ex-proof Fan'],
    ['Axial Wall Type Ex-proof Fans','Aksiyel Duvar Tipi Ex-proof Fanlar'],
    ['Axial Roof Type Ex-proof Fan','Aksiyel Çatı Tipi Ex-proof Fan'],
    ['Centrifugal Roof Type Ex-proof Fan','Santrifüj Çatı Tipi Ex-proof Fan'],
    ['Centrifugal Duct Type Ex-proof Fan','Santrifüj Kanal Tipi Ex-proof Fan'],
    ['Centrifugal Single Inlet Ex-proof Fan','Santrifüj Tek Emişli Ex-proof Fan'],
    ['Mobile Axial Fan','Mobil Aksiyel Fan'],
    ['Axial Mobile Fan','Aksiyel Mobil Fan'],
    ['Vertical Outlet Centrifugal Roof Type Fan','Dikey Atışlı Santrifüj Çatı Fanı'],
    ['Centrifugal Rectangular Duct Type Fan','Santrifüj Dikdörtgen Kanal Tipi Fan'],
    ['Centrifugal Cell Type Fan','Santrifüj Hücreli Fan'],
    ['Horizontal Outlet Centrifugal Roof Type Fan','Yatay Atışlı Santrifüj Çatı Fanı'],
    ['Horizontal Outlet Centrifugal Roof Fan','Yatay Atışlı Santrifüj Çatı Fanı'],
    ['Axial Duct Type Smoke Extract Fans','Aksiyel Kanal Tipi Duman Tahliye Fanları'],
    ['AXF Axial Duct Smoke Exhaust Fans','AXF Aksiyel Kanal Tipi Duman Tahliye Fanları'],
    ['Axial Jet Fan','Aksiyel Jet Fan'],
    ['Radial Jet Fans','Radyal Jet Fanlar'],
    ['Axial Duct Type Fan','Aksiyel Kanal Tipi Fan'],
    ['Axial Short Case Fan','Aksiyel Kısa Kasalı Fan'],
    ['Axial Wall Type Fan','Aksiyel Duvar Tipi Fan'],
    ['Bifurcated Axial Duct Type Fan','Bifurkasyonlu Aksiyel Kanal Tipi Fan'],
    ['Axial Cell Type Fans','Aksiyel Hücreli Fanlar'],
    ['Horizontal Outlet Axial Roof Type Fan','Yatay Atışlı Aksiyel Çatı Fanı'],
    ['Vertical Outlet Axial Roof Type Fan','Dikey Atışlı Aksiyel Çatı Fanı'],
    ['Centrifugal Single Inlet Cell Type Fan','Santrifüj Tek Emişli Hücreli Fan'],
    ['Centrifugal Single Inlet Fan','Santrifüj Tek Emişli Fan'],
    ['Duct Type Shelter Fan','Kanal Tipi Sığınak Fanı'],
    ['Heat Recovery Units','Isı Geri Kazanım Cihazları'],
    ['Centrifugal Duct Type Fan','Santrifüj Kanal Tipi Fan'],
    ['HEATMASTER F400 Smoke-Extract Centrifugal Roof Fans','HEATMASTER F400 Duman Tahliye Santrifüj Çatı Fanları'],
    ['SLIMROOF ES EC Centrifugal Roof Fans','SLIMROOF ES EC Santrifüj Çatı Fanları'],
    ['E-ATEX Explosion-Protected Axial Plate Fans','E-ATEX Patlamaya Dayanıklı Aksiyel Plaka Fanları'],
    ['Tiracamino Chimney-Top Extract Fan','Tiracamino Baca Üstü Aspiratör'],
    ['VORT QBK SAL-KC EVO Cabinet Centrifugal Fans','VORT QBK SAL-KC EVO Hücreli Santrifüj Fanlar'],
    ['VORT QUADRO EVO Residential Centrifugal Extract Fans','VORT QUADRO EVO Konut Tipi Santrifüj Aspiratörler'],
    ['VORT QUADRO I Flush-Mounted Centrifugal Duct Fans','VORT QUADRO I Gömme Tip Santrifüj Kanal Fanları'],
    ['VORT QUADRO Centrifugal Duct Fans','VORT QUADRO Santrifüj Kanal Fanları'],
    ['VORTICE VARIO I Flush-Mounted Axial Fans','VORTICE VARIO I Gömme Tip Aksiyel Fanlar'],
    ['VORTICE VARIO Wall / Window Axial Fans','VORTICE VARIO Duvar / Pencere Tipi Aksiyel Fanlar'],
    ['PUNTO EVO FLEXO Wall Axial Fans','PUNTO EVO FLEXO Duvar Tipi Aksiyel Fanlar'],
    ['PUNTO EVO GOLD Decorative Wall Axial Fans','PUNTO EVO GOLD Dekoratif Duvar Tipi Aksiyel Fanlar'],
    ['PUNTO EVO ES EC Energy-Saving Wall Axial Fans','PUNTO EVO ES EC Enerji Tasarruflu Duvar Tipi Aksiyel Fanlar'],
    ['PUNTO EVO Two-Speed Wall Axial Fans','PUNTO EVO Çift Hızlı Duvar Tipi Aksiyel Fanlar'],
    ['PUNTO GHOST Axial Duct Fans','PUNTO GHOST Aksiyel Kanal Fanları'],
    ['PUNTO FOUR Wall Axial Fans','PUNTO FOUR Duvar Tipi Aksiyel Fanlar'],
    ['PUNTO FILO Low-Profile Wall Axial Fans','PUNTO FILO İnce Tasarımlı Duvar Tipi Aksiyel Fanlar'],
    ['PUNTO Wall / Window Axial Fans','PUNTO Duvar / Pencere Tipi Aksiyel Fanlar'],
    ['CA MD Extra EU In-Line Mixed-Flow Duct Fans','CA MD Extra EU Kanal Tipi Karışık Akışlı Fanlar'],
    ['CA MD E RF Roof-Mounted Mixed-Flow Exhaust Fans','CA MD E RF Çatı Tipi Karışık Akışlı Egzoz Fanları'],
    ['CA MD In-Line Mixed-Flow Duct Fans','CA MD Kanal Tipi Karışık Akışlı Fanlar'],
    ['LINEO QUIET ES Low-Noise In-Line EC Mixed-Flow Fans','LINEO QUIET ES Düşük Sesli Kanal Tipi EC Karışık Akışlı Fanlar'],
    ['LINEO QUIET Low-Noise In-Line Mixed-Flow Fans','LINEO QUIET Düşük Sesli Kanal Tipi Karışık Akışlı Fanlar'],
    ['LINEO ES In-Line EC Mixed-Flow Fans','LINEO ES Kanal Tipi EC Karışık Akışlı Fanlar'],
    ['LINEO In-Line Mixed-Flow Fans','LINEO Kanal Tipi Karışık Akışlı Fanlar']
  ]);

  const exactProductPairs=new Map([
    ['There are different model options in the range of 355-1250 mm','355-1250 mm aralığında farklı model seçenekleri bulunmaktadır.'],
    ['It can be produced as double speed and reversible.','Çift devirli ve tersinir olarak üretilebilir.'],
    ['With aerofoil section and adjustable angle blades are produced by aluminum injection casting method.','Aerodinamik kesitli, ayarlanabilir açılı kanatlar alüminyum enjeksiyon döküm yöntemiyle üretilir.'],
    ['Both sides are self-flanged without welding according to ISO6580 UNI/EUROVENT 1-2 standards.','Her iki tarafı ISO 6580 UNI/EUROVENT 1-2 standartlarına uygun, kaynaksız kendinden flanşlıdır.'],
    ['The fan casing is produced from hard steel and coated Hot-Dip Galvanized as standart.','Fan gövdesi yüksek dayanımlı çelikten üretilir ve standart olarak sıcak daldırma galvaniz kaplanır.'],
    ['It is suitable for operation in temperature range (S1) -20°C/+55°C and the fire conditions (S2) 200°C/2h,','Normal çalışmada (S1) -20°C/+55°C sıcaklık aralığına ve yangın koşullarında (S2) 200°C/2 saat çalışmaya uygundur.'],
    ['Fan is certified with EN12101-3:2015 standarts.','Fan EN 12101-3:2015 standardına göre sertifikalıdır.'],
    ['IP 55 protected, IE2 high efficiency and with self lubricating bearing, fully enclosed type, in H insulation class.','Motor IP55 korumalı, IE2 yüksek verimli, kendinden yağlamalı rulmanlı, tam kapalı tip ve H izolasyon sınıfındadır.'],
    ['There is an external electrical junction box with IP67 protection outside the body for easy electrical connection.','Kolay elektrik bağlantısı için gövde dışında IP67 korumalı harici bağlantı kutusu bulunur.'],
    ['It is 400V-50Hz as standard and it is suitable for use with frequency converter.','Standart besleme 400V-50Hz olup frekans konvertörü ile kullanıma uygundur.'],
    ['General area ventilation','Genel alan havalandırması'],
    ['Car park smoke extraction systems','Otopark duman tahliye sistemleri'],
    ['Used for fresh air, exhaust','Taze hava ve egzoz uygulamalarında kullanılır'],
    ['Information transferred from the manufacturer technical catalogue.','Bilgiler üreticinin teknik kataloğundan aktarılmıştır.'],
    ['Data transferred from the manufacturer technical catalogue.','Veriler üreticinin teknik kataloğundan aktarılmıştır.']
  ]);

  const categoryPairs=new Map([
    ['Axial Fan','Aksiyel Fan'],['Axial','Aksiyel'],['Radial Fan','Radyal Fan'],['Radial','Radyal'],
    ['Duct Fan','Kanal Tipi Fan'],['Duct','Kanal Tipi'],['Cabinet Fan','Hücreli Fan'],['Cabinet','Hücreli'],
    ['Jet Fan','Jet Fan'],['Tunnel Fan','Tünel Fanı'],['Roof Fan','Çatı Fanı'],['Roof','Çatı Tipi'],
    ['Wall-Mounted Fan','Duvar Tipi Fan'],['Wall','Duvar Tipi'],['Mobile Fan','Mobil Fan'],['Mobile','Mobil'],
    ['Centrifugal Fan','Santrifüj Fan'],['Centrifugal','Santrifüj'],['Bifurcated Fan','Bifurkasyonlu Fan'],
    ['Smoke Exhaust Fan','Duman Tahliye Fanı'],['Smoke Exhaust','Duman Tahliye'],['Explosion-Proof / ATEX Fan','Ex-proof / ATEX Fan'],
    ['Ex-proof / ATEX Fan','Ex-proof / ATEX Fan'],['EC Fan','EC Fan'],['Heat Recovery Unit','Isı Geri Kazanım Cihazı'],
    ['Shelter Fan','Sığınak Fanı'],['Soler & Palau','Soler & Palau'],['Vortice','Vortice'],['Vitlo','Vitlo']
  ]);

  const phraseRules=[
    [/\bexplosion[- ]protected\b/gi,'patlamaya dayanıklı'],
    [/\bexplosion[- ]proof\b/gi,'ex-proof'],
    [/\bsmoke[- ]extract(?:ion)?\b/gi,'duman tahliye'],
    [/\bsmoke exhaust\b/gi,'duman tahliye'],
    [/\bheat recovery units?\b/gi,'ısı geri kazanım cihazı'],
    [/\bmixed[- ]flow\b/gi,'karışık akışlı'],
    [/\blow[- ]noise\b/gi,'düşük sesli'],
    [/\blow[- ]profile\b/gi,'ince tasarımlı'],
    [/\benergy[- ]saving\b/gi,'enerji tasarruflu'],
    [/\btwo[- ]speed\b/gi,'çift hızlı'],
    [/\bdouble speed\b/gi,'çift devirli'],
    [/\breversible\b/gi,'tersinir'],
    [/\bflush[- ]mounted\b/gi,'gömme tip'],
    [/\broof[- ]mounted\b/gi,'çatı tipi'],
    [/\bwall[- ]mounted\b/gi,'duvar tipi'],
    [/\bin[- ]line\b/gi,'kanal tipi'],
    [/\bchimney[- ]top\b/gi,'baca üstü'],
    [/\bvertical outlet\b/gi,'dikey atışlı'],
    [/\bhorizontal outlet\b/gi,'yatay atışlı'],
    [/\bsingle inlet\b/gi,'tek emişli'],
    [/\brectangular duct\b/gi,'dikdörtgen kanal tipi'],
    [/\bduct type\b/gi,'kanal tipi'],
    [/\broof type\b/gi,'çatı tipi'],
    [/\bwall type\b/gi,'duvar tipi'],
    [/\bcell type\b/gi,'hücreli'],
    [/\bcabinet\b/gi,'hücreli'],
    [/\bcentrifugal\b/gi,'santrifüj'],
    [/\baxial\b/gi,'aksiyel'],
    [/\bradial\b/gi,'radyal'],
    [/\bextract fans?\b/gi,'aspiratör'],
    [/\bexhaust fans?\b/gi,'egzoz fanı'],
    [/\bfans?\b/gi,'fan'],
    [/\bmotor\b/gi,'motor'],
    [/\bimpeller\b/gi,'fan çarkı'],
    [/\bblade(?:s)?\b/gi,'kanat'],
    [/\bcasing\b/gi,'gövde'],
    [/\benclosure\b/gi,'gövde'],
    [/\bairflow\b/gi,'hava debisi'],
    [/\bair flow\b/gi,'hava debisi'],
    [/\bpressure\b/gi,'basınç'],
    [/\bnoise\b/gi,'ses'],
    [/\bsound\b/gi,'ses'],
    [/\bvoltage\b/gi,'gerilim'],
    [/\bcurrent\b/gi,'akım'],
    [/\bfrequency\b/gi,'frekans'],
    [/\bpower\b/gi,'güç'],
    [/\bspeed\b/gi,'devir'],
    [/\bweight\b/gi,'ağırlık'],
    [/\btemperature\b/gi,'sıcaklık'],
    [/\bprotection\b/gi,'koruma'],
    [/\binstallation\b/gi,'montaj'],
    [/\bmounting\b/gi,'montaj'],
    [/\bapplication(?:s)?\b/gi,'kullanım alanı'],
    [/\bused for\b/gi,'kullanım amacı'],
    [/\bsuitable for\b/gi,'uygundur'],
    [/\bstandard\b/gi,'standart'],
    [/\bavailable\b/gi,'mevcut'],
    [/\boptional\b/gi,'opsiyonel'],
    [/\bstainless steel\b/gi,'paslanmaz çelik'],
    [/\bgalvanized steel\b/gi,'galvanizli çelik'],
    [/\baluminium\b/gi,'alüminyum'],
    [/\baluminum\b/gi,'alüminyum'],
    [/\bsteel\b/gi,'çelik'],
    [/\bfresh air\b/gi,'taze hava'],
    [/\bexhaust\b/gi,'egzoz'],
    [/\bventilation\b/gi,'havalandırma'],
    [/\bcar park\b/gi,'otopark'],
    [/\bcarpark\b/gi,'otopark'],
    [/\bindustrial\b/gi,'endüstriyel'],
    [/\bresidential\b/gi,'konut tipi'],
    [/\bZone\b/gi,'Bölge'],
    [/\bX special conditions\b/gi,'X özel koşulları']
  ];

  const uiReverse=new Map([...uiPairs.entries()].map(([en,tr])=>[tr,en]));
  const titleReverse=new Map([...titlePairs.entries()].map(([en,tr])=>[tr,en]));
  const categoryReverse=new Map([...categoryPairs.entries()].map(([en,tr])=>[tr,en]));
  let applying=false;
  let observer=null;
  let scheduled=false;

  function language(){
    return window.VensisI18n?.getLanguage?.()||(()=>{try{return localStorage.getItem('vensis_language_v1')||'en'}catch{return 'en'}})();
  }

  function exact(value,map,reverseMap,lang=language()){
    const source=String(value||'').trim();
    if(!source)return source;
    const en=reverseMap.get(source)||source;
    return lang==='tr'?(map.get(en)||source):en;
  }

  function productTextToTr(value){
    const source=String(value||'').replace(/\s+/g,' ').trim();
    if(!source)return source;
    if(exactProductPairs.has(source))return exactProductPairs.get(source);
    if(titlePairs.has(source))return titlePairs.get(source);
    if(categoryPairs.has(source))return categoryPairs.get(source);
    let output=source;
    for(const [pattern,replacement] of phraseRules)output=output.replace(pattern,replacement);
    return output;
  }

  function sourceText(node,mode,key='vensisEn'){
    if(!node)return '';
    const current=String(node.textContent||'').replace(/\s+/g,' ').trim();
    if(!node.dataset[key]){
      let original=current;
      if(mode==='ui')original=uiReverse.get(current)||current;
      else if(mode==='title')original=titleReverse.get(current)||current;
      else if(mode==='category')original=categoryReverse.get(current)||current;
      node.dataset[key]=original;
    }
    return node.dataset[key]||current;
  }

  function renderNode(node,mode){
    if(!node)return;
    const en=sourceText(node,mode);
    let next=en;
    if(language()==='tr'){
      if(mode==='ui')next=exact(en,uiPairs,uiReverse,'tr');
      else if(mode==='title')next=titlePairs.get(en)||productTextToTr(en);
      else if(mode==='category')next=categoryPairs.get(en)||productTextToTr(en);
      else next=productTextToTr(en);
    }
    if(String(node.textContent||'').trim()!==next)node.textContent=next;
  }

  function observeMutations(){
    if(!observer){
      observer=new MutationObserver(mutations=>{
        if(applying)return;
        if(!mutations.some(mutation=>mutation.addedNodes.length))return;
        if(scheduled)return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          apply(document);
        });
      });
    }
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  function apply(root=document){
    if(applying)return;
    applying=true;
    const reconnect=Boolean(observer);
    if(observer)observer.disconnect();
    try{
      const scope=root?.querySelectorAll?root:document;
      scope.querySelectorAll('.detail-back,.series-card-footer span,.model-catalog-only,.model-operating-title,.model-dimension summary,.model-safety-warning b,.empty-note,.empty-state,.model-datasheet-btn').forEach(node=>renderNode(node,'ui'));
      scope.querySelectorAll('.series-title,.series-hero-copy h2').forEach(node=>renderNode(node,'title'));
      scope.querySelectorAll('.series-badges span,.check-row span').forEach(node=>renderNode(node,'category'));
      scope.querySelectorAll('.series-card p,.series-info-grid p,.series-info-grid li,.detail-section p,.detail-section li').forEach(node=>renderNode(node,'product'));

      scope.querySelectorAll('.model-field').forEach(field=>{
        const label=field.querySelector('span');
        const value=field.querySelector('b');
        if(!label||!value)return;
        const originalLabel=sourceText(label,'ui');
        renderNode(label,'ui');
        if(originalLabel==='Performance Curve')renderNode(value,'ui');
        else if(/^(Fan Type|Mount Type|Availability|Hazardous Area|Speed Controller)$/i.test(originalLabel))renderNode(value,'product');
        else renderNode(value,'ui');
      });
    }finally{
      applying=false;
      if(reconnect)observeMutations();
    }
  }

  function start(){
    apply(document);
    observeMutations();
    window.addEventListener('vensis-language-changed',()=>apply(document));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
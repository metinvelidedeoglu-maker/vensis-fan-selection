(function(){
  'use strict';

  const pairs=new Map([
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
    ['No data','Veri yok']
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

  const reverse=new Map([...pairs.entries()].map(([en,tr])=>[tr,en]));
  const titleReverse=new Map([...titlePairs.entries()].map(([en,tr])=>[tr,en]));
  let applying=false;

  function language(){
    return window.VensisI18n?.getLanguage?.()||(()=>{try{return localStorage.getItem('vensis_language_v1')||'en'}catch{return 'en'}})();
  }

  function translateFrom(value,map,reverseMap,lang=language()){
    const text=String(value||'').trim();
    if(!text)return text;
    const en=reverseMap.get(text)||text;
    return lang==='tr'?(map.get(en)||text):en;
  }

  function translate(value,lang=language()){
    return translateFrom(value,pairs,reverse,lang);
  }

  function translateTitle(value,lang=language()){
    return translateFrom(value,titlePairs,titleReverse,lang);
  }

  function setNodeText(node){
    if(!node)return;
    const current=String(node.textContent||'').trim();
    const next=translate(current);
    if(next!==current)node.textContent=next;
  }

  function setTitleText(node){
    if(!node)return;
    const current=String(node.textContent||'').trim();
    const next=translateTitle(current);
    if(next!==current)node.textContent=next;
  }

  function apply(root=document){
    if(applying)return;
    applying=true;
    try{
      const scope=root?.querySelectorAll?root:document;
      scope.querySelectorAll('.detail-back,.series-card-footer span,.model-catalog-only,.model-operating-title,.model-dimension summary,.model-safety-warning b,.empty-note,.empty-state').forEach(setNodeText);
      scope.querySelectorAll('.series-title,.series-hero-copy h2').forEach(setTitleText);

      scope.querySelectorAll('.model-field').forEach(field=>{
        const label=field.querySelector('span');
        const value=field.querySelector('b');
        if(!label||!value)return;
        const labelText=String(label.textContent||'').trim();
        if(labelText==='Performance Curve'||labelText==='Performans Eğrisi')setNodeText(value);
      });
    }finally{applying=false}
  }

  function start(){
    apply(document);
    const observer=new MutationObserver(mutations=>{
      if(applying)return;
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node.nodeType===1)apply(node);
          else if(node.nodeType===3)apply(node.parentElement||document);
        }
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('vensis-language-changed',()=>apply(document));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

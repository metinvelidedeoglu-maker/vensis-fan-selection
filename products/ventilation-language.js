(function(){
  'use strict';
  // Reviewed text translations only. IDs, measurements, certification markings,
  // curves and manufacturer records remain in their original source form.
  const pairs=[
    ['Yatay Atışlı Çatı Tipi Radyal Fanlar','Horizontal Discharge Centrifugal Roof Fans'],
    ['Dikey Atışlı Çatı Tipi Radyal Fanlar','Vertical Discharge Centrifugal Roof Fans'],
    ['Çatı Tipi Duman Egzoz Fanları','Roof Smoke Extract Fans'],
    ['Çatı Tipi Aksiyel Fanlar','Axial Roof Fans'],
    ['Duvar Tipi Ex-Proof Aksiyel Fanlar','Ex-Proof Axial Wall Fans'],
    ['Duvar ve Pencere Tipi Aksiyel Fanlar','Axial Wall and Window Fans'],
    ['Duvar Tipi Aksiyel Fanlar','Axial Wall Fans'],
    ['Dikdörtgen Kanal Tipi Fanlar','Rectangular Duct Fans'],
    ['Dikdörtgen Kanal Tipi Ex-Proof Fanlar','Ex-Proof Rectangular Duct Fans'],
    ['Kanal Tipi Ex-Proof Karma Akışlı Fanlar','Ex-Proof Mixed Flow Duct Fans'],
    ['Yatay Atışlı Çatı Tipi Ex-Proof Fanlar','Ex-Proof Horizontal Discharge Roof Fans'],
    ['Yatay Atışlı Çatı Tipi Karma Akışlı Fanlar','Horizontal Discharge Mixed Flow Roof Fans'],
    ['Akustik Kabinli Fanlar','Acoustic Cabinet Fans'],
    ['Mini Aksiyel Fanlar','Mini Axial Fans'],
    ['Radyal Kanal Tipi Fanlar','Centrifugal Duct Fans'],
    ['Sessiz Kanal Tipi Transfer Fanları','Silent Duct Transfer Fans'],
    ['Dekoratif Banyo ve WC Fanları','Decorative Bathroom and Toilet Fans'],
    ['Banyo ve WC Fanları','Bathroom and Toilet Fans'],
    ['Dekoratif Sessiz Banyo ve WC Fanları','Decorative Silent Bathroom and Toilet Fans'],
    ['Sessiz Banyo ve WC Fanları','Silent Bathroom and Toilet Fans'],
    ['Yuvarlak Kanal Tipi Karma Akışlı Fanlar','Circular Mixed Flow Duct Fans'],
    ['Kanal Tipi Karma Akışlı Fanlar','Mixed Flow Duct Fans'],
    ['Ultra Sessiz Kanal Tipi Karma Akışlı Fanlar','Ultra Silent Mixed Flow Duct Fans'],
    ['Kanal Tipi Aksiyel Fanlar','Axial Duct Fans'],
    ['Yuvarlak Kanal Tipi Radyal Fanlar','Circular Centrifugal Duct Fans'],
    ['Bilgiler üreticinin sağlanan teknik kataloğundan aktarılmıştır.',"Information is taken from the manufacturer's supplied technical catalogue."],
    ['Monofaze','Single-phase'],['Trifaze','Three-phase'],
    ['Dikey atışlı çatı tipi radyal fan.','Vertical discharge centrifugal roof fan.'],
    ['Güç: katalogdaki maksimum çekilen elektriksel giriş gücü (P1).','Power: maximum electrical input power (P1) stated in the catalogue.'],
    ['Güç: maksimum çekilen elektriksel giriş gücü (P1).','Power: maximum electrical input power (P1).'],
    ['Güç: katalog dipnotundaki nominal motor gücü.','Power: rated motor power stated in the catalogue footnote.'],
    ['F400-120 sınıfı bu modele uygulanmaz.','The F400-120 classification does not apply to this model.'],
    ['Bu model F400-120 sınıflandırması kapsamı dışındadır.','This model is outside the scope of the F400-120 classification.'],
    ['F400 / 120 dakika duman egzoz sınıfı.','F400 / 120 minute smoke extraction classification.'],
    ['Yangın durumunda fanın maksimum hızda çalışmasını sağlayan emniyet sistemi kullanılmalıdır; termal koruma ve hız kontrolü bu çalışmayı engellememelidir.','A safety system must ensure that the fan runs at maximum speed in the event of fire; thermal protection and speed control must not prevent this operation.'],
    ['Ağırlık: üretici katalog sürümleri uyuşmadığı için doğrulama bekliyor.','Weight: awaiting verification because manufacturer catalogue editions disagree.'],
    ['İçeriden dışarıya aspirasyon için yatay atışlı çatı tipi aksiyel fan (B).','Horizontal discharge axial roof fan for extraction from inside to outside (B).'],
    ['Katalogda trafo ile hız kontrolü kapsamı dışındadır.','Excluded from transformer speed control in the catalogue.'],
    ['ATEX işaretlemesini ürün etiketi ve proje şartlarıyla doğrulayın. IIC T4 motor seçeneği standart teslimata dahil kabul edilmemelidir.','Verify the ATEX marking against the product nameplate and project requirements. The IIC T4 motor option must not be assumed to be included in the standard supply.'],
    ['İleri eğik radyal kanatlı dikdörtgen kanal tipi fan; bakım için müdahale kapağı.','Rectangular duct fan with forward curved centrifugal impeller; access cover for maintenance.'],
    ['Voltaj ayarı ile hız kontrolüne uygundur.','Suitable for speed control by voltage regulation.'],
    ['Voltaj ayarı ile hız kontrolüne uygundur. Trifaze motor inverter ile de kontrol edilebilir.','Suitable for speed control by voltage regulation. The three-phase motor can also be controlled by an inverter.'],
    ['Voltajla hız ayarında ATEX sertifikasını korumak için S&P RMT kullanılmalıdır. ATEX işaretlemesini ürün etiketi ve proje şartlarıyla doğrulayın.','S&P RMT must be used for voltage speed control to maintain ATEX certification. Verify the ATEX marking against the product nameplate and project requirements.'],
    ['Katalogdaki ATEX işaretlemesi: II 2G Ex eb IIB T3 Gb. Ürün etiketi, sertifika ve proje koşullarıyla doğrulayın; bağlantı kutusunun IP55 değeri motorun IP44 koruma sınıfını değiştirmez.','Catalogue ATEX marking: II 2G Ex eb IIB T3 Gb. Verify against the product nameplate, certificate and project conditions; the terminal box IP55 rating does not change the motor IP44 protection class.'],
    ['Katalogdaki ATEX işaretlemesi: IIG Exe IIC T3 Gb. Ürün etiketi, sertifika ve proje koşullarıyla doğrulayın; bağlantı kutusunun IP55 değeri motorun IP44 koruma sınıfını değiştirmez.','Catalogue ATEX marking: IIG Exe IIC T3 Gb. Verify against the product nameplate, certificate and project conditions; the terminal box IP55 rating does not change the motor IP44 protection class.']
  ];
  const en=new Map(pairs),tr=new Map(pairs.map(([a,b])=>[b,a]));
  const normalize=value=>String(value??'').replace(/\s+/g,' ').trim();
  for(const [english,turkish] of Object.entries(window.VensisVentilationData?.contentTranslations||{})){
    if(!en.has(normalize(turkish)))en.set(normalize(turkish),english);
    if(!tr.has(normalize(english)))tr.set(normalize(english),turkish);
  }
  // Exact templates from imported manufacturer descriptions; numeric tokens are
  // copied verbatim (only decimal punctuation is localized where appropriate).
  const templates=[
    [/^IP(\d+) motor, F sınıfı yalıtım\.$/,m=>`IP${m[1]} motor, class F insulation.`],
    [/^Sürekli taşınan hava sıcaklığı: en fazla (\d+) °C\.$/,m=>`Continuous conveyed air temperature: maximum ${m[1]} °C.`],
    [/^50 Hz katalog akımı: (\d+ V için [\d.]+ A(?:, \d+ V için [\d.]+ A)*)\.$/,m=>'50 Hz catalogue current: '+m[1].replace(/(\d+) V için ([\d.]+) A/g,'$2 A at $1 V')+'.'],
    [/^Ses basıncı: atış (\d+) dB\(A\), emiş (\d+) dB\(A\); 3 m, katalog çalışma noktası 2\.$/,m=>`Sound pressure: outlet ${m[1]} dB(A), inlet ${m[2]} dB(A); 3 m, catalogue operating point 2.`],
    [/^Ses: atış (\d+), emiş (\d+) dB\(A\); 3 m, katalog çalışma noktası 2\.$/,m=>`Sound: outlet ${m[1]}, inlet ${m[2]} dB(A); 3 m, catalogue operating point 2.`],
    [/^Ses basıncı: emiş (\d+) dB\(A\), atış (\d+) dB\(A\); 1,5 m, serbest alan\.$/,m=>`Sound pressure: inlet ${m[1]} dB(A), outlet ${m[2]} dB(A); 1.5 m, free field.`],
    [/^Ses basıncı: (\d+) dB\(A\); emiş ve atış kanalları bağlı, serbest alanda 1 m\.$/,m=>`Sound pressure: ${m[1]} dB(A); inlet and outlet ducts connected, 1 m in free field.`]
  ];
  // Expand only for actual source strings, so translations are reversible and
  // arbitrary user-entered notes never pass through a general phrase replacer.
  for(const source of [...(window.VensisVentilationData?.series||[]),...(window.VensisVentilationData?.models||[])]){
    for(const lines of Object.values(source.description||{}))for(const line of lines){
      for(const [pattern,render] of templates){const match=normalize(line).match(pattern);if(match){const translated=render(match);en.set(normalize(line),translated);tr.set(translated,normalize(line));break}}
    }
  }
  function language(){
    const active=window.VensisI18n?.getLanguage?.();if(active==='tr'||active==='en')return active;
    try{const saved=localStorage.getItem('vensis_language_v1');if(saved==='tr'||saved==='en')return saved}catch{}
    return document.documentElement.lang||'en';
  }
  function text(value,lang=language()){
    const original=String(value??''),clean=normalize(value);
    if(lang==='en')return en.get(clean)??original;
    return tr.get(clean)??original;
  }
  function modelName(value,lang=language()){
    return String(value??'').replace(lang==='en'?/\bPASLANMAZ\s*316\b/ig:/\bSTAINLESS\s+STEEL\s*316\b/ig,lang==='en'?'STAINLESS STEEL 316':'PASLANMAZ 316');
  }
  window.VensisProductLanguage={text,modelName,language};
})();

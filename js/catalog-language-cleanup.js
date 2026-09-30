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
    ['General Features','Genel Özellikler'],
    ['Models','Modeller'],
    ['Open Product PDF','Ürün PDF’ini Aç'],
    ['Models count','Model sayısı'],
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
    ['LINEO In-Line Mixed-Flow Fans','LINEO Kanal Tipi Karışık Akışlı Fanlar'],
    ['CMS ATEX Centrifugal Medium Pressure ATEX Fans','CMS ATEX Santrifüj Orta Basınçlı ATEX Fanlar']
  ]);

  const exactProductPairs=new Map([
  [
    "There are different model options in the range of 315-450 mm",
    "315-450 mm aralığında farklı model seçenekleri bulunmaktadır"
  ],
  [
    "There are different model options in the range of 355-800 mm",
    "355-800 mm aralığında farklı model seçenekleri bulunmaktadır"
  ],
  [
    "There are different model options in the range of 355-1000 mm",
    "355-1000 mm aralığında farklı model seçenekleri bulunmaktadır"
  ],
  [
    "There are different model options in the range of 355-1250 mm",
    "355-1250 mm aralığında farklı model seçenekleri bulunmaktadır"
  ],
  [
    "There are different model options in the range of 400-1250 mm",
    "400-1250 mm aralığında farklı model seçenekleri bulunmaktadır"
  ],
  [
    "There are different model options in the range of 450-1250 mm",
    "450-1250 mm aralığında farklı model seçenekleri bulunmaktadır"
  ],
  [
    "It can be produced as double speed and reversible",
    "Çift devirli ve tersinir olarak üretilebilir"
  ],
  [
    "With aerofoil section and adjustable angle blades are produced by aluminum injection casting method",
    "Aerodinamik kesitli ve ayarlanabilir açılı kanatlar alüminyum enjeksiyon döküm yöntemiyle üretilir"
  ],
  [
    "Both sides are self-flanged without welding according to ISO6580 UNI/EUROVENT 1-2 standards",
    "Her iki tarafı ISO 6580 ve UNI/EUROVENT 1-2 standartlarına uygun, kaynaksız kendinden flanşlıdır"
  ],
  [
    "One side is self-flanged without welding according to ISO6580 UNI/EUROVENT 1-2 standards",
    "Bir tarafı ISO 6580 ve UNI/EUROVENT 1-2 standartlarına uygun, kaynaksız kendinden flanşlıdır"
  ],
  [
    "The fan casing is produced from hard steel and coated Hot-Dip Galvanized as standart",
    "Fan gövdesi yüksek dayanımlı çelikten üretilir ve standart olarak sıcak daldırma galvaniz kaplanır"
  ],
  [
    "The fan casing is produced from hard steel and it is coated electrostatic powder coating as standart",
    "Fan gövdesi yüksek dayanımlı çelikten üretilir ve standart olarak elektrostatik toz boya ile kaplanır"
  ],
  [
    "The fan casing is made of hard steel and and it is coated electrostatic powder coating as standart",
    "Fan gövdesi yüksek dayanımlı çelikten üretilir ve standart olarak elektrostatik toz boya ile kaplanır"
  ],
  [
    "The fan casing is produced from galvanized sheet and is double wall insulated",
    "Fan gövdesi galvaniz sacdan üretilmiş, çift cidarlı ve yalıtımlıdır"
  ],
  [
    "The fan casing is made of galvanized sheet steel and it is self-flanged",
    "Fan gövdesi galvaniz sacdan üretilmiş ve kendinden flanşlıdır"
  ],
  [
    "Fan casing is made of galvanized sheet, integrated with silencer",
    "Fan gövdesi galvaniz sacdan imal edilmiş olup susturucu ile entegredir"
  ],
  [
    "They are cell type fans with a structure that will not be affected by external conditions and sun rays",
    "Dış ortam koşullarından ve güneş ışınlarından etkilenmeyecek yapıda hücreli fanlardır"
  ],
  [
    "Louvre grill option is available for suction and discharge side",
    "Emiş ve atış tarafı için panjur ızgara seçeneği mevcuttur"
  ],
  [
    "It is suitable for operation in temperature range (S1) -20°C/+55°C and the fire conditions (S2) 200°C/2h",
    "Normal çalışmada (S1) -20°C/+55°C sıcaklık aralığına ve yangın koşullarında (S2) 200°C/2 saat çalışmaya uygundur"
  ],
  [
    "It is suitable for operation in temperature range -20°C/+55°C",
    "-20°C/+55°C çalışma sıcaklığı aralığına uygundur"
  ],
  [
    "It is suitable for operation in temperature range -20°C/+120°C",
    "-20°C/+120°C çalışma sıcaklığı aralığına uygundur"
  ],
  [
    "Suitable for continuously operation at +50°C",
    "+50°C'de sürekli çalışmaya uygundur"
  ],
  [
    "Suitable for permanent operation at +50°C",
    "+50°C'de sürekli çalışmaya uygundur"
  ],
  [
    "Fan is certified with EN12101-3:2015 standarts",
    "Fan EN 12101-3:2015 standardına göre sertifikalıdır"
  ],
  [
    "IP 55 protected, IE2 high efficiency and with self lubricating bearing, fully enclosed type, in H insulation class",
    "Motor IP55 koruma sınıfında, IE2 yüksek verimli, kendinden yağlamalı rulmanlı, tam kapalı tip ve H izolasyon sınıfındadır"
  ],
  [
    "IP 55 protected, IE2/3 high efficiency and with self lubricating bearing, fully enclosed type, in F insulation class",
    "Motor IP55 koruma sınıfında, IE2/IE3 yüksek verimli, kendinden yağlamalı rulmanlı, tam kapalı tip ve F izolasyon sınıfındadır"
  ],
  [
    "IP 55 protected, IE2/3 high efficiency and with self lubricating bearing, fully enclosed type, in F",
    "Motor IP55 koruma sınıfında, IE2/IE3 yüksek verimli, kendinden yağlamalı rulmanlı ve tam kapalı tiptir; F izolasyon sınıfındadır"
  ],
  [
    "IP 65 protected, IE2/3 high efficiency and with self lubricating bearing, fully enclosed type, in F insulation class",
    "Motor IP65 koruma sınıfında, IE2/IE3 yüksek verimli, kendinden yağlamalı rulmanlı, tam kapalı tip ve F izolasyon sınıfındadır"
  ],
  [
    "It is 2/4 poles, IP 55 protection, IE2/3 high efficiency self lubricating bearing, fully closed type, in H insulation class",
    "Motor 2/4 kutuplu, IP55 koruma sınıfında, IE2/IE3 yüksek verimli, kendinden yağlamalı rulmanlı, tam kapalı tip ve H izolasyon sınıfındadır"
  ],
  [
    "IP 44 motor protection is available",
    "Motor IP44 koruma sınıfındadır"
  ],
  [
    "IP 54 motor protection is available",
    "Motor IP54 koruma sınıfındadır"
  ],
  [
    "There is an external electrical junction box with IP67 protection outside the body for easy electrical connection",
    "Kolay elektrik bağlantısı için gövde dışında IP67 koruma sınıfında harici elektrik bağlantı kutusu bulunur"
  ],
  [
    "There is an external electrical junction box with IP55 protection outside the body for easy electrical connection",
    "Kolay elektrik bağlantısı için gövde dışında IP55 koruma sınıfında harici elektrik bağlantı kutusu bulunur"
  ],
  [
    "It is 400V-50Hz as standard and it is suitable for use with frequency converter",
    "Standart besleme 400V-50Hz olup frekans konvertörü ile kullanıma uygundur"
  ],
  [
    "It is 230V-50Hz as standard and it is suitable for use with frequency converter",
    "Standart besleme 230V-50Hz olup frekans konvertörü ile kullanıma uygundur"
  ],
  [
    "It is 220V-50Hz as standard and it is suitable for speed controlled use",
    "Standart besleme 220V-50Hz olup hız kontrollü kullanıma uygundur"
  ],
  [
    "There are 4,6,8 pole motor options depending on the model and II 2G Ex D/e IIB/IIC T4-T3 protection ratings",
    "Modele bağlı olarak 4, 6 ve 8 kutuplu motor seçenekleri ile II 2G Ex d/e IIB/IIC T4-T3 koruma sınıfları mevcuttur"
  ],
  [
    "Aluminum plate in accordance with EN14986:2017 standards is rotated between the fan and the fan case",
    "Fan çarkı ile fan gövdesi arasında EN 14986:2017 standardına uygun alüminyum plaka kullanılmaktadır"
  ],
  [
    "Suction cone is made of copper material",
    "Emiş konisi bakır malzemeden imal edilir"
  ],
  [
    "It is ex-proof as a complete device",
    "Cihaz komple Ex-proof olarak tasarlanmıştır"
  ],
  [
    "It has mobile portable wheels, carrying handle, duct connection flange",
    "Taşınabilir tekerlekler, taşıma kolu ve kanal bağlantı flanşı bulunur"
  ],
  [
    "It has start-stop button outside the body and 5m electrical connection cable",
    "Gövde dışında start-stop butonu ve 5 m elektrik bağlantı kablosu bulunur"
  ],
  [
    "It has double side wire mesh as standard",
    "Standart olarak her iki tarafta koruyucu tel kafes bulunur"
  ],
  [
    "It has one side wire mesh as standard",
    "Standart olarak bir tarafta koruyucu tel kafes bulunur"
  ],
  [
    "It has square plate and wire mesh",
    "Kare montaj plakası ve koruyucu tel kafesi bulunur"
  ],
  [
    "t has square plate and wire mesh",
    "Kare montaj plakası ve koruyucu tel kafesi bulunur"
  ],
  [
    "It has wire mesh on the suction side and deflector on the blow side as standard",
    "Standart olarak emiş tarafında koruyucu tel kafes, atış tarafında yönlendirici bulunur"
  ],
  [
    "It has body structure with double sided silencer",
    "Gövde çift taraflı susturucu yapısına sahiptir"
  ],
  [
    "Duct type silencer and smart automation systems can be applied as optional",
    "Kanal tipi susturucu ve akıllı otomasyon sistemleri opsiyonel olarak uygulanabilir"
  ],
  [
    "It has radial backward curved blades with maximum efficiency",
    "Maksimum verim sağlayan geriye eğik radyal kanatlara sahiptir"
  ],
  [
    "It has high efficiency backward curved plug fan for low energy consumption",
    "Düşük enerji tüketimi için yüksek verimli geriye eğik plug fan kullanılır"
  ],
  [
    "It is a cell type radial fan with backward curved blades",
    "Geriye eğik kanatlı hücre tipi radyal fandır"
  ],
  [
    "It is a rectangular duct type radial fan with backward curved blades",
    "Geriye eğik kanatlı dikdörtgen kanal tipi radyal fandır"
  ],
  [
    "It is a roof type horizontal outlet radial fan with backward curved blades",
    "Geriye eğik kanatlı, yatay atışlı çatı tipi radyal fandır"
  ],
  [
    "It is a roof type vertical outlet radial fan with backward curved blades",
    "Geriye eğik kanatlı, dikey atışlı çatı tipi radyal fandır"
  ],
  [
    "It adjusts the motor speed according to the need with its integrated control circuit",
    "Entegre kontrol devresi sayesinde motor hızını ihtiyaca göre ayarlar"
  ],
  [
    "It can provide 0-100% speed control with 0-10V input",
    "0-10 V giriş ile %0-100 hız kontrolü sağlar"
  ],
  [
    "It provides over 90% efficiency thanks to integrated speed control",
    "Entegre hız kontrolü sayesinde %90'ın üzerinde verim sağlar"
  ],
  [
    "Speed control can be done in all models",
    "Tüm modellerde hız kontrolü yapılabilir"
  ],
  [
    "It provides low noise level and energy saving",
    "Düşük ses seviyesi ve enerji tasarrufu sağlar"
  ],
  [
    "It has a low sound level",
    "Düşük ses seviyesine sahiptir"
  ],
  [
    "The one-way flap is standard in the outlet side",
    "Atış tarafında tek yönlü klape standarttır"
  ],
  [
    "The motor is out of airflow and it can operate at 120°C continuously",
    "Motor hava akımının dışında konumlandırılmıştır ve 120°C'de sürekli çalışabilir"
  ],
  [
    "It is designed for use in the discharge of air containing intense oil and high temperature",
    "Yoğun yağ ve yüksek sıcaklık içeren havanın tahliyesi için tasarlanmıştır"
  ],
  [
    "It is resistant to factors such as rainwater and snow. It is suitable to work in outdoor conditions",
    "Yağmur suyu ve kar gibi dış etkenlere dayanıklıdır ve dış ortam koşullarında çalışmaya uygundur"
  ],
  [
    "It is suitable for horizontal and vertical installation",
    "Yatay ve dikey montaja uygundur"
  ],
  [
    "Smoke Extraction (F300, F400) option is also available",
    "F300 ve F400 duman tahliye seçenekleri de mevcuttur"
  ],
  [
    "It can be produced up to 2.000m3/h capacity",
    "2.000 m³/h kapasiteye kadar üretilebilir"
  ],
  [
    "It can be produced up to 5.000m3/h capacity",
    "5.000 m³/h kapasiteye kadar üretilebilir"
  ],
  [
    "It can be produced up to 12.000m3/h capacity",
    "12.000 m³/h kapasiteye kadar üretilebilir"
  ],
  [
    "It can be produced up to 50.000m3/h capacity",
    "50.000 m³/h kapasiteye kadar üretilebilir"
  ],
  [
    "High efficiency aluminum plate heat exchangers are used",
    "Yüksek verimli alüminyum plakalı ısı eşanjörleri kullanılır"
  ],
  [
    "G4 class filter is used as standard",
    "Standart olarak G4 sınıfı filtre kullanılır"
  ],
  [
    "With bypass cell, G4, activated carbon and hepa filter",
    "By-pass hücresi, G4 filtre, aktif karbon filtre ve HEPA filtre ile donatılmıştır"
  ],
  [
    "Watery or electrically heater battery can be added as optional",
    "Sulu veya elektrikli ısıtıcı batarya opsiyonel olarak eklenebilir"
  ],
  [
    "General area ventilation",
    "Genel alan havalandırması"
  ],
  [
    "General space ventilation",
    "Genel mahal havalandırması"
  ],
  [
    "Car park smoke extraction systems",
    "Otopark duman tahliye sistemleri"
  ],
  [
    "Smoke extraction systems",
    "Duman tahliye sistemleri"
  ],
  [
    "Tunnel smoke extraction systems",
    "Tünel duman tahliye sistemleri"
  ],
  [
    "Explosive area ventilation",
    "Patlayıcı ortam havalandırması"
  ],
  [
    "Factory, warehouse and parking ventilation systems",
    "Fabrika, depo ve otopark havalandırma sistemleri"
  ],
  [
    "Industrial warehouse ventilation",
    "Endüstriyel depo havalandırması"
  ],
  [
    "Industrial kitchen hood exhaust systems",
    "Endüstriyel mutfak davlumbaz egzoz sistemleri"
  ],
  [
    "Kitchen hood exhausts with filter system",
    "Filtreli mutfak davlumbaz egzoz sistemleri"
  ],
  [
    "Office, restaurant, garage, warehouse and workshop ventilation",
    "Ofis, restoran, garaj, depo ve atölye havalandırması"
  ],
  [
    "Office, restaurant,WC, garage, warehouse and workshop ventilation",
    "Ofis, restoran, WC, garaj, depo ve atölye havalandırması"
  ],
  [
    "Stair and elevator pressurization systems",
    "Merdiven ve asansör basınçlandırma sistemleri"
  ],
  [
    "Refuge fresh air systems",
    "Sığınak taze hava sistemleri"
  ],
  [
    "Welding smoke extraction systems",
    "Kaynak dumanı tahliye sistemleri"
  ],
  [
    "Heavy industry productions",
    "Ağır sanayi üretim tesisleri"
  ],
  [
    "Production processes with intense oil and high temperature",
    "Yoğun yağ ve yüksek sıcaklık içeren üretim prosesleri"
  ],
  [
    "Petrochem",
    "Petrokimya tesisleri"
  ],
  [
    "Petrochemical plants",
    "Petrokimya tesisleri"
  ],
  [
    "Used for fresh air, exhaust",
    "Taze hava ve egzoz uygulamalarında kullanılır"
  ],
  [
    "Used for fresh air, exhaust and circulation",
    "Taze hava, egzoz ve sirkülasyon uygulamalarında kullanılır"
  ],
  [
    "Uses for fresh air, exhaust and circulation in explosive and flammable spaces",
    "Patlayıcı ve yanıcı ortamlarda taze hava, egzoz ve sirkülasyon uygulamalarında kullanılır"
  ],
  [
    "Information transferred from the manufacturer technical catalogue",
    "Bilgiler üreticinin teknik kataloğundan aktarılmıştır"
  ],
  [
    "Data transferred from the manufacturer technical catalogue",
    "Veriler üreticinin teknik kataloğundan aktarılmıştır"
  ],
  [
    "ATEX dust marking: II 2D Ex h IIIC T125°C Db.",
    "ATEX toz işaretlemesi: II 2D Ex h IIIC T125°C Db."
  ],
  [
    "ATEX gas marking: II 2G Ex h IIB T3 Gb.",
    "ATEX gaz işaretlemesi: II 2G Ex h IIB T3 Gb."
  ],
  [
    "Acoustic casing designed for reduced sound transmission.",
    "Ses iletimini azaltmak üzere tasarlanmış akustik gövdeye sahiptir."
  ],
  [
    "Approximate continuous air-temperature capability: 200 °C.",
    "Sürekli hava sıcaklığı kapasitesi yaklaşık 200 °C'dir."
  ],
  [
    "Availability region: EU/current.",
    "Kullanılabilirlik bölgesi: AB / güncel."
  ],
  [
    "Availability region: Extra EU.",
    "Kullanılabilirlik bölgesi: AB dışı."
  ],
  [
    "Availability region: global.",
    "Kullanılabilirlik bölgesi: global."
  ],
  [
    "Axial plate fan for potentially explosive gas and dust atmospheres.",
    "Patlayıcı gaz ve toz atmosferleri için aksiyel plaka tipi fandır."
  ],
  [
    "Axial residential extract fan.",
    "Konut tipi aksiyel aspiratördür."
  ],
  [
    "Catalogue vector controls: 8_poles / 4_poles.",
    "Katalogdaki kontrol seçenekleri: 8 kutup / 4 kutup."
  ],
  [
    "Catalogue vector controls: min / max.",
    "Katalogdaki kontrol kademeleri: min. / maks."
  ],
  [
    "Catalogue vector controls: min / med / max.",
    "Katalogdaki kontrol kademeleri: min. / orta / maks."
  ],
  [
    "Catalogue vector controls: nominal.",
    "Katalogdaki kontrol seviyesi: nominal."
  ],
  [
    "Catalogue vector controls: speed_1 / speed_2 / speed_3 / speed_4.",
    "Katalogdaki kontrol kademeleri: hız 1 / hız 2 / hız 3 / hız 4."
  ],
  [
    "Centrifugal residential extract fan.",
    "Konut tipi santrifüj aspiratördür."
  ],
  [
    "Chimney-top radial extract fan for fireplace smoke extraction.",
    "Şömine dumanının tahliyesi için baca üstü radyal aspiratördür."
  ],
  [
    "Configuration features: humidity sensor, long-life motor.",
    "Donanım özellikleri: nem sensörü ve uzun ömürlü motor."
  ],
  [
    "Configuration features: long-life motor, reversible airflow.",
    "Donanım özellikleri: uzun ömürlü motor ve tersinir hava akışı."
  ],
  [
    "Configuration features: long-life motor.",
    "Donanım özelliği: uzun ömürlü motor."
  ],
  [
    "Configuration features: presence sensor, long-life motor.",
    "Donanım özellikleri: varlık sensörü ve uzun ömürlü motor."
  ],
  [
    "Configuration features: presence sensor.",
    "Donanım özelliği: varlık sensörü."
  ],
  [
    "Configuration features: reversible airflow.",
    "Donanım özelliği: tersinir hava akışı."
  ],
  [
    "Configuration features: timer, humidity sensor, long-life motor.",
    "Donanım özellikleri: zamanlayıcı, nem sensörü ve uzun ömürlü motor."
  ],
  [
    "Configuration features: timer, humidity sensor.",
    "Donanım özellikleri: zamanlayıcı ve nem sensörü."
  ],
  [
    "Configuration features: timer, long-life motor.",
    "Donanım özellikleri: zamanlayıcı ve uzun ömürlü motor."
  ],
  [
    "Configuration features: timer, presence sensor, long-life motor.",
    "Donanım özellikleri: zamanlayıcı, varlık sensörü ve uzun ömürlü motor."
  ],
  [
    "Configuration features: timer.",
    "Donanım özelliği: zamanlayıcı."
  ],
  [
    "Continuous air-temperature limit: 80 °C.",
    "Sürekli hava sıcaklığı sınırı 80 °C'dir."
  ],
  [
    "EC control levels supplied in the catalogue: 2V / 4V / 6V / 8V / 10V.",
    "Katalogda verilen EC kontrol seviyeleri: 2 V / 4 V / 6 V / 8 V / 10 V."
  ],
  [
    "EC control levels supplied in the catalogue: 2V / 6V / 8V / 10V.",
    "Katalogda verilen EC kontrol seviyeleri: 2 V / 6 V / 8 V / 10 V."
  ],
  [
    "EC control levels supplied in the catalogue: 2V / 8V / 10V.",
    "Katalogda verilen EC kontrol seviyeleri: 2 V / 8 V / 10 V."
  ],
  [
    "Emergency smoke duty: F400 (400 °C / 120 minutes).",
    "Acil durum duman tahliye sınıfı F400'dür (400 °C / 120 dakika)."
  ],
  [
    "Hazardous-area suitability must be confirmed against the project classification and manufacturer documentation; X special conditions apply.",
    "Tehlikeli bölge uygunluğu proje sınıflandırması ve üretici dokümantasyonuna göre doğrulanmalıdır; X özel koşulları geçerlidir."
  ],
  [
    "In-line mixed-flow fan for circular duct systems.",
    "Dairesel kanal sistemleri için kanal tipi karışık akışlı fandır."
  ],
  [
    "Insulated cabinet centrifugal fan with 90-degree inlet/outlet arrangement.",
    "90° emiş/atış düzenine sahip yalıtımlı hücre tipi santrifüj fandır."
  ],
  [
    "Maximum ambient temperature: 45 °C.",
    "Maksimum ortam sıcaklığı 45 °C'dir."
  ],
  [
    "Maximum ambient temperature: 50 °C.",
    "Maksimum ortam sıcaklığı 50 °C'dir."
  ],
  [
    "Maximum ambient temperature: 55 °C.",
    "Maksimum ortam sıcaklığı 55 °C'dir."
  ],
  [
    "Maximum ambient temperature: 60 °C.",
    "Maksimum ortam sıcaklığı 60 °C'dir."
  ],
  [
    "Nominal duct connection: 100 mm.",
    "Nominal kanal bağlantı çapı 100 mm'dir."
  ],
  [
    "Nominal duct connection: 125 mm.",
    "Nominal kanal bağlantı çapı 125 mm'dir."
  ],
  [
    "Nominal duct connection: 150 mm.",
    "Nominal kanal bağlantı çapı 150 mm'dir."
  ],
  [
    "Nominal duct connection: 160 mm.",
    "Nominal kanal bağlantı çapı 160 mm'dir."
  ],
  [
    "Nominal duct connection: 200 mm.",
    "Nominal kanal bağlantı çapı 200 mm'dir."
  ],
  [
    "Nominal duct connection: 250 mm.",
    "Nominal kanal bağlantı çapı 250 mm'dir."
  ],
  [
    "Nominal duct connection: 315 mm.",
    "Nominal kanal bağlantı çapı 315 mm'dir."
  ],
  [
    "Nominal intake diameter: 315 mm.",
    "Nominal emiş çapı 315 mm'dir."
  ],
  [
    "Nominal intake diameter: 355 mm.",
    "Nominal emiş çapı 355 mm'dir."
  ],
  [
    "Nominal intake diameter: 400 mm.",
    "Nominal emiş çapı 400 mm'dir."
  ],
  [
    "Nominal intake diameter: 450 mm.",
    "Nominal emiş çapı 450 mm'dir."
  ],
  [
    "Nominal intake diameter: 500 mm.",
    "Nominal emiş çapı 500 mm'dir."
  ],
  [
    "Nominal intake diameter: 560 mm.",
    "Nominal emiş çapı 560 mm'dir."
  ],
  [
    "Nominal intake diameter: 630 mm.",
    "Nominal emiş çapı 630 mm'dir."
  ],
  [
    "Operating air-temperature range: -20 to +40 °C.",
    "Çalışma hava sıcaklığı aralığı -20 °C ile +40 °C'dir."
  ],
  [
    "Operating air-temperature range: -25 to +60 °C.",
    "Çalışma hava sıcaklığı aralığı -25 °C ile +60 °C'dir."
  ],
  [
    "Radial-discharge centrifugal roof fan with an EC motor.",
    "EC motorlu, radyal atışlı santrifüj çatı fanıdır."
  ],
  [
    "Radial-discharge, dual-use centrifugal roof fan.",
    "Radyal atışlı, çift amaçlı santrifüj çatı fanıdır."
  ],
  [
    "Roof-mounted mixed-flow exhaust fan for circular duct systems.",
    "Dairesel kanal sistemleri için çatı tipi karışık akışlı egzoz fanıdır."
  ],
  [
    "Standard configuration.",
    "Standart konfigürasyondur."
  ],
  [
    "Timer-equipped product variant.",
    "Zamanlayıcılı ürün varyantıdır."
  ],
  [
    "Warning: not suitable for gas fires.",
    "Uyarı: gaz yakıtlı şömineler için uygun değildir."
  ],
  [
    "12 V, 50 Hz.",
    "12 V, 50 Hz."
  ],
  [
    "220-240 V, 50 Hz.",
    "220-240 V, 50 Hz."
  ],
  [
    "220-240 V, 50/60 Hz.",
    "220-240 V, 50/60 Hz."
  ],
  [
    "230 V, 50 Hz.",
    "230 V, 50 Hz."
  ],
  [
    "230 V, 50/60 Hz.",
    "230 V, 50/60 Hz."
  ],
  [
    "400 V, 50 Hz.",
    "400 V, 50 Hz."
  ],
  [
    "400 V, 50/60 Hz.",
    "400 V, 50/60 Hz."
  ],
  [
    "680 V, 50 Hz.",
    "680 V, 50 Hz."
  ],
  [
    "AC motor.",
    "AC motora sahiptir."
  ],
  [
    "AC multi-speed.",
    "Çok kademeli AC motora sahiptir."
  ],
  [
    "AC.",
    "AC motora sahiptir."
  ],
  [
    "Control levels: 4V / 6V / 8V / 10V.",
    "Kontrol seviyeleri: 4 V / 6 V / 8 V / 10 V."
  ],
  [
    "Control levels: max.",
    "Kontrol seviyesi: maks."
  ],
  [
    "Control levels: min / max.",
    "Kontrol seviyeleri: min. / maks."
  ],
  [
    "Control levels: min / med / max.",
    "Kontrol seviyeleri: min. / orta / maks."
  ],
  [
    "Control levels: min / mid / max.",
    "Kontrol seviyeleri: min. / orta / maks."
  ],
  [
    "EC brushless.",
    "Fırçasız EC motora sahiptir."
  ],
  [
    "EC motor.",
    "EC motora sahiptir."
  ],
  [
    "IP44 protection, insulation class II.",
    "IP44 koruma sınıfında ve izolasyon sınıfı II'dir."
  ],
  [
    "IP44 protection.",
    "IP44 koruma sınıfındadır."
  ],
  [
    "IP45 protection.",
    "IP45 koruma sınıfındadır."
  ],
  [
    "IP54 protection, insulation class I.",
    "IP54 koruma sınıfında ve izolasyon sınıfı I'dir."
  ],
  [
    "IP55 protection, insulation class F.",
    "IP55 koruma sınıfında ve F izolasyon sınıfındadır."
  ],
  [
    "IP55 protection, insulation class I.",
    "IP55 koruma sınıfında ve izolasyon sınıfı I'dir."
  ],
  [
    "IP65 protection, motor insulation class F.",
    "IP65 koruma sınıfında ve motor izolasyon sınıfı F'dir."
  ],
  [
    "IPX4 protection, insulation class I.",
    "IPX4 koruma sınıfında ve izolasyon sınıfı I'dir."
  ],
  [
    "IPX4 protection.",
    "IPX4 koruma sınıfındadır."
  ],
  [
    "IPX5 protection.",
    "IPX5 koruma sınıfındadır."
  ],
  [
    "Included speed controller: SCNR.",
    "SCNR hız kontrol cihazı dahildir."
  ],
  [
    "Performance curves are precomputed from the original catalogue vector paths.",
    "Performans eğrileri orijinal katalogdaki vektör eğrilerden önceden hesaplanmıştır."
  ],
  [
    "Single Phase, 4-pole motor.",
    "Monofaze, 4 kutuplu motora sahiptir."
  ],
  [
    "Single Phase, M4 motor.",
    "Monofaze M4 motora sahiptir."
  ],
  [
    "Three Phase, 4-pole motor.",
    "Trifaze, 4 kutuplu motora sahiptir."
  ],
  [
    "Three Phase, 6-pole motor.",
    "Trifaze, 6 kutuplu motora sahiptir."
  ],
  [
    "Three Phase, T2 motor.",
    "Trifaze T2 motora sahiptir."
  ],
  [
    "Three Phase, T4 motor.",
    "Trifaze T4 motora sahiptir."
  ],
  [
    "Three Phase, T4/8 motor.",
    "Trifaze T4/8 motora sahiptir."
  ],
  [
    "Three Phase, T6 motor.",
    "Trifaze T6 motora sahiptir."
  ],
  [
    "Hazardous-area compatibility must be confirmed against the project classification and manufacturer documentation. X special conditions apply.",
    "Tehlikeli bölge uygunluğu proje sınıflandırması ve üretici dokümantasyonuna göre doğrulanmalıdır. X özel koşulları geçerlidir."
  ],
  [
    "Not suitable for gas fires.",
    "Gaz yakıtlı şömineler için uygun değildir."
  ],
  [
    "Low-noise in-line EC mixed-flow fan range for circular duct systems.",
    "Dairesel kanal sistemleri için düşük sesli, kanal tipi EC karışık akışlı fan serisidir."
  ],
  [
    "Low-noise in-line mixed-flow fan range for circular duct systems.",
    "Dairesel kanal sistemleri için düşük sesli, kanal tipi karışık akışlı fan serisidir."
  ],
  [
    "In-line mixed-flow fan range for circular duct systems.",
    "Dairesel kanal sistemleri için kanal tipi karışık akışlı fan serisidir."
  ],
  [
    "Extra-performance in-line mixed-flow duct fan range.",
    "Yüksek performanslı kanal tipi karışık akışlı fan serisidir."
  ],
  [
    "Roof-mounted mixed-flow exhaust fan range.",
    "Çatı tipi karışık akışlı egzoz fanı serisidir."
  ],
  [
    "EC centrifugal roof fan range.",
    "EC motorlu santrifüj çatı fanı serisidir."
  ],
  [
    "F400 smoke-extract centrifugal roof fan range.",
    "F400 duman tahliye özellikli santrifüj çatı fanı serisidir."
  ],
  [
    "Explosion-protected axial plate fan range for hazardous areas.",
    "Tehlikeli bölgeler için patlamaya dayanıklı aksiyel plaka fan serisidir."
  ],
  [
    "Medium-pressure centrifugal ATEX fan for Zone 1 hazardous-area ventilation.",
    "Zone 1 tehlikeli bölge havalandırması için santrifüj orta basınçlı ATEX fandır."
  ],
  [
    "Chimney-top extract fan range.",
    "Baca üstü aspiratör serisidir."
  ],
  [
    "Cabinet centrifugal fan range for commercial and industrial duct systems.",
    "Ticari ve endüstriyel kanal sistemleri için hücreli santrifüj fan serisidir."
  ],
  [
    "Residential centrifugal extract fan range.",
    "Konut tipi santrifüj aspiratör serisidir."
  ],
  [
    "Flush-mounted centrifugal extract fan range.",
    "Gömme tip santrifüj aspiratör serisidir."
  ],
  [
    "Centrifugal residential extract fan range.",
    "Konut tipi santrifüj aspiratör serisidir."
  ],
  [
    "Flush-mounted reversible axial fan range.",
    "Gömme tip tersinir aksiyel fan serisidir."
  ],
  [
    "Wall and window mounted axial fan range.",
    "Duvar ve pencere tipi aksiyel fan serisidir."
  ],
  [
    "Wall-mounted axial extract fan range.",
    "Duvar tipi aksiyel aspiratör serisidir."
  ],
  [
    "Decorative wall-mounted axial extract fan range.",
    "Dekoratif duvar tipi aksiyel aspiratör serisidir."
  ],
  [
    "Two-speed wall axial extract fan range.",
    "Çift hızlı duvar tipi aksiyel aspiratör serisidir."
  ],
  [
    "Axial duct extract fan range.",
    "Aksiyel kanal tipi aspiratör serisidir."
  ],
  [
    "Wall axial extract fan range.",
    "Duvar tipi aksiyel aspiratör serisidir."
  ],
  [
    "Low-profile wall axial extract fan range.",
    "İnce tasarımlı duvar tipi aksiyel aspiratör serisidir."
  ],
  [
    "Wall and window axial extract fan range.",
    "Duvar ve pencere tipi aksiyel aspiratör serisidir."
  ],
  [
    "Centrifugal medium pressure ATEX fan.",
    "Santrifüj orta basınçlı ATEX fandır."
  ],
  [
    "Rolling steel sheet housing with completely joined or welded construction.",
    "Gövde, tamamen birleştirilmiş veya kaynaklı konstrüksiyona sahip haddelenmiş çelik sacdan üretilmiştir."
  ],
  [
    "Galvanised steel sheet simple-inlet forward-curved impeller.",
    "Tek emişli, öne eğik kanatlı çark galvanizli çelik sacdan üretilmiştir."
  ],
  [
    "Polyester powder finishing coat.",
    "Polyester toz boya son kat kaplamaya sahiptir."
  ],
  [
    "Inlet sparkproof ring made of copper or aluminium.",
    "Emiş tarafında bakır veya alüminyumdan imal edilmiş kıvılcım önleyici halka bulunur."
  ],
  [
    "Suitable for totally clean air without dust.",
    "Yalnızca tamamen temiz ve tozsuz hava için uygundur."
  ],
  [
    "Ambient working temperature from -20 °C to +40 °C; transported-air temperature according to the ATEX classification.",
    "Ortam çalışma sıcaklığı -20 °C ile +40 °C arasındadır; taşınan hava sıcaklığı ATEX sınıflandırmasına göre belirlenir."
  ],
  [
    "ATEX standard asynchronous motor certified according to the zone.",
    "Bölge sınıfına göre sertifikalandırılmış ATEX standardında asenkron motora sahiptir."
  ],
  [
    "IP55 protection and insulation class F.",
    "IP55 koruma sınıfında ve F izolasyon sınıfındadır."
  ],
  [
    "Standard voltages: 230 V 50 Hz for single-phase motors, 230/400 V 50 Hz for three-phase motors up to 4 kW, and 400/690 V 50 Hz for higher powers.",
    "Standart gerilimler; monofaze motorlarda 230 V 50 Hz, 4 kW'a kadar trifaze motorlarda 230/400 V 50 Hz, daha yüksek güçlerde 400/690 V 50 Hz'dir."
  ],
  [
    "This 0.09 kW model is rated 1450 rpm and 0.46 A at 400 V.",
    "Bu 0,09 kW model 1450 rpm devirde ve 400 V'ta 0,46 A akım değerindedir."
  ],
  [
    "Zone 1 suitability must be checked against the project gas group and certification. Fan and motor have separate ATEX markings. The manufacturer states that the fan is suitable only for totally clean air without dust.",
    "Zone 1 uygunluğu proje gaz grubu ve sertifikasyon şartlarına göre kontrol edilmelidir. Fan ve motorun ATEX işaretlemeleri ayrıdır. Üretici, fanın yalnızca tamamen temiz ve tozsuz hava için uygun olduğunu belirtmektedir."
  ]
]);

  const categoryPairs=new Map([
    ['Axial Fan','Aksiyel Fan'],['Axial','Aksiyel'],['Radial Fan','Radyal Fan'],['Radial','Radyal'],
    ['Duct Fan','Kanal Tipi Fan'],['Duct','Kanal Tipi'],['Cabinet Fan','Hücreli Fan'],['Cabinet','Hücreli'],
    ['Jet Fan','Jet Fan'],['Tunnel Fan','Tünel Fanı'],['Roof Fan','Çatı Fanı'],['Roof','Çatı Tipi'],
    ['Wall-Mounted Fan','Duvar Tipi Fan'],['Wall','Duvar Tipi'],['Mobile Fan','Mobil Fan'],['Mobile','Mobil'],
    ['Centrifugal Fan','Santrifüj Fan'],['Centrifugal','Santrifüj'],['Bifurcated Fan','Bifurkasyonlu Fan'],
    ['Smoke Exhaust Fan','Duman Tahliye Fanı'],['Smoke Exhaust','Duman Tahliye'],['Explosion-Proof / ATEX Fan','Ex-proof / ATEX Fan'],
    ['Ex-proof / ATEX Fan','Ex-proof / ATEX Fan'],['EC Fan','EC Fan'],['Heat Recovery Unit','Isı Geri Kazanım Cihazı'],
    ['Shelter Fan','Sığınak Fanı'],['Soler & Palau','Soler & Palau'],['Vortice','Vortice'],['Vitlo','Vitlo'],
    ['Mixed Flow','Karışık Akışlı'],['Cabinet / Duct-Mounted','Hücreli / Kanal Tipi'],['Chimney-Top','Baca Üstü'],
    ['Flush-Mounted','Gömme Tip'],['In-Line Duct','Kanal Tipi'],['Roof-Mounted','Çatı Tipi'],
    ['Wall / Ceiling','Duvar / Tavan'],['Wall / Plate-Mounted','Duvar / Plaka Tipi'],['Wall / Window','Duvar / Pencere'],
    ['Chimney Fan','Baca Fanı'],['Explosion-Protected Axial Fan','Patlamaya Dayanıklı Aksiyel Fan'],
    ['Residential Extract Fan','Konut Tipi Aspiratör'],['Scroll Housing','Salyangoz Gövde'],['ATEX Medium-Pressure Fan','ATEX Orta Basınçlı Fan'],['EU/current','AB / Güncel'],['Extra EU','AB Dışı'],['global','Global']
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

  const applicationPhrasePairs=new Map([
    ['General area ventilation','genel alan havalandırması'],
    ['General space ventilation','genel mahal havalandırması'],
    ['Car park smoke extraction systems','otopark duman tahliye sistemleri'],
    ['Smoke extraction systems','duman tahliye sistemleri'],
    ['Tunnel smoke extraction systems','tünel duman tahliye sistemleri'],
    ['Explosive area ventilation','patlayıcı ortam havalandırması'],
    ['Factory, warehouse and parking ventilation systems','fabrika, depo ve otopark havalandırma sistemleri'],
    ['Industrial warehouse ventilation','endüstriyel depo havalandırması'],
    ['Industrial kitchen hood exhaust systems','endüstriyel mutfak davlumbaz egzoz sistemleri'],
    ['Kitchen hood exhausts with filter system','filtreli mutfak davlumbaz egzoz sistemleri'],
    ['Office, restaurant, garage, warehouse and workshop ventilation','ofis, restoran, garaj, depo ve atölye havalandırması'],
    ['Office, restaurant,WC, garage, warehouse and workshop ventilation','ofis, restoran, WC, garaj, depo ve atölye havalandırması'],
    ['Stair and elevator pressurization systems','merdiven ve asansör basınçlandırma sistemleri'],
    ['Refuge fresh air systems','sığınak taze hava sistemleri'],
    ['Welding smoke extraction systems','kaynak dumanı tahliye sistemleri'],
    ['Heavy industry productions','ağır sanayi üretim tesisleri'],
    ['Production processes with intense oil and high temperature','yoğun yağ ve yüksek sıcaklık içeren üretim prosesleri'],
    ['Petrochem','petrokimya tesisleri'],
    ['Petrochemical plants','petrokimya tesisleri'],
    ['Used for fresh air, exhaust','taze hava ve egzoz uygulamaları'],
    ['Used for fresh air, exhaust and circulation','taze hava, egzoz ve sirkülasyon uygulamaları'],
    ['Uses for fresh air, exhaust and circulation in explosive and flammable spaces','patlayıcı ve yanıcı ortamlarda taze hava, egzoz ve sirkülasyon uygulamaları'],
    ["Air supply and exhaust systems","hava besleme ve egzoz sistemleri"],
    ["Bathroom, WC and utility-room ventilation","banyo, WC ve yardımcı hacim havalandırması"],
    ["Cabinet-fan duct installations","hücreli fan kanal uygulamaları"],
    ["Chimney-top installation","baca üstü uygulamalar"],
    ["Circular duct ventilation","dairesel kanal havalandırması"],
    ["Commercial and industrial air extraction","ticari ve endüstriyel hava tahliyesi"],
    ["EC-controlled air exhaust systems","EC kontrollü hava egzoz sistemleri"],
    ["Emergency smoke extraction at F400 / 120 min","F400 / 120 dakika acil durum duman tahliyesi"],
    ["Fireplace and solid-fuel chimney smoke extraction","şömine ve katı yakıtlı baca duman tahliyesi"],
    ["Normal roof extract ventilation","normal çatı egzoz havalandırması"],
    ["Residential room extraction","konut mahallerinde hava tahliyesi"],
    ["Roof extract ventilation","çatı egzoz havalandırması"],
    ["Roof-mounted air exhaust","çatı tipi hava egzozu"],
    ["Zone 1 gas atmospheres subject to full compatibility review","tam uygunluk kontrolü şartıyla Zone 1 gaz atmosferleri"],
    ["Zone 21 dust atmospheres subject to full compatibility review","tam uygunluk kontrolü şartıyla Zone 21 toz atmosferleri"]
    ["Inline installation in indoor environments classified as ATEX","ATEX olarak sınıflandırılmış kapalı ortamlarda kanal hattı uygulamaları"],
  ]);

  function joinTr(items){
    const values=[...new Set((items||[]).filter(Boolean))];
    if(!values.length)return '';
    if(values.length===1)return values[0];
    if(values.length===2)return `${values[0]} ve ${values[1]}`;
    return `${values.slice(0,-1).join(', ')} ve ${values.at(-1)}`;
  }
  function sentenceCaseTr(value){
    let text=String(value||'').replace(/\s+/g,' ').trim();
    if(!text)return text;
    const commonWords=[
      ['Genel Alan','genel alan'],['Genel Mahal','genel mahal'],['Otopark Duman','otopark duman'],
      ['Duman Tahliye','duman tahliye'],['Tünel Duman','tünel duman'],['Patlayıcı Ortam','patlayıcı ortam'],
      ['Endüstriyel Depo','endüstriyel depo'],['Petrokimya Tesisleri','petrokimya tesisleri'],
      ['Fabrika, Depo','fabrika, depo'],['Ofis, Restoran','ofis, restoran'],
      ['Merdiven ve Asansör','merdiven ve asansör'],['Sığınak Taze Hava','sığınak taze hava'],
      ['Kaynak Dumanı','kaynak dumanı'],['Ağır Sanayi','ağır sanayi'],['Yoğun Yağ','yoğun yağ'],
      ['Taze Hava','taze hava'],['Elektrik Bağlantı','elektrik bağlantı'],['Fan Gövdesi','fan gövdesi']
    ];
    for(const [from,to] of commonWords)text=text.split(from).join(to);
    text=text.replace(/(^|[.!?]\s+)([a-zçğıöşü])/g,(all,prefix,letter)=>prefix+letter.toLocaleUpperCase('tr-TR'));
    if(!/[.!?]$/.test(text))text+='.';
    return text;
  }

  function applicationSentenceToTr(items){
    const phrases=(items||[]).map(value=>{
      const source=String(value||'').replace(/\s+/g,' ').replace(/[.,]+\s*$/,'').trim();
      const phrase=applicationPhrasePairs.get(source)||productTextToTr(source).replace(/[.!?]+$/,'');
      return phrase.charAt(0).toLocaleLowerCase('tr-TR')+phrase.slice(1);
    }).filter(Boolean);
    const joined=joinTr(phrases);
    return joined?sentenceCaseTr(`Başlıca kullanım alanları arasında ${joined} yer alır`):'';
  }

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
    if(titlePairs.has(source))return titlePairs.get(source);
    if(categoryPairs.has(source))return categoryPairs.get(source);
    let output=source;
    const fragments=[...exactProductPairs.entries()].sort((a,b)=>b[0].length-a[0].length);
    for(const [english,turkish] of fragments){
      if(output.includes(english))output=output.split(english).join(turkish);
    }
    for(const [pattern,replacement] of phraseRules)output=output.replace(pattern,replacement);
    return sentenceCaseTr(output);
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
      else if(mode==='title')next=titlePairs.get(en)||en;
      else if(mode==='category')next=categoryPairs.get(en)||en;
      else next=productTextToTr(en);
    }
    if(String(node.textContent||'').trim()!==next)node.textContent=next;
  }

  function withoutRepeatedCode(code,text){
    const cleanCode=String(code||'').trim();
    const cleanText=String(text||'').trim();
    if(!cleanCode||!cleanText)return cleanText;
    if(cleanText.toLocaleLowerCase('en-US')===cleanCode.toLocaleLowerCase('en-US'))return cleanText;
    if(!cleanText.toLocaleLowerCase('en-US').startsWith(cleanCode.toLocaleLowerCase('en-US')))return cleanText;
    return cleanText.slice(cleanCode.length).replace(/^\s*[-–—:|\/]?\s*/,'').trim()||cleanText;
  }

  function cleanVorticeTitles(scope){
    const clean=(container,codeSelector,titleSelector)=>{
      const brand=String(container.querySelector('.series-brand')?.textContent||'').trim();
      if(brand.toLocaleLowerCase('en-US')!=='vortice')return;
      const code=String(container.querySelector(codeSelector)?.textContent||'').trim();
      const title=container.querySelector(titleSelector);
      if(!title)return;
      const cleaned=withoutRepeatedCode(code,title.textContent);
      if(cleaned!==title.textContent)title.textContent=cleaned;
    };
    scope.querySelectorAll('.series-card').forEach(card=>clean(card,'h2','.series-title'));
    scope.querySelectorAll('.series-hero-copy').forEach(hero=>clean(hero,'h1','h2'));
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

  function pruneVorticeModelSpecificFeatures(scope){
    scope.querySelectorAll?.('[data-vortice-features] li').forEach(node=>{
      const original=String(node.dataset.vensisEn||node.textContent||'').replace(/\s+/g,' ').trim();
      if(/^(?:Nominal duct connection|Nominal intake diameter):/i.test(original)||/^Nominal (?:kanal bağlantı çapı|emiş çapı)/i.test(original))node.remove();
    });
  }

  function consolidateFeatureApplications(scope){
    scope.querySelectorAll?.('[data-unified-features],[data-vitlo-features],[data-vortice-features]').forEach(section=>{
      const apps=[...section.querySelectorAll('.catalog-application,.vitlo-application,.vortice-application')];
      if(!apps.length)return;
      apps.forEach(node=>sourceText(node,'product'));
      if(language()==='tr'){
        const originals=apps.map(node=>node.dataset.vensisEn||node.textContent||'').filter(Boolean);
        const summary=applicationSentenceToTr(originals);
        apps[0].textContent=summary;
        apps[0].hidden=!summary;
        apps.slice(1).forEach(node=>node.hidden=true);
      }else{
        apps.forEach(node=>{
          node.hidden=false;
          node.textContent=node.dataset.vensisEn||node.textContent||'';
        });
      }
    });
  }

  function apply(root=document){
    if(applying)return;
    applying=true;
    const reconnect=Boolean(observer);
    if(observer)observer.disconnect();
    try{
      const scope=root?.querySelectorAll?root:document;
      scope.querySelectorAll('.detail-back,.series-card-footer span,.model-catalog-only,.model-operating-title,.model-dimension summary,.model-safety-warning b,.empty-note,.empty-state,.model-datasheet-btn,.detail-section h3,.models-section h2,.catalog-pdf').forEach(node=>renderNode(node,'ui'));
      scope.querySelectorAll('.series-title,.series-hero-copy h2').forEach(node=>renderNode(node,'title'));
      cleanVorticeTitles(scope);
      scope.querySelectorAll('.series-badges span,.check-row span').forEach(node=>renderNode(node,'category'));
      scope.querySelectorAll('.series-card p,.series-info-grid p,.series-info-grid li,.detail-section p,.detail-section li,.model-safety-warning-text').forEach(node=>renderNode(node,'product'));
      pruneVorticeModelSpecificFeatures(scope);
      consolidateFeatureApplications(scope);

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

  window.VensisCatalogLanguage={
    language,
    productTextToTr,
    titleToTr:value=>titlePairs.get(String(value||'').trim())||String(value||'').trim(),
    categoryToTr:value=>categoryPairs.get(String(value||'').trim())||String(value||'').trim(),
    applicationSentenceToTr
  };

  function start(){
    apply(document);
    observeMutations();
    window.addEventListener('vensis-language-changed',()=>apply(document));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

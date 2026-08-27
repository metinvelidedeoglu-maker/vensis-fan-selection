(function(){
  'use strict';

  const products=Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[];
  const blankTechnical={power:'',current:'',voltage:'',frequency:'',phase:'',ip:'',insulation:'',lumen:'',operatingTemperature:''};
  const newSeries={
    'ZNF.EX':{
      modelName:'ZNF.EX',brand:'ZONEX',category:'Aydınlatma',image:'',catalogPdf:'Vensis Elektrik.pdf',
      description:'Zone 1 exproof yönlendirme / EXIT armatürleri. 3 saat acil kitli floresan, LED tube ve LED dizgi seçenekleri.',
      defaults:{...blankTechnical,subcategory:'Exproof Yönlendirme Armatürü',voltage:'220/240 V',frequency:'50/60 Hz',phase:'Monofaze',ip:'IP66',operatingTemperature:'-20°C / +55°C'}
    },
    'ZNB.CE':{
      modelName:'ZNB.CE',brand:'ZONEX',category:'Kumanda',image:'',catalogPdf:'Vensis Elektrik.pdf',
      description:'Zone 1 exproof kontrol üniteleri. Buton, sinyal lambası, anahtar ve çoklu kumanda seçenekleri.',
      defaults:{...blankTechnical,subcategory:'Exproof Kontrol Ünitesi',ip:'IP65',operatingTemperature:'-25°C / +55°C'}
    }
  };
  const missingDefaults={
    'ZNP.X':{...blankTechnical,subcategory:'Exproof Lineer Armatür',voltage:'220/240 V',frequency:'50/60 Hz',phase:'Monofaze',ip:'IP66',operatingTemperature:'-20°C / +55°C'},
    'ZNG.X':{...blankTechnical,subcategory:'Çakar İkaz Armatürü',frequency:'50/60 Hz',phase:'Monofaze',ip:'IP66',operatingTemperature:'-20°C / +55°C'},
    'ZNJ.X':{...blankTechnical,subcategory:'Exproof Alüminyum Buat',voltage:'24-380 V',frequency:'50/60 Hz',ip:'IP66',operatingTemperature:'-25°C / +55°C'},
    'ZNEQ.X':{...blankTechnical,subcategory:'Exproof Kumanda Elemanı',voltage:'250 V',frequency:'50/60 Hz',ip:'IP65',operatingTemperature:'-25°C / +55°C'}
  };

  // [seri, sipariş kodu, ürün kodu, fiyat listesi açıklaması, EUR fiyatı, eksik model teknik alanları]
  const rows=[
    ['ZNF.X','101101','ZNF.2X18W','Floresan (Kısa)',210],
    ['ZNF.X','101102','ZNF.2X18W.EM','Acil Kitli Floresan (Kısa)',260],
    ['ZNF.X','101103','ZNF.2X36W','Floresan (Uzun)',265],
    ['ZNF.X','101104','ZNF.2X36W.EM','Acil Kitli Floresan (Uzun)',320],
    ['ZNF.X','101105','ZNF.2X9W.L','Led Tube (Kısa)',205],
    ['ZNF.X','101106','ZNF.2X8W.L.EM','Acil Kitli Led Tube (Kısa)',250],
    ['ZNF.X','101107','ZNF.2X18W.L','Led Tube (Uzun)',260],
    ['ZNF.X','101108','ZNF.2X18W.L.EM','Acil Kitli Led Tube (Uzun)',310],
    ['ZNF._S','101109','ZNF.22W.S','Led Dizgi (Kısa)',240],
    ['ZNF._S','101110','ZNF.22W.S.EM','Acil Kitli Led Dizgi (Kısa)',290],
    ['ZNF._S','101111','ZNF.44W.S','Led Dizgi (Uzun)',295],
    ['ZNF._S','101112','ZNF.44W.S.EM','Acil Kitli Led Dizgi (Uzun)',345],
    ['ZNF._S','101113','ZNF.66W.S','Led Dizgi (Uzun)',325],
    ['ZNF._S','101114','ZNF.66W.S.EM','Acil Kitli Led Dizgi (Uzun)',370],

    ['ZNP.X','101201','ZNP.2X18W','Floresan (Kısa)',88],
    ['ZNP.X','101202','ZNP.2X18W.EM','Acil Kitli Floresan (Kısa)',150],
    ['ZNP.X','101203','ZNP.2X36W','Floresan (Uzun)',115],
    ['ZNP.X','101204','ZNP.2X36W.EM','Acil Kitli Floresan (Uzun)',175],
    ['ZNP.X','101205','ZNP.2X9W.L','Led Tube (Kısa)',82,{power:'2x9 W'}],
    ['ZNP.X','101206','ZNP.2X9W.L.EM','Acil Kitli Led Tube (Kısa)',140,{power:'2x9 W'}],
    ['ZNP.X','101207','ZNP.2X18W.L','Led Tube (Uzun)',110,{power:'2x18 W'}],
    ['ZNP.X','101208','ZNP.2X18W.L.EM','Acil Kitli Led Tube (Uzun)',170,{power:'2x18 W'}],

    ['ZNF.EX','101301','ZNF.2X9W.L.EM','Led Tube, 3 Saat Acil Kitli EXIT',260,{power:'2x9 W'}],
    ['ZNF.EX','101302','ZNF.22W.S.EM','Led Dizgi, 3 Saat Acil Kitli EXIT',320,{power:'22 W'}],
    ['ZNF.EX','101303','ZNF.2X18W.EM','Floresan, 3 Saat Acil Kitli EXIT',270,{power:'2x18 W'}],

    ['ZNL.X','101401','ZNL.50','50 W Led Projektör (Küçük)',320],
    ['ZNL.X','101402','ZNL.75','75 W Led Projektör (Küçük)',370],
    ['ZNL.X','101403','ZNL.100','100 W Led Projektör (Büyük)',540],
    ['ZNL.X','101404','ZNL.120','120 W Led Projektör (Büyük)',580],
    ['ZNL.X','101405','ZNL.140','140 W Led Projektör (Büyük)',632],

    ['ZNK.X','101501','ZNK.100','100 W Led Projektör',345],
    ['ZNK.X','101502','ZNK.125','125 W Led Projektör',365],
    ['ZNK.X','101503','ZNK.150','150 W Led Projektör',390],
    ['ZNK.X','101504','ZNK.180','180 W Led Projektör',430],

    ['ZNG.X','101601','ZNG.F.R220','220 V AC Kırmızı Çakar İkaz',350,{voltage:'220 V AC'}],
    ['ZNG.X','101602','ZNG.F.R24','24 V DC Kırmızı Çakar İkaz',350,{voltage:'24 V DC',phase:'DC'}],
    ['ZNG.X','101603','ZNG.F.G220','220 V AC Yeşil Çakar İkaz',350,{voltage:'220 V AC'}],
    ['ZNG.X','101604','ZNG.F.G24','24 V DC Yeşil Çakar İkaz',350,{voltage:'24 V DC',phase:'DC'}],
    ['ZNG.X','101605','ZNG.F.Y220','220 V AC Sarı Çakar İkaz',350,{voltage:'220 V AC'}],
    ['ZNG.X','101606','ZNG.F.Y24','24 V DC Sarı Çakar İkaz',350,{voltage:'24 V DC',phase:'DC'}],
    ['ZNG.X','101701','ZNG.C.L','30 W Led Tavan Tipi (220-240 V AC)',210],
    ['ZNG.X','101702','ZNG.C.E','E27 Duylu, Tavan Tipi',195],
    ['ZNG.X','101703','ZNG.B.E','E27 Duylu, Borulama Tipi',190],
    ['ZNG.X','101704','ZNG.P.E','E27 Duylu, Seyyar Baladoz',200],

    ['ZNT.X','101801','ZNT.15W.220V','220-240 V AC, 15 W Led Tank Armatürü',310],
    ['ZNT.X','101802','ZNT.15W.24V.DC','24 V DC, 15 W Led Tank Armatürü',320],

    ['ZNJ.X','101901','ZNJ.65','İki Yollu (65 mm)',17],
    ['ZNJ.X','101902','ZNJ.105.2x1/2"','İki Yollu (105 mm)',28],
    ['ZNJ.X','101903','ZNJ.105.2x3/4"','İki Yollu (105 mm)',29],
    ['ZNJ.X','101904','ZNJ.105.3x1/2"','Üç Yollu (105 mm)',30],
    ['ZNJ.X','101905','ZNJ.105.3x3/4"','Üç Yollu (105 mm)',31],
    ['ZNJ.X','101906','ZNJ.105.4x1/2"','Dört Yollu (105 mm)',32.5],
    ['ZNJ.X','101907','ZNJ.105.4x3/4"','Dört Yollu (105 mm)',34],
    ['ZNJ.X','101908','ZNJ.150.X','Beş-altı Yollu (150 mm)',105],
    ['ZNJ.X','101909','ZNJ.150.X','Yedi-sekiz Yollu (150 mm)',110],

    ['ZNB.CE','101901','ZNB.CE2','Start Butonu',100],
    ['ZNB.CE','101902','ZNB.CE2','Stop Butonu',100],
    ['ZNB.CE','101903','ZNB.CE2','Acil Stop Butonu',115],
    ['ZNB.CE','101904','ZNB.CE2','Sinyal Lambası',95],
    ['ZNB.CE','101905','ZNB.CE2','Monofaze Anahtar',80],
    ['ZNB.CE','101906','ZNB.CE2','Trifaze Anahtar',90],
    ['ZNB.CE','101907','ZNB.CE2','Komütatör / Kutup Değiştirici Anahtar',87],
    ['ZNB.CE','101908','ZNB.CE2','Start-Stop Butonu',140],
    ['ZNB.CE','101909','ZNB.CE2','Start-Sinyal',135],
    ['ZNB.CE','101910','ZNB.CE2','Acil-Sinyal',140],
    ['ZNB.CE','101911','ZNB.CE2','Potansiyometre',165],
    ['ZNB.CE','101912','ZNB.CE3',"3'lü (Start-Stop-Acil Stop)",235],
    ['ZNB.CE','101913','ZNB.CE3',"3'lü (Start-Stop-Sinyal Lambası)",225],
    ['ZNB.CE','101914','ZNB.CE3',"3'lü (Start-Acil Stop-Sinyal)",225],

    ['ZNJP.X','102001','ZNJP.120.220/225','İki Yollu, M20 veya M25',73],
    ['ZNJP.X','102002','ZNJP.3XM20-25','Üç Yollu, M20 veya M25',77],
    ['ZNJP.X','102003','ZNJP.4XM20-25','Dört Yollu, M20 veya M25',82],
    ['ZNJP.X','102004','ZNJP.5XM20-25','Beş Yollu, M20 veya M25',85],
    ['ZNJP.X','102005','ZNJP.6XM20-25','Altı Yollu, M20 veya M25',88],
    ['ZNJP.X','102006','ZNJP.7XM20-25','Yedi Yollu, M20',91],
    ['ZNJP.X','102007','ZNJP.8XM20-25','Sekiz Yollu, M20',94],

    ['ZNB.X','102101','ZNB1','ZNB.1 Serisi Terminal Kutusu',135],
    ['ZNB.X','102102','ZNB2','ZNB.2 Serisi Terminal Kutusu',240],
    ['ZNB.X','102103','ZNB3','ZNB.3 Serisi Terminal Kutusu',310],
    ['ZNB.X','102104','ZNB4','ZNB.4 Serisi Terminal Kutusu',650],
    ['ZNB.X','102105','ZNB5','ZNB.5 Serisi Terminal Kutusu',910],
    ['ZNB.X','102106','ZNB6','ZNB.6 Serisi Terminal Kutusu',1250],
    ['ZNB.X','102107','ZNB7','ZNB.7 Serisi Terminal Kutusu',1850],

    ['ZNEQ.X','102201','ZNEQ.1','Start Butonu',60],
    ['ZNEQ.X','102202','ZNEQ.2','Stop Butonu',60],
    ['ZNEQ.X','102203','ZNEQ.3','Acil Stop Butonu',70],
    ['ZNEQ.X','102204','ZNEQ.5','Sinyal Lambası',50],
    ['ZNEQ.X','102205','ZNEQ.6.01.2X16A','Monofaze Anahtar',65],
    ['ZNEQ.X','102206','ZNEQ.6.01.3X32A','Trifaze Anahtar',70],
    ['ZNEQ.X','102207','ZNEQ.6.(012/102)','Komütatör / Kutup Değiştirici Anahtar',70],
    ['ZNEQ.X','102208','ZNEQ.7','Potansiyometre',82],

    ['ZNPG.X','102301','ZNPG.1N','1/2" NPT',4],
    ['ZNPG.X','102302','ZNPG.2N','3/4" NPT',5],
    ['ZNPG.X','102303','ZNPG.3N','1" NPT',6.8],
    ['ZNPG.X','102304','ZNPG.1M','M20x1,5',4.8],
    ['ZNPG.X','102305','ZNPG.2M','M25x1,5',5.8],
    ['ZNPG.X','102306','ZNPG.3M','M32x1,5',7.7],
    ['ZNPG.X','102307','ZNPG.1G','1/2" Gas',4.8],
    ['ZNPG.X','102308','ZNPG.2G','3/4" Gas',5.8],
    ['ZNPG.X','102309','ZNPG.3G','1" Gas',7.8]
  ];

  for(const [seriesName,definition] of Object.entries(newSeries)){
    if(!products.some(product=>product.modelName===seriesName)){
      products.push({...definition,submodels:[]});
    }
  }

  const productBySeries=new Map(products.map(product=>[product.modelName,product]));
  for(const [seriesName,orderCode,modelCode,name,price,details] of rows){
    const product=productBySeries.get(seriesName);
    if(!product)throw new Error(`Elektrik serisi bulunamadı: ${seriesName}`);
    if(seriesName==='ZNG.X')product.description='Zone 1-2 / 21-22 exproof çakar ikaz ve glob armatürleri.';
    let model=(product.submodels||[]).find(item=>item.orderCode===orderCode);
    if(!model){
      const defaults=newSeries[seriesName]?.defaults||missingDefaults[seriesName]||blankTechnical;
      model={...defaults,model:modelCode};
      product.submodels.push(model);
    }
    Object.assign(model,details||{}, {model:modelCode,name,price:`${price} EUR`,orderCode});
  }

  window.VENSIS_ELECTRICAL_PRICE_LIST_META={
    source:'2025-1 fiyat listesi (güncel)',
    documentTitle:'2024-1 Fiyat Listesi',
    sourceSha256:'9ead2999713365d7a66954a0218aee766327186872c9e667b431ed1b19f1759d',
    currentPricesConfirmed:true,
    currency:'EUR',
    rowCount:rows.length
  };
})();

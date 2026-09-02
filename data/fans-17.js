(function(){
  'use strict';
  window.models=Array.isArray(window.models)?window.models:[];

  const sourceCatalogue='CRS ATEX 63-2T-40  II 2G EEX-D IIC T4.pdf';
  const sourcePoints=[
    [5000,10500],
    [4800,12000],
    [4550,13500],
    [4200,15000],
    [3800,16500],
    [3400,18000],
    [3000,19430]
  ];
  const base={
    brand:'Vitlo',
    manufacturer:'Vitlo',
    nominal:19430,
    kw:30,
    rpm:2960,
    amps:52.2,
    spl:86,
    voltage:'400 V',
    frequency:'50 Hz',
    phase:'Three Phase',
    poles:2,
    pole:2,
    ipClass:'IP65',
    insulationClass:'F',
    dimensions:{A:1100,B:1200,C:950,H:750},
    motorFrameSize:'180',
    efficiencyPct:72,
    sourcePage:1,
    sourceCatalogue,
    airDensity:'1.2 kg/m³',
    curveInterpolation:'linear',
    curveVerification:{
      status:'digitized_from_supplied_pdf_chart',
      sourceCatalogue,
      sourcePage:1
    },
    operatingPoints:[{
      control:'nominal',
      powerW:30000,
      powerKw:30,
      currentA:52.2,
      rpm:2960,
      maxAirflowM3h:19430,
      staticPressurePa:3000,
      soundPressureDbA3m:86,
      efficiencyPct:72,
      mechanicalPowerAtWorkingPointKw:27.3
    }],
    curves:[{
      control:'nominal',
      sourcePage:1,
      sourceGraphTitle:'Characteristic Curve and Acoustics at 1.2 kg/m³',
      sourceMethod:'digitized approximately from supplied PDF performance graph',
      interpolation:'linear',
      precomputed:true,
      sourcePoints
    }]
  };

  const cloneBase=()=>({
    ...base,
    dimensions:{...base.dimensions},
    curveVerification:{...base.curveVerification},
    operatingPoints:base.operatingPoints.map(point=>({...point})),
    curves:base.curves.map(curve=>({...curve,sourcePoints:curve.sourcePoints.map(point=>[...point])}))
  });

  const rows=[
    {
      ...cloneBase(),
      key:'VITLO-CRS-ATEX|CRS/ATEX 63-2T-40',
      configurationId:'CRS/ATEX 63-2T-40',
      display:'CRS/ATEX 63-2T-40 (19430 m³/h)',
      model:'CRS/ATEX 63-2T-40',
      family:'CRS/ATEX',
      series:'CRS/ATEX',
      productCode:'CRS63-2T-40-ATEX',
      fanType:'Radyal',
      mountType:'Salyangoz',
      productGroup:'Ex-proof fan',
      fanTypeEn:'Radial',
      mountTypeEn:'Centrifugal',
      productGroupEn:'Explosion-Proof Fan',
      categories:['Explosion-Proof / ATEX Fan','Radial Fan','Centrifugal Fan'],
      tagsEn:['Explosion-Proof / ATEX Fan','Radial Fan','Centrifugal Fan'],
      tags:['Exproof / ATEX','Radyal','Salyangoz'],
      catalogNameEn:'CRS/ATEX Single-Inlet Centrifugal Explosion-Proof Fans',
      image:'assets/products/CRS-ATEX.webp',
      atex:true,
      atexProtection:'EXII2G EEX-D IIC T4',
      temperatureRange:'-20°C / +80°C',
      price:17000,
      catalogueInfo:{
        general:[
          'It can be produced up to 50,000 m³/h capacity.',
          'It has radial backward curved blades with maximum efficiency.',
          'The fan casing is produced from hard steel and it is coated electrostatic powder coating as standard.',
          'Suction cone is made of copper material.',
          'It is ex-proof as a complete device.',
          'It is suitable for operation in temperature range -20°C/+80°C.'
        ],
        motor:[
          'IP65 protected, IE2/IE3 high efficiency and with self lubricating bearing, fully enclosed type, in F insulation class.',
          'There are 4,6,8 pole motor options depending on the model and II 2G Eex D/e IIB/IIC T4-T3 protection ratings.',
          'It is 400V-50Hz as standard and it is suitable for use with frequency converter.'
        ],
        applications:[]
      },
      sourceNote:'Model-specific motor data and dimensions are taken from the supplied CRS/ATEX 63-2T-40 datasheet. Price supplied by the user: 17,000 EUR.'
    },
    {
      ...cloneBase(),
      key:'VITLO-CRS|CRS 63-2T-40',
      configurationId:'CRS 63-2T-40',
      display:'CRS 63-2T-40 (19430 m³/h)',
      model:'CRS 63-2T-40',
      family:'CRS',
      series:'CRS',
      productCode:'CRS63-2T-40',
      fanType:'Radyal',
      mountType:'Salyangoz',
      productGroup:'Radyal fan',
      fanTypeEn:'Radial',
      mountTypeEn:'Centrifugal',
      productGroupEn:'Radial Fan',
      categories:['Radial Fan','Centrifugal Fan'],
      tagsEn:['Radial Fan','Centrifugal Fan'],
      tags:['Radyal','Salyangoz'],
      catalogNameEn:'CRS Single-Inlet Centrifugal Fans',
      image:'assets/products/CRS.webp',
      atex:false,
      catalogueInfo:{general:[],motor:[],applications:[]},
      sourceNote:'Performance, motor and dimension values are copied from CRS/ATEX 63-2T-40 at the user’s request; no separate CRS datasheet was supplied. ATEX-specific construction, marking and temperature claims are not copied. No price was supplied.'
    },
    {
      ...cloneBase(),
      key:'VITLO-CRH|CRH 63-2T-40',
      configurationId:'CRH 63-2T-40',
      display:'CRH 63-2T-40 (19430 m³/h)',
      model:'CRH 63-2T-40',
      family:'CRH',
      series:'CRH',
      productCode:'CRH63-2T-40',
      fanType:'Radyal',
      mountType:'Çatı tipi',
      productGroup:'Santrifüj çatı fanı',
      fanTypeEn:'Radial',
      mountTypeEn:'Roof',
      productGroupEn:'Centrifugal Roof Fan',
      categories:['Roof Fan','Radial Fan','Centrifugal Fan'],
      tagsEn:['Roof Fan','Radial Fan','Centrifugal Fan'],
      tags:['Çatı Fanı','Radyal','Santrifüj'],
      catalogNameEn:'Horizontal Outlet Centrifugal Roof Type Fan',
      image:'assets/products/CRH.webp',
      atex:false,
      catalogueInfo:{general:[],motor:[],applications:[]},
      sourceNote:'Performance, motor and dimension values are copied from CRS/ATEX 63-2T-40 at the user’s request; no separate CRH datasheet was supplied. Product-specific construction and temperature claims are not inferred. No price was supplied.'
    },
    {
      ...cloneBase(),
      key:'VITLO-CRH-ATEX|CRH/ATEX 63-2T-40',
      configurationId:'CRH/ATEX 63-2T-40',
      display:'CRH/ATEX 63-2T-40 (19430 m³/h)',
      model:'CRH/ATEX 63-2T-40',
      family:'CRH/ATEX',
      series:'CRH/ATEX',
      productCode:'CRH63-2T-40-ATEX',
      fanType:'Radyal',
      mountType:'Çatı tipi',
      productGroup:'Ex-proof çatı fanı',
      fanTypeEn:'Radial',
      mountTypeEn:'Roof',
      productGroupEn:'Explosion-Proof Centrifugal Roof Fan',
      categories:['Explosion-Proof / ATEX Fan','Roof Fan','Radial Fan','Centrifugal Fan'],
      tagsEn:['Explosion-Proof / ATEX Fan','Roof Fan','Radial Fan','Centrifugal Fan'],
      tags:['Exproof / ATEX','Çatı Fanı','Radyal','Santrifüj'],
      catalogNameEn:'Centrifugal Roof Type Ex-proof Fan',
      image:'assets/products/CRH-ATEX.webp',
      atex:true,
      catalogueInfo:{general:[],motor:[],applications:[]},
      sourceNote:'Performance, motor and dimension values are copied from CRS/ATEX 63-2T-40 at the user’s request; no separate CRH/ATEX datasheet was supplied. Exact ATEX marking, construction and temperature limits are intentionally not asserted. No price was supplied.'
    }
  ];

  window.models.push(...rows);
})();

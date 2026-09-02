(function(){
  'use strict';
  window.models=Array.isArray(window.models)?window.models:[];

  const sourceCatalogue='CRS ATEX 31-2T-2(1).pdf';
  const sourcePoints=[
    [1200,1400],
    [1100,2300],
    [1000,2950],
    [950,3150],
    [800,3500],
    [600,3950],
    [400,4400]
  ];
  const base={
    brand:'Vitlo',
    manufacturer:'Vitlo',
    nominal:4400,
    kw:1.5,
    rpm:2865,
    amps:3.25,
    spl:68,
    voltage:'400 V',
    frequency:'50 Hz',
    phase:'Three Phase',
    poles:2,
    pole:2,
    ipClass:'IP55',
    insulationClass:'F',
    dimensions:{A:550,B:650,C:500,H:380},
    motorFrameSize:'90',
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
      powerW:1500,
      powerKw:1.5,
      currentA:3.25,
      rpm:2865,
      maxAirflowM3h:4400,
      soundPressureDbA3m:68
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
      key:'VITLO-CRS-ATEX|CRS/ATEX 31-2T-2',
      configurationId:'CRS/ATEX 31-2T-2',
      display:'CRS/ATEX 31-2T-2 (4400 m³/h)',
      model:'CRS/ATEX 31-2T-2',
      family:'CRS/ATEX',
      series:'CRS/ATEX',
      productCode:'CRS31-2T-2-ATEX',
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
      sourceNote:'Supplied datasheet general motor text states IP65, while the model-specific motor data table states IP55. IP55 is used for this model.'
    },
    {
      ...cloneBase(),
      key:'VITLO-CRS|CRS 31-2T-2',
      configurationId:'CRS 31-2T-2',
      display:'CRS 31-2T-2 (4400 m³/h)',
      model:'CRS 31-2T-2',
      family:'CRS',
      series:'CRS',
      productCode:'CRS31-2T-2',
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
      sourceNote:'Performance, motor and dimension values are copied from CRS/ATEX 31-2T-2 at the user’s request; no separate CRS datasheet was supplied. ATEX-specific construction, marking and temperature claims are not copied.'
    },
    {
      ...cloneBase(),
      key:'VITLO-CRH|CRH 31-2T-2',
      configurationId:'CRH 31-2T-2',
      display:'CRH 31-2T-2 (4400 m³/h)',
      model:'CRH 31-2T-2',
      family:'CRH',
      series:'CRH',
      productCode:'CRH31-2T-2',
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
      sourceNote:'Performance, motor and dimension values are copied from CRS/ATEX 31-2T-2 at the user’s request; no separate CRH datasheet was supplied. Product-specific construction and temperature claims are not inferred.'
    },
    {
      ...cloneBase(),
      key:'VITLO-CRH-ATEX|CRH/ATEX 31-2T-2',
      configurationId:'CRH/ATEX 31-2T-2',
      display:'CRH/ATEX 31-2T-2 (4400 m³/h)',
      model:'CRH/ATEX 31-2T-2',
      family:'CRH/ATEX',
      series:'CRH/ATEX',
      productCode:'CRH31-2T-2-ATEX',
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
      sourceNote:'Performance, motor and dimension values are copied from CRS/ATEX 31-2T-2 at the user’s request; no separate CRH/ATEX datasheet was supplied. Exact ATEX marking, construction and temperature limits are intentionally not asserted.'
    }
  ];

  window.models.push(...rows);
})();

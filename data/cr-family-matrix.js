(function(){
  'use strict';
  if(window.__VensisCRFamilyMatrixApplied)return;
  window.__VensisCRFamilyMatrixApplied=true;
  window.models=Array.isArray(window.models)?window.models:[];

  const specs={
    'CRS':{
      atex:false,image:'assets/products/CRS.webp',fanType:'Radyal',mountType:'Salyangoz',productGroup:'Radyal fan',
      fanTypeEn:'Radial',mountTypeEn:'Centrifugal',productGroupEn:'Radial Fan',
      categories:['Radial Fan','Centrifugal Fan'],tags:['Radyal','Salyangoz'],tagsEn:['Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Centrifugal Single Inlet Fan'
    },
    'CRS/ATEX':{
      atex:true,image:'assets/products/CRS-ATEX.webp',fanType:'Radyal',mountType:'Salyangoz',productGroup:'Ex-proof fan',
      fanTypeEn:'Radial',mountTypeEn:'Centrifugal',productGroupEn:'Explosion-Proof Fan',
      categories:['Explosion-Proof / ATEX Fan','Radial Fan','Centrifugal Fan'],tags:['Exproof / ATEX','Radyal','Salyangoz'],tagsEn:['Explosion-Proof / ATEX Fan','Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Centrifugal Single Inlet Ex-proof Fan'
    },
    'CRK':{
      atex:false,image:'assets/products/CRK.webp',fanType:'Radyal',mountType:'Hücreli',productGroup:'Hücre tipi fan',
      fanTypeEn:'Radial',mountTypeEn:'Cabinet',productGroupEn:'Centrifugal Cell Fan',
      categories:['Cabinet Fan','Radial Fan','Centrifugal Fan'],tags:['Hücreli','Radyal','Santrifüj'],tagsEn:['Cabinet Fan','Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Centrifugal Single Inlet Cell Type Fan'
    },
    'CRK/ATEX':{
      atex:true,image:'assets/products/CRK.webp',fanType:'Radyal',mountType:'Hücreli',productGroup:'Ex-proof hücre fanı',
      fanTypeEn:'Radial',mountTypeEn:'Cabinet',productGroupEn:'Explosion-Proof Centrifugal Cell Fan',
      categories:['Explosion-Proof / ATEX Fan','Cabinet Fan','Radial Fan','Centrifugal Fan'],tags:['Exproof / ATEX','Hücreli','Radyal','Santrifüj'],tagsEn:['Explosion-Proof / ATEX Fan','Cabinet Fan','Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Centrifugal Single Inlet Cell Type Ex-proof Fan',
      catalogueInfo:{
        general:[
          'CRK/ATEX is represented as the explosion-proof cell-type variant of the CR centrifugal family.',
          'Motor and performance data are inherited only from equivalent CR-family motor profiles.',
          'Exact ATEX marking, construction-specific dimensions and price must be confirmed separately.'
        ],
        motor:[],
        applications:['Explosive area ventilation','Industrial warehouse ventilation','Industrial kitchen hood exhaust systems','Petrochemical plants']
      }
    },
    'CRD':{
      atex:false,image:'assets/products/CRD.webp',fanType:'Radyal',mountType:'Kanal tipi',productGroup:'Kanal tipi fan',
      fanTypeEn:'Radial',mountTypeEn:'Duct',productGroupEn:'Centrifugal Duct Fan',
      categories:['Duct Fan','Radial Fan','Centrifugal Fan'],tags:['Kanal Tipi','Radyal','Santrifüj'],tagsEn:['Duct Fan','Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Centrifugal Rectangular Duct Type Fan'
    },
    'CRD/ATEX':{
      atex:true,image:'assets/products/CRD-ATEX.webp',fanType:'Radyal',mountType:'Kanal tipi',productGroup:'Ex-proof kanal fanı',
      fanTypeEn:'Radial',mountTypeEn:'Duct',productGroupEn:'Explosion-Proof Centrifugal Duct Fan',
      categories:['Explosion-Proof / ATEX Fan','Duct Fan','Radial Fan','Centrifugal Fan'],tags:['Exproof / ATEX','Kanal Tipi','Radyal','Santrifüj'],tagsEn:['Explosion-Proof / ATEX Fan','Duct Fan','Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Centrifugal Duct Type Ex-proof Fan'
    },
    'CRH':{
      atex:false,image:'assets/products/CRH.webp',fanType:'Radyal',mountType:'Çatı tipi',productGroup:'Santrifüj çatı fanı',
      fanTypeEn:'Radial',mountTypeEn:'Roof',productGroupEn:'Centrifugal Roof Fan',
      categories:['Roof Fan','Radial Fan','Centrifugal Fan'],tags:['Çatı Fanı','Radyal','Santrifüj'],tagsEn:['Roof Fan','Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Horizontal Outlet Centrifugal Roof Type Fan'
    },
    'CRH/ATEX':{
      atex:true,image:'assets/products/CRH-ATEX.webp',fanType:'Radyal',mountType:'Çatı tipi',productGroup:'Ex-proof çatı fanı',
      fanTypeEn:'Radial',mountTypeEn:'Roof',productGroupEn:'Explosion-Proof Centrifugal Roof Fan',
      categories:['Explosion-Proof / ATEX Fan','Roof Fan','Radial Fan','Centrifugal Fan'],tags:['Exproof / ATEX','Çatı Fanı','Radyal','Santrifüj'],tagsEn:['Explosion-Proof / ATEX Fan','Roof Fan','Radial Fan','Centrifugal Fan'],
      catalogNameEn:'Centrifugal Roof Type Ex-proof Fan'
    }
  };

  const targetSeries=Object.keys(specs);
  const targetSet=new Set(targetSeries);
  const deepClone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const text=value=>String(value??'').trim();

  function modelIdentity(row){
    const model=text(row?.model||row?.display||row?.configurationId);
    const match=model.match(/(?:^|\s)(\d+)\s*-\s*([24])T(?:\s*-\s*([0-9.,]+))?/i);
    if(!match)return null;
    const size=Number(match[1]);
    const pole=Number(match[2]);
    const kw=finite(row?.kw);
    if(!size||!kw||(pole!==2&&pole!==4))return null;
    const kwKey=String(Math.round(kw*10000)/10000);
    return {key:`${size}|${pole}|${kwKey}`,size,pole,kw};
  }

  function curvePointCount(row){
    let count=0;
    if(Array.isArray(row?.sourcePoints))count+=row.sourcePoints.length;
    if(Array.isArray(row?.points))count+=row.points.length;
    for(const curve of Array.isArray(row?.curves)?row.curves:[])count+=Array.isArray(curve?.sourcePoints)?curve.sourcePoints.length:0;
    for(const curve of Array.isArray(row?.performanceCurves)?row.performanceCurves:[])count+=Array.isArray(curve?.sourcePoints)?curve.sourcePoints.length:0;
    return count;
  }

  function richness(row,targetAtex){
    let score=(Boolean(row?.atex)===targetAtex)?10000:0;
    if(row?.curveVerification)score+=1200;
    if(row?.sourceCatalogue)score+=900;
    if(Array.isArray(row?.operatingPoints)&&row.operatingPoints.length)score+=700;
    score+=Math.min(500,curvePointCount(row)*10);
    if(finite(row?.nominal))score+=200;
    if(finite(row?.amps))score+=120;
    if(finite(row?.spl))score+=100;
    if(finite(row?.efficiencyPct))score+=80;
    if(row?.motorFrameSize)score+=60;
    return score;
  }

  function tailFor(row){
    const model=text(row?.model||row?.configurationId||row?.display);
    const series=text(row?.series);
    if(series&&model.toUpperCase().startsWith(series.toUpperCase()+' '))return model.slice(series.length).trim();
    const match=model.match(/(\d+\s*-\s*[24]T(?:\s*-\s*[0-9.,]+)?)/i);
    return match?match[1].replace(/\s+/g,''):model;
  }

  function safeProductCode(series,tail){
    const prefix=series.replace('/ATEX','').replace(/[^A-Z0-9]/gi,'');
    const suffix=String(tail).replace(/[^A-Z0-9.,-]/gi,'');
    return `${prefix}${suffix}${series.endsWith('/ATEX')?'-ATEX':''}`;
  }

  function catalogueInfoFor(target,source){
    if(specs[target]?.catalogueInfo)return deepClone(specs[target].catalogueInfo);
    const existing=window.models.find(row=>row?.series===target&&row?.catalogueInfo);
    if(existing?.catalogueInfo)return deepClone(existing.catalogueInfo);
    return {general:[],motor:[],applications:[]};
  }

  const rows=window.models.filter(row=>targetSet.has(text(row?.series))&&modelIdentity(row));
  const profiles=new Map();
  const existing=new Set();

  for(const row of rows){
    const identity=modelIdentity(row);
    if(!identity)continue;
    existing.add(`${row.series}|${identity.key}`);
    if(!profiles.has(identity.key))profiles.set(identity.key,{identity,candidates:[]});
    profiles.get(identity.key).candidates.push(row);
  }

  const added=[];
  for(const {identity,candidates} of profiles.values()){
    for(const target of targetSeries){
      if(existing.has(`${target}|${identity.key}`))continue;
      const spec=specs[target];
      const sorted=[...candidates].sort((a,b)=>richness(b,spec.atex)-richness(a,spec.atex));
      const source=sorted[0];
      if(!source)continue;
      const sameAtex=Boolean(source?.atex)===spec.atex;
      const tail=tailFor(source);
      const model=`${target} ${tail}`.replace(/\s+/g,' ').trim();
      const derived=deepClone(source)||{};

      delete derived.price;
      delete derived.pricing;
      delete derived.priceCurrency;
      delete derived.catalogPdf;
      delete derived.dimensionImage;
      delete derived.dimension_image_path;
      delete derived.dimensionImagePath;
      delete derived.dimensions;
      delete derived.dimensions_mm;
      delete derived.atexProtection;
      delete derived.atexMarking;
      delete derived.temperatureRange;
      delete derived.operatingTemperatureMinC;
      delete derived.operatingTemperatureMaxC;
      if(!sameAtex)delete derived.ipClass;

      Object.assign(derived,{
        key:`MATRIX-${target}|${model}`,
        configurationId:model,
        display:`${model} (${finite(source.nominal)} m³/h)`,
        model,
        brand:'Vitlo',
        manufacturer:'Vitlo',
        family:target,
        series:target,
        seriesCode:target,
        productCode:safeProductCode(target,tail),
        fanType:spec.fanType,
        mountType:spec.mountType,
        productGroup:spec.productGroup,
        fanTypeEn:spec.fanTypeEn,
        mountTypeEn:spec.mountTypeEn,
        productGroupEn:spec.productGroupEn,
        categories:[...spec.categories],
        tags:[...spec.tags],
        tagsEn:[...spec.tagsEn],
        catalogNameEn:spec.catalogNameEn,
        image:spec.image,
        atex:spec.atex,
        pole:identity.pole,
        poles:identity.pole,
        catalogueInfo:catalogueInfoFor(target,source),
        matrixDerived:true,
        matrixProfile:identity.key,
        derivedFromModel:text(source.model),
        derivedFromSeries:text(source.series),
        sourceNote:`Matrix-derived from ${text(source.model)} using the confirmed CR-family equivalence rule. Performance, motor and curve data are inherited; price, construction-specific dimensions and exact ATEX marking are not inferred.`
      });

      window.models.push(derived);
      added.push(derived);
      existing.add(`${target}|${identity.key}`);
    }
  }

  const profileRows=[];
  for(const {identity} of profiles.values()){
    const row={profile:identity.key,size:identity.size,poles:identity.pole,motorPowerKw:identity.kw};
    for(const series of targetSeries)row[series]=existing.has(`${series}|${identity.key}`);
    profileRows.push(row);
  }
  profileRows.sort((a,b)=>a.poles-b.poles||a.size-b.size||a.motorPowerKw-b.motorPowerKw);

  window.VensisCRFamilyMatrixReport={
    series:[...targetSeries],
    profiles:profileRows,
    profileCount:profileRows.length,
    addedCount:added.length,
    addedModels:added.map(row=>row.model),
    generatedAt:new Date().toISOString()
  };
})();

(function(){
  const names={
    'TUNEL-AXF':'Tunnel Type Axial Fan','MOB-AXD/ATEX':'Axial Mobile Ex-proof Fan','BOX-AXF':'Axial Cell Type Smoke Extract Fans','ROOF-AXF':'Axial Roof Type Smoke Extract Fans','AXD/ATEX':'Axial Duct Type Ex-proof Fan','AXW/ATEX':'Axial Wall Type Ex-proof Fans','AXR/ATEX':'Axial Roof Type Ex-proof Fan','CRH/ATEX':'Centrifugal Roof Type Ex-proof Fan','CRD/ATEX':'Centrifugal Duct Type Ex-proof Fan','CRS/ATEX':'Centrifugal Single Inlet Ex-proof Fan','AXD/MOB':'Mobile Axial Fan','CRU-EC':'Vertical Outlet Centrifugal Roof Type Fan','CRB-EC':'Centrifugal Rectangular Duct Type Fan','CRC-EC':'Centrifugal Cell Type Fan','CR-EC':'Horizontal Outlet Centrifugal Roof Type Fan','AXF':'Axial Duct Type Smoke Extract Fans','AXJ':'Axial Jet Fan','RXJ':'Radial Jet Fans','AXD':'Axial Duct Type Fan','AXS':'Axial Short Case Fan','AXW':'Axial Wall Type Fan','AXB':'Bifurcated Axial Duct Type Fan','AXH':'Axial Cell Type Fans','AXR':'Horizontal Outlet Axial Roof Type Fan','AXV':'Vertical Outlet Axial Roof Type Fan','CRB':'Centrifugal Rectangular Duct Type Fan','CRD':'Centrifugal Rectangular Duct Type Fan','CRK':'Centrifugal Single Inlet Cell Type Fan','CRC':'Centrifugal Cell Type Fan','CRS':'Centrifugal Single Inlet Fan','CRH':'Horizontal Outlet Centrifugal Roof Type Fan','CRV':'Vertical Outlet Centrifugal Roof Type Fan','CRU':'Vertical Outlet Centrifugal Roof Type Fan','CRR':'Duct Type Shelter Fan','VHR':'Heat Recovery Units','CD':'Centrifugal Duct Type Fan','CR':'Horizontal Outlet Centrifugal Roof Fan'
  };
  const aliases={'MOB-AXD':'AXD/MOB','AXD-MOB':'AXD/MOB','AXD/MOB':'AXD/MOB'};
  const files={};
  Object.keys(names).forEach(code=>files[code]=code.replaceAll('/','-')+'.webp');
  Object.assign(files,{'TUNEL-AXF':'TUNEL-AXF.webp','MOB-AXD/ATEX':'MOB-AXD-ATEX.webp','BOX-AXF':'BOX-AXF.webp','ROOF-AXF':'ROOF-AXF.webp','AXD/MOB':'MOB-AXD.webp'});
  const keys=[...new Set([...Object.keys(names),...Object.keys(aliases)])].sort((a,b)=>b.length-a.length);
  const rawModels=Array.isArray(window.models)?window.models:[];
  const seriesRecords=new Map();
  const modelRecords=new Map();

  function normalize(value){return String(value||'').toUpperCase().replace(/\\/g,'/').replace(/\s+/g,' ').trim()}
  function seriesCode(value){
    const text=normalize(value);
    const found=keys.find(key=>text===key||text.startsWith(key+' ')||text.startsWith(key+'-')||text.includes(' '+key+' '));
    return aliases[found]||found||'';
  }
  function normalizeModel(value,code){
    let model=String(value||'').trim();
    if(code==='AXD/MOB')model=model.replace(/^MOB-AXD(?=\s|-)/i,'AXD/MOB').replace(/^AXD-MOB(?=\s|-)/i,'AXD/MOB');
    return model;
  }
  function imageFor(code){return code&&files[code]?'assets/products/'+files[code]:''}

  function ensureSeries(row,code){
    if(seriesRecords.has(code))return seriesRecords.get(code);
    const info=row?.catalogueInfo||{};
    const categories=[...(row?.categories||row?.tagsEn||row?.tags||[])];
    const record={
      id:code,
      code,
      manufacturer:row?.manufacturer||row?.brand||'Vitlo',
      categories,
      title:names[code]||row?.catalogNameEn||row?.series||code,
      media:{image:imageFor(code),gallery:[]},
      catalogue:{pdf:row?.catalogPdf||'',page:row?.sourcePage||''},
      description:{general:info.general||[],motor:info.motor||[],applications:info.applications||[]},
      modelIds:[]
    };
    seriesRecords.set(code,record);
    return record;
  }

  function modelFromRow(row){
    const code=seriesCode(row?.series||row?.model);
    const model=normalizeModel(row?.model||row?.display||'',code);
    const series=ensureSeries(row,code);
    const id=String(row?.key||model);
    const record={
      id,
      seriesId:code,
      model,
      display:row?.display||model,
      pole:Number(row?.pole)||0,
      pricing:{listPrice:Number.isFinite(Number(row?.price))?Number(row.price):null,currency:'EUR'},
      motor:{power:Number(row?.kw)||0,speed:Number(row?.rpm)||0,current:Number(row?.amps)||0,voltage:row?.voltage||'',frequency:row?.frequency||'',sound:Number(row?.spl)||0},
      technical:{
        weight:Number(row?.weight)||0,
        ipClass:row?.ipClass||'',
        insulationClass:row?.insulationClass||'',
        efficiencyClass:row?.efficiencyClass||'',
        fireRating:row?.fire||'',
        fanType:row?.fanTypeEn||row?.fanType||'',
        mountType:row?.mountTypeEn||row?.mountType||'',
        productGroup:row?.productGroupEn||row?.productGroup||''
      },
      performance:{nominalAirflow:Number(row?.nominal)||0,points:row?.points||[],sourcePoints:row?.sourcePoints||row?.points||[]},
      source:{page:row?.sourcePage||''}
    };
    modelRecords.set(id,record);
    if(!series.modelIds.includes(id))series.modelIds.push(id);
  }

  rawModels.forEach(modelFromRow);
  delete window.models;

  function productView(model){
    if(!model)return null;
    const series=seriesRecords.get(model.seriesId)||{};
    return {
      id:model.id,key:model.id,model:model.model,display:model.display,
      series:{id:series.id||model.seriesId,code:series.code||model.seriesId,title:series.title||model.seriesId,manufacturer:series.manufacturer||'Vitlo',categories:series.categories||[]},
      media:series.media||{image:'',gallery:[]},catalogue:series.catalogue||{},
      description:series.description||{general:[],motor:[],applications:[]},
      pricing:model.pricing,motor:model.motor,technical:model.technical,performance:model.performance,source:model.source
    };
  }

  window.VensisCatalog={
    series:[...seriesRecords.values()],
    models:[...modelRecords.values()],
    getSeries:id=>seriesRecords.get(String(id||''))||null,
    getModel:id=>modelRecords.get(String(id||''))||null,
    product:id=>productView(modelRecords.get(String(id||''))),
    modelsForSeries:id=>(seriesRecords.get(String(id||''))?.modelIds||[]).map(modelId=>modelRecords.get(modelId)).filter(Boolean)
  };
  window.VensisProducts={
    get:key=>productView(modelRecords.get(String(key||''))),
    fromResult:result=>productView(modelRecords.get(String(result?.key||result?.id||''))),
    seriesCode,
    seriesName:value=>names[seriesCode(value)]||'',
    image:value=>imageFor(seriesCode(value)),
    count:()=>modelRecords.size,
    seriesCount:()=>seriesRecords.size
  };
})();

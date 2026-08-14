(function(){
  const names={
    'HEATMASTER F400':'HEATMASTER F400 Smoke-Extract Centrifugal Roof Fans','SLIMROOF ES':'SLIMROOF ES EC Centrifugal Roof Fans','E-ATEX':'E-ATEX Explosion-Protected Axial Plate Fans','TIRACAMINO':'Tiracamino Chimney-Top Extract Fan',
    'VORT QBK SAL-KC EVO':'VORT QBK SAL-KC EVO Cabinet Centrifugal Fans',
    'VORT QUADRO EVO':'VORT QUADRO EVO Residential Centrifugal Extract Fans','VORT QUADRO I':'VORT QUADRO I Flush-Mounted Centrifugal Duct Fans','VORT QUADRO':'VORT QUADRO Centrifugal Duct Fans',
    'VORTICE VARIO I':'VORTICE VARIO I Flush-Mounted Axial Fans','VORTICE VARIO':'VORTICE VARIO Wall / Window Axial Fans',
    'PUNTO EVO FLEXO':'PUNTO EVO FLEXO Wall Axial Fans','PUNTO EVO GOLD':'PUNTO EVO GOLD Decorative Wall Axial Fans','PUNTO EVO ES':'PUNTO EVO ES EC Energy-Saving Wall Axial Fans','PUNTO EVO':'PUNTO EVO Two-Speed Wall Axial Fans',
    'PUNTO GHOST':'PUNTO GHOST Axial Duct Fans','PUNTO FOUR':'PUNTO FOUR Wall Axial Fans','PUNTO FILO':'PUNTO FILO Low-Profile Wall Axial Fans','PUNTO':'PUNTO Wall / Window Axial Fans',
    'CA MD EXTRA EU':'CA MD Extra EU In-Line Mixed-Flow Duct Fans','CA MD E RF':'CA MD E RF Roof-Mounted Mixed-Flow Exhaust Fans','CA MD':'CA MD In-Line Mixed-Flow Duct Fans',
    'LINEO QUIET ES':'LINEO QUIET ES Low-Noise In-Line EC Mixed-Flow Fans','LINEO QUIET':'LINEO QUIET Low-Noise In-Line Mixed-Flow Fans','LINEO ES':'LINEO ES In-Line EC Mixed-Flow Fans','LINEO':'LINEO In-Line Mixed-Flow Fans','TUNEL-AXF':'Tunnel Type Axial Fan','MOB-AXD/ATEX':'Axial Mobile Ex-proof Fan','BOX-AXF':'Axial Cell Type Smoke Extract Fans','ROOF-AXF':'Axial Roof Type Smoke Extract Fans','AXD/ATEX':'Axial Duct Type Ex-proof Fan','AXW/ATEX':'Axial Wall Type Ex-proof Fans','AXR/ATEX':'Axial Roof Type Ex-proof Fan','CRH/ATEX':'Centrifugal Roof Type Ex-proof Fan','CRD/ATEX':'Centrifugal Duct Type Ex-proof Fan','CRS/ATEX':'Centrifugal Single Inlet Ex-proof Fan','AXD/MOB':'Mobile Axial Fan','CRU-EC':'Vertical Outlet Centrifugal Roof Type Fan','CRB-EC':'Centrifugal Rectangular Duct Type Fan','CRC-EC':'Centrifugal Cell Type Fan','CR-EC':'Horizontal Outlet Centrifugal Roof Type Fan','AXF':'Axial Duct Type Smoke Extract Fans','AXJ':'Axial Jet Fan','RXJ':'Radial Jet Fans','AXD':'Axial Duct Type Fan','AXS':'Axial Short Case Fan','AXW':'Axial Wall Type Fan','AXB':'Bifurcated Axial Duct Type Fan','AXH':'Axial Cell Type Fans','AXR':'Horizontal Outlet Axial Roof Type Fan','AXV':'Vertical Outlet Axial Roof Type Fan','CRB':'Centrifugal Rectangular Duct Type Fan','CRD':'Centrifugal Rectangular Duct Type Fan','CRK':'Centrifugal Single Inlet Cell Type Fan','CRC':'Centrifugal Cell Type Fan','CRS':'Centrifugal Single Inlet Fan','CRH':'Horizontal Outlet Centrifugal Roof Type Fan','CRV':'Vertical Outlet Centrifugal Roof Type Fan','CRU':'Vertical Outlet Centrifugal Roof Type Fan','CRR':'Duct Type Shelter Fan','VHR':'Heat Recovery Units','CD':'Centrifugal Duct Type Fan','CR':'Horizontal Outlet Centrifugal Roof Fan'
  };
  const aliases={'MOB-AXD':'AXD/MOB','AXD-MOB':'AXD/MOB','AXD/MOB':'AXD/MOB'};
  const files={};
  Object.keys(names).forEach(code=>files[code]=code.replaceAll('/','-')+'.webp');
  Object.assign(files,{'TUNEL-AXF':'TUNEL-AXF.webp','MOB-AXD/ATEX':'MOB-AXD-ATEX.webp','BOX-AXF':'BOX-AXF.webp','ROOF-AXF':'ROOF-AXF.webp','AXD/MOB':'MOB-AXD.webp'});
  const keys=[...new Set([...Object.keys(names),...Object.keys(aliases)])].sort((a,b)=>b.length-a.length);
  const rawModels=Array.isArray(window.models)?window.models:[];
  const seriesOverrides=window.VensisSeriesOverrides&&typeof window.VensisSeriesOverrides==='object'?window.VensisSeriesOverrides:{};
  const vorticePriceList=window.VensisVorticePriceList2026_1&&typeof window.VensisVorticePriceList2026_1==='object'
    ? window.VensisVorticePriceList2026_1
    : null;
  const vorticePrices=new Map();
  for(const entry of vorticePriceList?.entries||[]){
    const key=String(entry?.productKey||'');
    if(key&&!vorticePrices.has(key))vorticePrices.set(key,entry);
  }
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
  function finite(value){const number=Number(value);return Number.isFinite(number)?number:0}
  function pricingFor(row){
    if(Object.prototype.hasOwnProperty.call(row||{},'price')){
      const explicit=Number(row.price);
      return {listPrice:Number.isFinite(explicit)?explicit:null,currency:'EUR'};
    }
    const entry=vorticePrices.get(String(row?.key||''));
    const exactMatch=entry
      &&String(row?.brand||row?.manufacturer||'').toUpperCase()==='VORTICE'
      &&String(entry.series||'')===String(row?.series||'')
      &&String(entry.productCode||'')===String(row?.productCode||'');
    const listPrice=exactMatch?Number(entry.listPrice):NaN;
    return {
      listPrice:Number.isFinite(listPrice)?listPrice:null,
      currency:String(vorticePriceList?.currency||'EUR'),
      catalogue:exactMatch?String(vorticePriceList?.catalog||''):'',
      sourcePage:exactMatch?Number(entry.sourcePage)||null:null
    };
  }
  function normalizedPoints(points){
    const result=[];
    let previousKey='';
    for(const point of points||[]){
      const pressure=Array.isArray(point)?Number(point[0]):Number(point?.p_pa??point?.pressure??point?.p);
      const airflow=Array.isArray(point)?Number(point[1]):Number(point?.q_m3h??point?.airflow??point?.q);
      const key=`${pressure}|${airflow}`;
      if(Number.isFinite(pressure)&&Number.isFinite(airflow)&&key!==previousKey){
        result.push([pressure,airflow]);
        previousKey=key;
      }
    }
    // Preserve catalogue path order. Real fan curves can contain a stall-region
    // pressure rise or return to an earlier coordinate. Only consecutive duplicate
    // vertices are redundant; global de-duplication would break a closed path.
    return result;
  }
  function normalizedCurves(row){
    const raw=row?.performanceCurves??row?.curves;
    const curves=Array.isArray(raw)
      ? raw
      : raw&&typeof raw==='object'
        ? Object.entries(raw).map(([control,curve])=>({control,...curve}))
        : [];
    return curves.map((curve,index)=>({
      control:String(curve?.control||curve?.label||`Curve ${index+1}`),
      sourcePage:curve?.sourcePage??curve?.source_page??row?.sourcePage??'',
      interpolation:String(curve?.interpolation||row?.curveInterpolation||'').toLowerCase(),
      precomputed:Boolean(curve?.precomputed),
      sourcePoints:normalizedPoints(curve?.sourcePoints||curve?.points||[])
    })).filter(curve=>curve.sourcePoints.length);
  }
  function normalizedOperatingPoints(row){
    const source=Array.isArray(row?.operatingPoints)?row.operatingPoints:Array.isArray(row?.operating_points)?row.operating_points:[];
    return source.map(point=>({
      control:String(point?.control||''),
      power:finite(point?.powerKw??point?.power_kw??finite(point?.powerW??point?.power_w)/1000),
      speed:finite(point?.rpm??point?.speed),
      current:finite(point?.currentA??point?.current_a??point?.current),
      nominalAirflow:finite(point?.maxAirflowM3h??point?.max_airflow_m3h??point?.nominalAirflow),
      maxPressure:finite(point?.maxPressurePa??point?.max_pressure_pa??point?.maxPressure),
      sound:point?.soundPressureDbA3m==null&&point?.sound_pressure_db_a_3m==null&&point?.sound==null
        ? null
        : finite(point?.soundPressureDbA3m??point?.sound_pressure_db_a_3m??point?.sound)
    }));
  }

  function ensureSeries(row,code){
    if(seriesRecords.has(code))return seriesRecords.get(code);
    const info=row?.catalogueInfo||{};
    const override=seriesOverrides[code]&&typeof seriesOverrides[code]==='object'?seriesOverrides[code]:{};
    const descriptionOverride=override.description&&typeof override.description==='object'?override.description:{};
    const categories=Array.isArray(override.categories)
      ? [...override.categories]
      : [...(row?.categories||row?.tagsEn||row?.tags||[])];
    const record={
      id:code,
      code:override.code||code,
      manufacturer:override.manufacturer||row?.manufacturer||row?.brand||'Vitlo',
      categories,
      title:override.title||names[code]||row?.catalogNameEn||row?.series||code,
      media:{image:override.image||row?.image||row?.imagePath||row?.image_path||imageFor(code),gallery:[]},
      catalogue:{pdf:row?.catalogPdf||'',page:row?.sourcePage||''},
      description:{
        general:Array.isArray(descriptionOverride.general)?descriptionOverride.general:(info.general||[]),
        motor:Array.isArray(descriptionOverride.motor)?descriptionOverride.motor:(info.motor||[]),
        applications:Array.isArray(descriptionOverride.applications)?descriptionOverride.applications:(info.applications||[])
      },
      modelIds:[]
    };
    seriesRecords.set(code,record);
    return record;
  }

  function modelFromRow(row){
    const code=seriesCode(row?.series||row?.model);
    const model=normalizeModel(row?.model||row?.display||'',code);
    const series=ensureSeries(row,code);
    const override=seriesOverrides[code]&&typeof seriesOverrides[code]==='object'?seriesOverrides[code]:{};
    const id=String(row?.key||model);
    const curves=normalizedCurves(row);
    const operatingPoints=normalizedOperatingPoints(row);
    const primaryCurve=curves.at(-1)||null;
    const primaryOperating=operatingPoints.find(point=>point.control===primaryCurve?.control)||operatingPoints.at(-1)||null;
    const sourcePoints=normalizedPoints(row?.sourcePoints||row?.points||primaryCurve?.sourcePoints||[]);
    const rowPoints=normalizedPoints(row?.points||[]);
    const readyPoints=primaryCurve?.precomputed?sourcePoints:rowPoints;
    const record={
      id,
      seriesId:code,
      model,
      display:row?.display||model,
      catalogOnly:Boolean(row?.catalogOnly),
      pole:Number(row?.pole)||0,
      pricing:pricingFor(row),
      media:{image:override.useSeriesImageForModels?series.media?.image||'':row?.image||row?.imagePath||row?.image_path||series.media?.image||'',dimensionImage:row?.dimensionImage||row?.dimension_image_path||'',gallery:[]},
      motor:{power:Number(row?.kw)||primaryOperating?.power||0,speed:Number(row?.rpm)||primaryOperating?.speed||0,current:Number(row?.amps)||primaryOperating?.current||0,voltage:row?.voltage||'',frequency:row?.frequency||'',sound:Number(row?.spl??primaryOperating?.sound)||0},
      technical:{
        weight:Number(row?.weight)||0,
        ipClass:row?.ipClass||'',
        insulationClass:row?.insulationClass||'',
        efficiencyClass:row?.efficiencyClass||'',
        fireRating:row?.fire||'',
        fanType:row?.fanTypeEn||row?.fanType||'',
        mountType:row?.mountTypeEn||row?.mountType||'',
        productGroup:row?.productGroupEn||row?.productGroup||'',
        productCode:row?.productCode||row?.code||'',
        nominalDuctMm:Number(row?.nominalDuctMm??row?.nominal_duct_mm)||0,
        maxAmbientC:Number(row?.maxAmbientC??row?.max_ambient_c)||0,
        dimensions:row?.dimensions||row?.dimensions_mm||{},
        motorType:row?.motorType||row?.motor_type||'',
        quietCasing:Boolean(row?.quietCasing??row?.quiet_casing),
        timerVariant:Boolean(row?.timerVariant??row?.timer_variant),
        humiditySensor:Boolean(row?.humiditySensor??row?.humidity_sensor),
        presenceSensor:Boolean(row?.presenceSensor??row?.presence_sensor),
        longLife:Boolean(row?.longLife??row?.long_life),
        reversible:Boolean(row?.reversible),
        availabilityRegion:row?.availabilityRegion||row?.availability_region||'',
        operatingTemperatureMinC:finite(row?.operatingTemperatureMinC??row?.operating_temperature_c?.min),
        operatingTemperatureMaxC:finite(row?.operatingTemperatureMaxC??row?.operating_temperature_c?.max),
        continuousAirTemperatureC:finite(row?.continuousAirTemperatureC??row?.air_temperature_continuous_c),
        smokeTemperatureC:finite(row?.smokeTemperatureC??row?.smoke_temperature_c),
        smokeDurationMinutes:finite(row?.smokeDurationMinutes??row?.smoke_duration_minutes),
        approximateContinuousAirTemperatureC:finite(row?.approximateContinuousAirTemperatureC??row?.approx_continuous_air_temperature_c),
        impellerMm:row?.impellerMm||row?.impeller_mm||'',
        phase:row?.phase||'',
        poles:finite(row?.poles),
        inletDiameterMm:finite(row?.inletDiameterMm??row?.inlet_diameter_mm),
        speedControllerIncluded:row?.speedControllerIncluded||row?.speed_controller_included||'',
        gasFireCompatible:row?.gasFireCompatible??row?.gas_fire_compatible??null,
        atex:row?.atex&&typeof row.atex==='object'?row.atex:null,
        safetyWarning:row?.safetyWarning||row?.safety_warning||''
      },
      performance:{
        nominalAirflow:Number(row?.nominal)||primaryOperating?.nominalAirflow||0,
        points:readyPoints,
        sourcePoints,
        curves,
        control:primaryCurve?.control||'',
        controls:curves.map(curve=>curve.control),
        operatingPoints,
        interpolation:primaryCurve?.interpolation||row?.curveInterpolation||'',
        precomputed:Boolean(primaryCurve?.precomputed)
      },
      source:{page:row?.sourcePage||primaryCurve?.sourcePage||'',catalogue:row?.sourceCatalogue||row?.source_catalogue||''}
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
      catalogOnly:Boolean(model.catalogOnly),
      series:{id:series.id||model.seriesId,code:series.code||model.seriesId,title:series.title||model.seriesId,manufacturer:series.manufacturer||'Vitlo',categories:series.categories||[]},
      media:model.media?.image?model.media:(series.media||{image:'',gallery:[]}),catalogue:series.catalogue||{},
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
    fromResult:result=>productView(modelRecords.get(String(result?.productKey||result?.key||result?.id||''))),
    seriesCode,
    seriesName:value=>seriesRecords.get(seriesCode(value))?.title||'',
    image:value=>seriesRecords.get(seriesCode(value))?.media?.image||'',
    count:()=>modelRecords.size,
    seriesCount:()=>seriesRecords.size
  };
})();

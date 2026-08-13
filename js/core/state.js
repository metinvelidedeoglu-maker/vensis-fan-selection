(function(){
  const U=window.VensisUtils;
  const catalog=window.VensisCatalog;

  if(!catalog?.models?.length){
    throw new Error('VensisCatalog is empty or unavailable.');
  }

  function operatingPointFor(model,curve){
    const points=model.performance?.operatingPoints||[];
    return points.find(point=>String(point.control)===String(curve?.control))||null;
  }

  function toSelectionModel(model,curve=null){
    const series=catalog.getSeries(model.seriesId)||{};
    const performance=model.performance||{};
    const operatingPoint=operatingPointFor(model,curve);
    const sourcePoints=(curve?.sourcePoints||performance.sourcePoints||performance.points||[])
      .map(([pressure,flow])=>[Number(pressure),Number(flow)]);
    const control=String(curve?.control||performance.control||'');
    const precomputed=Boolean(curve?.precomputed||(!curve&&performance.precomputed));
    const readyPoints=precomputed?sourcePoints:(performance.points?.length?[...performance.points]:null);

    return {
      id:curve?`${model.id}|control:${control}`:model.id,
      key:model.id,
      productKey:model.id,
      model:model.model,
      display:control&&control.toLowerCase()!=='nominal'?`${model.model} — ${control}`:(model.display||model.model),
      control,
      catalogOnly:Boolean(model.catalogOnly),
      manufacturer:series.manufacturer||'Vitlo',
      categories:[...(series.categories||[])],
      series:series.code||model.seriesId,
      seriesTitle:series.title||series.code||model.seriesId,
      image:model.media?.image||series.media?.image||'',
      price:model.pricing?.listPrice,
      pole:Number(model.pole)||0,
      kw:Number(operatingPoint?.power??model.motor?.power)||0,
      rpm:Number(operatingPoint?.speed??model.motor?.speed)||0,
      amps:Number(operatingPoint?.current??model.motor?.current)||0,
      voltage:model.motor?.voltage||'',
      frequency:model.motor?.frequency||'',
      spl:operatingPoint?Number(operatingPoint.sound)||0:Number(model.motor?.sound)||0,
      weight:Number(model.technical?.weight)||0,
      ipClass:model.technical?.ipClass||'',
      insulationClass:model.technical?.insulationClass||'',
      efficiencyClass:model.technical?.efficiencyClass||'',
      fireRating:model.technical?.fireRating||'',
      fanType:model.technical?.fanType||'',
      mountType:model.technical?.mountType||'',
      productGroup:model.technical?.productGroup||'',
      hazardousArea:model.technical?.atex||null,
      safetyWarning:model.technical?.safetyWarning||'',
      continuousAirTemperatureC:Number(model.technical?.continuousAirTemperatureC)||0,
      smokeTemperatureC:Number(model.technical?.smokeTemperatureC)||0,
      smokeDurationMinutes:Number(model.technical?.smokeDurationMinutes)||0,
      nominal:Number(operatingPoint?.nominalAirflow??performance.nominalAirflow)||0,
      maxPressure:Number(operatingPoint?.maxPressure)||0,
      sourcePage:curve?.sourcePage||model.source?.page||'',
      interpolation:String(curve?.interpolation||performance.interpolation||'').toLowerCase(),
      precomputed,
      sourcePoints,
      points:readyPoints
    };
  }

  function selectionModelsFor(model){
    const curves=Array.isArray(model.performance?.curves)?model.performance.curves.filter(curve=>curve?.sourcePoints?.length):[];
    return curves.length?curves.map(curve=>toSelectionModel(model,curve)):[toSelectionModel(model)];
  }

  function pointsFor(model){
    if(!model)return [];
    if(Array.isArray(model.points))return model.points;
    const source=Array.isArray(model.sourcePoints)?model.sourcePoints:[];
    if(model.precomputed||model.interpolation==='linear'){
      model.points=source;
      return model.points;
    }
    model.points=U?.densifyPoints?U.densifyPoints(source,201):source;
    return model.points;
  }

  const models=catalog.models.flatMap(selectionModelsFor);
  const manufacturers=[...new Set(models.map(model=>model.manufacturer).filter(Boolean))];
  const categories=[...new Set(models.flatMap(model=>model.categories))];
  const series=[...new Set(models.map(model=>model.series).filter(Boolean))];
  const seriesCounts=new Map();

  for(const model of models){
    if(!seriesCounts.has(model.series))seriesCounts.set(model.series,new Set());
    seriesCounts.get(model.series).add(model.productKey||model.key||model.id);
  }

  window.VensisState={
    models,
    pointsFor,
    indexes:{manufacturers,categories,series,seriesCounts},
    results:[],
    selectedManufacturers:new Set(manufacturers.includes('Vitlo')?['Vitlo']:manufacturers.slice(0,1)),
    selectedCategories:new Set(),
    selectedSeries:new Set(),
    tableSortKey:'closest',
    tableSortDirection:1
  };
})();

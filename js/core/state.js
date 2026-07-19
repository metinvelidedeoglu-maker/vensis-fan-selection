(function(){
  const U=window.VensisUtils;
  const catalog=window.VensisCatalog;

  function selectionModel(model){
    const series=catalog?.getSeries?.(model.seriesId)||{};
    const sourcePoints=(model.performance?.points||model.performance?.sourcePoints||[]).map(([pressure,flow])=>[Number(pressure),Number(flow)]);
    return {
      id:model.id,
      key:model.id,
      model:model.model,
      display:model.display||model.model,
      manufacturer:series.manufacturer||'Vitlo',
      brand:series.manufacturer||'Vitlo',
      categories:[...(series.categories||[])],
      tags:[...(series.categories||[])],
      series:series.code||model.seriesId,
      catalogNameEn:series.title||series.code||model.seriesId,
      catalogueInfo:series.description||{},
      image:series.media?.image||'',
      price:model.pricing?.listPrice,
      kw:Number(model.motor?.power)||0,
      rpm:Number(model.motor?.speed)||0,
      amps:Number(model.motor?.current)||0,
      voltage:model.motor?.voltage||'',
      frequency:model.motor?.frequency||'',
      spl:Number(model.motor?.sound)||0,
      atex:Boolean(model.technical?.atex),
      fire:model.technical?.fireClass||'',
      weight:Number(model.technical?.weight)||0,
      nominal:Number(model.performance?.nominalAirflow)||0,
      sourcePage:model.source?.page||'',
      sourcePoints,
      points:U?.densifyPoints?U.densifyPoints(sourcePoints,201):sourcePoints
    };
  }

  const models=catalog?.models?.length
    ? catalog.models.map(selectionModel)
    : (window.models||[]).map(model=>{
        const sourcePoints=(model.points||[]).map(([pressure,flow])=>[Number(pressure),Number(flow)]);
        return {...model,manufacturer:model.manufacturer||'Vitlo',categories:[...(model.categories||model.tags||[])],sourcePoints,points:U?.densifyPoints?U.densifyPoints(sourcePoints,201):sourcePoints};
      });

  const manufacturers=[...new Set(models.map(model=>model.manufacturer).filter(Boolean))];
  const categories=[...new Set(models.flatMap(model=>model.categories||[]))];
  const series=[...new Set(models.map(model=>model.series).filter(Boolean))];
  const seriesCounts=new Map();
  for(const model of models){
    if(!model.series)continue;
    if(!seriesCounts.has(model.series))seriesCounts.set(model.series,new Set());
    seriesCounts.get(model.series).add(model.key);
  }

  window.models=models;
  window.VensisState={
    models,
    indexes:{manufacturers,categories,series,seriesCounts},
    results:[],
    selectedManufacturers:new Set(manufacturers.includes('Vitlo')?['Vitlo']:manufacturers.slice(0,1)),
    selectedCategories:new Set(),
    selectedSeries:new Set(),
    tableSortKey:'closest',
    tableSortDirection:1
  };
})();
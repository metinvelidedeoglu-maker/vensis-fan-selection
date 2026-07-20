(function(){
  const U=window.VensisUtils;
  const catalog=window.VensisCatalog;

  if(!catalog?.models?.length){
    throw new Error('VensisCatalog is empty or unavailable.');
  }

  function toSelectionModel(model){
    const series=catalog.getSeries(model.seriesId)||{};
    const sourcePoints=(model.performance?.sourcePoints||model.performance?.points||[])
      .map(([pressure,flow])=>[Number(pressure),Number(flow)]);

    return {
      id:model.id,
      key:model.id,
      model:model.model,
      display:model.display||model.model,
      manufacturer:series.manufacturer||'Vitlo',
      categories:[...(series.categories||[])],
      series:series.code||model.seriesId,
      seriesTitle:series.title||series.code||model.seriesId,
      image:series.media?.image||'',
      price:model.pricing?.listPrice,
      kw:Number(model.motor?.power)||0,
      rpm:Number(model.motor?.speed)||0,
      amps:Number(model.motor?.current)||0,
      voltage:model.motor?.voltage||'',
      frequency:model.motor?.frequency||'',
      spl:Number(model.motor?.sound)||0,
      weight:Number(model.technical?.weight)||0,
      ipClass:model.technical?.ipClass||'',
      insulationClass:model.technical?.insulationClass||'',
      efficiencyClass:model.technical?.efficiencyClass||'',
      fireRating:model.technical?.fireRating||'',
      fanType:model.technical?.fanType||'',
      mountType:model.technical?.mountType||'',
      productGroup:model.technical?.productGroup||'',
      nominal:Number(model.performance?.nominalAirflow)||0,
      sourcePage:model.source?.page||'',
      sourcePoints,
      points:U?.densifyPoints?U.densifyPoints(sourcePoints,201):sourcePoints
    };
  }

  const models=catalog.models.map(toSelectionModel);
  const manufacturers=[...new Set(models.map(model=>model.manufacturer).filter(Boolean))];
  const categories=[...new Set(models.flatMap(model=>model.categories))];
  const series=[...new Set(models.map(model=>model.series).filter(Boolean))];
  const seriesCounts=new Map();

  for(const model of models){
    if(!seriesCounts.has(model.series))seriesCounts.set(model.series,new Set());
    seriesCounts.get(model.series).add(model.id);
  }

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

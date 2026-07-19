(function(){
  const U=window.VensisUtils;
  const models=(window.models||[]).map(model=>{
    const sourcePoints=(model.points||[]).map(([pressure,flow])=>[Number(pressure),Number(flow)]);
    const manufacturer=model.manufacturer||'Vitlo';
    const categories=[...(model.categories||model.tags||[])];
    return {...model,manufacturer,categories,sourcePoints,points:U?.densifyPoints?U.densifyPoints(sourcePoints,201):sourcePoints};
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
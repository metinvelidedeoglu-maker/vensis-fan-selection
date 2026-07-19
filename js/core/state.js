(function(){
  const U=window.VensisUtils;
  const models=(window.models||[]).map(model=>{
    const sourcePoints=(model.points||[]).map(([pressure,flow])=>[Number(pressure),Number(flow)]);
    return {...model,sourcePoints,points:U?.densifyPoints?U.densifyPoints(sourcePoints,201):sourcePoints};
  });

  const tags=[...new Set(models.flatMap(model=>model.tags||[]))];
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
    indexes:{tags,series,seriesCounts},
    results:[],
    selectedTags:new Set(),
    selectedSeries:new Set(),
    tableSortKey:'closest',
    tableSortDirection:1
  };
})();
(function(){
  const U=window.VensisUtils;
  const models=(window.models||[]).map(model=>{
    const sourcePoints=(model.points||[]).map(point=>[Number(point[0]),Number(point[1])]);
    return {
      ...model,
      sourcePoints,
      points:U?.densifyPoints?U.densifyPoints(sourcePoints,201):sourcePoints
    };
  });
  window.models=models;
  window.VensisState={
    models,
    results:[],
    selectedTags:new Set(),
    selectedSeries:new Set(),
    tableSortKey:'closest',
    tableSortDirection:1
  };
})();
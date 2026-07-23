(function(){
  const S=window.VensisState;
  const U=window.VensisUtils;

  function select(){
    const airflow=U.number('q');
    const pressure=U.number('p');
    if(!(airflow>0&&pressure>0)){
      S.results=[];
      return [];
    }

    const airflowMin=airflow*(1+U.number('qmin')/100);
    const airflowMax=airflow*(1+U.number('qmax')/100);
    const pressureMin=pressure*(1+U.number('pmin')/100);
    const pressureMax=pressure*(1+U.number('pmax')/100);
    const selectedManufacturers=S.selectedManufacturers;
    const selectedCategories=S.selectedCategories;
    const selectedSeries=S.selectedSeries;
    const results=[];

    for(const model of S.models){
      if(model.catalogOnly)continue;
      if(selectedManufacturers.size&&!selectedManufacturers.has(model.manufacturer))continue;
      if(selectedCategories.size&&![...selectedCategories].every(category=>model.categories.includes(category)))continue;
      if(selectedSeries.size&&!selectedSeries.has(model.series))continue;
      if(!model.points.length)continue;

      let bestMatch=null;
      for(let candidatePressure=Math.ceil(pressureMin);candidatePressure<=Math.floor(pressureMax);candidatePressure++){
        const candidateAirflow=U.interpolate(model.points,candidatePressure);
        if(candidateAirflow==null||candidateAirflow<airflowMin||candidateAirflow>airflowMax)continue;

        const airflowDifference=(candidateAirflow-airflow)/airflow;
        const pressureDifference=(candidatePressure-pressure)/pressure;
        const score=Math.abs(airflowDifference)+Math.abs(pressureDifference);
        if(!bestMatch||score<bestMatch.score){
          bestMatch={qq:candidateAirflow,pp:candidatePressure,qd:airflowDifference,pd:pressureDifference,score};
        }
      }

      if(bestMatch)results.push({...model,...bestMatch});
    }

    results.sort((a,b)=>a.score-b.score||a.kw-b.kw);
    S.results=results;
    return {results,ranges:{qL:airflowMin,qH:airflowMax,pL:pressureMin,pH:pressureMax}};
  }

  window.VensisSelection={select};
})();

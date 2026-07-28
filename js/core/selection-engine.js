(function(){
  const S=window.VensisState;
  const U=window.VensisUtils;

  function curvePoints(points){
    const unique=new Map();
    for(const point of points||[]){
      const pressure=Number(point?.[0]);
      const airflow=Number(point?.[1]);
      if(Number.isFinite(pressure)&&Number.isFinite(airflow))unique.set(pressure,airflow);
    }
    return [...unique.entries()].sort((a,b)=>a[0]-b[0]);
  }

  function operatingPoint(points,requiredAirflow,requiredPressure){
    const curve=curvePoints(points);
    const matches=[];
    // The required duty defines the system resistance curve P = K × Q².
    // Its intersection with the fan curve is the fan's real operating point.
    const residual=([pressure,airflow])=>pressure-requiredPressure*Math.pow(airflow/requiredAirflow,2);

    for(let index=0;index<curve.length-1;index++){
      const start=curve[index];
      const end=curve[index+1];
      const initialStartResidual=residual(start);
      const initialEndResidual=residual(end);

      if(Math.abs(initialStartResidual)<1e-9){
        matches.push({qq:start[1],pp:start[0]});
        continue;
      }
      if(initialStartResidual*initialEndResidual>0)continue;

      let lowPressure=start[0];
      let lowAirflow=start[1];
      let lowResidual=initialStartResidual;
      let highPressure=end[0];
      let highAirflow=end[1];
      for(let iteration=0;iteration<40;iteration++){
        const middlePressure=(lowPressure+highPressure)/2;
        const fraction=(middlePressure-lowPressure)/(highPressure-lowPressure);
        const middleAirflow=lowAirflow+(highAirflow-lowAirflow)*fraction;
        const middleResidual=middlePressure-requiredPressure*Math.pow(middleAirflow/requiredAirflow,2);
        if(Math.sign(middleResidual)===Math.sign(lowResidual)){
          lowPressure=middlePressure;
          lowAirflow=middleAirflow;
          lowResidual=middleResidual;
        }else{
          highPressure=middlePressure;
          highAirflow=middleAirflow;
        }
      }
      matches.push({qq:(lowAirflow+highAirflow)/2,pp:(lowPressure+highPressure)/2});
    }

    return matches
      .map(match=>{
        const qd=(match.qq-requiredAirflow)/requiredAirflow;
        const pd=(match.pp-requiredPressure)/requiredPressure;
        return {...match,qd,pd,score:Math.abs(qd)+Math.abs(pd)};
      })
      .sort((a,b)=>a.score-b.score)[0]||null;
  }

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

      // Tolerances decide whether the fan is eligible; the displayed point below
      // is the fan/system-curve intersection, not an arbitrary rectangle edge.
      let hasToleranceMatch=false;
      for(let candidatePressure=Math.ceil(pressureMin);candidatePressure<=Math.floor(pressureMax);candidatePressure++){
        const candidateAirflow=U.interpolate(model.points,candidatePressure);
        if(candidateAirflow==null||candidateAirflow<airflowMin||candidateAirflow>airflowMax)continue;
        hasToleranceMatch=true;
        break;
      }

      if(!hasToleranceMatch)continue;
      const bestMatch=operatingPoint(model.points,airflow,pressure);
      if(bestMatch)results.push({...model,...bestMatch});
    }

    results.sort((a,b)=>a.score-b.score||a.kw-b.kw);
    S.results=results;
    return {results,ranges:{qL:airflowMin,qH:airflowMax,pL:pressureMin,pH:pressureMax}};
  }

  window.VensisSelection={select};
})();

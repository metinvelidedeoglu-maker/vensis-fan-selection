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

  function restrictInterval(interval,startValue,endValue,minimum,maximum){
    const difference=endValue-startValue;
    if(Math.abs(difference)<1e-12){
      return startValue>=minimum&&startValue<=maximum?interval:null;
    }

    const first=(minimum-startValue)/difference;
    const second=(maximum-startValue)/difference;
    const low=Math.max(interval[0],Math.min(first,second));
    const high=Math.min(interval[1],Math.max(first,second));
    return low<=high+1e-12?[Math.max(0,low),Math.min(1,high)]:null;
  }

  function operatingPoint(points,requiredAirflow,requiredPressure,bounds){
    const curve=curvePoints(points);
    const exactMatches=[];
    const candidates=[];
    // The required duty defines the system resistance curve P = K × Q².
    // Prefer its exact intersection with the fan curve. When the two curves do
    // not cross, keep an otherwise eligible fan by using the tolerated curve
    // point that comes closest to the system curve.
    const residual=([pressure,airflow])=>pressure-requiredPressure*Math.pow(airflow/requiredAirflow,2);
    const describeCandidate=(pressure,airflow)=>{
      const qd=(airflow-requiredAirflow)/requiredAirflow;
      const pd=(pressure-requiredPressure)/requiredPressure;
      const systemPressure=requiredPressure*Math.pow(airflow/requiredAirflow,2);
      const systemGap=Math.abs(pressure-systemPressure)/Math.max(requiredPressure,systemPressure,1);
      const dutyGap=Math.abs(qd)+Math.abs(pd);
      return {
        qq:airflow,
        pp:pressure,
        qd,
        pd,
        systemGap,
        dutyGap,
        score:dutyGap+systemGap,
        matchMode:systemGap<1e-7?'system-intersection':'tolerance-nearest'
      };
    };
    const addCandidate=(pressure,airflow)=>{
      if(
        !Number.isFinite(pressure)||
        !Number.isFinite(airflow)||
        pressure<bounds.pressureMin-1e-7||
        pressure>bounds.pressureMax+1e-7||
        airflow<bounds.airflowMin-1e-7||
        airflow>bounds.airflowMax+1e-7
      )return;
      candidates.push(describeCandidate(pressure,airflow));
    };

    if(curve.length===1){
      addCandidate(curve[0][0],curve[0][1]);
    }

    // Preserve the established behavior: when the fan and system curves cross,
    // that physical operating point remains the displayed result.
    for(let index=0;index<curve.length-1;index++){
      const start=curve[index];
      const end=curve[index+1];
      const startResidual=residual(start);
      const endResidual=residual(end);

      if(Math.abs(startResidual)<1e-9){
        exactMatches.push(describeCandidate(start[0],start[1]));
        continue;
      }
      if(startResidual*endResidual>0)continue;

      let low=0;
      let high=1;
      let currentLowResidual=startResidual;
      for(let iteration=0;iteration<45;iteration++){
        const middle=(low+high)/2;
        const pressure=start[0]+(end[0]-start[0])*middle;
        const airflow=start[1]+(end[1]-start[1])*middle;
        const middleResidual=residual([pressure,airflow]);
        if(Math.sign(middleResidual)===Math.sign(currentLowResidual)){
          low=middle;
          currentLowResidual=middleResidual;
        }else{
          high=middle;
        }
      }
      const fraction=(low+high)/2;
      exactMatches.push(describeCandidate(
        start[0]+(end[0]-start[0])*fraction,
        start[1]+(end[1]-start[1])*fraction
      ));
    }

    for(let index=0;index<curve.length-1;index++){
      const start=curve[index];
      const end=curve[index+1];
      let interval=[0,1];
      interval=restrictInterval(interval,start[0],end[0],bounds.pressureMin,bounds.pressureMax);
      if(!interval)continue;
      interval=restrictInterval(interval,start[1],end[1],bounds.airflowMin,bounds.airflowMax);
      if(!interval)continue;

      const pressureDifference=end[0]-start[0];
      const airflowDifference=end[1]-start[1];
      const pointAt=fraction=>[
        start[0]+pressureDifference*fraction,
        start[1]+airflowDifference*fraction
      ];
      const lowPoint=pointAt(interval[0]);
      const highPoint=pointAt(interval[1]);
      const lowResidual=residual(lowPoint);
      const highResidual=residual(highPoint);

      addCandidate(lowPoint[0],lowPoint[1]);
      addCandidate(highPoint[0],highPoint[1]);

      if(Math.abs(lowResidual)<1e-9){
        addCandidate(lowPoint[0],lowPoint[1]);
      }else if(Math.abs(highResidual)<1e-9){
        addCandidate(highPoint[0],highPoint[1]);
      }else if(lowResidual*highResidual<0){
        let low=interval[0];
        let high=interval[1];
        let currentLowResidual=lowResidual;
        for(let iteration=0;iteration<45;iteration++){
          const middle=(low+high)/2;
          const middleResidual=residual(pointAt(middle));
          if(Math.sign(middleResidual)===Math.sign(currentLowResidual)){
            low=middle;
            currentLowResidual=middleResidual;
          }else{
            high=middle;
          }
        }
        const intersection=pointAt((low+high)/2);
        addCandidate(intersection[0],intersection[1]);
      }

      // On a linear fan-curve segment the system residual is quadratic. Its
      // stationary point can be the closest approach when there is no crossing.
      if(Math.abs(airflowDifference)>1e-12){
        const stationary=(
          pressureDifference*Math.pow(requiredAirflow,2)/
          (2*requiredPressure*airflowDifference)-
          start[1]
        )/airflowDifference;
        if(stationary>interval[0]&&stationary<interval[1]){
          const nearest=pointAt(stationary);
          addCandidate(nearest[0],nearest[1]);
        }
      }
    }

    if(!candidates.length)return null;
    return exactMatches
      .sort((a,b)=>a.dutyGap-b.dutyGap)[0]||
      candidates.sort((a,b)=>a.systemGap-b.systemGap||a.dutyGap-b.dutyGap)[0];
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
      const points=S.pointsFor?S.pointsFor(model):(model.points||model.sourcePoints||[]);
      if(!points.length)continue;

      const bestMatch=operatingPoint(points,airflow,pressure,{
        airflowMin,
        airflowMax,
        pressureMin,
        pressureMax
      });
      if(bestMatch)results.push({...model,...bestMatch});
    }

    results.sort((a,b)=>a.score-b.score||a.kw-b.kw);
    S.results=results;
    return {results,ranges:{qL:airflowMin,qH:airflowMax,pL:pressureMin,pH:pressureMax}};
  }

  window.VensisSelection={select};
})();

(function(){
  const S=window.VensisState,U=window.VensisUtils;
  const finiteOrInfinity=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:Infinity};

  function select(){
    const q=U.number('q'),p=U.number('p');
    if(!(q>0&&p>0)){S.results=[];return []}

    const qL=q*(1+U.number('qmin')/100),qH=q*(1+U.number('qmax')/100);
    const pL=p*(1+U.number('pmin')/100),pH=p*(1+U.number('pmax')/100);
    const maxText=U.byId('maxkw')?.value.trim();
    const maxkw=maxText?Number(maxText):Infinity;
    const pole=U.byId('pole')?.value||'';
    const sort=U.byId('sort')?.value||'closest';
    const selectedManufacturers=[...S.selectedManufacturers];
    const selectedCategories=[...S.selectedCategories];
    const out=[];

    for(const model of S.models){
      if(selectedManufacturers.length&&!selectedManufacturers.includes(model.manufacturer))continue;
      if(selectedCategories.length&&!selectedCategories.every(category=>(model.categories||[]).includes(category)))continue;
      if(S.selectedSeries.size&&!S.selectedSeries.has(model.series))continue;
      if(pole&&String(model.pole)!==pole)continue;
      if(Number(model.kw)>maxkw||!model.points?.length)continue;

      let best=null;
      for(let pressure=Math.ceil(pL);pressure<=Math.floor(pH);pressure++){
        const flow=U.interpolate(model.points,pressure);
        if(flow==null||flow<qL||flow>qH)continue;
        const qd=(flow-q)/q,pd=(pressure-p)/p,score=Math.abs(qd)+Math.abs(pd);
        if(!best||score<best.score)best={qq:flow,pp:pressure,qd,pd,score};
      }
      if(best)out.push({...model,...best});
    }

    const sorters={
      closest:(a,b)=>a.score-b.score||a.kw-b.kw,
      economic:(a,b)=>finiteOrInfinity(a.price)-finiteOrInfinity(b.price)||a.score-b.score,
      quiet:(a,b)=>finiteOrInfinity(a.spl)-finiteOrInfinity(b.spl)||a.score-b.score,
      power:(a,b)=>finiteOrInfinity(a.kw)-finiteOrInfinity(b.kw)||a.score-b.score
    };
    out.sort(sorters[sort]||sorters.closest);
    S.results=out;
    return {results:out,ranges:{qL,qH,pL,pH}};
  }

  window.VensisSelection={select};
})();
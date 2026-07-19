(function(){
  const U=window.VensisUtils,S=window.VensisState;

  function toggleSec(element){element.parentElement.classList.toggle('open')}

  function syncDualTolerance(prefix){
    const min=U.byId(prefix+'minSlider'),max=U.byId(prefix+'maxSlider');
    if(!min||!max)return;
    let lower=Math.round(Number(min.value)/5)*5;
    let upper=Math.round(Number(max.value)/5)*5;
    if(lower>upper-5){
      if(document.activeElement===min)lower=upper-5;
      else upper=lower+5;
    }
    lower=Math.max(-50,Math.min(95,lower));
    upper=Math.max(-45,Math.min(100,upper));
    min.value=lower;
    max.value=upper;
    U.byId(prefix+'min').value=lower;
    U.byId(prefix+'max').value=upper;
    U.byId(prefix+'minText').textContent=lower;
    U.byId(prefix+'maxText').textContent=upper;
    const fill=U.byId(prefix+'RangeFill');
    if(fill){
      const percent=value=>((Number(value)+50)/150)*100;
      fill.style.left=percent(lower)+'%';
      fill.style.right=(100-percent(upper))+'%';
    }
  }

  function runSelection(){
    const selection=window.VensisSelection.select();
    if(selection?.ranges){
      const {qL,qH,pL,pH}=selection.ranges;
      U.byId('range').innerHTML=`Flow range: <b>${U.format(qL)}–${U.format(qH)} m³/h</b> &nbsp; | &nbsp; Pressure range: <b>${U.format(pL)}–${U.format(pH)} Pa</b>`;
    }else{
      U.byId('range').textContent='Enter valid flow and pressure values to begin.';
    }
    window.VensisResults.render();
  }

  function resetAll(){
    ['q','p','maxkw'].forEach(id=>{const element=U.byId(id);if(element)element.value=''});
    if(U.byId('pole'))U.byId('pole').value='';
    if(U.byId('sort'))U.byId('sort').value='closest';
    for(const [prefix,lower,upper] of [['q',-10,20],['p',-10,20]]){
      U.byId(prefix+'minSlider').value=lower;
      U.byId(prefix+'maxSlider').value=upper;
      syncDualTolerance(prefix);
    }
    S.selectedTags.clear();
    S.selectedSeries.clear();
    S.results=[];
    if(U.byId('typeSearch'))U.byId('typeSearch').value='';
    if(U.byId('seriesSearch'))U.byId('seriesSearch').value='';
    U.byId('range').textContent='Enter flow and pressure values to begin.';
    window.VensisFilters.render();
    window.VensisResults.render();
  }

  Object.assign(window,{
    toggleSec,
    syncDualTolerance,
    runSelection,
    resetAll,
    renderTagSeries:()=>window.VensisFilters.render(),
    setTableSort:key=>window.VensisResults.setSort(key)
  });

  function init(){
    syncDualTolerance('q');
    syncDualTolerance('p');
    window.VensisFilters.render();
    window.VensisResults.render();
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
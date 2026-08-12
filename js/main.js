(function(){
  const U=window.VensisUtils,S=window.VensisState;
  const MOBILE_TOLERANCE_QUERY='(max-width: 1000px)';
  const TOLERANCE_MIN=-50;
  const TOLERANCE_MAX=100;
  const TOLERANCE_DESKTOP_STEP=1;
  const TOLERANCE_MOBILE_STEP=10;

  function toggleSec(element){element.parentElement.classList.toggle('open')}

  function toleranceStep(){
    return window.matchMedia?.(MOBILE_TOLERANCE_QUERY).matches?TOLERANCE_MOBILE_STEP:TOLERANCE_DESKTOP_STEP;
  }

  function snapTolerance(value,step){
    const snapped=TOLERANCE_MIN+Math.round((Number(value)-TOLERANCE_MIN)/step)*step;
    return Math.max(TOLERANCE_MIN,Math.min(TOLERANCE_MAX,snapped));
  }

  function syncDualTolerance(prefix,changedSide){
    const min=U.byId(prefix+'minSlider'),max=U.byId(prefix+'maxSlider');
    if(!min||!max)return;
    const step=Math.max(1,Number(min.step)||toleranceStep());
    let lower=snapTolerance(min.value,step);
    let upper=snapTolerance(max.value,step);
    if(lower>upper-step){
      if(changedSide==='min'||(!changedSide&&document.activeElement===min))lower=upper-step;
      else upper=lower+step;
    }
    lower=Math.max(TOLERANCE_MIN,Math.min(TOLERANCE_MAX-step,lower));
    upper=Math.max(TOLERANCE_MIN+step,Math.min(TOLERANCE_MAX,upper));
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

  function setToleranceFromClick(event){
    const source=event.target;
    if(source&&typeof source.closest==='function'&&source.closest('.dual-range-input'))return;
    const control=event.currentTarget;
    const prefix=control?.dataset?.tolerancePrefix;
    const range=control?.querySelector?.('.dual-range');
    const min=prefix&&U.byId(prefix+'minSlider'),max=prefix&&U.byId(prefix+'maxSlider');
    if(!range||!min||!max)return;
    const rect=range.getBoundingClientRect();
    if(!rect.width||!Number.isFinite(event.clientX))return;
    const step=Math.max(1,Number(min.step)||toleranceStep());
    const scaleLabel=source&&typeof source.closest==='function'?source.closest('[data-tolerance-value]'):null;
    const explicitValue=Number(scaleLabel?.dataset?.toleranceValue);
    const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    const clickedValue=scaleLabel&&Number.isFinite(explicitValue)?explicitValue:TOLERANCE_MIN+ratio*(TOLERANCE_MAX-TOLERANCE_MIN);
    const target=snapTolerance(clickedValue,step);
    const lower=Number(min.value),upper=Number(max.value);
    const changedSide=target<=lower?'min':target>=upper?'max':Math.abs(target-lower)<Math.abs(target-upper)?'min':'max';
    const slider=changedSide==='min'?min:max;
    slider.value=target;
    syncDualTolerance(prefix,changedSide);
    if(typeof slider.focus==='function')slider.focus({preventScroll:true});
    event.preventDefault?.();
  }

  function applyToleranceMode(){
    const step=toleranceStep();
    for(const prefix of ['q','p']){
      const min=U.byId(prefix+'minSlider'),max=U.byId(prefix+'maxSlider');
      if(!min||!max)continue;
      min.step=step;
      max.step=step;
      syncDualTolerance(prefix);
    }
  }

  function initToleranceControls(){
    document.querySelectorAll?.('.tolerance-control').forEach(control=>control.addEventListener('click',setToleranceFromClick));
    const media=window.matchMedia?.(MOBILE_TOLERANCE_QUERY);
    if(media?.addEventListener)media.addEventListener('change',applyToleranceMode);
    else media?.addListener?.(applyToleranceMode);
    applyToleranceMode();
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
    S.selectedManufacturers.clear();
    if(S.indexes.manufacturers.includes('Vitlo'))S.selectedManufacturers.add('Vitlo');
    else if(S.indexes.manufacturers[0])S.selectedManufacturers.add(S.indexes.manufacturers[0]);
    S.selectedCategories.clear();
    S.selectedSeries.clear();
    S.results=[];
    if(U.byId('categorySearch'))U.byId('categorySearch').value='';
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
    initToleranceControls();
    window.VensisFilters.render();
    window.VensisResults.render();
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();

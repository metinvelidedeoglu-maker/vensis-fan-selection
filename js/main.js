(function(){
  const U=window.VensisUtils,S=window.VensisState;
  function toggleSec(el){el.parentElement.classList.toggle('open')}
  function syncDualTolerance(prefix){
    const min=U.byId(prefix+'minSlider'),max=U.byId(prefix+'maxSlider');if(!min||!max)return;
    let a=Math.round(Number(min.value)/5)*5,b=Math.round(Number(max.value)/5)*5;if(a>b-5){if(document.activeElement===min)a=b-5;else b=a+5}
    a=Math.max(-50,Math.min(95,a));b=Math.max(-45,Math.min(100,b));min.value=a;max.value=b;U.byId(prefix+'min').value=a;U.byId(prefix+'max').value=b;U.byId(prefix+'minText').textContent=a;U.byId(prefix+'maxText').textContent=b;
    const fill=U.byId(prefix+'RangeFill');if(fill){const pct=v=>((Number(v)+50)/150)*100;fill.style.left=pct(a)+'%';fill.style.right=(100-pct(b))+'%'}
  }
  function runSelection(){
    const selection=window.VensisSelection.select();
    if(selection?.ranges){const r=selection.ranges;U.byId('range').innerHTML=`Flow range: <b>${U.format(r.qL)}–${U.format(r.qH)} m³/h</b> &nbsp; | &nbsp; Pressure range: <b>${U.format(r.pL)}–${U.format(r.pH)} Pa</b>`}
    else U.byId('range').textContent='Enter valid flow and pressure values to begin.';
    window.VensisResults.render();
  }
  function resetAll(){
    ['q','p','maxkw'].forEach(id=>{if(U.byId(id))U.byId(id).value=''});if(U.byId('pole'))U.byId('pole').value='';if(U.byId('sort'))U.byId('sort').value='closest';
    [['q',-10,20],['p',-10,20]].forEach(([prefix,a,b])=>{U.byId(prefix+'minSlider').value=a;U.byId(prefix+'maxSlider').value=b;syncDualTolerance(prefix)});
    S.selectedTags.clear();S.selectedSeries.clear();S.results=[];if(U.byId('typeSearch'))U.byId('typeSearch').value='';if(U.byId('seriesSearch'))U.byId('seriesSearch').value='';if(U.byId('aiRecognition'))U.byId('aiRecognition').innerHTML='';
    U.byId('range').textContent='Enter flow and pressure values to begin.';window.VensisFilters.render();window.VensisResults.render();
  }
  Object.assign(window,{toggleSec,syncDualTolerance,runSelection,resetAll,renderTagSeries:()=>window.VensisFilters.render(),setTableSort:key=>window.VensisResults.setSort(key),openProductTab:i=>window.VensisResults.preview(i),parseSmart:()=>window.VensisAI.parse(),startHoldSpeech:e=>window.VensisAI.start(e),stopHoldSpeech:e=>window.VensisAI.stop(e),cancelHoldSpeech:e=>window.VensisAI.cancel(e)});
  function init(){syncDualTolerance('q');syncDualTolerance('p');window.VensisFilters.render();window.VensisResults.render();if(!window.VensisAI.supported())U.byId('holdMicStatus').textContent='Speech recognition requires Chrome or Edge.'}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
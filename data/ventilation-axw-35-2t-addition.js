(function(){
  'use strict';
  const data=window.VensisVentilationData;
  if(!data||data.schemaVersion!==3)return;
  const id='AXW|AXW 35-2T-0.37|4000|30';
  if(data.models.some(model=>model.id===id))return;
  const get=id=>data.models.find(model=>model.id===id);
  const duct=get('AXD|AXD 35-2T-0.37|4000|24');
  const wall=get('AXW|AXW 35-4T-0.27|2860|30');
  const atex=get('AXW/ATEX|AXW/ATEX 35-2T-0.37|4000|12');
  const series=data.series.find(series=>series.id==='AXW');
  if(!duct||!wall||!atex||!series||JSON.stringify(duct.performance.sourcePoints)!==JSON.stringify(atex.performance.sourcePoints)){
    console.warn('AXW 35-2T-0.37 provisional source models are unavailable or inconsistent.');
    return;
  }
  const copy=value=>JSON.parse(JSON.stringify(value));
  const name='AXW 35-2T-0.37';
  const caution='';
  const model=copy(duct);
  Object.assign(model,{id,seriesId:'AXW',model:name,display:name,altModel:name,
    media:copy(wall.media),dimensions:copy(wall.dimensions),features:copy(wall.features),
    technical:copy(wall.technical),source:{page:33,catalogue:''},
    verification:{status:'catalog-derived',caution,derivation:{date:'2026-11-02',performanceAndMotor:duct.id,price:duct.id,wallGeometry:wall.id,comparedWallGeometry:atex.id,manufacturerConfirmation:'pending',notAtex:true}}
  });
  model.technical.safetyWarning=caution;
  const i=data.models.findIndex(item=>item.id===wall.id);
  data.models.splice(i+1,0,model);
  const j=series.modelIds.indexOf(wall.id);
  series.modelIds.splice(j+1,0,id);
})();

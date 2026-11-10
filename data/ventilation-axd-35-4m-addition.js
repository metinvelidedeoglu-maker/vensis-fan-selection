(function(){
  'use strict';
  const data=window.VensisVentilationData;
  if(!data||data.schemaVersion!==3)return;
  const id='AXD|AXD 35-4M-0.18|2860|27';
  if(data.models.some(model=>model.id===id))return;
  const get=id=>data.models.find(model=>model.id===id);
  const duct=get('AXD|AXD 35-4T-0.27|2860|24');
  const wall=get('AXW|AXW 35-4T-0.27|2860|30');
  const single=get('AXW/ATEX|AXW/ATEX 35-4M-0.18|2860|15');
  const series=data.series.find(series=>series.id==='AXD');
  if(!duct||!wall||!single||!series||
      JSON.stringify(duct.performance.sourcePoints)!==JSON.stringify(wall.performance.sourcePoints)||
      JSON.stringify(duct.performance.sourcePoints)!==JSON.stringify(single.performance.sourcePoints)){
    console.warn('AXD 35-4M-0.18 source models are unavailable or inconsistent.');
    return;
  }
  const copy=value=>JSON.parse(JSON.stringify(value));
  const name='AXD 35-4M-0.18';
  const model=copy(duct);
  Object.assign(model,{id,model:name,display:name,altModel:name,
    pricing:{listPrice:600,currency:'EUR'},source:{page:'',catalogue:''},
    description:copy(series.description),
    verification:{status:'catalog-derived',caution:'',derivation:{
      date:'2026-11-10',requestedBy:'Metin',performanceAndDuctGeometry:duct.id,
      comparedWallPerformance:wall.id,singlePhaseSupply:single.id,
      price:{basis:'user-specified',amount:600,currency:'EUR'},
      manufacturerConfirmation:'pending',notAtex:true
    }}
  });
  // Retain the standard AXD mechanics and source curve. The existing 4M peer
  // supplies only its single-phase electrical configuration, never ATEX claims.
  model.motor.voltage=single.motor.voltage;
  model.motor.frequency='50 Hz';
  model.motor.current=0; // No verified current for this specific motor variant.
  model.technical.phase='Single-phase';
  model.technical.poles=4;
  model.description.general=model.description.general.filter(line=>!/400\s*V|frequency converter/i.test(line));
  const supply='Single-phase 230 V, 50 Hz, 4-pole motor.';
  model.description.motor.push(supply);
  data.contentTranslations=data.contentTranslations||{};
  data.contentTranslations[supply]='Monofaze 230 V, 50 Hz, 4 kutuplu motor.';
  const index=data.models.findIndex(item=>item.id===duct.id);
  data.models.splice(index+1,0,model);
  series.modelIds.splice(series.modelIds.indexOf(duct.id)+1,0,id);
})();

(function(){
  'use strict';
  const data=window.VensisVentilationData;
  if(!data||data.schemaVersion!==3)throw new Error('Unified ventilation catalog is unavailable.');
  const text=value=>String(value??'').trim();
  const slug=value=>text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const number=value=>value==null||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
  const seriesMap=new Map(),modelMap=new Map();
  const brands=(data.brands||[]).map(b=>({...b}));
  const description=value=>({general:[...(value?.general||[])],motor:[...(value?.motor||[])],applications:[...(value?.applications||[])]});
  for(const source of data.series||[]){
    if(!source.id||seriesMap.has(source.id))throw new Error('Missing or duplicate ventilation series ID: '+source.id);
    const series={...source,description:description(source.description),modelIds:[],submodels:[]};
    series.descriptionText=[...series.description.general,...series.description.motor,...series.description.applications].join(' ');
    seriesMap.set(series.id,series);
    if(!brands.some(b=>b.name===series.manufacturer))brands.push({id:slug(series.manufacturer),slug:slug(series.manufacturer),name:series.manufacturer});
  }
  for(const source of data.models||[]){
    if(!source.id||modelMap.has(source.id))throw new Error('Missing or duplicate ventilation model ID: '+source.id);
    const series=seriesMap.get(source.seriesId);
    if(!series)throw new Error('Unknown ventilation series: '+source.seriesId);
    const model={...source,motor:{...source.motor},technical:{...source.technical},performance:{...source.performance},media:{...source.media},pricing:{...source.pricing}};
    model.standard={altModel:model.model,motorPower:number(model.motor.power),speed:number(model.motor.speed),voltage:text(model.motor.voltage),maxAirflow:number(model.performance.maxAirflow??model.performance.nominalAirflow),sound:number(model.motor.sound),price:number(model.pricing.listPrice)};
    modelMap.set(model.id,model);series.modelIds.push(model.id);series.submodels.push(model.model);
  }
  const routeCounts=new Map();
  const baseModelSlug=model=>slug(model.technical?.productCode||model.model||model.id);
  for(const model of modelMap.values()){
    const key=model.seriesId+'|'+baseModelSlug(model);routeCounts.set(key,(routeCounts.get(key)||0)+1);
  }
  const modelSlug=model=>routeCounts.get(model.seriesId+'|'+baseModelSlug(model))>1?slug(model.id):baseModelSlug(model);
  function brand(value){
    const key=text(value).toLowerCase();
    return brands.find(b=>[b.id,b.slug,b.name].some(v=>text(v).toLowerCase()===key))||null;
  }
  function resolveSeries(value,manufacturer=''){
    const wanted=text(value),key=slug(value),selectedBrand=brand(manufacturer)?.name||text(manufacturer);
    const matches=[...seriesMap.values()].filter(s=>(!selectedBrand||s.manufacturer===selectedBrand)&&[s.id,s.code,s.title,`${s.manufacturer}-${s.code}`].some(v=>text(v)===wanted||slug(v)===key));
    return matches.length===1?matches[0]:null;
  }
  function product(id){
    const model=modelMap.get(text(id));if(!model)return null;
    const s=seriesMap.get(model.seriesId);
    return {...model,key:model.id,series:{id:s.id,code:s.code,title:s.title,manufacturer:s.manufacturer,categories:s.categories||[]},catalogue:s.catalogue||{},media:{...s.media,...model.media},description:model.description||s.description};
  }
  const names=[...seriesMap.values()].sort((a,b)=>text(b.code).length-text(a.code).length);
  function seriesCode(value){
    const exact=resolveSeries(value);if(exact)return exact.code;
    const normalized=text(value).toUpperCase();
    const match=names.find(s=>{const code=text(s.code).toUpperCase();return code&&(normalized.startsWith(code+' ')||normalized.startsWith(code+'-'));});
    return match?.code||'';
  }
  function presentation(value={}){
    const p=product(value.productKey||value.key||value.id);
    const code=text(value.seriesCode||p?.series?.code||seriesCode(value.series||value.model));
    let label=text(value.productDescription||value.series||p?.series?.title);
    if(code&&label.toLowerCase().startsWith(code.toLowerCase())&&/^[\s\-–—:|\/]/.test(label.slice(code.length)))label=label.slice(code.length).replace(/^\s*[-–—:|\/]?\s*/,'').trim()||label;
    return {altModel:text(value.altModel||value.model||p?.model),description:label,brand:text(value.brand||value.manufacturer||p?.series?.manufacturer)};
  }
  function dimensions(product={},model={}){
    const stored=model.dimensions||product.dimensions;
    const image=model.media?.dimensionImage||product.media?.dimensionImage||stored?.drawing?.asset||'';
    if(stored)return {...stored,drawing:{...stored.drawing,asset:image}};
    const values=model.technical?.dimensions||product.technical?.dimensions||{};
    const headers=Object.keys(values).filter(key=>typeof values[key]==='number'||typeof values[key]==='string');
    return image||headers.length?{headers,values,unit:'mm',drawing:{asset:image}}:null;
  }
  // Display defaults never overwrite manufacturer records or selection inputs.
  function displayFrequency(model={}){
    const values=[model.motor?.frequency,model.technical?.frequency,model.frequency];
    const value=values.map(text).find(v=>v&&!/^(?:[-—]|0(?:\s*hz)?|n\/?a)$/i.test(v));
    return value?(/hz\b/i.test(value)?value:value+' Hz'):'50 Hz';
  }
  function displayTemperature(technical={},format=String){
    const valid=value=>value!=null&&text(value)!==''&&typeof value!=='boolean'&&Number.isFinite(Number(value));
    const byFrequency=technical.operatingTemperatureByFrequencyC;
    if(byFrequency&&typeof byFrequency==='object'&&!Array.isArray(byFrequency)){
      const limits=Object.entries(byFrequency).filter(([hz,range])=>valid(hz)&&Number(hz)>0&&range&&typeof range==='object')
        .sort(([a],[b])=>Number(a)-Number(b))
        .map(([hz,range])=>{
          const value=displayTemperature({operatingTemperatureMinC:range.min,operatingTemperatureMaxC:range.max},format);
          return value?`${value} (${format(Number(hz))} Hz)`:'';
        }).filter(Boolean);
      if(limits.length)return limits.join(' / ');
    }
    const min=technical.operatingTemperatureMinC,max=technical.operatingTemperatureMaxC;
    const hasMin=valid(min),hasMax=valid(max);
    // Imported 0/0 limits mean unspecified, not a verified zero-degree range.
    if(hasMin&&hasMax)return Number(min)===0&&Number(max)===0?'':`${format(Number(min))} – ${format(Number(max))} °C`;
    if(hasMin)return `≥ ${format(Number(min))} °C`;
    if(hasMax)return `≤ ${format(Number(max))} °C`;
    return '';
  }
  function modelMotorDescription(value,model={}){
    const line=text(value);
    // A series may contain both single- and three-phase models. A standalone
    // supply line must use the selected model's voltage, never the series default.
    if(!/^\d+(?:\.\d+)?(?:\s*[-–/]\s*\d+(?:\.\d+)?)*\s*V\s*[,;–-]\s*\d+(?:\s*\/\s*\d+)?\s*Hz[.!]?$/i.test(line))return value;
    const voltage=text(model.motor?.voltage);
    if(!voltage)return '';
    return `${/v\b/i.test(voltage)?voltage:voltage+' V'}, ${displayFrequency(model)}.`;
  }
  function measurementNote(technical={},field,lang='tr'){
    if(field==='power'&&technical.powerBasis==='maximum-electrical-input-P1')return lang==='tr'?'P1 maks.':'P1 max.';
    if(field==='power'&&technical.powerBasis==='nominal-motor-power')return lang==='tr'?'Nominal':'Rated';
    if(field==='sound'&&technical.soundBasis==='outlet-sound-pressure-3m-operating-point-2')return lang==='tr'?'Atış, 3 m':'Outlet, 3 m';
    if(field==='sound'&&technical.soundBasis==='inlet-sound-pressure-1_5m-free-field')return lang==='tr'?'Emiş, 1,5 m':'Inlet, 1.5 m';
    if(field==='sound'&&technical.soundBasis==='sound-pressure-1m-free-field-with-ducts')return lang==='tr'?'Kanallı, 1 m':'Ducted, 1 m';
    if(field==='sound'&&technical.soundBasis==='sound-pressure-1_5m-free-field')return lang==='tr'?'1,5 m':'1.5 m';
    if(field==='sound'&&technical.soundBasis==='sound-pressure-3m-high-speed')return lang==='tr'?'3 m, yüksek hız':'3 m, high speed';
    if(field==='sound'&&technical.soundBasis==='inlet-sound-pressure-1_5m-free-field-operating-point-A')return lang==='tr'?'Emiş, 1,5 m, A':'Inlet, 1.5 m, A';
    if(field==='sound'&&technical.soundBasis==='radiated-sound-pressure-3m-free-field-operating-point-B')return lang==='tr'?'Yayılan, 3 m, B':'Radiated, 3 m, B';
    if(field==='sound'&&technical.soundBasis==='inlet-sound-pressure-3m-free-field-operating-point-A')return lang==='tr'?'Emiş, 3 m, A':'Inlet, 3 m, A';
    if(field==='sound'&&technical.soundBasis==='sound-pressure-3m-high-speed-exhaust')return lang==='tr'?'3 m, egzoz, yüksek hız':'3 m, exhaust, high speed';
    if(field==='sound'&&technical.soundBasis==='sound-pressure-3D-minimum-1_5m-free-field'){
      const distance=Number(technical.soundMeasurementDistanceM);
      return distance>0?String(distance).replace('.',lang==='tr'?',':'.')+' m':(lang==='tr'?'3D, en az 1,5 m':'3D, at least 1.5 m');
    }
    if(field==='current'&&Number(technical.currentReferenceVoltageV)>0)return `${Number(technical.currentReferenceVoltageV)} V`;
    return '';
  }
  window.VensisVentilationDisplay={frequency:displayFrequency,temperature:displayTemperature,motorDescription:modelMotorDescription,measurementNote};
  window.VensisCatalog={
    schemaVersion:3,brands,brand,resolveSeries,slug,modelSlug,
    standard:{seriesFields:['modelName','brand','description','category','image','submodels','catalogPdf'],submodelFields:['altModel','motorPower','speed','voltage','maxAirflow','sound','price']},
    series:[...seriesMap.values()],models:[...modelMap.values()],
    getSeries:id=>seriesMap.get(text(id))||resolveSeries(id),getModel:id=>modelMap.get(text(id))||null,
    product,modelsForSeries:id=>(seriesMap.get(text(id))?.modelIds||[]).map(key=>modelMap.get(key))
  };
  window.VensisDimensions={resolve:dimensions};
  window.VensisProducts={get:product,fromResult:row=>product(row?.productKey||row?.key||row?.id),seriesCode,
    seriesName:value=>resolveSeries(seriesCode(value))?.title||'',image:value=>resolveSeries(seriesCode(value))?.media?.image||'',
    presentation,count:()=>modelMap.size,seriesCount:()=>seriesMap.size};
})();

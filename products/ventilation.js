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

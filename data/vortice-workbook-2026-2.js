(function(){
  'use strict';

  const catalog=window.VensisCatalog;
  const rows=Array.isArray(window.VensisVorticeWorkbookRows)?window.VensisVorticeWorkbookRows:[];
  if(!catalog||!Array.isArray(catalog.series)||!Array.isArray(catalog.models)||!rows.length)return;

  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const identity=value=>text(value).toUpperCase().replace(/[–—]/g,'-').replace(/\s*\/\s*/g,'/').replace(/\s*-\s*/g,'-').replace(/(\d),(\d)/g,'$1.$2');
  const compact=value=>identity(value).replace(/[^A-Z0-9]/g,'');
  const numeric=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
  const isVortice=series=>identity(series?.manufacturer)==='VORTICE';
  const originalGetModel=typeof catalog.getModel==='function'?catalog.getModel.bind(catalog):null;
  const originalProduct=typeof catalog.product==='function'?catalog.product.bind(catalog):null;
  const originalModelsForSeries=typeof catalog.modelsForSeries==='function'?catalog.modelsForSeries.bind(catalog):null;
  const extraById=new Map();
  const extraBySeries=new Map();
  const usedIds=new Set();
  const matched=[];
  const aliases=[];
  const unmatched=[];

  function seriesFor(row){
    const wanted=identity(row.series);
    return catalog.series.find(series=>isVortice(series)&&[series?.id,series?.code,series?.title].some(value=>identity(value)===wanted))||null;
  }

  function sourceModels(series){
    const direct=catalog.models.filter(model=>String(model.seriesId)===String(series.id));
    return direct.length?direct:(originalModelsForSeries?originalModelsForSeries(series.id):[]);
  }

  function findExisting(series,row){
    const models=sourceModels(series).filter(model=>!usedIds.has(String(model.id)));
    const wantedText=identity(row.altModel);
    const wantedCompact=compact(row.altModel);
    const exact=models.filter(model=>[
      model?.standard?.altModel,model?.altModel,model?.model,model?.display,model?.id
    ].some(value=>identity(value)===wantedText||compact(value)===wantedCompact));
    if(exact.length===1)return exact[0];
    const suffix=models.filter(model=>[
      model?.standard?.altModel,model?.altModel,model?.model,model?.display,model?.id
    ].some(value=>{
      const key=compact(value);
      return key.length>=5&&(key.endsWith(wantedCompact)||wantedCompact.endsWith(key));
    }));
    return suffix.length===1?suffix[0]:null;
  }

  function applyRow(model,row){
    model.motor=model.motor||{};
    model.performance=model.performance||{};
    model.pricing=model.pricing||{};
    model.standard=model.standard||{};
    const altModel=text(row.altModel);

    model.model=altModel;
    model.display=altModel;
    model.altModel=altModel;
    model.motor.power=numeric(row.power);
    model.motor.speed=numeric(row.speed);
    model.motor.voltage=text(row.voltage);
    model.motor.sound=numeric(row.sound);
    model.performance.nominalAirflow=numeric(row.maxAirflow);
    model.pricing.listPrice=numeric(row.price);
    model.pricing.currency='EUR';
    model.standard.altModel=altModel;
    model.standard.motorPower=numeric(row.power);
    model.standard.speed=numeric(row.speed);
    model.standard.voltage=text(row.voltage);
    model.standard.maxAirflow=numeric(row.maxAirflow);
    model.standard.sound=numeric(row.sound);
    model.standard.price=numeric(row.price);
    return model;
  }

  function createWorkbookModel(series,row,index){
    const id=`VORTICE-WORKBOOK-2026-2|${series.id}|${index+1}`;
    const altModel=text(row.altModel);
    const model={
      id,seriesId:series.id,model:altModel,display:altModel,altModel,catalogOnly:true,pole:0,
      pricing:{listPrice:numeric(row.price),currency:'EUR'},
      media:{image:series.media?.image||'',dimensionImage:'',gallery:[]},
      motor:{power:numeric(row.power),speed:numeric(row.speed),current:0,voltage:text(row.voltage),frequency:'',sound:numeric(row.sound)},
      technical:{},
      performance:{nominalAirflow:numeric(row.maxAirflow),points:[],sourcePoints:[],curves:[],operatingPoints:[],controls:[]},
      source:{catalogue:'Vortice workbook 2026.2',page:''},
      standard:{altModel,motorPower:numeric(row.power),speed:numeric(row.speed),voltage:text(row.voltage),maxAirflow:numeric(row.maxAirflow),sound:numeric(row.sound),price:numeric(row.price)}
    };
    extraById.set(id,model);
    catalog.models.push(model);
    if(!Array.isArray(series.modelIds))series.modelIds=[];
    if(!series.modelIds.includes(id))series.modelIds.push(id);
    if(!extraBySeries.has(String(series.id)))extraBySeries.set(String(series.id),[]);
    extraBySeries.get(String(series.id)).push(model);
    return model;
  }

  function productFor(model){
    const series=catalog.series.find(item=>String(item.id)===String(model.seriesId))||{};
    return {id:model.id,model:model.model,series:{id:series.id||model.seriesId,code:series.code||model.seriesId,title:series.title||model.seriesId,manufacturer:series.manufacturer||'Vortice',categories:[...(series.categories||[])]},media:model.media,description:series.description||{general:[],motor:[],applications:[]},pricing:model.pricing,motor:model.motor,technical:model.technical,performance:model.performance,source:model.source};
  }

  const rowsBySeries=new Map();
  for(const row of rows){
    const key=identity(row.series);
    if(!rowsBySeries.has(key))rowsBySeries.set(key,[]);
    rowsBySeries.get(key).push(row);
  }
  for(const series of catalog.series){
    if(!isVortice(series))continue;
    const seriesRows=rowsBySeries.get(identity(series.code||series.id||series.title))||[];
    if(!seriesRows.length)continue;
    const categories=[...new Set(seriesRows.flatMap(row=>row.categories||[]).filter(Boolean))];
    if(categories.length){series.categories=[...categories];series.category=[...categories];}
  }

  rows.forEach((row,index)=>{
    const series=seriesFor(row);
    if(!series){unmatched.push(`${row.series}|${row.altModel}`);return;}
    const existing=findExisting(series,row);
    const model=existing?applyRow(existing,row):createWorkbookModel(series,row,index);
    usedIds.add(String(model.id));
    (existing?matched:aliases).push(String(model.id));
  });

  for(const series of catalog.series){
    if(!isVortice(series))continue;
    series.submodels=catalog.models
      .filter(model=>String(model.seriesId)===String(series.id))
      .map(model=>text(model.standard?.altModel||model.altModel||model.model||model.display))
      .filter(Boolean);
  }

  catalog.getModel=id=>{
    const key=String(id||'');
    return extraById.get(key)||(originalGetModel?originalGetModel(id):catalog.models.find(model=>String(model.id)===key)||null);
  };
  catalog.modelsForSeries=id=>catalog.models.filter(model=>String(model.seriesId)===String(id));
  catalog.product=id=>{
    const key=String(id||'');
    const current=catalog.models.find(model=>String(model.id)===key);
    const series=current&&catalog.series.find(item=>String(item.id)===String(current.seriesId));
    if(current&&series&&isVortice(series))return productFor(current);
    return originalProduct?originalProduct(id):null;
  };

  const products=window.VensisProducts;
  if(products&&typeof products==='object'){
    if(typeof products.get==='function'){
      const original=products.get.bind(products);
      products.get=key=>{
        const id=String(key||'');
        const current=catalog.models.find(model=>String(model.id)===id);
        const series=current&&catalog.series.find(item=>String(item.id)===String(current.seriesId));
        return current&&series&&isVortice(series)?productFor(current):original(key);
      };
    }
    if(typeof products.fromResult==='function'){
      const original=products.fromResult.bind(products);
      products.fromResult=result=>{
        const id=String(result?.productKey||result?.key||result?.id||'');
        const current=catalog.models.find(model=>String(model.id)===id);
        const series=current&&catalog.series.find(item=>String(item.id)===String(current.seriesId));
        return current&&series&&isVortice(series)?productFor(current):original(result);
      };
    }
  }

  catalog.vorticeWorkbook={version:'2026.2-sound-r4-clean-altmodels',rows:rows.length,matched:matched.length,catalogOnlyAliases:aliases.length,applied:matched.length+aliases.length,unmatched};
  delete window.VensisVorticeWorkbookRows;
})();

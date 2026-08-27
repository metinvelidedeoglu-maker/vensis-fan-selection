(function(){
  'use strict';

  const catalog=window.VensisCatalog;
  const rows=Array.isArray(window.VensisSPWorkbookRows)?window.VensisSPWorkbookRows:[];
  if(!catalog||!Array.isArray(catalog.series)||!Array.isArray(catalog.models)||!rows.length)return;

  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const identity=value=>text(value).toUpperCase().replace(/[–—]/g,'-').replace(/\s*\/\s*/g,'/').replace(/\s*-\s*/g,'-').replace(/(\d),(\d)/g,'$1.$2');
  const compact=value=>identity(value).replace(/[^A-Z0-9]/g,'');
  const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:null;};
  const isSP=series=>identity(series?.manufacturer)==='SOLER & PALAU';
  const originalGetModel=typeof catalog.getModel==='function'?catalog.getModel.bind(catalog):null;
  const originalGetSeries=typeof catalog.getSeries==='function'?catalog.getSeries.bind(catalog):null;
  const originalProduct=typeof catalog.product==='function'?catalog.product.bind(catalog):null;
  const originalModelsForSeries=typeof catalog.modelsForSeries==='function'?catalog.modelsForSeries.bind(catalog):null;
  const aliasById=new Map();
  const keptIds=new Set();
  const matched=[];
  const aliases=[];
  const unmatchedSeries=[];

  function seriesFor(row){
    const wanted=identity(row.series);
    return catalog.series.find(series=>isSP(series)&&[series?.id,series?.code,series?.title].some(value=>identity(value)===wanted))||null;
  }

  function sourceModels(series){
    const direct=(catalog.models||[]).filter(model=>String(model.seriesId)===String(series.id));
    if(direct.length)return direct;
    return originalModelsForSeries?originalModelsForSeries(series.id):[];
  }

  function findExisting(series,row){
    const models=sourceModels(series).filter(model=>!keptIds.has(String(model.id)));
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
      return key.length>=5&&(wantedCompact.endsWith(key)||key.endsWith(wantedCompact));
    }));
    return suffix.length===1?suffix[0]:null;
  }

  function applyRow(model,row){
    model.motor=model.motor||{};
    model.performance=model.performance||{};
    model.pricing=model.pricing||{};
    model.standard=model.standard||{};
    const power=finite(row.power),speed=finite(row.speed),airflow=finite(row.maxAirflow),sound=finite(row.sound),price=finite(row.price);
    if(power!=null)model.motor.power=power;
    if(speed!=null)model.motor.speed=speed;
    if(text(row.voltage))model.motor.voltage=text(row.voltage);
    if(sound!=null)model.motor.sound=sound;
    if(airflow!=null)model.performance.nominalAirflow=airflow;
    if(price!=null)model.pricing.listPrice=price;
    model.pricing.currency='EUR';
    model.standard.altModel=text(row.altModel);
    model.standard.motorPower=power;
    model.standard.speed=speed;
    model.standard.voltage=text(row.voltage);
    model.standard.maxAirflow=airflow;
    model.standard.sound=sound;
    model.standard.price=price;
    delete model.standard.current;
    return model;
  }

  function createAlias(series,row,index){
    const id=`SP-WORKBOOK-2026-2|${series.id}|${index+1}`;
    const model={
      id,seriesId:series.id,model:text(row.altModel),display:text(row.altModel),catalogOnly:true,pole:0,
      pricing:{listPrice:finite(row.price),currency:'EUR'},
      media:{image:series.media?.image||'',dimensionImage:'',gallery:[]},
      motor:{power:finite(row.power)||0,speed:finite(row.speed)||0,current:0,voltage:text(row.voltage),frequency:'',sound:finite(row.sound)||0},
      technical:{},
      performance:{nominalAirflow:finite(row.maxAirflow)||0,points:[],sourcePoints:[],curves:[],operatingPoints:[],controls:[]},
      source:{catalogue:'S&P priced workbook 2026',page:''},
      standard:{altModel:text(row.altModel),motorPower:finite(row.power),speed:finite(row.speed),voltage:text(row.voltage),maxAirflow:finite(row.maxAirflow),sound:finite(row.sound),price:finite(row.price)}
    };
    aliasById.set(id,model);
    catalog.models.push(model);
    if(!Array.isArray(series.modelIds))series.modelIds=[];
    if(!series.modelIds.includes(id))series.modelIds.push(id);
    return model;
  }

  function productFor(model){
    const series=catalog.series.find(item=>String(item.id)===String(model.seriesId))||{};
    return {id:model.id,model:model.model,series:{id:series.id||model.seriesId,code:series.code||model.seriesId,title:series.title||model.seriesId,manufacturer:series.manufacturer||'Soler & Palau',categories:[...(series.categories||[])]},media:model.media,description:series.description||{general:[],motor:[],applications:[]},pricing:model.pricing,motor:model.motor,technical:model.technical,performance:model.performance,source:model.source};
  }

  const rowsBySeries=new Map();
  for(const row of rows){
    const key=identity(row.series);
    if(!rowsBySeries.has(key))rowsBySeries.set(key,[]);
    rowsBySeries.get(key).push(row);
  }
  for(const series of catalog.series){
    if(!isSP(series))continue;
    const seriesRows=rowsBySeries.get(identity(series.code||series.id||series.title))||[];
    if(!seriesRows.length)continue;
    const categories=[...new Set(seriesRows.flatMap(row=>row.categories||[]).filter(Boolean))];
    if(categories.length){series.categories=[...categories];series.category=[...categories];}
  }

  rows.forEach((row,index)=>{
    const series=seriesFor(row);
    if(!series){unmatchedSeries.push(`${row.series}|${row.altModel}`);return;}
    const existing=findExisting(series,row);
    const model=existing?applyRow(existing,row):applyRow(createAlias(series,row,index),row);
    keptIds.add(String(model.id));
    (existing?matched:aliases).push(String(model.id));
  });

  // Safety: only prune when every workbook row resolved to a known S&P series.
  if(!unmatchedSeries.length){
    const removedIds=new Set(catalog.models.filter(model=>{
      const series=catalog.series.find(item=>String(item.id)===String(model.seriesId));
      return isSP(series)&&!keptIds.has(String(model.id));
    }).map(model=>String(model.id)));
    catalog.models.splice(0,catalog.models.length,...catalog.models.filter(model=>!removedIds.has(String(model.id))));
    for(const series of catalog.series){
      if(isSP(series)&&Array.isArray(series.modelIds))series.modelIds=series.modelIds.filter(id=>keptIds.has(String(id)));
    }
    const removedSeriesIds=new Set(catalog.series.filter(series=>isSP(series)&&!(series.modelIds||[]).length).map(series=>String(series.id)));
    catalog.series.splice(0,catalog.series.length,...catalog.series.filter(series=>!removedSeriesIds.has(String(series.id))));

    catalog.getModel=id=>{
      const key=String(id||'');
      if(aliasById.has(key))return aliasById.get(key);
      if(removedIds.has(key))return null;
      return originalGetModel?originalGetModel(id):catalog.models.find(model=>String(model.id)===key)||null;
    };
    catalog.getSeries=id=>removedSeriesIds.has(String(id||''))?null:(originalGetSeries?originalGetSeries(id):catalog.series.find(series=>String(series.id)===String(id))||null);
    catalog.modelsForSeries=id=>{
      const series=catalog.series.find(item=>String(item.id)===String(id));
      if(series&&isSP(series))return catalog.models.filter(model=>String(model.seriesId)===String(id));
      return originalModelsForSeries?originalModelsForSeries(id):catalog.models.filter(model=>String(model.seriesId)===String(id));
    };
    catalog.product=id=>{
      const key=String(id||'');
      const alias=aliasById.get(key);
      if(alias)return productFor(alias);
      if(removedIds.has(key))return null;
      return originalProduct?originalProduct(id):null;
    };
    const products=window.VensisProducts;
    if(products&&typeof products==='object'){
      if(typeof products.get==='function'){
        const original=products.get.bind(products);
        products.get=key=>{const id=String(key||'');const alias=aliasById.get(id);return alias?productFor(alias):(removedIds.has(id)?null:original(key));};
      }
      if(typeof products.fromResult==='function'){
        const original=products.fromResult.bind(products);
        products.fromResult=result=>{const id=String(result?.productKey||result?.key||result?.id||'');const alias=aliasById.get(id);return alias?productFor(alias):(removedIds.has(id)?null:original(result));};
      }
    }
    catalog.solerPalauWorkbook={version:'2026-priced-r1',rows:rows.length,matched:matched.length,catalogOnlyAliases:aliases.length,applied:matched.length+aliases.length,removed:removedIds.size,removedSeries:removedSeriesIds.size,remaining:catalog.models.filter(model=>{const series=catalog.series.find(item=>String(item.id)===String(model.seriesId));return isSP(series);}).length,unmatchedSeries};
  }else{
    catalog.solerPalauWorkbook={version:'2026-priced-r1',rows:rows.length,matched:matched.length,catalogOnlyAliases:aliases.length,applied:matched.length+aliases.length,removed:0,removedSeries:0,remaining:null,unmatchedSeries};
  }

  delete window.VensisSPWorkbookRows;
})();

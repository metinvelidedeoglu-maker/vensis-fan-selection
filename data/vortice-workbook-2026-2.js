(function(){
  'use strict';

  const catalog=window.VensisCatalog;
  const rows=Array.isArray(window.VensisVorticeWorkbookRows)?window.VensisVorticeWorkbookRows:[];
  if(!catalog||!Array.isArray(catalog.series)||!rows.length)return;

  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const identity=value=>text(value).toUpperCase().replace(/(\d),(\d)/g,'$1.$2');
  const numeric=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
  const isVortice=series=>identity(series?.manufacturer)==='VORTICE';
  const originalGetModel=typeof catalog.getModel==='function'?catalog.getModel.bind(catalog):null;
  const originalProduct=typeof catalog.product==='function'?catalog.product.bind(catalog):null;
  const originalModelsForSeries=typeof catalog.modelsForSeries==='function'?catalog.modelsForSeries.bind(catalog):null;
  const extraById=new Map();
  const extraBySeries=new Map();
  const matched=[];
  const aliases=[];
  const unmatched=[];

  function seriesFor(row){
    const wanted=identity(row.series);
    return catalog.series.find(series=>
      isVortice(series)&&
      [series?.id,series?.code,series?.title].some(value=>identity(value)===wanted)
    )||null;
  }

  function sourceModels(series){
    if(originalModelsForSeries)return originalModelsForSeries(series.id);
    return (catalog.models||[]).filter(model=>String(model.seriesId)===String(series.id));
  }

  function findExisting(series,row){
    const wanted=identity(row.altModel);
    const models=sourceModels(series);
    return models.find(model=>[
      model?.standard?.altModel,
      model?.altModel,
      model?.model,
      model?.display,
      model?.id
    ].some(value=>identity(value)===wanted))||null;
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
    const model={
      id,
      seriesId:series.id,
      model:text(row.altModel),
      display:text(row.altModel),
      altModel:text(row.altModel),
      catalogOnly:true,
      pole:0,
      pricing:{listPrice:numeric(row.price),currency:'EUR'},
      media:{image:series.media?.image||'',dimensionImage:'',gallery:[]},
      motor:{power:numeric(row.power),speed:numeric(row.speed),current:0,voltage:text(row.voltage),frequency:'',sound:numeric(row.sound)},
      technical:{},
      performance:{nominalAirflow:numeric(row.maxAirflow),points:[],sourcePoints:[],curves:[],operatingPoints:[],controls:[]},
      source:{catalogue:'Vortice workbook 2026.2',page:''},
      standard:{
        altModel:text(row.altModel),
        motorPower:numeric(row.power),
        speed:numeric(row.speed),
        voltage:text(row.voltage),
        maxAirflow:numeric(row.maxAirflow),
        sound:numeric(row.sound),
        price:numeric(row.price)
      }
    };
    extraById.set(id,model);
    if(!extraBySeries.has(series.id))extraBySeries.set(series.id,[]);
    extraBySeries.get(series.id).push(model);
    return model;
  }

  function productForModel(model){
    const series=catalog.series.find(item=>String(item.id)===String(model.seriesId))||{};
    return {
      id:model.id,
      model:model.model,
      series:{
        id:series.id||model.seriesId,
        code:series.code||model.seriesId,
        title:series.title||model.seriesId,
        manufacturer:series.manufacturer||'Vortice',
        categories:[...(series.categories||[])]
      },
      media:model.media,
      description:series.description||{general:[],motor:[],applications:[]},
      pricing:model.pricing,
      motor:model.motor,
      technical:model.technical,
      performance:model.performance,
      source:model.source
    };
  }

  const rowsBySeries=new Map();
  rows.forEach(row=>{
    const key=identity(row.series);
    if(!rowsBySeries.has(key))rowsBySeries.set(key,[]);
    rowsBySeries.get(key).push(row);
  });

  for(const series of catalog.series){
    if(!isVortice(series))continue;
    const seriesRows=rowsBySeries.get(identity(series.code||series.id||series.title))||[];
    if(!seriesRows.length)continue;
    const categories=[...new Set(seriesRows.flatMap(row=>row.categories||[]).filter(Boolean))];
    if(categories.length){
      series.categories=[...categories];
      series.category=[...categories];
    }
  }

  rows.forEach((row,index)=>{
    const series=seriesFor(row);
    if(!series){
      unmatched.push(`${row.series}|${row.altModel}`);
      return;
    }
    const existing=findExisting(series,row);
    if(existing){
      applyRow(existing,row);
      matched.push(existing.id);
      return;
    }
    const extra=createWorkbookModel(series,row,index);
    aliases.push(extra.id);
  });

  for(const series of catalog.series){
    if(!isVortice(series))continue;
    series.submodels=[
      ...sourceModels(series),
      ...(extraBySeries.get(String(series.id))||[])
    ].map(model=>text(model.standard?.altModel||model.altModel||model.model||model.display)).filter(Boolean);
  }

  if(extraById.size||matched.length){
    catalog.getModel=id=>extraById.get(String(id||''))||(originalGetModel?originalGetModel(id):null);
    catalog.product=id=>{
      const key=String(id||'');
      const extra=extraById.get(key);
      if(extra)return productForModel(extra);
      const current=catalog.models.find(model=>String(model.id)===key);
      const currentSeries=current&&catalog.series.find(series=>String(series.id)===String(current.seriesId));
      if(current&&currentSeries&&isVortice(currentSeries))return productForModel(current);
      return originalProduct?originalProduct(id):null;
    };
    catalog.modelsForSeries=id=>[
      ...(originalModelsForSeries?originalModelsForSeries(id):(catalog.models||[]).filter(model=>String(model.seriesId)===String(id))),
      ...(extraBySeries.get(String(id||''))||[])
    ];
  }

  catalog.vorticeWorkbook={
    version:'2026.2-sound-r3-altmodel-source',
    rows:rows.length,
    matched:matched.length,
    catalogOnlyAliases:aliases.length,
    applied:matched.length+aliases.length,
    unmatched
  };

  delete window.VensisVorticeWorkbookRows;
})();

(function(){
  'use strict';

  const catalog=window.VensisCatalog;
  if(!catalog||!Array.isArray(catalog.series)||!Array.isArray(catalog.models))return;

  const isVorticeSeries=series=>String(series?.manufacturer||'').trim().toLowerCase()==='vortice';
  const vorticeSeriesIds=new Set(catalog.series.filter(isVorticeSeries).map(series=>String(series.id)));
  const hasPrice=model=>Number(model?.pricing?.listPrice)>0;
  const removedIds=new Set(
    catalog.models
      .filter(model=>vorticeSeriesIds.has(String(model?.seriesId))&&!hasPrice(model))
      .map(model=>String(model.id))
  );

  if(!removedIds.size){
    catalog.vorticePricePolicy={removed:0,remaining:catalog.models.filter(model=>vorticeSeriesIds.has(String(model?.seriesId))).length};
    return;
  }

  // Remove unpriced Vortice models from the public catalog collection.
  catalog.models.splice(0,catalog.models.length,...catalog.models.filter(model=>!removedIds.has(String(model?.id))));

  // Keep each series' model index in sync with the filtered model collection.
  for(const series of catalog.series){
    if(!Array.isArray(series?.modelIds))continue;
    series.modelIds=series.modelIds.filter(id=>!removedIds.has(String(id)));
  }

  // If a Vortice series has no priced model left, remove the empty series as well.
  const removedSeriesIds=new Set(
    catalog.series
      .filter(series=>isVorticeSeries(series)&&!(series.modelIds||[]).length)
      .map(series=>String(series.id))
  );
  catalog.series.splice(0,catalog.series.length,...catalog.series.filter(series=>!removedSeriesIds.has(String(series?.id))));

  // Guard direct lookups too, so removed products cannot reappear through an old ID.
  if(typeof catalog.getModel==='function'){
    const originalGetModel=catalog.getModel.bind(catalog);
    catalog.getModel=id=>removedIds.has(String(id||''))?null:originalGetModel(id);
  }
  if(typeof catalog.getSeries==='function'){
    const originalGetSeries=catalog.getSeries.bind(catalog);
    catalog.getSeries=id=>removedSeriesIds.has(String(id||''))?null:originalGetSeries(id);
  }
  if(typeof catalog.modelsForSeries==='function'){
    const originalModelsForSeries=catalog.modelsForSeries.bind(catalog);
    catalog.modelsForSeries=id=>removedSeriesIds.has(String(id||''))?[]:originalModelsForSeries(id).filter(model=>!removedIds.has(String(model?.id)));
  }
  if(typeof catalog.product==='function'){
    const originalProduct=catalog.product.bind(catalog);
    catalog.product=id=>removedIds.has(String(id||''))?null:originalProduct(id);
  }

  const products=window.VensisProducts;
  if(products&&typeof products==='object'){
    if(typeof products.get==='function'){
      const originalGet=products.get.bind(products);
      products.get=key=>removedIds.has(String(key||''))?null:originalGet(key);
    }
    if(typeof products.fromResult==='function'){
      const originalFromResult=products.fromResult.bind(products);
      products.fromResult=result=>{
        const key=String(result?.productKey||result?.key||result?.id||'');
        return removedIds.has(key)?null:originalFromResult(result);
      };
    }
  }

  catalog.vorticePricePolicy={
    removed:removedIds.size,
    removedSeries:removedSeriesIds.size,
    remaining:catalog.models.filter(model=>vorticeSeriesIds.has(String(model?.seriesId))).length
  };
})();

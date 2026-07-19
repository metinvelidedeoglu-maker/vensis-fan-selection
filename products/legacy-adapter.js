(function(){
  const catalog=window.VensisCatalog;
  const products=window.VensisProducts;
  if(!catalog||!products)return;

  function legacyProduct(model){
    if(!model)return null;
    const series=catalog.getSeries(model.seriesId)||{};
    return {
      id:model.id,
      model:model.model,
      series:{code:series.code||model.seriesId,title:series.title||series.code||model.seriesId},
      media:{image:series.image||''},
      description:series.description||{general:[],motor:[],applications:[]},
      pricing:model.pricing,
      technical:{
        motorPower:model.motor?.power||0,
        speed:model.motor?.speed||0,
        current:model.motor?.current||0,
        sound:model.motor?.sound||0,
        voltage:model.motor?.voltage||'',
        atex:Boolean(model.technical?.atex),
        fireClass:model.technical?.fireClass||'',
        sourcePage:model.source?.page||'',
        tags:series.categories||[]
      },
      performance:model.performance
    };
  }

  products.getModel=products.get;
  products.get=key=>legacyProduct(catalog.getModel(String(key||'')));
  products.fromResult=result=>legacyProduct(catalog.getModel(String(result?.key||result?.id||'')));
})();
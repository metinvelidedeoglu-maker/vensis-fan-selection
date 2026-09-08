(function(){
  'use strict';

  const positive=value=>{
    const number=Number(value);
    return Number.isFinite(number)&&number>0?number:0;
  };
  const text=value=>String(value??'').trim();

  function refreshCatalogPolicies(){
    try{window.VensisSPSilentPolicy20260908?.applyCatalog?.()}catch{}
  }

  function modelFor(item){
    if(!item||item.mode==='custom')return null;
    const key=text(item.productKey);
    const direct=key?window.VensisCatalog?.getModel?.(key):null;
    if(direct)return direct;
    const modelName=text(item.model);
    if(!modelName)return null;
    return (window.VensisCatalog?.models||[]).find(model=>text(model?.model||model?.display)===modelName)||null;
  }

  function enrichItems(items){
    if(!Array.isArray(items))return false;
    refreshCatalogPolicies();
    let changed=false;
    for(const item of items){
      const model=modelFor(item);
      const listPrice=positive(model?.pricing?.listPrice);
      if(!model||!listPrice)continue;
      const source=text(item.priceSource).toLowerCase();
      if(source==='manual')continue;
      const currentPrice=positive(item.price);
      if(currentPrice!==listPrice){
        item.price=listPrice;
        changed=true;
      }
      const nextSource=text(model.pricing?.catalogue)||'catalog';
      const nextCurrency=text(model.pricing?.currency)||'EUR';
      if(text(item.priceSource)!==nextSource){item.priceSource=nextSource;changed=true}
      if(text(item.priceCurrency)!==nextCurrency){item.priceCurrency=nextCurrency;changed=true}
    }
    return changed;
  }

  window.VensisPricing={enrichItems,modelFor};
})();

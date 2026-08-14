(function(){
  'use strict';

  const positive=value=>{
    const number=Number(value);
    return Number.isFinite(number)&&number>0?number:0;
  };

  function modelFor(item){
    if(!item||item.mode==='custom'||!String(item.productKey||'').trim())return null;
    return window.VensisCatalog?.getModel?.(item.productKey)||null;
  }

  function enrichItems(items){
    if(!Array.isArray(items))return false;
    let changed=false;
    for(const item of items){
      const model=modelFor(item);
      const listPrice=positive(model?.pricing?.listPrice);
      if(!model||!listPrice||String(item.priceSource||'').trim())continue;
      const currentPrice=positive(item.price);
      if(!currentPrice){
        item.price=listPrice;
        changed=true;
      }else if(currentPrice!==listPrice){
        continue;
      }
      item.priceSource=String(model.pricing?.catalogue||'catalog');
      item.priceCurrency=String(model.pricing?.currency||'EUR');
      changed=true;
    }
    return changed;
  }

  window.VensisPricing={enrichItems,modelFor};
})();

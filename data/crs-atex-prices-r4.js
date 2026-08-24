(function(){
  'use strict';

  const prices = {
    'CRS40-2T-5.5': 4300,
    'CRS80-4T-25': 10700
  };

  const models = window.VensisCatalog && Array.isArray(window.VensisCatalog.models)
    ? window.VensisCatalog.models
    : [];

  for (const model of models) {
    if (String(model.seriesId || '') !== 'CRS/ATEX') continue;

    const productCode = String(model.technical?.productCode || '').trim();
    if (!Object.prototype.hasOwnProperty.call(prices, productCode)) continue;

    model.pricing = {
      ...(model.pricing || {}),
      listPrice: prices[productCode],
      currency: 'EUR',
      catalogue: 'CRS/ATEX manual price 2026-08-24'
    };
  }
})();

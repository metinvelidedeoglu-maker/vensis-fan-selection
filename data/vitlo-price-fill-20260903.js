(function(){
  'use strict';

  window.models=Array.isArray(window.models)?window.models:[];

  const source='Vitlo_Tum_Teklif_Urunleri_Zone2_Zone22_EEXE_Haric(1).xlsx';
  const prices={
    'CRH 35-4T':920,
    'CRH 40-4T':1070,
    'CRH/ATEX 35-4T-0.75':1960,
    'CRH/ATEX 45-4T-2':2500,
    'CRH/ATEX 56-4T-4':3660,
    'CRH/ATEX 71-4T-15':6600,
    'CRK 31-4T':1180,
    'CRK 35-4T':1280,
    'CRK 40-4T':1530,
    'CRK 45-2T-10':4900,
    'CRK/ATEX 35-4T':2960,
    'CRK/ATEX 40-4T-1':2560,
    'CRK/ATEX 71-4T-15':8360,
    'CRK/ATEX 80-4T-25':12700,
    'CRS 45-2T-10':1960,
    'CRS 50-4T':1600,
    'CRS 56-4T':1700,
    'CRS 71-4T-15':3520,
    'CRS/ATEX 31-4T':1750,
    'CRS/ATEX 35-4T-0.75':1920,
    'CRS/ATEX 45-2T-10':5720,
    'CRS/ATEX 56-2T-20':8720,
    'CRS/ATEX 56-4T':3500,
    'CRS/ATEX 71-4T':6900,
    'CRS/ATEX 71-4T-15':6900
  };

  // The worksheet contained two historical same-model price conflicts. The user
  // explicitly selected the values below on 2026-09-04, so they are now safe to
  // apply while retaining the discarded alternatives for auditability.
  const resolvedConflicts={
    'CRK/ATEX 35-4T':{price:2960,discarded:[2720]},
    'CRS 50-4T':{price:1600,discarded:[1400]}
  };

  function normalize(value){
    return String(value||'')
      .toUpperCase()
      .replace(/,/g,'.')
      .replace(/\s+/g,' ')
      .trim();
  }

  const priceMap=new Map(Object.entries(prices).map(([model,price])=>[normalize(model),price]));
  const applied=[];
  const alreadyPriced=[];
  const unmatched=[];

  for(const row of window.models){
    if(String(row?.brand||row?.manufacturer||'').trim().toUpperCase()!=='VITLO')continue;
    const model=normalize(row?.model||row?.configurationId||row?.display);
    if(!priceMap.has(model))continue;

    const price=priceMap.get(model);
    const existing=Number(row?.price);
    if(Number.isFinite(existing)&&existing>0){
      alreadyPriced.push({model:row.model,price:existing});
      continue;
    }

    row.price=price;
    row.priceCurrency='EUR';
    row.priceSource=source;
    applied.push({model:row.model,price});
  }

  const seen=new Set(window.models.map(row=>normalize(row?.model||row?.configurationId||row?.display)));
  for(const [model,price] of priceMap){
    if(!seen.has(model))unmatched.push({model,price});
  }

  window.VensisVitloPriceFill20260903Report={
    source,
    requestedUniqueModels:24,
    configuredModelAliases:Object.keys(prices).length,
    appliedCount:applied.length,
    applied,
    alreadyPricedCount:alreadyPriced.length,
    alreadyPriced,
    unmatched,
    conflicts:[],
    resolvedConflicts:Object.entries(resolvedConflicts).map(([model,detail])=>({model,...detail})),
    generatedAt:new Date().toISOString()
  };
})();

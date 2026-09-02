(function(){
  'use strict';

  const sourceRows=[{"model":"AXB/ATEX 45-2T-1","cert":"II 2G EEX-D IIC T4","price":2520},{"model":"AXD 112-4T-30","cert":"","price":3720},{"model":"AXD 35-2T-0,37","cert":"","price":520},{"model":"AXD 35-2T-0,55","cert":"","price":500},{"model":"AXD 35-2T-1","cert":"","price":560},{"model":"AXD 35-4T-0,18","cert":"","price":460},{"model":"AXD 40-2T-2","cert":"","price":620},{"model":"AXD/ATEX 35-2T-0,37","cert":"II 2G EEX-D IIC T4","price":1320},{"model":"AXD/ATEX 35-2T-0.37","cert":"II 3G EEX-E IIC T4","price":1300},{"model":"AXD/ATEX 35-2T-0.75","cert":"II 3G EEX-E IIC T4","price":1380},{"model":"AXD/ATEX 35-4T-0,18","cert":"II 2G EEX-D IIC T4","price":1260},{"model":"AXD/ATEX 40-2M-1","cert":"II 2G EEX-D IIC T4","price":1640},{"model":"AXD/ATEX 40-2T-1","cert":"II 2G EEX-D IIC T4","price":1530},{"model":"AXD/ATEX 40-2T-1,5","cert":"II 2G EEX-D IIC T4","price":1640},{"model":"AXD/ATEX 40-4T-0.27","cert":"II 2G EEX-D IIC T4","price":1300},{"model":"AXD/ATEX 56-4T-1.5","cert":"II 2G EEX-D IIC T4","price":1880},{"model":"AXD/ATEX 63-4T-1.5","cert":"II 2G EEX-D IIC T4","price":2060},{"model":"AXD/ATEX 71-4T-3","cert":"II 2G EEX-D IIC T4","price":2660},{"model":"AXF 112-4T-15 F300","cert":"","price":4540},{"model":"AXF 112-4T-25 F300","cert":"","price":5540},{"model":"AXF 35-2T-1 F300","cert":"","price":920},{"model":"AXF 40-2T-1 F300","cert":"","price":1030},{"model":"AXF 40-2T-1 F300","cert":"","price":960},{"model":"AXF 40-2T-2 F300","cert":"","price":920},{"model":"AXF 40-2T-2 F300","cert":"","price":960},{"model":"AXF 45-2T-4 F300","cert":"","price":1300},{"model":"AXH 50-2T-5,5","cert":"","price":1490},{"model":"AXH/ATEX 50-2T-5,5","cert":"ATEX 3D IIIC T135 DC","price":3160},{"model":"AXJ 35-2/4T F300 N: 56/14","cert":"","price":1200},{"model":"AXJ 40-2/4T F300 N: 76/19","cert":"","price":1360},{"model":"AXJ 40-2/4T F300 N: 84/21","cert":"","price":1360},{"model":"AXR 35-2T-0,37","cert":"","price":920},{"model":"AXR 90-4T-7.5","cert":"","price":2400},{"model":"AXR/ATEX 35-4T-0,18","cert":"II 2G EEx-d IIC T4","price":1670},{"model":"AXR/ATEX 35-4T-0,18","cert":"II 2G EEX-E IIB T3","price":1250},{"model":"AXR/ATEX 63-4T-1.5","cert":"II 2G EEX-D IIC T4","price":2600},{"model":"AXW 20-2M","cert":"","price":260},{"model":"AXW 35-2T-0,37","cert":"","price":440},{"model":"AXW 35-2T-0.37","cert":"","price":500},{"model":"AXW 35-2T-1 F300","cert":"","price":940},{"model":"AXW 40-2T-1 F300","cert":"","price":980},{"model":"AXW 40-4M-0.27","cert":"","price":460},{"model":"AXW 56-4T-1,5","cert":"","price":740},{"model":"AXW/ATEX 35-4M-0,18","cert":"II 2G EEX-D IIC T4","price":1300},{"model":"AXW/ATEX 35-4M-0.18","cert":"II 2G EEX-D IIC T4","price":1200},{"model":"AXW/ATEX 35-4M-0.18","cert":"II 2G EEX-E IIB T3","price":780},{"model":"AXW/ATEX 35-4T-0,18","cert":"II 2G EEX-E IIB T3","price":740},{"model":"AXW/ATEX 35-4T-0.18","cert":"II 2G EEX-D IIC T4","price":1140},{"model":"AXW/ATEX 35-4T-0.27","cert":"II 3G EEX-E IIC T4","price":620},{"model":"AXW/ATEX 35-6T-0,18","cert":"ATEX 3D IIIC T135 DC","price":620},{"model":"AXW/ATEX 40-4T-0.18","cert":"II 2G EEX-D IIC T4","price":1300},{"model":"AXW/ATEX 45-4T-0,55","cert":"II 2G EEX-D IIC T4","price":1500},{"model":"AXW/ATEX 45-4T-0.55","cert":"II 2G EEX-E IIB T3","price":1160},{"model":"AXW/ATEX 50-4M-0.55","cert":"II 2G EEX-D IIC T4","price":1580},{"model":"AXW/ATEX 50-4T-0,55","cert":"II 2G EEX D IIC T4","price":1530},{"model":"AXW/ATEX 50-4T-0,55","cert":"","price":1530},{"model":"AXW/ATEX 50-4T-0,75","cert":"II 2G EEX-D IIC T4","price":1600},{"model":"AXW/ATEX 56-4T-0,75","cert":"II 2G EEX-e IIB T3","price":1360},{"model":"AXW/ATEX 71-4T-3","cert":"II 2G EEX-D IIC T4","price":2960},{"model":"CR 20-2M","cert":"","price":270},{"model":"CR 20EC","cert":"","price":670},{"model":"CR 25-2M","cert":"","price":290},{"model":"CRB 700X400","cert":"","price":860},{"model":"CRH 35-4T","cert":"","price":920},{"model":"CRH 40-4T","cert":"","price":1070},{"model":"CRH/ATEX 35-4T-0,75","cert":"II 2G EEX-D IIC T4","price":1960},{"model":"CRH/ATEX 45-4T-2","cert":"II 2G EEX-D IIC T4","price":2500},{"model":"CRH/ATEX 56-4T-4","cert":"II 2G EEX-D IIC T4","price":3660},{"model":"CRH/ATEX 71-4T-15","cert":"II 2G EEX-D IIC T4","price":6600},{"model":"CRK 31-4T","cert":"","price":1180},{"model":"CRK 35-2T-4","cert":"","price":2960},{"model":"CRK 35-4T","cert":"","price":1280},{"model":"CRK 40-4T","cert":"","price":1530},{"model":"CRK 45-2T-10","cert":"","price":4900},{"model":"CRK/ATEX 35-4T","cert":"II 2G Eex-d IIC T4","price":2960},{"model":"CRK/ATEX 35-4T","cert":"II 2G Eex-d IIC T4","price":2720},{"model":"CRK/ATEX 40-4T-1","cert":"II 2G EEX-D IIC T4","price":2560},{"model":"CRK/ATEX 71-4T-15","cert":"II 2G EEx-d IIC T4","price":8360},{"model":"CRK/ATEX 80-4T-25","cert":"II 2G EEx-d IIC T4","price":12700},{"model":"CRS 100-4T-100","cert":"","price":18720},{"model":"CRS 45-2T-10","cert":"","price":1960},{"model":"CRS 50-4T","cert":"","price":1600},{"model":"CRS 50-4T","cert":"","price":1400},{"model":"CRS 56-4T","cert":"","price":1700},{"model":"CRS 71-2T-50","cert":"","price":11300},{"model":"CRS 71-4T-15","cert":"","price":3520},{"model":"CRS/ATEX 31-2T-2","cert":"II 3G EEX-E IIC T4","price":1560},{"model":"CRS/ATEX 31-4T","cert":"II 2G EEx-d IIC T4","price":1750},{"model":"CRS/ATEX 31-4T","cert":"II 3G EEX - EC IIC T4","price":960},{"model":"CRS/ATEX 35-4T-0.75","cert":"II 2G EEX-D IIC T4","price":1920},{"model":"CRS/ATEX 35-4T-0.75","cert":"II 3G EEX-E IIC T4","price":1180},{"model":"CRS/ATEX 40-4T","cert":"ATEX 3D IIIC T135 DC","price":1360},{"model":"CRS/ATEX 45-2T-10","cert":"II 2G EEX-D IIC T4","price":5720},{"model":"CRS/ATEX 45-2T-4","cert":"II 3G EEX - CC IIC T4","price":2840},{"model":"CRS/ATEX 50-2T-7,5","cert":"II 3G EEX - CC IIC T4","price":4200},{"model":"CRS/ATEX 56-2T-20","cert":"II 2G EEX-D IIC T4","price":8720},{"model":"CRS/ATEX 56-4T","cert":"II 2G EEX-D IIC T4","price":3500},{"model":"CRS/ATEX 63-2T-15","cert":"II 3G EEX - CC IIC T4","price":5600},{"model":"CRS/ATEX 63-2T-40","cert":"II 2G EEX-D IIC T4","price":15920},{"model":"CRS/ATEX 63-4T-7.5","cert":"II 2G EEX-E IIB T3 ","price":4320},{"model":"CRS/ATEX 63-4T-7.5","cert":"II 3G EEX-E IIC T4 ","price":3960},{"model":"CRS/ATEX 71-2T-50","cert":"II 2G EEX-D IIC T4","price":17400},{"model":"CRS/ATEX 71-4T","cert":"II 2G EEX-D IIC T4","price":6900},{"model":"CRS/ATEX 71-4T-15","cert":"II 2G EEX-D IIC T4","price":6900},{"model":"CRU 25-2M","cert":"","price":370},{"model":"CRU 35-4M","cert":"","price":800},{"model":"CRV 28-2T","cert":"","price":1260},{"model":"CRV 40-4T","cert":"","price":1200},{"model":"MOB-AXD/ATEX 35-2T-0.75","cert":"II 2G EEx-d IIC T4","price":2560}];
  const models=Array.isArray(window.models)?window.models:[];
  const text=value=>String(value??'').trim();

  function normalizeModel(value){
    return text(value)
      .toUpperCase()
      .replace(/(?<=\d),(?=\d)/g,'.')
      .replace(/\s*-\s*/g,'-')
      .replace(/\s+/g,' ')
      .trim();
  }

  function normalizeCertificate(value){
    return text(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function rowModelKeys(row){
    const candidates=[row?.model,row?.configurationId,row?.display];
    const keys=[];
    for(const value of candidates){
      let key=normalizeModel(value);
      if(!key)continue;
      key=key.replace(/\s*\(\s*[\d.,]+\s*M(?:³|3)\/H\s*\)\s*$/i,'');
      if(key&&!keys.includes(key))keys.push(key);
    }
    return keys;
  }

  function rowCertificate(row){
    return normalizeCertificate(
      row?.atexProtection||
      row?.atexMarking||
      row?.certification||
      row?.atex?.marking||
      row?.atex?.protection||
      row?.atex?.certificate||
      ''
    );
  }

  const byModel=new Map();
  for(const source of sourceRows){
    const key=normalizeModel(source.model);
    if(!key)continue;
    if(!byModel.has(key))byModel.set(key,[]);
    byModel.get(key).push({
      price:Number(source.price),
      cert:normalizeCertificate(source.cert),
      sourceModel:source.model,
      sourceCert:source.cert||''
    });
  }

  const report={
    source:'Vitlo_Tum_Teklif_Urunleri_Tekrarsiz(1).xlsx',
    currency:'EUR',
    filled:[],
    preserved:[],
    ambiguous:[],
    unmatched:[]
  };
  const matchedSourceKeys=new Set();

  for(const row of models){
    if(String(row?.brand||row?.manufacturer||'Vitlo').toUpperCase()!=='VITLO')continue;

    const keys=rowModelKeys(row);
    let key='';
    let candidates=[];
    for(const candidateKey of keys){
      const found=byModel.get(candidateKey);
      if(found?.length){
        key=candidateKey;
        candidates=found;
        break;
      }
    }
    if(!candidates.length)continue;
    matchedSourceKeys.add(key);

    const current=Number(row?.price);
    if(Number.isFinite(current)&&current>0){
      report.preserved.push({model:text(row.model||row.configurationId),price:current});
      continue;
    }

    let selectedPrice=null;
    const distinctPrices=[...new Set(candidates.map(item=>item.price).filter(value=>Number.isFinite(value)&&value>0))];
    if(distinctPrices.length===1){
      selectedPrice=distinctPrices[0];
    }else{
      const cert=rowCertificate(row);
      if(cert){
        const certMatches=candidates.filter(item=>item.cert&&item.cert===cert);
        const certPrices=[...new Set(certMatches.map(item=>item.price).filter(value=>Number.isFinite(value)&&value>0))];
        if(certPrices.length===1)selectedPrice=certPrices[0];
      }
    }

    if(!(Number.isFinite(selectedPrice)&&selectedPrice>0)){
      report.ambiguous.push({
        model:text(row.model||row.configurationId),
        candidates:candidates.map(item=>({price:item.price,cert:item.sourceCert}))
      });
      continue;
    }

    row.price=selectedPrice;
    row.priceCurrency='EUR';
    row.priceSource='Historical Vensis quote list 2026-09-02';
    report.filled.push({model:text(row.model||row.configurationId),price:selectedPrice});
  }

  for(const [key,candidates] of byModel.entries()){
    if(matchedSourceKeys.has(key))continue;
    report.unmatched.push({
      model:candidates[0]?.sourceModel||key,
      prices:[...new Set(candidates.map(item=>item.price))]
    });
  }

  window.VensisQuotePriceFillReport=report;
})();

(function(){
  'use strict';

  const path=String(location.pathname||'').toLowerCase();
  if(!path.endsWith('catalog.html')&&!path.endsWith('catalog-brand.html'))return;

  const rows=Array.isArray(window.models)?window.models:[];
  if(!rows.length)return;

  const requested=String(new URLSearchParams(location.search).get('series')||'').trim();
  const normalize=value=>String(value||'').toUpperCase().replace(/\\/g,'/').replace(/\s+/g,' ').trim();
  const requestedKey=normalize(requested);
  const aliases={'MOB-AXD':'AXD/MOB','AXD-MOB':'AXD/MOB'};

  function rowMatchesRequested(row){
    if(!requestedKey)return false;
    const direct=aliases[normalize(row?.seriesCode)]||normalize(row?.seriesCode);
    if(direct&&direct===requestedKey)return true;
    const series=normalize(row?.series);
    const family=normalize(row?.family);
    const model=normalize(row?.model||row?.display);
    return series===requestedKey
      ||family===requestedKey
      ||series.startsWith(requestedKey+' ')
      ||series.startsWith(requestedKey+'-')
      ||family.startsWith(requestedKey+' ')
      ||family.startsWith(requestedKey+'-')
      ||model===requestedKey
      ||model.startsWith(requestedKey+' ')
      ||model.startsWith(requestedKey+'-');
  }

  let trimmed=0;
  for(const row of rows){
    if(rowMatchesRequested(row))continue;
    if(row&&typeof row==='object'){
      if(row.performanceCurves!=null)row.performanceCurves=[];
      if(row.curves!=null)row.curves=[];
      if(row.sourcePoints!=null)row.sourcePoints=[];
      if(row.points!=null)row.points=[];
      trimmed++;
    }
  }

  window.VensisCatalogPerformanceGuard={
    active:true,
    page:path.endsWith('catalog-brand.html')?'brand':'catalog',
    brand:window.VensisCatalogBrand||'',
    requestedSeries:requested,
    totalRows:rows.length,
    trimmedRows:trimmed
  };
})();

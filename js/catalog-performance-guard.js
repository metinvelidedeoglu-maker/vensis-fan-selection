(function(){
  'use strict';

  const path=String(location.pathname||'').toLowerCase();
  if(!path.endsWith('catalog.html'))return;

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
    const model=normalize(row?.model||row?.display);
    return series===requestedKey
      ||series.startsWith(requestedKey+' ')
      ||series.startsWith(requestedKey+'-')
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
    requestedSeries:requested,
    totalRows:rows.length,
    trimmedRows:trimmed
  };
})();

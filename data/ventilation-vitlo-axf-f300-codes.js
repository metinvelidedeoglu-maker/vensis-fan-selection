(function(){
  'use strict';
  // Update the actual shared catalogue model/product code, not a quotation-only label.
  // Stable model IDs and original URL slugs are deliberately retained.
  const data=window.VensisVentilationData;
  if(!data||data.schemaVersion!==3)return;
  const ids=new Set((data.series||[])
    .filter(series=>String(series.manufacturer||'').toLowerCase()==='vitlo'&&/^(AXF|BOX-AXF)$/i.test(String(series.code||'')))
    .map(series=>series.id));
  for(const model of data.models||[]){
    if(!ids.has(model.seriesId)||!/^F300$/i.test(String(model.technical?.fireRating||'').trim()))continue;
    const old=String(model.model||'').trim();
    if(!old||/\bF300\b/i.test(old))continue;
    const productCode=old+' F300';
    model.model=productCode;
    if(String(model.display||'').trim()===old)model.display=productCode;
    if(String(model.altModel||'').trim()===old)model.altModel=productCode;
    model.technical.productCode=productCode;
    model.legacyModelCode=old;
  }
})();

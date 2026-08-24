(function(){
  'use strict';

  const catalog = window.VensisCatalog;
  if(!catalog || !Array.isArray(catalog.series) || !Array.isArray(catalog.models)) return;

  const rawModels = Array.isArray(window.VensisRawModelsV2) ? window.VensisRawModelsV2 : [];
  const text = value => String(value ?? '').replace(/\s+/g,' ').trim();
  const finite = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const uniqueText = values => {
    const out = [];
    const seen = new Set();
    for(const value of values.flat(Infinity)){
      const clean = text(value);
      if(!clean) continue;
      const key = clean.toLocaleLowerCase('tr-TR');
      if(seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
  };
  const phaseLabel = value => {
    const raw = text(value);
    const key = raw.toLowerCase();
    if(!raw) return '';
    if(key.includes('three phase') || key.includes('3 phase') || key.includes('3~') || key.includes('trifaze')) return 'Trifaze';
    if(key.includes('single phase') || key.includes('1 phase') || key.includes('1~') || key.includes('monofaze')) return 'Monofaze';
    return raw;
  };
  const fullModelName = (series, model) => {
    const code = text(series?.code || series?.id);
    const current = text(model?.model || model?.display || model?.id);
    if(!code) return current;
    if(!current) return code;
    const c = current.toUpperCase();
    const s = code.toUpperCase();
    return c === s || c.startsWith(s+' ') || c.startsWith(s+'-') || c.startsWith(s+'/') ? current : `${code} ${current}`;
  };
  const maxAirflow = model => {
    const values = [finite(model?.performance?.nominalAirflow)];
    for(const point of model?.performance?.points || []) values.push(finite(point?.[1]));
    for(const point of model?.performance?.sourcePoints || []) values.push(finite(point?.[1]));
    for(const curve of model?.performance?.curves || []){
      for(const point of curve?.sourcePoints || []) values.push(finite(point?.[1]));
      for(const point of curve?.points || []) values.push(finite(point?.[1]));
    }
    for(const point of model?.performance?.operatingPoints || []) values.push(finite(point?.nominalAirflow));
    return Math.max(0, ...values);
  };
  const hasCurve = model => Boolean(
    (model?.performance?.points || []).length ||
    (model?.performance?.sourcePoints || []).length ||
    (model?.performance?.curves || []).some(curve => (curve?.sourcePoints || []).length || (curve?.points || []).length)
  );

  const rawBySeries = new Map();
  for(const row of rawModels){
    const id = String(row?.key || '');
    const normalized = id && typeof catalog.getModel === 'function' ? catalog.getModel(id) : null;
    const seriesId = normalized?.seriesId || text(row?.series || row?.family);
    if(!seriesId) continue;
    if(!rawBySeries.has(seriesId)) rawBySeries.set(seriesId, []);
    rawBySeries.get(seriesId).push(row);
  }

  for(const series of catalog.series){
    const models = typeof catalog.modelsForSeries === 'function'
      ? catalog.modelsForSeries(series.id)
      : catalog.models.filter(model => model.seriesId === series.id);
    const rawRows = rawBySeries.get(series.id) || [];
    const originalDescription = {
      general: [...(series?.description?.general || [])],
      motor: [...(series?.description?.motor || [])],
      applications: [...(series?.description?.applications || [])]
    };
    const descriptionParts = uniqueText([
      originalDescription.general,
      originalDescription.motor,
      originalDescription.applications,
      rawRows.flatMap(row => row?.catalogueInfo?.general || []),
      rawRows.flatMap(row => row?.catalogueInfo?.motor || []),
      rawRows.flatMap(row => row?.catalogueInfo?.applications || [])
    ]);
    const descriptionText = descriptionParts.join(' ');

    const pdfs = uniqueText([
      series?.catalogue?.pdf || '',
      rawRows.map(row => row?.catalogPdf || '')
    ]);

    series.schemaVersion = '2.0';
    series.modelName = text(series.code || series.title || series.id);
    series.brand = text(series.manufacturer);
    series.descriptionParts = originalDescription;
    series.descriptionText = descriptionText;
    series.description = {
      text: descriptionText,
      general: descriptionText ? [descriptionText] : [],
      motor: [],
      applications: []
    };
    series.category = [...(series.categories || [])];
    series.image = text(series?.media?.image);
    series.catalogPdf = pdfs[0] || '';
    series.catalogPdfs = pdfs;

    for(const model of models){
      const fullName = fullModelName(series, model);
      model.model = fullName;
      model.display = fullName;
      model.altModel = fullName;

      if(model.technical && Object.prototype.hasOwnProperty.call(model.technical,'productCode')){
        delete model.technical.productCode;
      }

      const standard = {
        altModel: fullName,
        motorPower: finite(model?.motor?.power),
        speed: finite(model?.motor?.speed),
        current: finite(model?.motor?.current),
        voltage: text(model?.motor?.voltage),
        frequency: text(model?.motor?.frequency),
        phase: phaseLabel(model?.technical?.phase),
        poles: finite(model?.technical?.poles || model?.pole),
        maxAirflow: maxAirflow(model),
        sound: finite(model?.motor?.sound),
        ip: text(model?.technical?.ipClass),
        insulation: text(model?.technical?.insulationClass),
        performanceCurve: hasCurve(model) ? 'mevcut' : '',
        hasPerformanceCurve: hasCurve(model),
        price: finite(model?.pricing?.listPrice),
        currency: text(model?.pricing?.currency || 'EUR')
      };

      model.standard = standard;
      model.technical = model.technical || {};
      model.technical.phase = standard.phase;
    }

    series.submodels = models.map(model => model.model);
  }

  catalog.schemaVersion = '2.0';
  catalog.standard = {
    seriesFields: ['modelName','brand','descriptionText','category','image','submodels','catalogPdf'],
    submodelFields: ['altModel','motorPower','speed','current','voltage','frequency','phase','poles','maxAirflow','sound','ip','insulation','performanceCurve','price','currency']
  };

  delete window.VensisRawModelsV2;
})();

(function(){
  'use strict';

  const catalog = window.VensisCatalog;
  if(!catalog || !Array.isArray(catalog.series) || !Array.isArray(catalog.models)) return;

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
    const alreadyContainsSeries = c === s || c.startsWith(s+' ') || c.startsWith(s+'-') || c.startsWith(s+'/') || c.includes(' '+s+' ') || c.endsWith(' '+s);
    return alreadyContainsSeries ? current : `${code} ${current}`;
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

  for(const series of catalog.series){
    const models = typeof catalog.modelsForSeries === 'function'
      ? catalog.modelsForSeries(series.id)
      : catalog.models.filter(model => model.seriesId === series.id);

    const originalDescription = {
      general: [...(series?.description?.general || [])],
      motor: [...(series?.description?.motor || [])],
      applications: [...(series?.description?.applications || [])]
    };
    const descriptionParts = uniqueText([
      originalDescription.general,
      originalDescription.motor,
      originalDescription.applications
    ]);
    const descriptionText = descriptionParts.join(' ');

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
    series.catalogPdf = text(series?.catalogue?.pdf);

    for(const model of models){
      const fullName = fullModelName(series, model);
      model.model = fullName;
      model.display = fullName;
      model.altModel = fullName;

      model.technical = model.technical || {};
      if(Object.prototype.hasOwnProperty.call(model.technical,'productCode')) delete model.technical.productCode;

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
      model.technical.phase = standard.phase;
    }

    series.submodels = models.map(model => model.model);
  }

  catalog.schemaVersion = '2.0';
  catalog.standard = {
    seriesFields: ['modelName','brand','descriptionText','category','image','submodels','catalogPdf'],
    submodelFields: ['altModel','motorPower','speed','current','voltage','frequency','phase','poles','maxAirflow','sound','ip','insulation','performanceCurve','price','currency']
  };

  function installCatalogUiPatch(){
    if(typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[ch]));
    const num = (value, digits=0) => {
      const n = Number(value);
      if(!Number.isFinite(n) || n <= 0) return '-';
      return n.toLocaleString('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
    };
    const money = (value, currency='EUR') => {
      const n = Number(value);
      if(!Number.isFinite(n) || n <= 0) return '-';
      return `${num(n, n % 1 ? 2 : 0)} ${String(currency || 'EUR').toUpperCase()}`;
    };
    const field = (label,value) => `<div class="model-field"><span>${esc(label)}</span><b>${esc(value || '-')}</b></div>`;

    function apply(){
      if(!document.body?.classList.contains('app-catalog')) return;

      const seriesId = new URLSearchParams(location.search).get('series');
      const series = seriesId && typeof catalog.getSeries === 'function' ? catalog.getSeries(seriesId) : null;
      const infoGrid = document.querySelector('.series-info-grid');
      if(series && infoGrid && infoGrid.dataset.schemaV2 !== '1'){
        infoGrid.dataset.schemaV2 = '1';
        infoGrid.style.gridTemplateColumns = '1fr';
        infoGrid.innerHTML = `<section class="detail-section"><h3>Description</h3><p style="margin:0;line-height:1.65;color:#334155">${esc(series.descriptionText || 'No information available.')}</p></section>`;
      }

      document.querySelectorAll('.model-card').forEach(card => {
        if(card.dataset.schemaV2 === '1') return;
        const button = card.querySelector('[data-model-datasheet]');
        const id = button?.dataset?.modelDatasheet;
        const model = id && typeof catalog.getModel === 'function' ? catalog.getModel(id) : null;
        const s = model?.standard;
        if(!model || !s) return;

        card.dataset.schemaV2 = '1';
        const title = card.querySelector('h3');
        if(title) title.textContent = s.altModel || model.model || '';

        const grid = card.querySelector('.model-grid');
        if(grid){
          grid.innerHTML = [
            field('Motor Power', s.motorPower > 0 ? `${num(s.motorPower,2)} kW` : '-'),
            field('Speed', s.speed > 0 ? `${num(s.speed)} rpm` : '-'),
            field('Current', s.current > 0 ? `${num(s.current,2)} A` : '-'),
            field('Voltage', s.voltage || '-'),
            field('Frequency', s.frequency || '-'),
            field('Phase', s.phase || '-'),
            field('Poles', s.poles > 0 ? num(s.poles) : '-'),
            field('Max. Airflow', s.maxAirflow > 0 ? `${num(s.maxAirflow)} m³/h` : '-'),
            field('Sound', s.sound > 0 ? `${num(s.sound)} dB(A)` : '-'),
            field('IP', s.ip || '-'),
            field('Insulation', s.insulation || '-'),
            field('Performance Curve', s.performanceCurve || '-'),
            field('Price', money(s.price,s.currency))
          ].join('');
        }

        const op = card.querySelector('.model-operating-points');
        if(op) op.hidden = true;
      });
    }

    let scheduled = false;
    const schedule = () => {
      if(scheduled) return;
      scheduled = true;
      Promise.resolve().then(() => {
        scheduled = false;
        apply();
      });
    };

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once:true});
    else schedule();
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  }

  installCatalogUiPatch();
})();

(function(){
  'use strict';

  const catalog = window.VensisCatalog;
  if(!catalog) return;

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
    const symbol = String(currency).toUpperCase()==='EUR' ? 'EUR' : String(currency||'');
    return `${num(n, n % 1 ? 2 : 0)} ${symbol}`.trim();
  };
  const field = (label,value) => `<div class="model-field"><span>${esc(label)}</span><b>${esc(value || '-')}</b></div>`;

  function applySeriesDescription(){
    const id = new URLSearchParams(location.search).get('series');
    if(!id) return;
    const series = typeof catalog.getSeries === 'function' ? catalog.getSeries(id) : null;
    const grid = document.querySelector('.series-info-grid');
    if(!series || !grid) return;
    grid.style.gridTemplateColumns = '1fr';
    grid.innerHTML = `<section class="detail-section"><h3>Description</h3><p style="margin:0;line-height:1.65;color:#334155">${esc(series.descriptionText || 'No information available.')}</p></section>`;
  }

  function applyModelTemplate(){
    document.querySelectorAll('.model-card').forEach(card => {
      const button = card.querySelector('[data-model-datasheet]');
      const id = button?.dataset?.modelDatasheet;
      const model = id && typeof catalog.getModel === 'function' ? catalog.getModel(id) : null;
      const s = model?.standard;
      if(!model || !s) return;

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

  function apply(){
    applySeriesDescription();
    applyModelTemplate();
  }

  apply();
  setTimeout(apply,0);
})();

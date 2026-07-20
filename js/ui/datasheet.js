(function(){
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)||0);
  const positive=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null};

  function normalizePoints(points){
    const map=new Map();
    for(const point of points||[]){
      const p=Number(point?.[0]),q=Number(point?.[1]);
      if(Number.isFinite(p)&&Number.isFinite(q)&&p>=0&&q>=0)map.set(`${p}|${q}`,{p,q});
    }
    return [...map.values()].sort((a,b)=>a.q-b.q||b.p-a.p);
  }

  function niceScaleMax(value,targetTicks=10){
    if(!(value>0))return 1;
    const rough=value/targetTicks;
    const magnitude=Math.pow(10,Math.floor(Math.log10(rough)));
    const normalized=rough/magnitude;
    const factor=normalized<=1?1:normalized<=2?2:normalized<=5?5:10;
    const step=factor*magnitude;
    return Math.ceil(value/step)*step;
  }

  function curveSvg(options={}){
    const dense=normalizePoints(options.points);
    const source=normalizePoints(options.sourcePoints?.length?options.sourcePoints:options.points);
    const curve=dense.length?dense:source;
    if(curve.length<2)return '<div class="empty-curve">No performance curve data available.</div>';

    const required=options.required||null,selected=options.selected||null;
    const qValues=curve.map(pt=>pt.q),pValues=curve.map(pt=>pt.p);
    if(required?.q>0)qValues.push(Number(required.q));
    if(required?.p>0)pValues.push(Number(required.p));
    if(selected?.q>0)qValues.push(Number(selected.q));
    if(selected?.p>0)pValues.push(Number(selected.p));

    const maxQ=niceScaleMax(Math.max(...qValues)*1.06,10);
    const maxP=niceScaleMax(Math.max(...pValues)*1.08,8);
    const W=1000,H=470,L=92,R=34,T=34,B=78,plotW=W-L-R,plotH=H-T-B;
    const x=q=>L+(Math.max(0,Math.min(Number(q)||0,maxQ))/maxQ)*plotW;
    const y=p=>T+plotH-(Math.max(0,Math.min(Number(p)||0,maxP))/maxP)*plotH;
    const xTicks=10,yTicks=8,grid=[];

    for(let i=0;i<=xTicks;i++){
      const value=maxQ*i/xTicks,gx=x(value);
      grid.push(`<line x1="${gx}" y1="${T}" x2="${gx}" y2="${T+plotH}" stroke="#d8e0e5" stroke-width="1" stroke-dasharray="4 5"/><text x="${gx}" y="${T+plotH+25}" text-anchor="middle" font-size="12" fill="#52666b">${fmt(value)}</text>`);
    }
    for(let i=0;i<=yTicks;i++){
      const value=maxP*i/yTicks,gy=y(value);
      grid.push(`<line x1="${L}" y1="${gy}" x2="${L+plotW}" y2="${gy}" stroke="#d8e0e5" stroke-width="1" stroke-dasharray="4 5"/><text x="${L-13}" y="${gy+4}" text-anchor="end" font-size="12" fill="#52666b">${fmt(value)}</text>`);
    }

    const path=curve.map((pt,index)=>`${index?'L':'M'} ${x(pt.q).toFixed(2)} ${y(pt.p).toFixed(2)}`).join(' ');
    const sourceMarkers=source.map(pt=>`<circle cx="${x(pt.q)}" cy="${y(pt.p)}" r="4.5" fill="#2368ad" stroke="#fff" stroke-width="1.5"/>`).join('');

    function pointMarkup(point,type){
      if(!(point?.q>=0&&point?.p>=0))return '';
      const px=x(point.q),py=y(point.p),isRequired=type==='required';
      const color=isRequired?'#d63b32':'#168451';
      const title=isRequired?'Required':'Program Selected';
      const close=required&&selected&&Math.abs(x(required.q)-x(selected.q))<150&&Math.abs(y(required.p)-y(selected.p))<65;
      const labelY=isRequired?Math.max(T+18,py-(close?28:15)):Math.min(T+plotH-8,py+(close?34:22));
      const anchor=isRequired?'end':'start';
      const labelX=isRequired?Math.max(L+210,px-12):Math.min(L+plotW-225,px+12);
      return `<line x1="${px}" y1="${py}" x2="${px}" y2="${T+plotH}" stroke="${color}" stroke-width="2" stroke-dasharray="7 6"/><line x1="${L}" y1="${py}" x2="${px}" y2="${py}" stroke="${color}" stroke-width="2" stroke-dasharray="7 6"/><circle cx="${px}" cy="${py}" r="8" fill="${color}" stroke="#fff" stroke-width="2.5"/><rect x="${isRequired?labelX-218:labelX-5}" y="${labelY-17}" width="223" height="25" rx="5" fill="#fff" opacity=".92"/><text x="${labelX}" y="${labelY}" text-anchor="${anchor}" font-size="13.5" font-weight="700" fill="${color}">${title}: ${fmt(point.q)} m³/h @ ${fmt(point.p)} Pa</text><text x="${px}" y="${T+plotH+46}" text-anchor="middle" font-size="12" font-weight="700" fill="${color}">${fmt(point.q)}</text><text x="${L-13}" y="${py-7}" text-anchor="end" font-size="12" font-weight="700" fill="${color}">${fmt(point.p)}</text>`;
    }

    const legend=`<g transform="translate(${L},${H-20})"><line x1="0" y1="0" x2="34" y2="0" stroke="#2368ad" stroke-width="4"/><circle cx="17" cy="0" r="4" fill="#2368ad"/><text x="43" y="4" font-size="11.5" fill="#334155">Fan Performance Curve</text>${required?`<circle cx="235" cy="0" r="5" fill="#d63b32"/><text x="247" y="4" font-size="11.5" fill="#334155">Required Point</text>`:''}${selected?`<circle cx="370" cy="0" r="5" fill="#168451"/><text x="382" y="4" font-size="11.5" fill="#334155">Program Selected Point</text>`:''}</g>`;

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Fan performance curve"><rect width="${W}" height="${H}" fill="#fff"/>${grid.join('')}<line x1="${L}" y1="${T+plotH}" x2="${L+plotW}" y2="${T+plotH}" stroke="#354b52" stroke-width="1.7"/><line x1="${L}" y1="${T}" x2="${L}" y2="${T+plotH}" stroke="#354b52" stroke-width="1.7"/><path d="${path}" fill="none" stroke="#2368ad" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${sourceMarkers}${pointMarkup(required,'required')}${pointMarkup(selected,'selected')}<text x="${L+plotW/2}" y="${H-42}" text-anchor="middle" font-size="16" font-weight="700" fill="#173033">Air Flow (m³/h)</text><text x="24" y="${T+plotH/2}" text-anchor="middle" font-size="16" font-weight="700" fill="#173033" transform="rotate(-90 24 ${T+plotH/2})">Static Pressure (Pa)</text>${legend}</svg>`;
  }

  function bullets(items,limit=8){
    const rows=(items||[]).filter(Boolean).slice(0,limit);
    return rows.length?`<ul>${rows.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class="muted">No information available.</p>';
  }

  function normalizePayload(payload={}){
    const product=payload.product||{},model=payload.model||{};
    const series=product.series||{};
    const motor=model.motor||product.motor||{};
    const technical=model.technical||product.technical||{};
    const performance=model.performance||product.performance||{};
    return {
      mode:payload.mode||'catalog',
      model:model.model||product.model||model.display||'',
      title:series.title||model.seriesTitle||model.series||'',
      brand:series.manufacturer||model.manufacturer||'Vitlo',
      image:product.media?.image||model.image||'',
      motor:{power:motor.power??model.kw,speed:motor.speed??model.rpm,current:motor.current??model.amps,voltage:motor.voltage??model.voltage,sound:motor.sound??model.spl},
      technical:{fireRating:technical.fireRating||model.fireRating||'',fanType:technical.fanType||model.fanType||'',mountType:technical.mountType||model.mountType||'',ipClass:technical.ipClass||model.ipClass||''},
      performance:{nominalAirflow:performance.nominalAirflow??model.nominal,points:performance.points||model.points||[],sourcePoints:performance.sourcePoints||model.sourcePoints||performance.points||model.points||[]},
      description:product.description||{general:[],motor:[],applications:[]},
      required:payload.required||null,
      selected:payload.selected||null
    };
  }

  function field(label,value){return `<div class="spec-row"><span>${esc(label)}</span><b>${esc(value||'-')}</b></div>`}

  function html(payload){
    const d=normalizePayload(payload);
    const selectedFlow=d.selected?.q||d.performance.nominalAirflow;
    const curve=curveSvg({points:d.performance.points,sourcePoints:d.performance.sourcePoints,required:d.mode==='selection'?d.required:null,selected:d.mode==='selection'?d.selected:null});
    const pointSummary=d.mode==='selection'?`<div class="point-summary"><div class="point-card required"><span>Required Point</span><b>${fmt(d.required?.q)} m³/h @ ${fmt(d.required?.p)} Pa</b></div><div class="point-card selected"><span>Program Selected Point</span><b>${fmt(d.selected?.q)} m³/h @ ${fmt(d.selected?.p)} Pa</b></div></div>`:'';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.model)} Product Datasheet</title><style>*{box-sizing:border-box}body{margin:0;background:#e9eff0;color:#162f33;font-family:Arial,Helvetica,sans-serif}.toolbar{max-width:210mm;margin:10px auto 0;display:flex;justify-content:flex-end;gap:8px}.toolbar button{border:0;border-radius:7px;padding:9px 13px;font-weight:700;cursor:pointer}.print{background:#087f4f;color:#fff}.close{background:#dfe8e9;color:#29484d}.sheet{width:210mm;min-height:297mm;margin:10px auto 22px;background:#fff;padding:10mm 10mm 8mm;box-shadow:0 8px 30px rgba(18,52,59,.14)}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #087f4f;padding-bottom:6px}.logo{height:18mm;max-width:78mm;object-fit:contain}.doc-title{font-size:12px;color:#566b70;font-weight:700;margin-top:5px}.product-title{margin:7px 0 0}.product-title h1{font-size:28px;color:#075e39;margin:0}.product-title h2{font-size:17px;margin:3px 0 0}.hero{display:grid;grid-template-columns:1.04fr .96fr;gap:8mm;align-items:center;margin-top:5mm}.product-image{width:100%;height:64mm;object-fit:contain}.spec-box{border:1px solid #8db3a2;border-radius:8px;overflow:hidden}.spec-head{background:#edf6f1;color:#07633c;text-align:center;font-weight:800;padding:6px;font-size:12px}.spec-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:6px 9px;border-top:1px solid #d7e3de;font-size:11px}.spec-row span{font-weight:700}.spec-row b{text-align:right}.point-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:5mm}.point-card{border-radius:7px;padding:7px 10px;background:#fff;font-size:10px}.point-card span{display:block;font-weight:700;margin-bottom:2px}.point-card b{font-size:12px}.point-card.required{border:1px solid #d63b32;color:#b62e27}.point-card.selected{border:1px solid #168451;color:#116b43}.section{margin-top:5mm}.section-head{font-size:12px;font-weight:800;color:#07633c;margin:0 0 3px;text-transform:uppercase}.curve{border:1px solid #8db3a2;border-radius:8px;padding:2mm;height:91mm;overflow:hidden}.curve svg{height:100%;display:block}.bottom-grid{display:grid;grid-template-columns:1.08fr .92fr;gap:5mm;margin-top:5mm}.info-box{border:1px solid #8db3a2;border-radius:8px;padding:4mm;min-height:43mm}.info-box h3{font-size:11px;color:#07633c;margin:0 0 3mm;text-transform:uppercase}.info-box ul{margin:0;padding-left:16px;font-size:9.4px;line-height:1.37}.info-box li{margin-bottom:2px}.muted{font-size:10px;color:#64748b}.footer{margin-top:5mm;padding-top:3mm;border-top:2px solid #087f4f;text-align:center;font-size:8.5px;color:#64748b}.footer b{display:block;margin-top:2mm;color:#087f4f;font-size:9.5px}.empty-curve{padding:25px;text-align:center;color:#64748b}@page{size:A4 portrait;margin:0}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;box-shadow:none;width:210mm;height:297mm;min-height:0;overflow:hidden}}@media(max-width:850px){.toolbar{padding:0 10px}.sheet{width:100%;min-height:0;margin:8px 0;padding:16px}.hero,.bottom-grid{grid-template-columns:1fr}.product-image{height:260px}.curve{height:auto}.point-summary{grid-template-columns:1fr}}</style></head><body><div class="toolbar"><button class="close" onclick="window.close()">Close</button><button class="print" onclick="window.print()">Print / Save PDF</button></div><main class="sheet"><header class="header"><img class="logo" src="assets/vensis-logo.png" alt="Vensis"><div class="doc-title">PRODUCT DATASHEET</div></header><div class="product-title"><h1>${esc(d.model)}</h1><h2>${esc(d.title)}</h2></div><section class="hero"><img class="product-image" src="${esc(d.image)}" alt="${esc(d.model)}" onerror="this.style.visibility='hidden'"><div class="spec-box"><div class="spec-head">SPECIFICATIONS</div>${field('Brand',d.brand)}${field(d.mode==='selection'?'Selected Airflow':'Nominal Airflow',positive(selectedFlow)?`${fmt(selectedFlow)} m³/h`:'-')}${d.mode==='selection'?field('Selected Pressure',positive(d.selected?.p)?`${fmt(d.selected.p)} Pa`:'-'):''}${field('Motor Power',positive(d.motor.power)?`${fmt(d.motor.power,2)} kW`:'-')}${field('Speed',positive(d.motor.speed)?`${fmt(d.motor.speed)} rpm`:'-')}${field('Current',positive(d.motor.current)?`${fmt(d.motor.current,2)} A`:'-')}${field('Voltage',d.motor.voltage||'-')}${field('Sound Level',positive(d.motor.sound)?`${fmt(d.motor.sound)} dB(A)`:'-')}${field('Fire Rating',d.technical.fireRating||'-')}${field('Fan Type',d.technical.fanType||'-')}${field('Mount Type',d.technical.mountType||'-')}</div></section>${pointSummary}<section class="section"><h3 class="section-head">Performance Curve</h3><div class="curve">${curve}</div></section><div class="bottom-grid"><section class="info-box"><h3>General Features</h3>${bullets(d.description.general,8)}</section><section class="info-box"><h3>Applications</h3>${bullets(d.description.applications,5)}</section></div><footer class="footer">Technical data is based on manufacturer catalogue information. Project suitability should be confirmed by Vensis.<b>Vensis Engineering Suite&nbsp;&nbsp; | &nbsp;&nbsp;Fan Selection&nbsp;&nbsp; | &nbsp;&nbsp;www.vensis.com.tr</b></footer></main></body></html>`;
  }

  function open(payload){
    const key='vensis_detail_'+Date.now();
    localStorage.setItem(key,html(payload));
    window.open('detail.html?key='+encodeURIComponent(key),'_blank');
  }

  window.VensisDatasheet={curveSvg,html,open};
})();

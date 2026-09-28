(function(){
  'use strict';

  const renderer=window.VensisDatasheet||{};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const attr=esc;
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)||0);
  const positive=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null};
  const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const arr=value=>Array.isArray(value)?value.filter(Boolean):(value==null||value===''?[]:[value]);

  function absoluteAssetUrl(value){
    const raw=String(value??'').trim();
    if(!raw)return '';
    try{
      if(/^(?:data:|blob:|https?:|\/\/)/i.test(raw))return new URL(raw,window.location.href).href;
      const clean=raw.replace(/^\.\//,'').replace(/^(?:\.\.\/)+/,'').replace(/^\/+/, '');
      return new URL('/'+clean,window.location.origin).href;
    }catch{return raw}
  }

  function previewImage(product,model,series){
    const fallback=(()=>{
      try{return window.VensisProducts?.image?.(series?.code||model?.seriesId||model?.series||'')||''}catch{return ''}
    })();
    return absoluteAssetUrl(
      product?.media?.image||
      product?.image||
      model?.media?.image||
      model?.image||
      fallback||
      ''
    );
  }

  function previewDimensions(product,model,series){
    const brand=String(series?.manufacturer||product?.manufacturer||model?.manufacturer||model?.brand||'').trim().toLowerCase();
    if(brand!=='vitlo')return null;
    try{
      return window.VensisVitloDimensions?.resolve?.(
        series?.code||model?.seriesId||model?.series||product?.seriesCode||'',
        model
      )||null;
    }catch(error){
      console.warn('Vensis Vitlo dimension resolver error',error);
      return null;
    }
  }

  function modelId(item){return item?.id??item?.key??item?.productKey??item?.model??''}

  function productForCatalog(id){
    const C=window.VensisCatalog;
    const model=C?.getModel?.(id)||(C?.models||[]).find(item=>String(modelId(item))===String(id));
    if(!model)return null;
    const product=C?.product?.(id)||C?.product?.(modelId(model))||null;
    return {mode:'catalog',product,model};
  }

  function productForSelection(row){
    const C=window.VensisCatalog;
    const key=row?.productKey||row?.key||row?.id;
    return C?.product?.(key)||window.VensisProducts?.fromResult?.(row)||{
      model:row?.model||row?.display||'',
      series:{title:row?.catalogNameEn||row?.series||'',manufacturer:row?.manufacturer||row?.brand||'Vitlo'},
      media:{image:row?.image||''},
      motor:{power:row?.kw,speed:row?.rpm,current:row?.amps,voltage:row?.voltage,sound:row?.spl},
      technical:{fanType:row?.fanTypeEn||row?.fanType,mountType:row?.mountTypeEn||row?.mountType,ipClass:row?.ipClass},
      performance:{nominalAirflow:row?.nominal,points:row?.points,sourcePoints:row?.sourcePoints},
      description:row?.catalogueInfo||{general:[],motor:[],applications:[]}
    };
  }

  function selectionPayload(index){
    const S=window.VensisState,U=window.VensisUtils;
    const row=S?.results?.[Number(index)];
    if(!row)return null;
    return {
      mode:'selection',
      product:productForSelection(row),
      model:row,
      required:{q:typeof U?.number==='function'?U.number('q'):0,p:typeof U?.number==='function'?U.number('p'):0},
      selected:{q:Number(row.qq)||0,p:Number(row.pp)||0}
    };
  }

  function populatedPoints(...values){return values.find(value=>Array.isArray(value)&&value.length)||[]}

  function normalizedPayload(payload={}){
    const product=obj(payload.product),model=obj(payload.model);
    const series=obj(product.series);
    const motor=Object.keys(obj(model.motor)).length?obj(model.motor):obj(product.motor);
    const technical=Object.keys(obj(model.technical)).length?obj(model.technical):obj(product.technical);
    const performance=Object.keys(obj(model.performance)).length?obj(model.performance):obj(product.performance);
    const sourcePoints=populatedPoints(model.sourcePoints,performance.sourcePoints,model.points,performance.points);
    let points=populatedPoints(model.points,performance.points);
    if(!points.length&&sourcePoints.length){
      try{points=sourcePoints.length>=3&&window.VensisUtils?.densifyPoints?window.VensisUtils.densifyPoints(sourcePoints,201):sourcePoints}catch{points=sourcePoints}
    }
    const rawDescription=obj(product.description);
    const fallbackDescription=obj(model.catalogueInfo);
    const general=arr(rawDescription.general?.length?rawDescription.general:fallbackDescription.general);
    const applications=arr(rawDescription.applications?.length?rawDescription.applications:fallbackDescription.applications);
    const rawControls=performance.controls??model.controls??[];
    const controls=arr(rawControls).map(String).filter(value=>value.toLowerCase()!=='nominal');
    const rawControl=String(model.control??performance.control??'');
    const control=rawControl.toLowerCase()==='nominal'?'':rawControl;
    const dimensions=previewDimensions(product,model,series);
    return {
      mode:payload.mode||'catalog',
      model:model.model||product.model||model.display||'Ürün',
      title:series.title||product.seriesTitle||model.catalogNameEn||model.seriesTitle||model.series||'',
      brand:series.manufacturer||product.manufacturer||model.manufacturer||model.brand||'Vitlo',
      image:previewImage(product,model,series),
      motor:{
        power:motor.power??model.kw,
        current:motor.current??model.amps,
        speed:motor.speed??model.rpm,
        voltage:motor.voltage??model.voltage,
        sound:motor.sound??model.spl
      },
      technical:{
        fanType:technical.fanType||model.fanTypeEn||model.fanType||'',
        mountType:technical.mountType||model.mountTypeEn||model.mountType||'',
        ipClass:technical.ipClass||model.ipClass||'',
        fireRating:technical.fireRating||model.fireRating||model.fire||''
      },
      performance:{
        nominalAirflow:performance.nominalAirflow??model.nominal,
        points,
        sourcePoints,
        control,
        controls
      },
      description:{general,applications},
      dimensions,
      required:obj(payload.required),
      selected:obj(payload.selected)
    };
  }

  function pointsAsObjects(points){
    const out=[];
    let previous='';
    for(const point of points||[]){
      const p=Number(point?.[0]),q=Number(point?.[1]);
      if(!Number.isFinite(p)||!Number.isFinite(q)||p<0||q<0)continue;
      const key=`${p}|${q}`;
      if(key===previous)continue;
      out.push({p,q}); previous=key;
    }
    return out;
  }

  function niceScaleMax(value,targetTicks=10){
    if(!(value>0))return 1;
    const rough=value/targetTicks;
    const magnitude=Math.pow(10,Math.floor(Math.log10(rough)));
    const normalized=rough/magnitude;
    const factor=normalized<=1?1:normalized<=2?2:normalized<=5?5:10;
    return Math.ceil(value/(factor*magnitude))*(factor*magnitude);
  }

  function curveSvg(d){
    const dense=pointsAsObjects(d.performance.points);
    const source=pointsAsObjects(d.performance.sourcePoints?.length?d.performance.sourcePoints:d.performance.points);
    const curve=dense.length>=2?dense:source;
    if(curve.length<2)return '<div class="empty-curve">Bu model için performans eğrisi verisi bulunmuyor.</div>';

    const required=d.mode==='selection'?d.required:null;
    const selected=d.mode==='selection'?d.selected:null;
    const qValues=curve.map(pt=>pt.q),pValues=curve.map(pt=>pt.p);
    if(positive(required?.q))qValues.push(Number(required.q));
    if(positive(required?.p))pValues.push(Number(required.p));
    if(positive(selected?.q))qValues.push(Number(selected.q));
    if(positive(selected?.p))pValues.push(Number(selected.p));

    const maxQ=niceScaleMax(Math.max(...qValues)*1.06,10),maxP=niceScaleMax(Math.max(...pValues)*1.08,8);
    const W=1000,H=470,L=92,R=34,T=34,B=78,plotW=W-L-R,plotH=H-T-B;
    const x=q=>L+(Math.max(0,Math.min(Number(q)||0,maxQ))/maxQ)*plotW;
    const y=p=>T+plotH-(Math.max(0,Math.min(Number(p)||0,maxP))/maxP)*plotH;
    const grid=[];
    for(let i=0;i<=10;i++){
      const value=maxQ*i/10,gx=x(value);
      grid.push(`<line x1="${gx}" y1="${T}" x2="${gx}" y2="${T+plotH}" stroke="#d8e0e5" stroke-width="1" stroke-dasharray="4 5"/><text x="${gx}" y="${T+plotH+25}" text-anchor="middle" font-size="12" fill="#52666b">${fmt(value)}</text>`);
    }
    for(let i=0;i<=8;i++){
      const value=maxP*i/8,gy=y(value);
      grid.push(`<line x1="${L}" y1="${gy}" x2="${L+plotW}" y2="${gy}" stroke="#d8e0e5" stroke-width="1" stroke-dasharray="4 5"/><text x="${L-13}" y="${gy+4}" text-anchor="end" font-size="12" fill="#52666b">${fmt(value)}</text>`);
    }
    const path=curve.map((pt,i)=>`${i?'L':'M'} ${x(pt.q).toFixed(2)} ${y(pt.p).toFixed(2)}`).join(' ');
    const markers=source.length<=28?source.map(pt=>`<circle cx="${x(pt.q)}" cy="${y(pt.p)}" r="4.3" fill="#2368ad" stroke="#fff" stroke-width="1.4"/>`).join(''):'';

    function pointMarkup(point,type){
      if(!positive(point?.q)||!positive(point?.p))return '';
      const isRequired=type==='required',color=isRequired?'#d63b32':'#168451';
      const px=x(point.q),py=y(point.p);
      const close=required&&selected&&Math.abs(x(required.q)-x(selected.q))<160&&Math.abs(y(required.p)-y(selected.p))<66;
      const labelY=isRequired?Math.max(T+18,py-(close?28:15)):Math.min(T+plotH-8,py+(close?34:22));
      const labelX=isRequired?Math.max(L+220,px-12):Math.min(L+plotW-250,px+12);
      const anchor=isRequired?'end':'start';
      const title=isRequired?'İstenen':'Program Seçimi';
      return `<line x1="${px}" y1="${py}" x2="${px}" y2="${T+plotH}" stroke="${color}" stroke-width="2" stroke-dasharray="7 6"/><line x1="${L}" y1="${py}" x2="${px}" y2="${py}" stroke="${color}" stroke-width="2" stroke-dasharray="7 6"/><circle cx="${px}" cy="${py}" r="8" fill="${color}" stroke="#fff" stroke-width="2.5"/><rect x="${isRequired?labelX-240:labelX-5}" y="${labelY-17}" width="245" height="25" rx="5" fill="#fff" opacity=".92"/><text x="${labelX}" y="${labelY}" text-anchor="${anchor}" font-size="13" font-weight="700" fill="${color}">${title}: ${fmt(point.q)} m³/h @ ${fmt(point.p)} Pa</text><text x="${px}" y="${T+plotH+46}" text-anchor="middle" font-size="12" font-weight="700" fill="${color}">${fmt(point.q)}</text><text x="${L-13}" y="${py-7}" text-anchor="end" font-size="12" font-weight="700" fill="${color}">${fmt(point.p)}</text>`;
    }

    const legend=`<g transform="translate(${L},${H-20})"><line x1="0" y1="0" x2="34" y2="0" stroke="#2368ad" stroke-width="4"/><circle cx="17" cy="0" r="4" fill="#2368ad"/><text x="43" y="4" font-size="11.5" fill="#334155">Fan Performans Eğrisi</text>${required?`<circle cx="245" cy="0" r="5" fill="#d63b32"/><text x="257" y="4" font-size="11.5" fill="#334155">İstenen Nokta</text>`:''}${selected?`<circle cx="385" cy="0" r="5" fill="#168451"/><text x="397" y="4" font-size="11.5" fill="#334155">Programın Seçtiği Nokta</text>`:''}</g>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Fan performans eğrisi"><rect width="${W}" height="${H}" fill="#fff"/>${grid.join('')}<line x1="${L}" y1="${T+plotH}" x2="${L+plotW}" y2="${T+plotH}" stroke="#354b52" stroke-width="1.7"/><line x1="${L}" y1="${T}" x2="${L}" y2="${T+plotH}" stroke="#354b52" stroke-width="1.7"/><path d="${path}" fill="none" stroke="#2368ad" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${markers}${pointMarkup(required,'required')}${pointMarkup(selected,'selected')}<text x="${L+plotW/2}" y="${H-42}" text-anchor="middle" font-size="16" font-weight="700" fill="#173033">Debi (m³/h)</text><text x="24" y="${T+plotH/2}" text-anchor="middle" font-size="16" font-weight="700" fill="#173033" transform="rotate(-90 24 ${T+plotH/2})">Statik Basınç (Pa)</text>${legend}</svg>`;
  }

  function row(label,value,kind=''){
    if(value==null||value===''||value==='-')return '';
    return `<div class="spec-row ${kind}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
  }

  function specRows(d){
    const items=[];
    if(d.mode==='selection'){
      if(positive(d.required.q)&&positive(d.required.p))items.push(row('İstenen Nokta',`${fmt(d.required.q)} m³/h @ ${fmt(d.required.p)} Pa`,'required'));
      if(positive(d.selected.q)&&positive(d.selected.p))items.push(row('Programın Seçtiği Nokta',`${fmt(d.selected.q)} m³/h @ ${fmt(d.selected.p)} Pa`,'selected'));
    }
    if(d.performance.control)items.push(row('Control Level',d.performance.control));
    if(d.performance.controls.length>1)items.push(row('Available Controls',d.performance.controls.join(' / ')));
    const flow=d.mode==='selection'?d.selected.q:d.performance.nominalAirflow;
    if(positive(flow))items.push(row(d.mode==='selection'?'Seçilen Debi':'Nominal Debi',`${fmt(flow)} m³/h`));
    if(d.mode==='selection'&&positive(d.selected.p))items.push(row('Seçilen Basınç',`${fmt(d.selected.p)} Pa`));
    if(positive(d.motor.power))items.push(row('Motor Gücü',`${fmt(d.motor.power,2)} kW`));
    if(positive(d.motor.current))items.push(row('Akım',`${fmt(d.motor.current,2)} A`));
    if(positive(d.motor.speed))items.push(row('Devir',`${fmt(d.motor.speed)} rpm`));
    if(d.motor.voltage)items.push(row('Gerilim',d.motor.voltage));
    if(positive(d.motor.sound))items.push(row('Ses Seviyesi',`${fmt(d.motor.sound)} dB(A)`));
    if(!d.performance.control&&!d.performance.controls.length&&d.technical.fanType)items.push(row('Fan Tipi',d.technical.fanType));
    if(!d.performance.control&&!d.performance.controls.length&&d.technical.mountType)items.push(row('Montaj',d.technical.mountType));
    if(d.technical.ipClass&&items.length<11)items.push(row('IP Sınıfı',d.technical.ipClass));
    return items.join('');
  }

  function featuresHtml(d){
    const items=[...d.description.general,...d.description.applications].filter(Boolean).slice(0,7);
    if(!items.length)return '<p class="muted">Bu ürün için genel özellik bilgisi bulunmuyor.</p>';
    return `<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
  }

  function dimensionDisplayValue(value,header){
    if(value==null||value==='')return '-';
    const raw=String(value);
    if(/[Ø×x]/.test(raw)||/N\s*×/i.test(String(header||'')))return raw;
    const n=Number(value);
    return Number.isFinite(n)?`${fmt(n)} mm`:raw;
  }

  function dimensionRowsHtml(dim){
    if(!dim)return '';
    return dim.headers.map(header=>`<tr><th>${esc(header)}</th><td>${esc(dimensionDisplayValue(dim.values?.[header],header))}</td></tr>`).join('');
  }

  function dimensionDiagramSvg(dim){
    if(!dim)return '';
    const type=String(dim.diagram||'');
    const value=key=>dim.values?.[key];
    const caption=key=>{
      const v=value(key);
      return v==null?'':`${key} = ${dimensionDisplayValue(v,key)}`;
    };
    const labels=dim.headers.map((header,index)=>{
      const x=34+(index%3)*188;
      const y=274+Math.floor(index/3)*28;
      return `<g transform="translate(${x},${y})"><rect width="174" height="22" rx="5" fill="#f2f7f5" stroke="#b8d0c5"/><text x="87" y="15" text-anchor="middle" font-size="11" font-weight="700" fill="#24434a">${esc(caption(header))}</text></g>`;
    }).join('');
    const defs='<defs><marker id="dim-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#31535a"/></marker></defs>';
    const line=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#31535a" stroke-width="1.5" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>`;
    let body='';
    if(['axial-duct','axial-short','axial-mobile'].includes(type)){
      body=`<circle cx="145" cy="118" r="76" fill="none" stroke="#173033" stroke-width="2"/><circle cx="145" cy="118" r="58" fill="none" stroke="#678087" stroke-width="1.4"/><circle cx="145" cy="118" r="15" fill="none" stroke="#173033" stroke-width="1.5"/><line x1="145" y1="42" x2="145" y2="194" stroke="#c4d1d4"/><line x1="69" y1="118" x2="221" y2="118" stroke="#c4d1d4"/><rect x="330" y="65" width="180" height="106" rx="4" fill="none" stroke="#173033" stroke-width="2"/><rect x="390" y="88" width="58" height="60" rx="4" fill="none" stroke="#678087"/>${line(330,196,510,196)}<text x="420" y="214" text-anchor="middle" font-size="12" font-weight="700">E</text>${line(56,24,234,24)}<text x="145" y="17" text-anchor="middle" font-size="12" font-weight="700">ØA / ØB / ØD</text>`;
    }else if(['wall-axial','cell-axial','cell-radial'].includes(type)){
      body=`<rect x="58" y="34" width="176" height="176" fill="none" stroke="#173033" stroke-width="2"/><circle cx="146" cy="122" r="66" fill="none" stroke="#678087" stroke-width="1.5"/><circle cx="146" cy="122" r="16" fill="none" stroke="#173033" stroke-width="1.5"/><rect x="336" y="62" width="170" height="120" fill="none" stroke="#173033" stroke-width="2"/><circle cx="385" cy="122" r="38" fill="none" stroke="#678087"/>${line(58,224,234,224)}<text x="146" y="242" text-anchor="middle" font-size="12" font-weight="700">A / B</text>${line(336,204,506,204)}<text x="421" y="222" text-anchor="middle" font-size="12" font-weight="700">C / E</text>`;
    }else if(['jet-axial','jet-radial','tunnel-axial'].includes(type)){
      body=`<rect x="64" y="78" width="470" height="92" rx="42" fill="none" stroke="#173033" stroke-width="2"/><rect x="255" y="68" width="86" height="112" rx="8" fill="none" stroke="#678087" stroke-width="1.5"/><circle cx="108" cy="124" r="38" fill="none" stroke="#678087"/>${line(64,204,534,204)}<text x="299" y="222" text-anchor="middle" font-size="12" font-weight="700">C / L / E</text>${line(28,78,28,170)}<text x="17" y="128" text-anchor="middle" font-size="12" font-weight="700" transform="rotate(-90 17 128)">A / B / ØA / ØB</text>`;
    }else if(['roof-axial-horizontal','roof-axial-vertical','roof-radial-horizontal','roof-radial-vertical'].includes(type)){
      body=`<rect x="78" y="166" width="420" height="28" fill="none" stroke="#173033" stroke-width="2"/><path d="M125 166 L170 76 L410 76 L455 166 Z" fill="none" stroke="#173033" stroke-width="2"/><circle cx="290" cy="128" r="40" fill="none" stroke="#678087"/><rect x="260" y="94" width="60" height="68" fill="none" stroke="#678087"/>${line(78,216,498,216)}<text x="288" y="234" text-anchor="middle" font-size="12" font-weight="700">A / B / D</text>${line(522,76,522,194)}<text x="540" y="137" text-anchor="middle" font-size="12" font-weight="700" transform="rotate(-90 540 137)">C / E</text>`;
    }else if(type==='circular-duct'){
      body=`<circle cx="142" cy="118" r="74" fill="none" stroke="#173033" stroke-width="2"/><circle cx="142" cy="118" r="44" fill="none" stroke="#678087" stroke-width="1.5"/><rect x="330" y="74" width="176" height="88" rx="20" fill="none" stroke="#173033" stroke-width="2"/>${line(52,26,232,26)}<text x="142" y="18" text-anchor="middle" font-size="12" font-weight="700">ØD1 / Ød</text>${line(330,196,506,196)}<text x="418" y="214" text-anchor="middle" font-size="12" font-weight="700">A / B / E</text>`;
    }else if(type==='heat-recovery'){
      body=`<rect x="86" y="56" width="390" height="142" rx="5" fill="none" stroke="#173033" stroke-width="2"/><rect x="120" y="86" width="76" height="70" fill="none" stroke="#678087"/><rect x="366" y="86" width="76" height="70" fill="none" stroke="#678087"/><path d="M238 84 L326 170 M326 84 L238 170" stroke="#678087" stroke-width="1.5"/>${line(86,222,476,222)}<text x="281" y="240" text-anchor="middle" font-size="12" font-weight="700">A / B</text>${line(504,56,504,198)}<text x="522" y="128" text-anchor="middle" font-size="12" font-weight="700" transform="rotate(-90 522 128)">C / e / f / z</text>`;
    }else{
      body=`<rect x="92" y="62" width="374" height="130" fill="none" stroke="#173033" stroke-width="2"/><circle cx="278" cy="127" r="46" fill="none" stroke="#678087"/>${line(92,218,466,218)}<text x="279" y="236" text-anchor="middle" font-size="12" font-weight="700">A / B / C</text>${line(494,62,494,192)}<text x="512" y="127" text-anchor="middle" font-size="12" font-weight="700" transform="rotate(-90 512 127)">D / H</text>`;
    }
    return `<svg viewBox="0 0 600 350" role="img" aria-label="Ölçü referans şeması">${defs}<rect width="600" height="350" fill="#fff"/>${body}${labels}</svg>`;
  }

  function originalDrawingHtml(dim){
    const drawing=dim?.drawing;
    if(!drawing)return dimensionDiagramSvg(dim);
    const crop=drawing.crop||{};
    const family=encodeURIComponent(String(drawing.family||dim.drawingFamily||''));
    const imageUrl='/api/catalog/vitlo-drawing.php?family='+family+'&v=20260928-r3';
    return `<div class="catalog-drawing" data-original-catalog-drawing>
      <img id="vitloCatalogDrawingImage"
        class="catalog-drawing-image"
        src="${attr(imageUrl)}"
        alt="Vitlo katalog orijinal teknik çizimi"
        decoding="sync">
      <canvas id="vitloCatalogDrawing"
        class="catalog-drawing-canvas"
        data-pdf-page="${attr(drawing.pdfPage)}"
        data-crop-x="${attr(crop.x)}"
        data-crop-y="${attr(crop.y)}"
        data-crop-w="${attr(crop.w)}"
        data-crop-h="${attr(crop.h)}"
        aria-label="Vitlo katalog orijinal teknik çizimi"></canvas>
      <div id="vitloCatalogDrawingStatus" class="drawing-status">Vitlo kataloğundaki orijinal teknik çizim hazırlanıyor…</div>
    </div>`;
  }

  function dimensionRuntime(d){
    const drawing=d?.dimensions?.drawing;
    if(!drawing)return '';
    const sourceUrl=String(d.dimensions.sourceProxy||drawing.pdfUrl||'/api/catalog/vitlo-pdf.php');
    const officialUrl=String(d.dimensions.sourceUrl||drawing.officialPdfUrl||'');
    return `<div id="printBlocker" class="print-blocker"><h2>Teknik çizim hazırlanıyor</h2><p>PDF çıktısı alınmadan önce Vitlo katalog çiziminin yüklenmesi gerekiyor.</p></div>
<script>
(function(){
  const image=document.getElementById('vitloCatalogDrawingImage');
  const canvas=document.getElementById('vitloCatalogDrawing');
  const status=document.getElementById('vitloCatalogDrawingStatus');
  const printButton=document.getElementById('printBtn');
  const official=${JSON.stringify(officialUrl)};
  const proxy=${JSON.stringify(sourceUrl)};
  let ready=false;
  let fallbackStarted=false;
  let fallbackTimer=0;

  const setReady=()=>{
    if(ready)return;
    ready=true;
    document.documentElement.classList.add('drawing-ready');
    document.documentElement.classList.remove('drawing-pending','block-print');
    if(status)status.hidden=true;
    if(printButton)printButton.disabled=false;
    if(fallbackTimer)clearTimeout(fallbackTimer);
  };

  const setStatus=(message,isError=false)=>{
    if(!status)return;
    status.hidden=false;
    status.textContent=message;
    status.classList.toggle('error',Boolean(isError));
  };

  const blockPrint=()=>{
    if(ready)return false;
    document.documentElement.classList.add('block-print');
    setStatus('Teknik çizim henüz hazır değil. Birkaç saniye sonra tekrar deneyin.');
    return true;
  };

  const loadScript=url=>new Promise((resolve,reject)=>{
    if(window.pdfjsLib){resolve();return}
    const script=document.createElement('script');
    script.src=url;
    script.crossOrigin='anonymous';
    script.referrerPolicy='no-referrer';
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error('PDF.js load failed'));
    document.head.appendChild(script);
  });

  const renderFallback=async()=>{
    if(ready||fallbackStarted)return;
    fallbackStarted=true;
    try{
      setStatus('Orijinal çizim katalogdan hazırlanıyor…');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      if(!canvas||!window.pdfjsLib)throw new Error('PDF renderer unavailable');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf=await window.pdfjsLib.getDocument({url:proxy}).promise;
      const page=await pdf.getPage(Number(canvas.dataset.pdfPage||1));
      const viewport=page.getViewport({scale:2.25});
      const source=document.createElement('canvas');
      source.width=Math.ceil(viewport.width);
      source.height=Math.ceil(viewport.height);
      await page.render({canvasContext:source.getContext('2d',{alpha:false}),viewport}).promise;

      const cx=Math.max(0,Math.min(1,Number(canvas.dataset.cropX)||0));
      const cy=Math.max(0,Math.min(1,Number(canvas.dataset.cropY)||0));
      const cw=Math.max(0.01,Math.min(1-cx,Number(canvas.dataset.cropW)||1));
      const ch=Math.max(0.01,Math.min(1-cy,Number(canvas.dataset.cropH)||1));
      const sx=Math.round(source.width*cx),sy=Math.round(source.height*cy);
      const sw=Math.max(1,Math.round(source.width*cw)),sh=Math.max(1,Math.round(source.height*ch));

      canvas.width=sw;canvas.height=sh;
      const out=canvas.getContext('2d',{alpha:false});
      out.fillStyle='#fff';out.fillRect(0,0,sw,sh);
      out.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
      canvas.classList.add('ready');
      if(image)image.hidden=true;
      setReady();
    }catch(error){
      console.error('Vitlo catalogue drawing fallback error',error);
      const suffix=official?' Vitlo kataloğunu kaynak bağlantısından kontrol edebilirsiniz.':'';
      setStatus('Orijinal katalog çizimi yüklenemedi.'+suffix,true);
      if(status&&official){
        const link=document.createElement('a');
        link.href=official;link.target='_blank';link.rel='noopener';
        link.textContent=' Vitlo kataloğunu aç';
        status.appendChild(link);
      }
    }
  };

  if(image){
    image.addEventListener('load',()=>{
      image.classList.add('ready');
      setReady();
    },{once:true});
    image.addEventListener('error',()=>renderFallback(),{once:true});
    if(image.complete){
      if(image.naturalWidth>0){image.classList.add('ready');setReady()}
      else renderFallback();
    }
  }else{
    renderFallback();
  }

  fallbackTimer=setTimeout(()=>{if(!ready)renderFallback()},6000);

  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='p'&&!ready){
      event.preventDefault();
      blockPrint();
    }
  },true);

  window.addEventListener('beforeprint',()=>{if(!ready)blockPrint()});
  window.addEventListener('afterprint',()=>document.documentElement.classList.remove('block-print'));
  window.addEventListener('load',()=>{if(!ready&&image?.complete&&image.naturalWidth>0){image.classList.add('ready');setReady()}});
})();
<\/script>`;
  }

  function dimensionPage(d){
    const dim=d.dimensions;
    if(!dim)return '';
    const source=dim.sourceUrl?`<a href="${attr(dim.sourceUrl)}" target="_blank" rel="noopener">Vitlo Genel Ürün Kataloğu, s. ${esc(dim.catalogPage||'-')}</a>`:'Vitlo Genel Ürün Kataloğu';
    const note=dim.sourceNote?`<div class="dimension-alert">${esc(dim.sourceNote)}</div>`:'';
    return `<main class="sheet dimension-sheet"><header class="header"><img class="logo" src="assets/vensis-logo.png" alt="Vensis"><div class="doc-title">TEKNİK RESİM &amp; ÖLÇÜLER</div></header><div class="product-title"><h1>${esc(d.model)}</h1><div class="brand">Marka: ${esc(d.brand)}</div><h2>${esc(d.title)}</h2></div><section class="dimension-layout"><div class="dimension-figure"><h3>ORİJİNAL KATALOG TEKNİK ÇİZİMİ</h3>${originalDrawingHtml(dim)}<p>${dim.drawing?'Çizim, Vitlo genel ürün kataloğundaki ortak kasa çiziminden doğrudan alınır.':'Sayısal ölçüler sağdaki tabloda verilmiştir.'}</p></div><div class="dimension-data"><h3>MODEL ÖLÇÜLERİ</h3><table><thead><tr><th>Ölçü</th><th>Değer</th></tr></thead><tbody>${dimensionRowsHtml(dim)}</tbody></table><div class="dimension-ref"><b>Ölçü referansı:</b> ${esc(dim.series)} ${esc(dim.referenceModel)}<br><b>Kaynak:</b> ${source}</div>${note}</div></section><section class="dimension-note"><b>Not:</b> Ölçüler üretici kataloğundan aktarılmıştır. Montaj boşlukları, aksesuarlar, kaide/kanal bağlantıları ve proje özelindeki toleranslar uygulama öncesinde kontrol edilmelidir.</section><footer class="footer">Teknik veriler üretici katalog bilgilerine dayanmaktadır. Projeye uygunluk Vensis tarafından doğrulanmalıdır.<b>Vensis Engineering Suite&nbsp;&nbsp; | &nbsp;&nbsp;Fan Selection&nbsp;&nbsp; | &nbsp;&nbsp;www.vensis.com.tr</b><div class="page-note">TEKNİK FÖY • SAYFA 2 / 2</div></footer></main>`;
  }

  function classicHtml(payload){
    const d=normalizedPayload(payload);
    const curve=curveSvg(d);
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.model)} Teknik Föy</title><base href="${attr(new URL('.',window.location.href).href)}"><style>*{box-sizing:border-box}body{margin:0;background:#e9eff0;color:#162f33;font-family:Arial,Helvetica,sans-serif}.toolbar{max-width:210mm;margin:10px auto 0;display:flex;justify-content:flex-end;gap:8px}.toolbar button{border:0;border-radius:7px;padding:9px 13px;font-weight:800;cursor:pointer}.print{background:#087f4f;color:#fff}.close{background:#dfe8e9;color:#29484d}.sheet{width:210mm;min-height:297mm;margin:10px auto 22px;background:#fff;padding:9mm 10mm 7mm;box-shadow:0 8px 30px rgba(18,52,59,.14);display:flex;flex-direction:column}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #087f4f;padding-bottom:5px}.logo{height:17mm;max-width:80mm;object-fit:contain}.doc-title{font-size:11px;color:#566b70;font-weight:800;margin-top:3px}.product-title{margin:5px 0 0}.product-title h1{font-size:27px;line-height:1.05;color:#075e39;margin:0}.brand{margin-top:4px;color:#087f4f;font-weight:800;font-size:11px}.product-title h2{font-size:16px;line-height:1.15;margin:4px 0 0;color:#173033}.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:7mm;align-items:center;margin-top:4mm}.product-image{width:100%;height:59mm;object-fit:contain}.spec-box{border:1px solid #8db3a2;border-radius:8px;overflow:hidden}.spec-head{background:#edf6f1;color:#07633c;text-align:center;font-weight:900;padding:5px;font-size:12px}.spec-row{display:grid;grid-template-columns:1fr 1.22fr;gap:7px;padding:4.7px 8px;border-top:1px solid #d7e3de;font-size:9.5px;line-height:1.15}.spec-row span{font-weight:700}.spec-row b{text-align:right}.spec-row.required{color:#d63b32}.spec-row.selected{color:#168451}.section{margin-top:4mm}.section-head{font-size:12px;font-weight:900;color:#07633c;margin:0 0 2px;text-transform:uppercase}.curve{border:1px solid #8db3a2;border-radius:8px;padding:1.5mm;height:84mm;overflow:hidden}.curve svg{height:100%;display:block}.info-box{border:1px solid #8db3a2;border-radius:8px;padding:3.5mm;min-height:36mm;max-height:40mm;overflow:hidden}.info-box h3{font-size:10.5px;color:#07633c;margin:0 0 2mm;text-transform:uppercase}.info-box ul{margin:0;padding-left:15px;font-size:8.2px;line-height:1.28}.info-box li{margin-bottom:1.5px}.muted{font-size:9px;color:#64748b}.dimension-sheet{page-break-before:always;break-before:page}.dimension-layout{display:grid;grid-template-columns:1.15fr .85fr;gap:7mm;margin-top:8mm;align-items:start}.dimension-figure,.dimension-data{border:1px solid #8db3a2;border-radius:9px;padding:5mm;background:#fbfdfc}.dimension-figure h3,.dimension-data h3{margin:0 0 4mm;color:#07633c;font-size:13px}.dimension-figure svg{display:block;width:100%;height:auto;max-height:126mm}.catalog-drawing{position:relative;min-height:88mm;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e3e9e7;border-radius:7px;overflow:hidden}.catalog-drawing-image,.catalog-drawing-canvas{display:block;width:100%;height:auto;max-height:112mm;object-fit:contain;opacity:0;transition:opacity .15s}.catalog-drawing-image.ready,.catalog-drawing-canvas.ready{opacity:1}.catalog-drawing-canvas{display:none}.catalog-drawing-canvas.ready{display:block}.drawing-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;color:#64748b;font-size:9px;background:#fff}.drawing-status.error{color:#8a5a12;background:#fff8e8}.drawing-status a{color:#087f4f;font-weight:800}.print:disabled{opacity:.45;cursor:wait}.print-blocker{display:none;padding:25mm;font-size:14px;color:#173033}.print-blocker h2{color:#087f4f}.dimension-figure p{margin:3mm 0 0;color:#64748b;font-size:8.5px;line-height:1.4}.dimension-data table{width:100%;border-collapse:collapse;font-size:11px}.dimension-data th,.dimension-data td{border:1px solid #d7e3de;padding:7px 8px}.dimension-data th{text-align:left;background:#edf6f1;color:#075e39}.dimension-data td{text-align:right;font-weight:800}.dimension-ref{margin-top:5mm;padding:4mm;border-radius:7px;background:#f3f7f6;font-size:9px;line-height:1.55;color:#40565b}.dimension-ref a{color:#087f4f}.dimension-alert{margin-top:3mm;padding:3mm;border:1px solid #e4b45e;border-radius:7px;background:#fff8e8;color:#6d4a09;font-size:8.5px;line-height:1.4}.dimension-note{margin-top:7mm;padding:4mm;border:1px solid #d7e3de;border-radius:8px;background:#f8fbfa;font-size:9px;line-height:1.5}.footer{margin-top:auto;padding-top:2.5mm;border-top:2px solid #087f4f;text-align:center;font-size:7.6px;color:#64748b}.footer b{display:block;margin-top:1.5mm;color:#087f4f;font-size:8.7px}.page-note{margin-top:2mm;padding-top:1.7mm;border-top:1px solid #d7e3e5;font-size:7.2px;color:#7b898d}.empty-curve{padding:25px;text-align:center;color:#64748b}@page{size:A4 portrait;margin:0}@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none!important}.sheet{margin:0!important;box-shadow:none!important;width:210mm!important;height:297mm!important;min-height:0!important;max-height:297mm!important;padding:6mm 9mm 5mm!important;overflow:hidden!important;page-break-inside:avoid!important;break-inside:avoid-page!important;page-break-after:always!important;break-after:page!important}.sheet:last-of-type{page-break-after:auto!important;break-after:auto!important}.header{padding-bottom:3px!important}.logo{height:14mm!important}.product-title{margin-top:3px!important}.product-title h1{font-size:24px!important}.product-title h2{font-size:14px!important;margin-top:2px!important}.hero{grid-template-columns:1.02fr .98fr!important;gap:5mm!important;margin-top:2.5mm!important}.product-image{height:46mm!important}.spec-head{padding:4px!important;font-size:10.5px!important}.spec-row{padding:3.2px 7px!important;font-size:8.5px!important;line-height:1.1!important}.section{margin-top:2.5mm!important}.section-head{font-size:10.5px!important;margin-bottom:1px!important}.curve{height:68mm!important;padding:1mm!important}.info-box{min-height:25mm!important;max-height:27mm!important;padding:2.5mm!important}.info-box h3{font-size:9.5px!important;margin-bottom:1.5mm!important}.info-box ul{font-size:7.2px!important;line-height:1.16!important;max-height:19mm!important;overflow:hidden!important}.info-box li{margin-bottom:1px!important}.footer{padding-top:1.8mm!important;font-size:6.8px!important}.footer b{margin-top:1mm!important;font-size:7.8px!important}.page-note{margin-top:1mm!important;padding-top:1mm!important;font-size:6.4px!important}.dimension-sheet{page-break-before:auto!important;break-before:auto!important}.dimension-layout{gap:5mm!important;margin-top:5mm!important}.dimension-figure,.dimension-data{padding:4mm!important}.dimension-figure h3,.dimension-data h3{margin-bottom:2.5mm!important;font-size:11.5px!important}.catalog-drawing{min-height:72mm!important}.catalog-drawing-image,.catalog-drawing-canvas{max-height:100mm!important}.dimension-data table{font-size:10px!important}.dimension-data th,.dimension-data td{padding:5px 7px!important}.dimension-ref{margin-top:3mm!important;padding:3mm!important;font-size:8px!important}.dimension-note{margin-top:4mm!important;padding:3mm!important;font-size:8px!important}.block-print body>*:not(.print-blocker){display:none!important}.block-print .print-blocker{display:block!important}}@media(max-width:850px){.toolbar{padding:0 10px}.sheet{width:100%;min-height:0;margin:8px 0;padding:16px}.hero{grid-template-columns:1fr}.product-image{height:240px}.curve{height:auto}.info-box{max-height:none}}</style></head><body><div class="toolbar"><button class="close" onclick="window.close()">Kapat</button><button id="printBtn" class="print" onclick="window.print()" ${d.dimensions?.drawing?'disabled':''}>Yazdır / PDF Kaydet</button></div><main class="sheet"><header class="header"><img class="logo" src="assets/vensis-logo.png" alt="Vensis"><div class="doc-title">ÜRÜN TEKNİK FÖYÜ</div></header><div class="product-title"><h1>${esc(d.model)}</h1><div class="brand">Marka: ${esc(d.brand)}</div><h2>${esc(d.title)}</h2></div><section class="hero">${d.image?`<img class="product-image" src="${attr(d.image)}" alt="${attr(d.model)}" onerror="this.style.visibility='hidden'">`:'<div></div>'}<div class="spec-box"><div class="spec-head">TEKNİK ÖZELLİKLER</div>${specRows(d)}</div></section><section class="section"><h3 class="section-head">PERFORMANS EĞRİSİ</h3><div class="curve">${curve}</div></section><section class="section info-box"><h3>GENEL ÖZELLİKLER</h3>${featuresHtml(d)}</section><footer class="footer">Teknik veriler üretici katalog bilgilerine dayanmaktadır. Projeye uygunluk Vensis tarafından doğrulanmalıdır.<b>Vensis Engineering Suite&nbsp;&nbsp; | &nbsp;&nbsp;Fan Selection&nbsp;&nbsp; | &nbsp;&nbsp;www.vensis.com.tr</b><div class="page-note">TEKNİK FÖY • SAYFA 1 / ${d.dimensions?'2':'1'}</div></footer></main>${dimensionPage(d)}${dimensionRuntime(d)}</body></html>`;
  }

  function openClassic(payload){
    const preview=window.open('about:blank','_blank');
    if(!preview){alert('Önizleme tarayıcı tarafından engellendi. select.vensis.com.tr için açılır pencereye izin verin.');return null}
    try{
      preview.document.open();
      preview.document.write(classicHtml(payload));
      preview.document.close();
      preview.focus();
      return preview;
    }catch(error){
      console.error('Vensis classic preview error',error);
      try{preview.document.open();preview.document.write('<!doctype html><meta charset="utf-8"><body style="font:16px Arial;padding:30px"><h2>Teknik föy açılamadı</h2><p>Lütfen sayfayı yenileyip tekrar deneyin.</p></body>');preview.document.close()}catch{}
      return null;
    }
  }

  function makeCatalogButton(oldButton){
    const id=oldButton.dataset.modelDatasheet;
    const button=document.createElement('button');
    button.type='button';button.className='model-datasheet-btn vensis-preview-classic';button.textContent='Önizleme';button.style.marginTop='0';
    button.addEventListener('click',()=>{const payload=productForCatalog(id);if(!payload){alert('Ürün bilgisi bulunamadı.');return}openClassic(payload)});
    oldButton.replaceWith(button);
  }

  function makeSelectionButton(oldButton){
    const index=oldButton.dataset.viewDatasheet;
    const button=document.createElement('button');
    button.type='button';button.className='detail-icon-btn vensis-preview-classic';button.textContent='Önizleme';button.title='Teknik föy önizleme';button.setAttribute('aria-label','Teknik föy önizleme');button.style.cssText='min-width:82px;height:36px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;white-space:nowrap';
    button.addEventListener('click',()=>{const payload=selectionPayload(index);if(!payload){alert('Fan seçim bilgisi bulunamadı.');return}openClassic(payload)});
    oldButton.replaceWith(button);
  }

  function replaceButtons(root=document){
    root.querySelectorAll?.('[data-model-datasheet]').forEach(makeCatalogButton);
    root.querySelectorAll?.('[data-view-datasheet]').forEach(makeSelectionButton);
  }

  renderer.save=openClassic;renderer.preview=openClassic;renderer.open=openClassic;renderer.html=classicHtml;
  window.VensisDatasheet=renderer;
  const start=()=>replaceButtons(document);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  new MutationObserver(mutations=>{for(const mutation of mutations){for(const node of mutation.addedNodes||[]){if(node?.nodeType!==1)continue;if(node.matches?.('[data-model-datasheet]'))makeCatalogButton(node);else if(node.matches?.('[data-view-datasheet]'))makeSelectionButton(node);else replaceButtons(node)}}}).observe(document.documentElement,{childList:true,subtree:true});
  window.VensisDirectPreview={open:openClassic,refresh:replaceButtons,html:classicHtml};
})();

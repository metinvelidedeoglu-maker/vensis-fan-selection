(function(){
  const storageKey=key=>window.VensisAccess?.storageKey?.(key)||key;
  const PRINT_KEY=storageKey('vensis_project_print_snapshot_v1');
  const ITEMS_KEY=storageKey('vensis_project_items_v1');
  const META_KEY=storageKey('vensis_project_meta_v1');
  const catalog=window.VensisCatalog||{models:[]};
  const root=document.getElementById('projectPrintRoot');
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value));
  const point=value=>value&&num(value.q)>=0&&num(value.p)>=0?`${fmt(value.q)} m³/h @ ${fmt(value.p)} Pa`:'-';

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}
  }

  function snapshot(){
    const stored=readJson(PRINT_KEY,null);
    if(stored&&Array.isArray(stored.items))return stored;
    const items=readJson(ITEMS_KEY,[]);
    const meta=readJson(META_KEY,{});
    return {createdAt:new Date().toISOString(),project:{name:meta.name||'',reference:meta.reference||'',contact:meta.contact||''},items:Array.isArray(items)?items:[]};
  }

  function outputLanguage(){
    const stored=readJson(PRINT_KEY,null);
    if(stored?.outputLanguage==='tr'||stored?.outputLanguage==='en')return stored.outputLanguage;
    const requested=new URLSearchParams(location.search).get('lang');
    if(requested==='tr'||requested==='en')return requested;
    const active=window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'';
    if(active==='tr'||active==='en')return active;
    try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}
  }

  const OUTPUT_LANGUAGE=outputLanguage();

  function modelFor(item){
    if(item.mode==='custom')return null;
    const direct=catalog.getModel?.(item.productKey);
    if(direct)return direct;
    return (catalog.models||[]).find(model=>String(model.model||'')===String(item.model||''))||null;
  }

  function productFor(item,model){
    const product=model?catalog.product?.(model.id):null;
    if(product)return product;
    return {
      model:item.model||'',
      series:{title:item.series||'',manufacturer:item.manufacturer||'Vitlo'},
      media:{image:item.image||''},
      motor:{power:num(item.motorPower),speed:num(item.speed),current:num(item.current),voltage:item.voltage||'',frequency:item.frequency||'',sound:num(item.noise)},
      performance:{nominalAirflow:num(item.nominalAirflow),points:[],sourcePoints:[]},
      description:{general:[],motor:[],applications:[]}
    };
  }

  function modelAtControl(item,model){
    const control=String(item.control||'').trim();
    if(!model||!control)return model;
    const curve=(model.performance?.curves||[]).find(row=>String(row.control)===control);
    if(!curve)return model;
    const operating=(model.performance?.operatingPoints||[]).find(row=>String(row.control)===control)||null;
    const sourcePoints=curve.sourcePoints||[];
    return {
      ...model,
      motor:{
        ...model.motor,
        power:num(item.motorPower)||num(operating?.power)||num(model.motor?.power),
        speed:num(item.speed)||num(operating?.speed)||num(model.motor?.speed),
        current:num(item.current)||num(operating?.current)||num(model.motor?.current)
      },
      performance:{
        ...model.performance,
        control,
        nominalAirflow:num(operating?.nominalAirflow)||num(model.performance?.nominalAirflow),
        sourcePoints,
        points:curve.precomputed?sourcePoints:[],
        interpolation:curve.interpolation||model.performance?.interpolation||'',
        precomputed:Boolean(curve.precomputed)
      }
    };
  }

  function resolvedMotor(item,model){
    return {
      power:num(item.motorPower)||num(model?.motor?.power),
      speed:num(item.speed)||num(model?.motor?.speed),
      current:num(item.current)||num(model?.motor?.current),
      voltage:String(item.voltage||model?.motor?.voltage||'').trim(),
      frequency:String(item.frequency||model?.motor?.frequency||'').trim(),
      sound:num(item.noise)||num(model?.motor?.sound)
    };
  }

  function supplyText(item,model){
    const motor=resolvedMotor(item,model);
    if(motor.voltage&&motor.frequency)return `${esc(motor.voltage)} – ${esc(motor.frequency)}`;
    return esc(motor.voltage||motor.frequency||'-');
  }

  function sourceText(item){
    if(item.mode==='catalog')return 'Catalog Item';
    if(item.mode==='custom')return 'Custom Product';
    return point(item.required);
  }

  function selectedText(item){
    if(item.mode==='catalog'||item.mode==='custom')return num(item.nominalAirflow)>0?`${fmt(item.nominalAirflow)} m³/h nominal`:'-';
    return point(item.selected);
  }

  function localizedModelName(item){
    const raw=String(item?.model||'').trim();
    if(OUTPUT_LANGUAGE==='en'&&/\bPASLANMAZ\s*316\b/i.test(raw))return raw.replace(/\bPASLANMAZ\s*316\b/ig,'STAINLESS STEEL 316');
    if(OUTPUT_LANGUAGE==='tr'&&/\bSTAINLESS\s+STEEL\s*316\b/i.test(raw))return raw.replace(/\bSTAINLESS\s+STEEL\s*316\b/ig,'PASLANMAZ 316');
    return raw;
  }

  function overviewRow(item){
    const model=modelFor(item);
    const motor=resolvedMotor(item,model);
    const image=item.image||catalog.product?.(model?.id)?.media?.image||'';
    const description=String(item.description||'').trim();
    const safety=String(item.safetyWarning||model?.technical?.safetyWarning||'').trim();
    return `<tr>
      <td><div class="project-product"><i class="project-product-image-slot"${image?'':` aria-hidden="true"`}>${image?`<img src="${esc(image)}" alt="${esc(localizedModelName(item)||'Fan')}" onerror="this.remove()">`:''}</i><div><strong>${esc(localizedModelName(item)||'-')}</strong><span>${esc(item.series||model?.seriesTitle||'')}</span><small>${esc(item.manufacturer||'Vitlo')}</small>${safety?`<em style="display:block;margin-top:4px;color:#9a3412;font-size:8.5px;font-weight:750;line-height:1.3">${esc(safety)}</em>`:''}${description?`<em class="project-description">${esc(description)}</em>`:''}</div></div></td>
      <td class="technical-point">${esc(sourceText(item))}</td>
      <td class="technical-point">${esc(selectedText(item))}</td>
      <td>${supplyText(item,model)}</td>
      <td>${motor.power>0?`${fmt(motor.power,2)} kW`:'-'}</td>
      <td>${motor.speed>0?`${fmt(motor.speed)} rpm`:'-'}</td>
      <td>${motor.current>0?`${fmt(motor.current,2)} A`:'-'}</td>
      <td>${motor.sound>0?`${fmt(motor.sound)} dB(A)`:'-'}</td>
      <td><b>${Math.max(1,num(item.quantity)||1)}</b></td>
    </tr>`;
  }

  function overview(data){
    const units=data.items.reduce((sum,item)=>sum+Math.max(1,num(item.quantity)||1),0);
    const date=new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(data.createdAt||Date.now()));
    return `<section class="project-overview">
      <header class="project-header"><img src="assets/vensis-logo.png" alt="Vensis"><div class="project-title"><h1>PROJECT TECHNICAL DOCUMENT</h1><p>Project list and product datasheets &nbsp;•&nbsp; ${esc(date)} &nbsp;•&nbsp; ${fmt(units)} units</p></div></header>
      <section class="project-meta"><div class="meta-card"><span>Project Name</span><b>${esc(data.project?.name||'-')}</b></div><div class="meta-card"><span>Customer / Reference</span><b>${esc(data.project?.reference||'-')}</b></div><div class="meta-card"><span>Contact Person / İlgili</span><b>${esc(data.project?.contact||'-')}</b></div></section>
      <section class="project-table-wrap"><table class="project-table"><thead><tr><th>Product</th><th>Required / Source</th><th>Selected / Nominal</th><th>V / Hz</th><th>kW</th><th>rpm</th><th>A</th><th>dB(A)</th><th>Qty</th></tr></thead><tbody>${data.items.map(overviewRow).join('')}</tbody></table></section>
      <section class="project-note"><b>Technical Project Output</b>This document intentionally excludes unit prices, discounts and commercial totals. A product datasheet or custom technical sheet is included for every project line below.</section>
      <footer class="project-footer">Vensis Engineering Suite &nbsp;•&nbsp; Technical Project Print &nbsp;•&nbsp; www.vensis.com.tr</footer>
    </section>`;
  }

  function payloadFor(item){
    const baseModel=modelFor(item);
    const product=productFor(item,baseModel);
    const model=modelAtControl(item,baseModel);
    const localizedModel=localizedModelName(item);
    const localizedProduct={...product,model:localizedModel||product?.model||''};
    const fallbackModel=model?{...model,model:localizedModel||model.model}:{
      model:localizedModel||'',
      manufacturer:item.manufacturer||'Vitlo',
      motor:product.motor,
      performance:product.performance,
      technical:{},
      seriesTitle:item.series||''
    };
    // SEAT 25: show the manufacturer's complete characteristic curve in the
    // technical project PDF, while Fan Selection keeps the motor-power-limited
    // part of the characteristic for calculating candidate duty points.
    const rawSeat=(window.models||[]).find(row=>
      String(row?.manufacturer||'').toUpperCase()==='SEAT'&&
      (String(row?.productCode||'')===String(item.orderCode||'')||
       String(row?.key||'')===String(item.productKey||'')));
    const displayPoints=rawSeat?.curves?.[0]?.displaySourcePoints;
    if(Array.isArray(displayPoints)&&displayPoints.length>2){
      fallbackModel.performance={...fallbackModel.performance,
        sourcePoints:displayPoints,points:displayPoints,precomputed:true,interpolation:'linear'};
    }
    return {
      mode:item.mode==='catalog'?'catalog':'selection',
      outputLanguage:OUTPUT_LANGUAGE,
      product:localizedProduct,
      model:fallbackModel,
      required:item.mode==='catalog'?null:item.required,
      selected:item.mode==='catalog'?null:item.selected
    };
  }

  function ensureMechanicalDimensions(doc,sheet,item){
    // Remove legacy placeholder/source notes. A report must show the actual
    // stored technical drawing, never a sentence explaining where it came from.
    sheet.querySelectorAll('p,.muted,.source-note,.dimension-note').forEach(node=>{
      const value=String(node.textContent||'').toLocaleLowerCase('tr-TR');
      if(value.includes('ortak kasa çizim')||value.includes('genel ürün kataloğundaki')||value.includes('common casing drawing')){
        node.remove();
      }
    });

    if(sheet.querySelector('.dimension-panel,.dimension-box .dimension-drawing'))return;

    const model=modelFor(item);
    const seriesCode=String(model?.seriesId||item.series||model?.seriesTitle||'').trim();
    const info=window.VensisVitloDimensions?.resolve?.(seriesCode,{
      ...(model||{}),
      model:model?.model||item.model||'',
      motor:model?.motor||{},
      performance:model?.performance||{}
    })||null;
    const drawing=String(
      model?.dimensionImage||model?.media?.dimensionImage||
      window.VensisVitloTechnicalDrawings?.resolve?.(seriesCode)?.asset||
      info?.drawing?.asset||
      ''
    ).trim();
    const rawDimensions=model?.dimensions&&typeof model.dimensions==='object'?model.dimensions:null;
    if(!drawing&&!info&&!rawDimensions)return;

    const box=doc.createElement('section');
    box.className='info-box dimension-box';
    const title=doc.createElement('h3');
    title.textContent='Mechanical Dimensions';
    box.appendChild(title);

    if(drawing){
      const img=doc.createElement('img');
      img.className='dimension-drawing';
      img.src=drawing;
      img.alt=(item.model||model?.model||'Fan')+' technical drawing';
      const fallback=window.VensisVitloTechnicalDrawings?.resolve?.(seriesCode)?.fallback||info?.drawing?.fallback||'';
      if(fallback)img.dataset.fallback=fallback;
      img.onerror=function(){
        if(this.dataset.fallback&&this.src.indexOf(this.dataset.fallback)<0)this.src=this.dataset.fallback;
        else this.style.display='none';
      };
      box.appendChild(img);
    }

    if(rawDimensions&&!info){
      const values=doc.createElement('div');
      values.className='dimension-values';
      for(const [key,value] of Object.entries(rawDimensions)){
        const cell=doc.createElement('div');cell.className='dimension-value';
        const label=doc.createElement('span');label.textContent=key;
        const number=doc.createElement('b');number.textContent=String(value)+' mm';
        cell.append(label,number);values.appendChild(cell);
      }
      box.appendChild(values);
    }
    if(info?.headers?.length){
      const values=doc.createElement('div');
      values.className='dimension-values';
      info.headers.forEach(header=>{
        const cell=doc.createElement('div');
        cell.className='dimension-value';
        const label=doc.createElement('span');
        label.textContent=header;
        const value=doc.createElement('b');
        value.textContent=String(info.values?.[header]??'-')+(info.unit?' '+info.unit:'');
        cell.append(label,value);
        values.appendChild(cell);
      });
      box.appendChild(values);
    }

    let bottom=sheet.querySelector('.bottom-grid');
    if(!bottom){
      bottom=doc.createElement('div');
      bottom.className='bottom-grid';
      const footer=sheet.querySelector('.footer');
      if(footer)footer.insertAdjacentElement('beforebegin',bottom);
      else sheet.appendChild(bottom);
    }
    bottom.appendChild(box);
  }

  function addDescriptionNote(doc,sheet,item){
    const description=String(item.description||'').trim();
    if(!description)return;
    const note=doc.createElement('div');
    note.style.cssText='margin-top:3mm;padding:3mm 4mm;border-left:3px solid #087f4f;background:#f5faf7;border-radius:0 6px 6px 0;color:#29484d;font-size:9.5px;line-height:1.4';
    note.innerHTML=`<b style="display:block;color:#087f4f;margin-bottom:2px;text-transform:uppercase;font-size:8.5px">Project Description</b>${esc(description).replace(/\n/g,'<br>')}`;
    const hero=sheet.querySelector('.top-grid,.hero');
    if(hero)hero.insertAdjacentElement('afterend',note);
  }

  function cleanDatasheet(item,index,total){
    const renderer=window.VensisDatasheet;
    if(!renderer?.html)return '';
    const doc=new DOMParser().parseFromString(renderer.html(payloadFor(item)),'text/html');
    const sheet=doc.querySelector('.sheet');
    if(!sheet)return '';
    const productTitle=sheet.querySelector('.product-title');
    const heading=productTitle?.querySelector('h1');
    if(productTitle&&heading&&!productTitle.querySelector('.product-brand,.brand')){
      const brand=doc.createElement('div');
      brand.className='product-brand';
      brand.textContent=`Brand: ${item.manufacturer||'Vitlo'}`;
      heading.insertAdjacentElement('afterend',brand);
    }
    sheet.querySelectorAll('.spec-row').forEach(row=>{
      const label=(row.querySelector('span')?.textContent||'').trim();
      if(['Brand','Fire Rating','Fan Type','Mount Type'].includes(label))row.remove();
    });
    const pointSummary=sheet.querySelector('.point-summary');
    const specBox=sheet.querySelector('.spec-box');
    if(pointSummary&&specBox){
      const cards=[...pointSummary.querySelectorAll('.point-card')];
      if(cards.length===2){
        const first=(cards[0].querySelector('b')?.textContent||'').trim();
        const second=(cards[1].querySelector('b')?.textContent||'').trim();
        if(first===second){
          const label=cards[0].querySelector('span');
          if(label)label.textContent='Required / Program Selected Point';
          cards[0].classList.add('combined');
          cards[1].remove();
        }
      }
      specBox.insertBefore(pointSummary,specBox.children[1]||null);
    }
    addDescriptionNote(doc,sheet,item);
    ensureMechanicalDimensions(doc,sheet,item);
    sheet.querySelectorAll('.page-note').forEach(node=>node.remove());
    const footer=sheet.querySelector('.footer');
    if(footer){
      const meta=doc.createElement('div');
      meta.className='pdf-footer-meta';
      meta.textContent='Project Datasheet Appendix';
      footer.appendChild(meta);
    }
    return `<section class="sheet datasheet-page one-page-datasheet">${sheet.innerHTML}</section>`;
  }

  function specRow(label,value){
    return `<div class="spec-row"><span>${esc(label)}</span><b>${esc(value||'-')}</b></div>`;
  }

  function customDatasheet(item,index,total){
    const motor=resolvedMotor(item,null);
    const description=String(item.description||'').trim();
    const image=String(item.image||'').trim();
    return `<section class="sheet datasheet-page">
      <header class="header"><img class="logo" src="assets/vensis-logo.png" alt="Vensis"><div class="doc-title">CUSTOM PRODUCT TECHNICAL SHEET</div></header>
      <div class="product-title"><h1>${esc(item.model||'Custom Product')}</h1><div class="product-brand">Brand: ${esc(item.manufacturer||'Vitlo')}</div><h2>${esc(item.series||'Project-defined product')}</h2></div>
      <section class="hero">${image?`<img class="product-image" src="${esc(image)}" alt="${esc(item.model||'Custom Product')}" onerror="this.style.visibility='hidden'">`:`<div class="product-image" aria-hidden="true" style="border:1px dashed #b8c9cc;border-radius:8px"></div>`}<div class="spec-box"><div class="spec-head">PROJECT SPECIFICATIONS</div>${specRow('Selected / Nominal Airflow',num(item.nominalAirflow)>0?`${fmt(item.nominalAirflow)} m³/h`:'-')}${specRow('Voltage / Frequency',motor.voltage||motor.frequency?`${motor.voltage}${motor.voltage&&motor.frequency?' – ':''}${motor.frequency}`:'-')}${specRow('Motor Power',motor.power>0?`${fmt(motor.power,2)} kW`:'-')}${specRow('Speed',motor.speed>0?`${fmt(motor.speed)} rpm`:'-')}${specRow('Current',motor.current>0?`${fmt(motor.current,2)} A`:'-')}${specRow('Sound Level',motor.sound>0?`${fmt(motor.sound)} dB(A)`:'-')}${specRow('Quantity',String(Math.max(1,num(item.quantity)||1)))}</div></section>
      <section class="info-box" style="margin-top:7mm;min-height:74mm"><h3>Project Description</h3>${description?`<p style="margin:0;color:#29484d;font-size:11px;line-height:1.65;white-space:pre-wrap">${esc(description)}</p>`:'<p class="muted">No additional project description was entered.</p>'}</section>
      <section class="info-box" style="margin-top:5mm;min-height:38mm"><h3>Document Note</h3><p style="margin:0;color:#52666b;font-size:10px;line-height:1.55">This custom product was entered manually in the project and is not linked to a verified selection-program performance curve. Technical suitability and manufacturer data should be confirmed before order.</p></section>
      <footer class="footer">Custom product data is based on project-entered information and should be verified before order.<b>Vensis Engineering Suite&nbsp;&nbsp; | &nbsp;&nbsp;Project Technical Document&nbsp;&nbsp; | &nbsp;&nbsp;www.vensis.com.tr</b><div class="pdf-footer-meta">Custom Product Appendix</div></footer>
    </section>`;
  }

  function waitForImages(){
    const images=[...document.images];
    return Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise(resolve=>{
      image.addEventListener('load',resolve,{once:true});
      image.addEventListener('error',resolve,{once:true});
      setTimeout(resolve,1500);
    })));
  }

  function render(){
    const data=snapshot();
    if(!Array.isArray(data.items)||!data.items.length){
      root.innerHTML='<section class="empty"><h2>No project products found</h2><p>Return to the project and add products before printing.</p></section>';
      return;
    }
    root.innerHTML=overview(data)+data.items.map((item,index)=>item.mode==='custom'?customDatasheet(item,index,data.items.length):cleanDatasheet(item,index,data.items.length)).join('');
    document.title=`${data.project?.name||'Vensis Project'} - Technical Project.pdf`;
    if(new URLSearchParams(location.search).get('print')==='1'){
      waitForImages().then(()=>setTimeout(()=>window.print(),250));
    }
  }

  document.getElementById('printProjectDocument')?.addEventListener('click',()=>window.print());
  render();
})();

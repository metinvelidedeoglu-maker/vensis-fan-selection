(function(){
  const PRINT_KEY='vensis_project_print_snapshot_v1';
  const ITEMS_KEY='vensis_project_items_v1';
  const META_KEY='vensis_project_meta_v1';
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

  function overviewRow(item){
    const model=modelFor(item);
    const motor=resolvedMotor(item,model);
    const image=item.image||catalog.product?.(model?.id)?.media?.image||'';
    const description=String(item.description||'').trim();
    return `<tr>
      <td><div class="project-product">${image?`<img src="${esc(image)}" alt="${esc(item.model||'Fan')}" onerror="this.style.display='none'">`:''}<div><strong>${esc(item.model||'-')}</strong><span>${esc(item.series||model?.seriesTitle||'')}</span><small>${esc(item.manufacturer||'Vitlo')}</small>${description?`<em class="project-description">${esc(description)}</em>`:''}</div></div></td>
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
    const model=modelFor(item);
    const product=productFor(item,model);
    const fallbackModel=model||{
      model:item.model||'',
      manufacturer:item.manufacturer||'Vitlo',
      motor:product.motor,
      performance:product.performance,
      technical:{},
      seriesTitle:item.series||''
    };
    return {
      mode:item.mode==='catalog'?'catalog':'selection',
      product,
      model:fallbackModel,
      required:item.mode==='catalog'?null:item.required,
      selected:item.mode==='catalog'?null:item.selected
    };
  }

  function addDescriptionNote(doc,sheet,item){
    const description=String(item.description||'').trim();
    if(!description)return;
    const note=doc.createElement('div');
    note.style.cssText='margin-top:3mm;padding:3mm 4mm;border-left:3px solid #087f4f;background:#f5faf7;border-radius:0 6px 6px 0;color:#29484d;font-size:9.5px;line-height:1.4';
    note.innerHTML=`<b style="display:block;color:#087f4f;margin-bottom:2px;text-transform:uppercase;font-size:8.5px">Project Description</b>${esc(description).replace(/\n/g,'<br>')}`;
    const hero=sheet.querySelector('.hero');
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
    if(productTitle&&heading&&!productTitle.querySelector('.product-brand')){
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
    const footer=sheet.querySelector('.footer');
    if(footer){
      const meta=doc.createElement('div');
      meta.className='pdf-footer-meta';
      meta.textContent=`Project Datasheet Appendix  •  Page ${index+2} / ${total+1}`;
      footer.appendChild(meta);
    }
    return `<section class="sheet datasheet-page">${sheet.innerHTML}</section>`;
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
      <section class="hero">${image?`<img class="product-image" src="${esc(image)}" alt="${esc(item.model||'Custom Product')}" onerror="this.style.visibility='hidden'">`:`<div class="product-image" style="display:flex;align-items:center;justify-content:center;border:1px dashed #b8c9cc;border-radius:8px;color:#64748b;font-size:12px">No product image</div>`}<div class="spec-box"><div class="spec-head">PROJECT SPECIFICATIONS</div>${specRow('Selected / Nominal Airflow',num(item.nominalAirflow)>0?`${fmt(item.nominalAirflow)} m³/h`:'-')}${specRow('Voltage / Frequency',motor.voltage||motor.frequency?`${motor.voltage}${motor.voltage&&motor.frequency?' – ':''}${motor.frequency}`:'-')}${specRow('Motor Power',motor.power>0?`${fmt(motor.power,2)} kW`:'-')}${specRow('Speed',motor.speed>0?`${fmt(motor.speed)} rpm`:'-')}${specRow('Current',motor.current>0?`${fmt(motor.current,2)} A`:'-')}${specRow('Sound Level',motor.sound>0?`${fmt(motor.sound)} dB(A)`:'-')}${specRow('Quantity',String(Math.max(1,num(item.quantity)||1)))}</div></section>
      <section class="info-box" style="margin-top:7mm;min-height:74mm"><h3>Project Description</h3>${description?`<p style="margin:0;color:#29484d;font-size:11px;line-height:1.65;white-space:pre-wrap">${esc(description)}</p>`:'<p class="muted">No additional project description was entered.</p>'}</section>
      <section class="info-box" style="margin-top:5mm;min-height:38mm"><h3>Document Note</h3><p style="margin:0;color:#52666b;font-size:10px;line-height:1.55">This custom product was entered manually in the project and is not linked to a verified selection-program performance curve. Technical suitability and manufacturer data should be confirmed before order.</p></section>
      <footer class="footer">Custom product data is based on project-entered information and should be verified before order.<b>Vensis Engineering Suite&nbsp;&nbsp; | &nbsp;&nbsp;Project Technical Document&nbsp;&nbsp; | &nbsp;&nbsp;www.vensis.com.tr</b><div class="pdf-footer-meta">Custom Product Appendix &nbsp;•&nbsp; Page ${index+2} / ${total+1}</div></footer>
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

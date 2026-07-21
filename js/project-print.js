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
    return {createdAt:new Date().toISOString(),project:{name:meta.name||'',reference:meta.reference||''},items:Array.isArray(items)?items:[]};
  }

  function modelFor(item){
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
    return item.mode==='catalog'?'Catalog Item':point(item.required);
  }

  function selectedText(item){
    if(item.mode==='catalog')return num(item.nominalAirflow)>0?`${fmt(item.nominalAirflow)} m³/h nominal`:'-';
    return point(item.selected);
  }

  function overviewRow(item){
    const model=modelFor(item);
    const motor=resolvedMotor(item,model);
    const image=item.image||catalog.product?.(model?.id)?.media?.image||'';
    return `<tr>
      <td><div class="project-product">${image?`<img src="${esc(image)}" alt="${esc(item.model||'Fan')}" onerror="this.style.display='none'">`:''}<div><strong>${esc(item.model||'-')}</strong><span>${esc(item.series||model?.seriesTitle||'')}</span><small>${esc(item.manufacturer||'Vitlo')}</small></div></div></td>
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
      <header class="project-header"><img src="assets/vensis-logo.png" alt="Vensis"><div class="project-title"><h1>PROJECT TECHNICAL DOCUMENT</h1><p>Project list and product datasheets</p></div></header>
      <section class="project-meta"><div class="meta-card"><span>Project Name</span><b>${esc(data.project?.name||'-')}</b></div><div class="meta-card"><span>Customer / Reference</span><b>${esc(data.project?.reference||'-')}</b></div><div class="meta-card"><span>Date / Total Units</span><b>${esc(date)} &nbsp;•&nbsp; ${fmt(units)} units</b></div></section>
      <section class="project-table-wrap"><table class="project-table"><thead><tr><th>Product</th><th>Required / Source</th><th>Selected / Nominal</th><th>V / Hz</th><th>kW</th><th>rpm</th><th>A</th><th>dB(A)</th><th>Qty</th></tr></thead><tbody>${data.items.map(overviewRow).join('')}</tbody></table></section>
      <section class="project-note"><b>Technical Project Output</b>This document intentionally excludes unit prices, discounts and commercial totals. A separate product datasheet is included for every project line below.</section>
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
    const footer=sheet.querySelector('.footer');
    if(footer){
      const meta=doc.createElement('div');
      meta.className='pdf-footer-meta';
      meta.textContent=`Project Datasheet Appendix  •  Page ${index+2} / ${total+1}`;
      footer.appendChild(meta);
    }
    return `<section class="sheet datasheet-page">${sheet.innerHTML}</section>`;
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
    root.innerHTML=overview(data)+data.items.map((item,index)=>cleanDatasheet(item,index,data.items.length)).join('');
    document.title=`${data.project?.name||'Vensis Project'} - Technical Project.pdf`;
    if(new URLSearchParams(location.search).get('print')==='1'){
      waitForImages().then(()=>setTimeout(()=>window.print(),250));
    }
  }

  document.getElementById('printProjectDocument')?.addEventListener('click',()=>window.print());
  render();
})();
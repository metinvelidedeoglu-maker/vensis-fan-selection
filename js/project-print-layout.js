(function(){
  'use strict';

  const root=document.getElementById('projectPrintRoot');
  if(!root)return;

  const storageKey=key=>window.VensisAccess?.storageKey?.(key)||key;
  const PRINT_KEY=storageKey('vensis_project_print_snapshot_v1');
  const ITEMS_KEY=storageKey('vensis_project_items_v1');
  const META_KEY=storageKey('vensis_project_meta_v1');
  const catalog=window.VensisCatalog||{models:[]};
  const formats=window.VensisQuotationFormats||{
    split(items){
      const electrical=[],fan=[];
      (items||[]).forEach(item=>{
        const isElectrical=item?.productType==='electrical'||/^electrical\|/i.test(String(item?.itemKey||''))||/zonex/i.test(String(item?.manufacturer||''))||Boolean(item?.ip);
        (isElectrical?electrical:fan).push(item);
      });
      return {fan,electrical};
    }
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};

  function language(){
    const active=window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'';
    if(active==='tr'||active==='en')return active;
    try{
      const saved=localStorage.getItem('vensis_language_v1');
      return saved==='tr'?'tr':'en';
    }catch{return 'en'}
  }

  function labels(){
    if(language()==='tr'){
      return {
        fanHeaders:['Ürün','İstenen Debi','Seçilen / Anma','Voltaj','kW','rpm','Adet'],
        electricalHeaders:['Ürün','Güç','Lümen','Voltaj','IP','Adet'],
        fanGroup:'Fan Ürünleri',
        electricalGroup:'Elektrik Ürünleri'
      };
    }
    return {
      fanHeaders:['Product','Required Airflow','Selected / Nominal','Voltage','kW','rpm','Qty'],
      electricalHeaders:['Product','Power','Lumen','Voltage','IP','Qty'],
      fanGroup:'Fan Products',
      electricalGroup:'Electrical Products'
    };
  }

  const fmt=(value,digits=0)=>new Intl.NumberFormat(language()==='tr'?'tr-TR':'en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value));
  const point=value=>value&&num(value.q)>=0&&num(value.p)>=0?`${fmt(value.q)} m³/h @ ${fmt(value.p)} Pa`:'-';

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}
  }

  function snapshot(){
    const stored=readJson(PRINT_KEY,null);
    if(stored&&Array.isArray(stored.items))return stored;
    const items=readJson(ITEMS_KEY,[]);
    const meta=readJson(META_KEY,{});
    return {project:{name:meta.name||'',reference:meta.reference||'',contact:meta.contact||''},items:Array.isArray(items)?items:[]};
  }

  function modelFor(item){
    if(item?.mode==='custom')return null;
    const direct=catalog.getModel?.(item?.productKey);
    if(direct)return direct;
    return (catalog.models||[]).find(model=>String(model.model||'')===String(item?.model||''))||null;
  }

  function productMarkup(item,model){
    const image=item.image||catalog.product?.(model?.id)?.media?.image||'';
    const description=String(item.description||'').trim();
    const safety=String(item.safetyWarning||model?.technical?.safetyWarning||'').trim();
    return `<div class="project-product">${image?`<img src="${esc(image)}" alt="${esc(item.model||'Product')}" onerror="this.style.display='none'">`:''}<div><strong>${esc(item.model||'-')}</strong><span>${esc(item.series||model?.seriesTitle||'')}</span><small>${esc(item.manufacturer||'Vitlo')}</small>${safety?`<em style="display:block;margin-top:4px;color:#9a3412;font-size:8.5px;font-weight:750;line-height:1.3">${esc(safety)}</em>`:''}${description?`<em class="project-description">${esc(description)}</em>`:''}</div></div>`;
  }

  function voltageText(item,model){
    const voltage=String(item.voltage||model?.motor?.voltage||'').trim();
    return voltage?esc(voltage):'-';
  }

  function requestedAirflow(item){
    const q=num(item?.required?.q);
    return q>0?`${fmt(q)} m³/h`:'-';
  }

  function selectedText(item){
    if(item.mode==='catalog'||item.mode==='custom')return num(item.nominalAirflow)>0?`${fmt(item.nominalAirflow)} m³/h`:'-';
    return point(item.selected);
  }

  function fanRow(item){
    const model=modelFor(item);
    const power=num(item.motorPower)||num(model?.motor?.power);
    const speed=num(item.speed)||num(model?.motor?.speed);
    const qty=Math.max(1,Math.round(num(item.quantity)||1));
    return `<tr><td>${productMarkup(item,model)}</td><td class="technical-point">${requestedAirflow(item)}</td><td class="technical-point">${esc(selectedText(item))}</td><td>${voltageText(item,model)}</td><td>${power>0?`${fmt(power,2)} kW`:'-'}</td><td>${speed>0?`${fmt(speed)} rpm`:'-'}</td><td><b>${fmt(qty)}</b></td></tr>`;
  }

  function electricalRow(item){
    const qty=Math.max(1,Math.round(num(item.quantity)||1));
    const power=String(item.power||'').trim();
    const lumen=String(item.lumen||'').trim();
    const ip=String(item.ip||'').trim();
    return `<tr><td>${productMarkup(item,null)}</td><td>${power?esc(power):'-'}</td><td>${lumen?esc(lumen):'-'}</td><td>${voltageText(item,null)}</td><td>${ip?esc(ip):'-'}</td><td><b>${fmt(qty)}</b></td></tr>`;
  }

  function table(type,items,title=''){
    const electrical=type==='electrical';
    const text=labels();
    const headers=electrical?text.electricalHeaders:text.fanHeaders;
    const rows=items.map(item=>electrical?electricalRow(item):fanRow(item)).join('');
    return `<section class="project-product-group">${title?`<h2 class="project-product-group-title">${esc(title)}</h2>`:''}<div class="project-table-wrap"><table class="project-table ${electrical?'project-electrical-table':'project-fan-table'}"><thead><tr>${headers.map(header=>`<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function tables(items){
    const groups=formats.split(items||[]);
    const mixed=groups.fan.length&&groups.electrical.length;
    const text=labels();
    return `${groups.fan.length?table('fan',groups.fan,mixed?text.fanGroup:''):''}${groups.electrical.length?table('electrical',groups.electrical,mixed?text.electricalGroup:''):''}`;
  }

  function addStyles(){
    if(document.getElementById('projectPrintQuotationLayout'))return;
    const style=document.createElement('style');
    style.id='projectPrintQuotationLayout';
    style.textContent=`
      .project-product-group{margin-top:7mm}.project-product-group+.project-product-group{margin-top:5mm}.project-product-group .project-table-wrap{margin-top:0}.project-product-group-title{margin:0 0 2mm;padding:0 2px;color:#087f4f;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
      @media print{
        .project-table.project-fan-table th:nth-child(1),.project-table.project-fan-table td:nth-child(1){width:34%}.project-table.project-fan-table th:nth-child(2),.project-table.project-fan-table td:nth-child(2){width:15%}.project-table.project-fan-table th:nth-child(3),.project-table.project-fan-table td:nth-child(3){width:16%}.project-table.project-fan-table th:nth-child(4),.project-table.project-fan-table td:nth-child(4){width:13%}.project-table.project-fan-table th:nth-child(5),.project-table.project-fan-table td:nth-child(5){width:8%}.project-table.project-fan-table th:nth-child(6),.project-table.project-fan-table td:nth-child(6){width:8%}.project-table.project-fan-table th:nth-child(7),.project-table.project-fan-table td:nth-child(7){width:6%}
        .project-table.project-electrical-table th:nth-child(1),.project-table.project-electrical-table td:nth-child(1){width:42%}.project-table.project-electrical-table th:nth-child(2),.project-table.project-electrical-table td:nth-child(2){width:13%}.project-table.project-electrical-table th:nth-child(3),.project-table.project-electrical-table td:nth-child(3){width:13%}.project-table.project-electrical-table th:nth-child(4),.project-table.project-electrical-table td:nth-child(4){width:14%}.project-table.project-electrical-table th:nth-child(5),.project-table.project-electrical-table td:nth-child(5){width:10%}.project-table.project-electrical-table th:nth-child(6),.project-table.project-electrical-table td:nth-child(6){width:8%}
      }`;
    document.head.appendChild(style);
  }

  function apply(){
    const data=snapshot();
    if(!Array.isArray(data.items)||!data.items.length)return;
    const overview=root.querySelector('.project-overview');
    if(!overview)return;
    addStyles();
    const existing=overview.querySelector('.project-product-tables');
    if(existing){
      existing.innerHTML=tables(data.items);
      return;
    }
    const oldTable=overview.querySelector('.project-table-wrap');
    if(!oldTable)return;
    const holder=document.createElement('div');
    holder.className='project-product-tables';
    holder.innerHTML=tables(data.items);
    oldTable.replaceWith(holder);
  }

  window.addEventListener('vensis-language-changed',apply);
  apply();
})();

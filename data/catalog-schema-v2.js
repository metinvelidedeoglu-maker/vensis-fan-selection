(function(){
  'use strict';

  const catalog=window.VensisCatalog;
  if(!catalog||!Array.isArray(catalog.series)||!Array.isArray(catalog.models))return;

  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const identity=value=>text(value).toUpperCase().replace(/(\d),(\d)/g,'$1.$2');
  const uniqueText=values=>{const out=[],seen=new Set();for(const value of values.flat(Infinity)){const clean=text(value);if(!clean)continue;const key=clean.toLocaleLowerCase('tr-TR');if(seen.has(key))continue;seen.add(key);out.push(clean)}return out};
  const fullModelName=(series,model)=>{const code=text(series?.code||series?.id),current=text(model?.model||model?.display||model?.id);if(!code)return current;if(!current)return code;const c=current.toUpperCase(),s=code.toUpperCase();const exists=c===s||c.startsWith(s+' ')||c.startsWith(s+'-')||c.startsWith(s+'/')||c.includes(' '+s+' ')||c.endsWith(' '+s);return exists?current:`${code} ${current}`};
  const maxAirflow=model=>{const values=[finite(model?.performance?.nominalAirflow)];for(const point of model?.performance?.points||[])values.push(finite(point?.[1]));for(const point of model?.performance?.sourcePoints||[])values.push(finite(point?.[1]));for(const curve of model?.performance?.curves||[]){for(const point of curve?.sourcePoints||[])values.push(finite(point?.[1]));for(const point of curve?.points||[])values.push(finite(point?.[1]))}for(const point of model?.performance?.operatingPoints||[])values.push(finite(point?.nominalAirflow));return Math.max(0,...values)};
  const voltageOnly=value=>{const raw=text(value);const match=raw.match(/\b(\d+(?:\/\d+)?\s*V)\b/i);return match?match[1].replace(/\s+/g,'').toUpperCase():raw};
  const isVitlo=series=>text(series?.manufacturer).toLocaleLowerCase('tr-TR')==='vitlo';

  // 2026-08-27: Values supplied by Metin in the Vitlo workbook.
  // All other Vitlo power/speed/current/airflow/sound values already match the workbook exactly.
  const vitloPriceRows=[["AXB","AXB 100-4T-10",2138.5],["AXB","AXB 100-4T-15",1734],["AXB","AXB 100-4T-7,5",2112],["AXB","AXB 45-4T-0.75",800],["AXB","AXB 50-4T-1",834],["AXB","AXB 56-4T-1.5",845],["AXB","AXB 63-4T-1.5",890],["AXB","AXB 63-4T-2",912],["AXB","AXB 63-4T-3",1290],["AXB","AXB 71-4T-3",1323],["AXB","AXB 71-4T-4",1334],["AXB","AXB 80-4T-4",1401],["AXB","AXB 80-4T-5,5",1423],["AXB","AXB 80-4T-7,5",1543],["AXB","AXB 90-4T-10",1523],["AXB","AXB 90-4T-5,5",1623],["AXB","AXB 90-4T-7,5",1712],["AXV","AXV 100-4T-10",3321.6],["AXV","AXV 100-4T-15",3494.4],["AXV","AXV 100-4T-7,5",4281.6],["AXV","AXV 35-4T-0.18",998.4],["AXV","AXV 40-4T-0.27",1094.4],["AXV","AXV 40-4T-0.37",1113.6],["AXV","AXV 45-4T-0.55",1190.4],["AXV","AXV 50-4T-0.55",1401.6],["AXV","AXV 50-4T-0.75",1420.8],["AXV","AXV 56-4T-0.75",1516.8],["AXV","AXV 56-4T-1",1536],["AXV","AXV 56-4T-1.5",1574.4],["AXV","AXV 63-4T-1",1670.4],["AXV","AXV 63-4T-1.5",1708.8],["AXV","AXV 63-4T-2",1747.2],["AXV","AXV 63-4T-3",2073.6],["AXV","AXV 71-4T-3",2323.2],["AXV","AXV 71-4T-4",2361.6],["AXV","AXV 80-4T-4",2553.6],["AXV","AXV 80-4T-5,5",2611.2],["AXV","AXV 80-4T-7,5",2841.6],["AXV","AXV 90-4T-10",2976],["AXV","AXV 90-4T-5,5",3168],["AXV","AXV 90-4T-7,5",3206.4]];
  const vitloPriceMap=new Map(vitloPriceRows.map(([series,model,price])=>[`${identity(series)}|${identity(model)}`,price]));

  for(const series of catalog.series){
    const models=typeof catalog.modelsForSeries==='function'?catalog.modelsForSeries(series.id):catalog.models.filter(model=>model.seriesId===series.id);
    const originalDescription={general:[...(series?.description?.general||[])],motor:[...(series?.description?.motor||[])],applications:[...(series?.description?.applications||[])]};
    const descriptionText=uniqueText([originalDescription.general,originalDescription.motor,originalDescription.applications]).join(' ');
    series.schemaVersion='2.2';
    series.modelName=text(series.code||series.title||series.id);
    series.brand=text(series.manufacturer);
    series.descriptionParts=originalDescription;
    series.descriptionText=descriptionText;
    series.description={text:descriptionText,general:descriptionText?[descriptionText]:[],motor:[],applications:[]};
    series.category=[...(series.categories||[])];
    series.image=text(series?.media?.image);
    series.catalogPdf=text(series?.catalogue?.pdf);

    for(const model of models){
      const fullName=fullModelName(series,model);
      model.model=fullName;
      model.display=fullName;
      model.altModel=fullName;
      model.motor=model.motor||{};
      model.pricing=model.pricing||{};

      if(isVitlo(series)){
        // The workbook intentionally keeps voltage only; frequency is not an alt-model field.
        model.motor.voltage=voltageOnly(model.motor.voltage);
        const workbookPrice=vitloPriceMap.get(`${identity(series.code||series.id)}|${identity(fullName)}`);
        if(Number.isFinite(workbookPrice)){
          model.pricing.listPrice=workbookPrice;
          if(!model.pricing.currency)model.pricing.currency='EUR';
        }
      }

      model.standard={
        altModel:fullName,
        motorPower:finite(model?.motor?.power),
        speed:finite(model?.motor?.speed),
        current:finite(model?.motor?.current),
        voltage:text(model?.motor?.voltage),
        maxAirflow:maxAirflow(model),
        sound:finite(model?.motor?.sound),
        price:finite(model?.pricing?.listPrice)
      };
    }
    series.submodels=models.map(model=>model.model);
  }

  catalog.schemaVersion='2.2';
  catalog.standard={
    seriesFields:['modelName','brand','descriptionText','category','image','submodels','catalogPdf'],
    submodelFields:['altModel','motorPower','speed','current','voltage','maxAirflow','sound','price']
  };

  function installFieldPolicy(){
    if(typeof document==='undefined'||typeof MutationObserver==='undefined')return;
    const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    const num=(value,digits=0)=>{const n=Number(value);if(!Number.isFinite(n)||n<=0)return '-';return n.toLocaleString('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits})};
    const money=(value,currency='EUR')=>{const n=Number(value);if(!Number.isFinite(n)||n<=0)return '-';return `${num(n,n%1?2:0)} ${String(currency||'EUR').toUpperCase()}`};
    const field=(label,value)=>`<div class="model-field"><span>${esc(label)}</span><b>${esc(value||'-')}</b></div>`;
    const forbiddenEditFields=new Set(['frequency','phase','poles','pole','fire','fanTypeEn','mountTypeEn','ipClass','insulation','operatingTemperature']);

    function pruneEditFields(){
      document.querySelectorAll('.vensis-edit-dialog .vensis-edit-field').forEach(label=>{
        const input=label.querySelector('[name]');
        if(input&&forbiddenEditFields.has(input.name))label.remove();
      });
    }

    function applyCatalog(){
      if(!document.body?.classList.contains('app-catalog'))return;
      const seriesId=new URLSearchParams(location.search).get('series');
      const series=seriesId&&typeof catalog.getSeries==='function'?catalog.getSeries(seriesId):null;
      const infoGrid=document.querySelector('.series-info-grid');
      if(series&&infoGrid&&infoGrid.dataset.schemaV2!=='1'){
        infoGrid.dataset.schemaV2='1';
        infoGrid.style.gridTemplateColumns='1fr';
        infoGrid.innerHTML=`<section class="detail-section"><h3>Description</h3><p style="margin:0;line-height:1.65;color:#334155">${esc(series.descriptionText||'No information available.')}</p></section>`;
      }
      document.querySelectorAll('.model-card').forEach(card=>{
        if(card.dataset.schemaV2==='1')return;
        const button=card.querySelector('[data-model-datasheet]');
        const id=button?.dataset?.modelDatasheet;
        const model=id&&typeof catalog.getModel==='function'?catalog.getModel(id):null;
        const s=model?.standard;
        if(!model||!s)return;
        card.dataset.schemaV2='1';
        const title=card.querySelector('h3');
        if(title)title.textContent=s.altModel||model.model||'';
        const grid=card.querySelector('.model-grid');
        if(grid)grid.innerHTML=[
          field('Motor Power',s.motorPower>0?`${num(s.motorPower,2)} kW`:'-'),
          field('Speed',s.speed>0?`${num(s.speed)} rpm`:'-'),
          field('Current',s.current>0?`${num(s.current,2)} A`:'-'),
          field('Voltage',s.voltage||'-'),
          field('Max. Airflow',s.maxAirflow>0?`${num(s.maxAirflow)} m³/h`:'-'),
          field('Sound',s.sound>0?`${num(s.sound)} dB(A)`:'-'),
          field('Price',money(s.price,model?.pricing?.currency||'EUR'))
        ].join('');
        const op=card.querySelector('.model-operating-points');
        if(op)op.hidden=true;
      });
    }

    function apply(){pruneEditFields();applyCatalog()}
    let scheduled=false;
    const schedule=()=>{if(scheduled)return;scheduled=true;Promise.resolve().then(()=>{scheduled=false;apply()})};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  }

  function installDatasheetPolicy(){
    if(typeof window==='undefined')return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      const renderer=window.VensisDatasheet;
      if(!renderer?.html){if(attempts>100)clearInterval(timer);return}
      if(renderer.__altModelFieldPolicy){clearInterval(timer);return}
      clearInterval(timer);
      const originalHtml=renderer.html.bind(renderer);
      const blocked=['Product Code','Availability','Control Level','Available Controls','Fire Rating','Fan Type','Mount Type'];
      renderer.html=function(payload){
        let output=originalHtml(payload);
        for(const label of blocked){
          const safe=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          output=output.replace(new RegExp(`<div class="spec-row"><span>${safe}<\\/span><b>[\\s\\S]*?<\\/b><\\/div>`,'g'),'');
        }
        const model=payload?.model||{},product=payload?.product||{};
        const price=Number(model?.pricing?.listPrice??product?.pricing?.listPrice??model?.price??0);
        if(Number.isFinite(price)&&price>0){
          const currency=text(model?.pricing?.currency||product?.pricing?.currency||'EUR').toUpperCase();
          const priceText=`${price.toLocaleString('tr-TR',{minimumFractionDigits:price%1?2:0,maximumFractionDigits:2})} ${currency}`;
          const row=`<div class="spec-row"><span>Price</span><b>${esc(priceText)}</b></div>`;
          output=output.replace(/(<div class="spec-box">[\s\S]*?)(<\/div><\/section>)/,`$1${row}$2`);
        }
        return output;
      };
      renderer.__altModelFieldPolicy=true;
    },0);
  }

  installFieldPolicy();
  installDatasheetPolicy();
})();
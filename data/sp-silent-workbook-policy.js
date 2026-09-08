(function(root){
  'use strict';

  const rows=[
    {series:'SILENT',altModel:'SILENT-100 CZ',categories:['Bathroom Fan','Soler & Palau'],power:0.008,speed:2400,voltage:'230 V',maxAirflow:95,sound:26.5,price:67,speedControllerIncluded:'REB-1 N',timerVariant:false,featuresTr:'Pilot lamba, geri tepme ventili',featuresEn:'Pilot lamp, backdraft damper'},
    {series:'SILENT',altModel:'SILENT-100 CRZ',categories:['Bathroom Fan','Soler & Palau'],power:0.008,speed:2400,voltage:'230 V',maxAirflow:95,sound:26.5,price:98,speedControllerIncluded:'REB-1 N',timerVariant:true,featuresTr:'Pilot lamba, geri tepme ventili, timer',featuresEn:'Pilot lamp, backdraft damper, timer'},
    {series:'SILENT',altModel:'SILENT-100 CZ SILVER',categories:['Bathroom Fan','Soler & Palau'],power:0.008,speed:2400,voltage:'230 V',maxAirflow:95,sound:26.5,price:83,speedControllerIncluded:'REB-1 N',timerVariant:false,featuresTr:'Krom renk, geri tepme ventili',featuresEn:'Chrome finish, backdraft damper'},
    {series:'SILENT',altModel:'SILENT-100 CRZ SILVER',categories:['Bathroom Fan','Soler & Palau'],power:0.008,speed:2400,voltage:'230 V',maxAirflow:95,sound:26.5,price:102,speedControllerIncluded:'REB-1 N',timerVariant:true,featuresTr:'Krom renk, geri tepme ventili, timer',featuresEn:'Chrome finish, backdraft damper, timer'},
    {series:'SILENT',altModel:'SILENT-200 CZ',categories:['Bathroom Fan','Soler & Palau'],power:0.016,speed:2350,voltage:'230 V',maxAirflow:180,sound:33,price:98,speedControllerIncluded:'REB-1 N',timerVariant:false,featuresTr:'Pilot lamba, geri tepme ventili',featuresEn:'Pilot lamp, backdraft damper'},
    {series:'SILENT',altModel:'SILENT-200 CRZ',categories:['Bathroom Fan','Soler & Palau'],power:0.016,speed:2350,voltage:'230 V',maxAirflow:180,sound:33,price:129,speedControllerIncluded:'REB-1 N',timerVariant:true,featuresTr:'Pilot lamba, geri tepme ventili, timer',featuresEn:'Pilot lamp, backdraft damper, timer'},
    {series:'SILENT',altModel:'SILENT-300 CZ',categories:['Bathroom Fan','Soler & Palau'],power:0.029,speed:1700,voltage:'230 V',maxAirflow:260,sound:32,price:127,speedControllerIncluded:'REB-1 N',timerVariant:false,featuresTr:'Pilot lamba, geri tepme ventili',featuresEn:'Pilot lamp, backdraft damper'},
    {series:'SILENT',altModel:'SILENT-300 CRZ',categories:['Bathroom Fan','Soler & Palau'],power:0.029,speed:1700,voltage:'230 V',maxAirflow:260,sound:32,price:158,speedControllerIncluded:'REB-1 N',timerVariant:true,featuresTr:'Pilot lamba, geri tepme ventili, timer',featuresEn:'Pilot lamp, backdraft damper, timer'}
  ];

  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const identity=value=>text(value).toUpperCase().replace(/[–—]/g,'-').replace(/\s*\/\s*/g,'/').replace(/\s*-\s*/g,'-').replace(/(\d),(\d)/g,'$1.$2');
  const isSilentRow=row=>identity(row?.series)==='SILENT';
  const cloneRows=()=>rows.map(row=>({...row,categories:[...row.categories]}));

  let workbookRows=Array.isArray(root.VensisSPWorkbookRows)?root.VensisSPWorkbookRows:[];
  function normalizeWorkbookRows(value){
    const source=Array.isArray(value)?value:[];
    if(!source.some(isSilentRow))return source;
    return source.filter(row=>!isSilentRow(row)).concat(cloneRows());
  }
  workbookRows=normalizeWorkbookRows(workbookRows);

  try{
    Object.defineProperty(root,'VensisSPWorkbookRows',{
      configurable:true,
      enumerable:true,
      get(){return workbookRows},
      set(value){workbookRows=normalizeWorkbookRows(value)}
    });
  }catch{
    root.VensisSPWorkbookRows=workbookRows;
  }

  const specByModel=new Map(rows.map(row=>[identity(row.altModel),row]));
  function silentSeries(catalog){
    return (catalog?.series||[]).find(series=>identity(series?.manufacturer)==='SOLER & PALAU'&&[series?.id,series?.code,series?.title].some(value=>identity(value)==='SILENT'))||null;
  }
  function applyCatalog(){
    const catalog=root.VensisCatalog;
    if(!catalog||!Array.isArray(catalog.models)||!Array.isArray(catalog.series))return false;
    const series=silentSeries(catalog);if(!series)return false;
    let applied=0;
    for(const model of catalog.models){
      if(String(model?.seriesId)!==String(series.id))continue;
      const spec=specByModel.get(identity(model?.model||model?.display||model?.standard?.altModel));
      if(!spec)continue;
      model.technical=model.technical||{};
      model.technical.speedControllerIncluded=spec.speedControllerIncluded;
      model.technical.timerVariant=Boolean(spec.timerVariant);
      model.technical.silentFeaturesTr=spec.featuresTr;
      model.technical.silentFeaturesEn=spec.featuresEn;
      model.pricing=model.pricing||{};
      model.pricing.listPrice=spec.price;
      model.pricing.currency='EUR';
      model.performance=model.performance||{};
      model.performance.nominalAirflow=spec.maxAirflow;
      model.motor=model.motor||{};
      model.motor.power=spec.power;
      model.motor.speed=spec.speed;
      model.motor.voltage=spec.voltage;
      model.motor.sound=spec.sound;
      if(model.standard){
        model.standard.altModel=spec.altModel;
        model.standard.motorPower=spec.power;
        model.standard.speed=spec.speed;
        model.standard.voltage=spec.voltage;
        model.standard.maxAirflow=spec.maxAirflow;
        model.standard.sound=spec.sound;
        model.standard.price=spec.price;
      }
      applied++;
    }
    series.submodels=(catalog.models||[]).filter(model=>String(model?.seriesId)===String(series.id)).map(model=>text(model?.model)).filter(Boolean);
    return applied===rows.length;
  }

  function currentLanguage(){
    const api=root.VensisI18n?.getLanguage?.();
    if(api==='tr'||api==='en')return api;
    return String(root.document?.documentElement?.lang||'').toLowerCase().startsWith('tr')?'tr':'en';
  }
  function findModelForCard(card){
    const id=card?.querySelector?.('[data-model-datasheet]')?.getAttribute('data-model-datasheet');
    return id&&root.VensisCatalog?.getModel?.(id)||null;
  }
  function hasField(grid,labels){
    return [...(grid?.querySelectorAll?.('.model-field span')||[])].some(node=>labels.includes(text(node.textContent)));
  }
  function addField(grid,key,label,value){
    let field=grid.querySelector(`[data-silent-field="${key}"]`);
    if(!field){field=root.document.createElement('div');field.className='model-field';field.dataset.silentField=key;field.innerHTML='<span></span><b></b>';grid.appendChild(field)}
    field.querySelector('span').textContent=label;
    field.querySelector('b').textContent=value;
  }
  function decorateCards(){
    if(!root.document||!root.VensisCatalog)return;
    const lang=currentLanguage();
    root.document.querySelectorAll('.model-card').forEach(card=>{
      const model=findModelForCard(card);if(!model)return;
      const spec=specByModel.get(identity(model.model));if(!spec)return;
      const grid=card.querySelector('.model-grid');if(!grid)return;
      if(!hasField(grid,['Speed Controller','Hız Kontrol Cihazı','Hız Anahtarı']))addField(grid,'controller',lang==='tr'?'Hız Anahtarı':'Speed Controller',spec.speedControllerIncluded);
      else grid.querySelector('[data-silent-field="controller"]')?.remove();
      addField(grid,'features',lang==='tr'?'Özellikler':'Features',lang==='tr'?spec.featuresTr:spec.featuresEn);
      if(spec.timerVariant&&!hasField(grid,['Timer','Zamanlayıcı']))addField(grid,'timer',lang==='tr'?'Zamanlayıcı':'Timer',lang==='tr'?'Evet':'Yes');
      else if(!spec.timerVariant||hasField(grid,['Timer','Zamanlayıcı']))grid.querySelector('[data-silent-field="timer"]')?.remove();
    });
  }

  let attempts=0;
  function refresh(){
    attempts++;
    const applied=applyCatalog();
    decorateCards();
    if(!applied&&attempts<120)root.setTimeout?.(refresh,50);
  }
  function start(){
    refresh();
    if(root.MutationObserver&&root.document?.documentElement){
      let queued=false;
      new root.MutationObserver(()=>{if(queued)return;queued=true;root.requestAnimationFrame?.(()=>{queued=false;applyCatalog();decorateCards()})||root.setTimeout?.(()=>{queued=false;applyCatalog();decorateCards()},0)}).observe(root.document.documentElement,{childList:true,subtree:true});
    }
    root.addEventListener?.('vensis-language-changed',()=>root.setTimeout?.(()=>{applyCatalog();decorateCards()},0));
  }

  root.VensisSPSilentPolicy20260908={rows:cloneRows(),applyCatalog,decorateCards};
  if(root.document){
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }
})(typeof window!=='undefined'?window:globalThis);

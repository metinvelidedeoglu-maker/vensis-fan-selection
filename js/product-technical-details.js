(function(){
  'use strict';

  const TYPE_LABELS={
    fan:'Fan',
    lighting:'Lighting',
    motor:'Motor',
    electrical:'Electrical / Ex-proof Equipment',
    other:'Other Product'
  };
  const TYPE_ALIASES={
    fan:'fan',
    ventilation:'fan',
    havalandirma:'fan',
    havalandırma:'fan',
    aydinlatma:'lighting',
    aydınlatma:'lighting',
    lighting:'lighting',
    luminaire:'lighting',
    motor:'motor',
    elektrik:'electrical',
    electrical:'electrical',
    exproof:'electrical',
    'ex-proof':'electrical',
    other:'other',
    diger:'other',
    diğer:'other'
  };

  const number=value=>{
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:0;
  };
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{
    minimumFractionDigits:digits,
    maximumFractionDigits:digits
  }).format(number(value));
  const text=value=>String(value??'').trim();
  const key=value=>text(value).toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
  const withUnit=(value,unit,digits=0)=>{
    const raw=text(value);
    if(!raw)return '';
    if(/[a-zA-Z³°%]/.test(raw))return raw;
    const numeric=Number(raw.replace(',','.'));
    const formatted=Number.isFinite(numeric)&&numeric!==0?fmt(numeric,Number.isInteger(numeric)?0:digits):raw;
    return `${formatted} ${unit}`.trim();
  };

  function normalizeType(value){
    const normalized=key(value);
    return TYPE_ALIASES[normalized]||(['fan','lighting','motor','electrical','other'].includes(normalized)?normalized:'');
  }

  function seriesFor(model,catalog){
    if(!model)return {};
    return catalog?.getSeries?.(model.seriesId)
      ||(catalog?.series||[]).find(series=>String(series.id)===String(model.seriesId))
      ||{};
  }

  function detectType(item={},model=null,series=null){
    const explicit=[
      item.productType,
      model?.productType,
      model?.technical?.productType,
      series?.productType
    ].map(normalizeType).find(Boolean);
    if(explicit)return explicit;
    if(item.mode==='selection')return 'fan';

    const keywords=[
      item.series,
      item.model,
      model?.technical?.productGroup,
      model?.technical?.fanType,
      series?.title,
      series?.code,
      ...(series?.categories||[])
    ].map(key).join(' ');

    if(/\b(aydınlatma|aydinlatma|lighting|luminaire|armatür|armatur|floodlight|projektör|projektor|lamp)\b/.test(keywords))return 'lighting';
    if(/\b(motor|electric motor|elektrik motoru)\b/.test(keywords))return 'motor';
    if(/\b(elektrik|electrical|pano|panel|sensör|sensor|şalter|salter|junction|exproof|ex-proof)\b/.test(keywords))return 'electrical';
    if(
      item.mode==='catalog'
      ||number(item.nominalAirflow)>0
      ||number(item.staticPressure)>0
      ||number(model?.performance?.nominalAirflow)>0
      ||/\b(fan|ventilation|havalandırma|havalandirma|airflow|axial|centrifugal)\b/.test(keywords)
    )return 'fan';
    return 'other';
  }

  function parseDetails(value){
    if(Array.isArray(value)){
      return value.map(entry=>{
        if(Array.isArray(entry))return {label:text(entry[0]),value:text(entry[1])};
        if(entry&&typeof entry==='object')return {label:text(entry.label||entry.name||entry.key),value:text(entry.value)};
        return parseDetailLine(entry);
      }).filter(entry=>entry.label&&entry.value);
    }
    if(value&&typeof value==='object'){
      return Object.entries(value).map(([label,entryValue])=>({label:text(label),value:text(entryValue)})).filter(entry=>entry.label&&entry.value);
    }
    return text(value).split(/\r?\n/).map(parseDetailLine).filter(entry=>entry.label&&entry.value);
  }

  function parseDetailLine(line){
    const raw=text(line);
    if(!raw)return {label:'',value:''};
    const match=raw.match(/^([^:=–—]{1,80})\s*(?::|=|–|—)\s*(.+)$/);
    if(match)return {label:text(match[1]),value:text(match[2])};
    return {label:'Detail',value:raw};
  }

  function detailsFor(item={},model=null,catalog=window.VensisCatalog||{}){
    const series=seriesFor(model,catalog);
    const productType=detectType(item,model,series);
    const details=[];
    const positions=new Map();
    const add=(label,value,replace=false)=>{
      const cleanLabel=text(label).slice(0,80);
      const cleanValue=text(value).slice(0,300);
      if(!cleanLabel||!cleanValue||cleanValue==='-')return;
      const normalized=key(cleanLabel);
      if(positions.has(normalized)){
        if(replace)details[positions.get(normalized)]={label:cleanLabel,value:cleanValue};
        return;
      }
      positions.set(normalized,details.length);
      details.push({label:cleanLabel,value:cleanValue});
    };

    const voltage=text(item.voltage||model?.motor?.voltage);
    const frequency=text(item.frequency||model?.motor?.frequency);
    const supply=voltage&&frequency?`${voltage} – ${frequency}`:voltage||frequency;
    const ipClass=text(item.ipClass||model?.technical?.ipClass);
    const explosionProtection=text(item.explosionProtection||model?.technical?.explosionProtection||model?.technical?.atex);

    if(productType==='fan'){
      if(item.mode==='selection'&&number(item.selected?.q)>0){
        add('Selected Point',`${fmt(item.selected.q)} m³/h @ ${fmt(item.selected.p)} Pa`);
      }else{
        const airflow=number(item.nominalAirflow)||number(model?.performance?.nominalAirflow);
        add('Airflow',airflow>0?`${fmt(airflow)} m³/h`:'');
        const pressure=number(item.staticPressure);
        add('Pressure',pressure>0?`${fmt(pressure)} Pa`:'');
      }
      add('Supply',supply);
      const power=number(item.motorPower)||number(model?.motor?.power);
      const speed=number(item.speed)||number(model?.motor?.speed);
      const current=number(item.current)||number(model?.motor?.current);
      const sound=number(item.noise)||number(model?.motor?.sound);
      add('Motor Power',power>0?`${fmt(power,2)} kW`:'');
      add('Speed',speed>0?`${fmt(speed)} rpm`:'');
      add('Current',current>0?`${fmt(current,2)} A`:'');
      add('Sound',sound>0?`${fmt(sound)} dB(A)`:'');
      add('IP Class',ipClass);
      add('Fire / Ex Protection',explosionProtection||text(model?.technical?.fireRating));
    }else if(productType==='lighting'){
      const lighting=model?.lighting||model?.technical?.lighting||{};
      add('Power',withUnit(item.lightingPower||item.powerW||lighting.power,'W',1));
      add('Luminous Flux',withUnit(item.luminousFlux||item.lumens||lighting.luminousFlux||lighting.lumens,'lm'));
      add('Colour Temperature',withUnit(item.colorTemperature||item.cct||lighting.colorTemperature||lighting.cct,'K'));
      add('CRI',withUnit(item.cri||lighting.cri,''));
      add('Beam Angle',withUnit(item.beamAngle||lighting.beamAngle,'°'));
      add('Supply',supply);
      add('IP Class',ipClass);
      add('Ex Protection',explosionProtection);
    }else if(productType==='motor'){
      const power=number(item.motorPower)||number(model?.motor?.power);
      const speed=number(item.speed)||number(model?.motor?.speed);
      const current=number(item.current)||number(model?.motor?.current);
      add('Power',power>0?`${fmt(power,2)} kW`:'');
      add('Speed',speed>0?`${fmt(speed)} rpm`:'');
      add('Supply',supply);
      add('Current',current>0?`${fmt(current,2)} A`:'');
      add('Efficiency Class',text(item.efficiencyClass||model?.technical?.efficiencyClass));
      add('Insulation Class',text(item.insulationClass||model?.technical?.insulationClass));
      add('IP Class',ipClass);
      add('Mounting',text(item.mounting||model?.technical?.mountType));
      add('Ex Protection',explosionProtection);
    }else{
      const power=number(item.motorPower)||number(model?.motor?.power);
      add('Supply',supply);
      add('Power',power>0?`${fmt(power,2)} kW`:'');
      add('IP Class',ipClass);
      add('Ex Protection',explosionProtection);
    }

    [
      model?.specifications,
      model?.technical?.specifications,
      item.specifications,
      item.technicalDetails
    ].flatMap(parseDetails).forEach(entry=>add(entry.label,entry.value,true));

    return {
      type:productType,
      typeLabel:TYPE_LABELS[productType]||TYPE_LABELS.other,
      details
    };
  }

  window.VensisTechnicalDetails={
    labels:{...TYPE_LABELS},
    normalizeType,
    detectType,
    parseDetails,
    forItem:detailsFor
  };
})();

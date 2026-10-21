(function(){
  'use strict';
  const text=value=>String(value??'').trim();
  const slug=value=>text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  // One source of model-specific, verified feature labels for cards and printable previews.
  function featureTags(model,lang='tr'){
    if(!model)return [];
    const tr=String(lang).toLowerCase().startsWith('tr');
    const technical=model.technical||{};
    const approvalPending=model.technicalApprovalRequired||/pending|unverified|unknown|not approved|bekliyor/i.test(String(model.atexCertificationStatus||''));
    const result=[],seen=new Set();
    const add=value=>{const s=text(value);if(!s)return;const key=slug(s);if(key&&!seen.has(key)){seen.add(key);result.push(s)}};
    const localize=value=>{
      const s=text(value);
      if(/^(timer|zamanlayıcı)$/i.test(s))return tr?'Zamanlayıcı':'Timer';
      if(/^(humidity sensor|nem sensörü)$/i.test(s))return tr?'Nem Sensörü':'Humidity Sensor';
      if(/^(presence sensor|varlık sensörü)$/i.test(s))return tr?'Varlık Sensörü':'Presence Sensor';
      if(/^(long.life motor|uzun ömürlü motor)$/i.test(s))return tr?'Uzun Ömürlü Motor':'Long-Life Motor';
      return s;
    };
    const raw=model.features?.[tr?'tr':'en']||model.features?.en||model.features?.tr||technical[tr?'silentFeaturesTr':'silentFeaturesEn']||'';
    const fragments=Array.isArray(raw)?raw.flatMap(v=>String(v).split(/[,;|]/)):String(raw).split(/[,;|]/);
    fragments.forEach(s=>{if(!(approvalPending&&/^ATEX$/i.test(text(s))))add(localize(s))});
    if(technical.timerVariant)add(tr?'Zamanlayıcı':'Timer');
    if(technical.humiditySensor)add(tr?'Nem Sensörü':'Humidity Sensor');
    if(technical.presenceSensor)add(tr?'Varlık Sensörü':'Presence Sensor');
    if(technical.longLife)add(tr?'Uzun Ömürlü Motor':'Long-Life Motor');
    const fire=String(technical.fireRating||'').match(/\bF(?:300|400|600)\b/gi)||[];
    fire.forEach(s=>add(s.toUpperCase()));
    const atex=technical.atex;
    if(atex&&(atex.gas_marking||atex.dust_marking)&&!approvalPending)add('ATEX');
    return result;
  }
  window.VensisCatalogFeatureTags=featureTags;
})();

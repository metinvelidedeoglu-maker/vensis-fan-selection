(function(){
  'use strict';

  const path=(location.pathname||'/').toLowerCase();
  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const params=()=>new URLSearchParams(location.search);
  const lang=()=>{
    const requested=params().get('lang');
    return requested==='tr'||requested==='en'?requested:(String(document.documentElement.lang||'en').toLowerCase().startsWith('tr')?'tr':'en');
  };

  function setName(name,content){
    let node=document.head.querySelector(`meta[name="${name}"]`);
    if(!node){node=document.createElement('meta');node.name=name;document.head.appendChild(node)}
    node.content=content;
  }
  function setProperty(property,content){
    let node=document.head.querySelector(`meta[property="${property}"]`);
    if(!node){node=document.createElement('meta');node.setAttribute('property',property);document.head.appendChild(node)}
    node.content=content;
  }
  function setCopy(title,description){
    if(title)document.title=title;
    if(description)setName('description',description);
    if(title){setProperty('og:title',title);setName('twitter:title',title)}
    if(description){setProperty('og:description',description);setName('twitter:description',description)}
  }

  function range(values,language,unit){
    const nums=values.map(Number).filter(value=>Number.isFinite(value)&&value>0);
    if(!nums.length)return '';
    const min=Math.min(...nums),max=Math.max(...nums);
    const format=value=>value.toLocaleString(language==='tr'?'tr-TR':'en-US',{maximumFractionDigits:2});
    return min===max?`${format(min)} ${unit}`:`${format(min)}–${format(max)} ${unit}`;
  }

  function fanState(){
    if(!path.endsWith('/catalog-brand.html')&&!path.endsWith('/catalog-vortice.html'))return null;
    const seriesId=text(params().get('series'));
    if(!seriesId)return null;
    const catalog=window.VensisCatalog;
    if(!catalog)return null;
    const series=(typeof catalog.getSeries==='function'?catalog.getSeries(seriesId):null)||
      (catalog.series||[]).find(item=>String(item.id)===seriesId);
    if(!series)return null;
    const models=(series.modelIds||[]).map(id=>catalog.getModel?.(id)).filter(Boolean);
    const requested=text(params().get('model'));
    const selected=requested?models.find(model=>
      String(model.id)===requested||text(model.technical?.productCode)===requested||text(model.model)===requested
    ):null;
    return {catalog,series,models,selected};
  }

  function fanSeriesCopy(state,language){
    const {series,models}=state;
    const manufacturer=text(series.manufacturer||'Vensis');
    const code=text(series.code||series.id||'');
    const category=text(series.categories?.[0]||models[0]?.technical?.productGroup||'');
    const airflow=range(models.map(model=>model.performance?.nominalAirflow),language,'m³/h');
    const power=range(models.map(model=>model.motor?.power),language,'kW');
    const atex=/atex|ex-?proof|explosion/i.test(`${code} ${category} ${(series.categories||[]).join(' ')}`);
    if(language==='tr'){
      const title=`${code} ${category||'Fan Serisi'} | ${manufacturer} | Vensis`;
      const bits=[`${models.length} model`,airflow&&`debi ${airflow}`,power&&`motor gücü ${power}`].filter(Boolean);
      const description=`${manufacturer} ${code}${category?' '+category:''} serisi: ${bits.join(', ')}. Teknik özellikler, performans eğrileri, motor verileri ve model seçeneklerini karşılaştırın.${atex?' ATEX / Exproof sertifika işaretleri yalnız doğrulanmış katalog verisi bulunan modellerde gösterilir.':''}`;
      return {title,description};
    }
    const title=`${code} ${category||'Fan Series'} | ${manufacturer} | Vensis`;
    const bits=[`${models.length} models`,airflow&&`airflow ${airflow}`,power&&`motor power ${power}`].filter(Boolean);
    const description=`${manufacturer} ${code}${category?' '+category:''} series: ${bits.join(', ')}. Compare technical specifications, performance curves, motor data and model options.${atex?' ATEX / explosion-proof certification markings are shown only for models with verified catalog data.':''}`;
    return {title,description};
  }

  function fanModelCopy(model,series,language){
    const manufacturer=text(series.manufacturer||model.manufacturer||'Vensis');
    const code=text(series.code||series.id||'');
    const modelName=text(model.model||model.technical?.productCode||model.id);
    const group=text(model.technical?.productGroup||series.categories?.[0]||'');
    const facts=[];
    if(Number(model.performance?.nominalAirflow)>0)facts.push(`${Number(model.performance.nominalAirflow).toLocaleString(language==='tr'?'tr-TR':'en-US')} m³/h`);
    if(Number(model.motor?.power)>0)facts.push(`${Number(model.motor.power)} kW`);
    if(Number(model.motor?.speed)>0)facts.push(`${Number(model.motor.speed)} rpm`);
    if(Number(model.motor?.current)>0)facts.push(`${Number(model.motor.current)} A`);
    if(text(model.technical?.ipClass))facts.push(text(model.technical.ipClass));
    const atex=Boolean(model.technical?.atex)||/atex|ex-?proof|explosion/i.test(group);
    if(language==='tr'){
      return {
        title:`${modelName} | ${manufacturer} ${code} | Vensis`,
        description:`${manufacturer} ${modelName}${group?' '+group:''}. ${facts.length?'Katalog verileri: '+facts.join(', ')+'. ':''}Debi, motor, performans eğrisi ve teknik özellikleri inceleyin.${atex?' Kesin ATEX / Exproof sertifika işaretleri yalnız doğrulanmış katalog verisi varsa gösterilir.':''}`
      };
    }
    return {
      title:`${modelName} | ${manufacturer} ${code} | Vensis`,
      description:`${manufacturer} ${modelName}${group?' '+group:''}. ${facts.length?'Catalog data: '+facts.join(', ')+'. ':''}Review airflow, motor data, performance curve and technical specifications.${atex?' Exact ATEX / explosion-proof certification markings are shown only where verified catalog data is available.':''}`
    };
  }

  function patchFanJsonLd(state,language){
    const node=document.getElementById('vensisSeoJsonLd');
    if(!node?.textContent)return;
    let data;try{data=JSON.parse(node.textContent)}catch{return}
    const graph=Array.isArray(data?.['@graph'])?data['@graph']:[];
    const seriesCopy=fanSeriesCopy(state,language);
    const byIdentity=new Map(state.models.map(model=>[text(model.technical?.productCode||model.model||model.id),model]));
    for(const item of graph){
      if(item?.['@type']==='ProductGroup'){
        item.description=seriesCopy.description;
        item.inLanguage=language==='tr'?'tr-TR':'en';
        const variants=Array.isArray(item.hasVariant)?item.hasVariant:[];
        for(const product of variants){
          const model=byIdentity.get(text(product.sku));
          if(model)product.description=fanModelCopy(model,state.series,language).description;
          product.inLanguage=language==='tr'?'tr-TR':'en';
        }
      }
    }
    node.textContent=JSON.stringify(data);
  }

  function electricalCopy(language){
    if(!path.endsWith('/electrical/index.html'))return null;
    const seriesName=text(params().get('series'));
    if(!seriesName)return null;
    const products=Array.isArray(window.VENSIS_ELECTRICAL_PRODUCTS)?window.VENSIS_ELECTRICAL_PRODUCTS:[];
    const product=products.find(item=>String(item.modelName)===seriesName);
    if(!product)return null;
    const requested=text(params().get('model'));
    const selected=requested?(product.submodels||[]).find(model=>String(model.orderCode||model.model)===requested):null;
    if(selected){
      const name=text(selected.model||selected.orderCode);
      const facts=[selected.power&&`${language==='tr'?'güç':'power'} ${selected.power}`,selected.voltage&&`${language==='tr'?'gerilim':'voltage'} ${selected.voltage}`,selected.ip&&`${language==='tr'?'koruma':'protection'} ${selected.ip}`].filter(Boolean);
      return language==='tr'
        ?{title:`${name} | ${product.brand||'ZONEX'} ${product.modelName} | Vensis`,description:`${product.brand||'ZONEX'} ${name}, ${product.modelName} serisi. ${facts.join(', ')}. Teknik özellikler ve model bilgilerini inceleyin.`}
        :{title:`${name} | ${product.brand||'ZONEX'} ${product.modelName} | Vensis`,description:`${product.brand||'ZONEX'} ${name}, ${product.modelName} series. ${facts.join(', ')}. Review technical specifications and model information.`};
    }
    const count=Array.isArray(product.submodels)?product.submodels.length:0;
    return language==='tr'
      ?{title:`${product.brand||'ZONEX'} ${product.modelName} | Endüstriyel Elektrik | Vensis`,description:`${product.brand||'ZONEX'} ${product.modelName} serisinde ${count} model seçeneği. Güç, gerilim, koruma sınıfı ve teknik özellikleri model bazında karşılaştırın.`}
      :{title:`${product.brand||'ZONEX'} ${product.modelName} | Industrial Electrical | Vensis`,description:`${product.brand||'ZONEX'} ${product.modelName} series with ${count} model options. Compare power, voltage, protection class and technical specifications by model.`};
  }

  function apply(){
    const language=lang();
    const fan=fanState();
    if(fan){
      const copy=fan.selected?fanModelCopy(fan.selected,fan.series,language):fanSeriesCopy(fan,language);
      setCopy(copy.title,copy.description);
      patchFanJsonLd(fan,language);
      return true;
    }
    const electrical=electricalCopy(language);
    if(electrical){setCopy(electrical.title,electrical.description);return true;}
    return false;
  }

  function schedule(delay=260){setTimeout(()=>{if(!apply())setTimeout(apply,180)},delay)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(),{once:true});else schedule();
  window.addEventListener('load',()=>schedule(120),{once:true});
  window.addEventListener('vensis-language-changed',()=>schedule(220));
  window.addEventListener('vensis-electrical-route-changed',()=>schedule(180));
  window.addEventListener('popstate',()=>schedule(180));
})();

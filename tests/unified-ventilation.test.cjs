const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function harness(extra=false){
  const values={q:'100',p:'50',qmin:'20',qmax:'20',pmin:'20',pmax:'20'};
  const document={readyState:'loading',documentElement:{lang:'en'},addEventListener(){},querySelectorAll:()=>[],getElementById:id=>({value:values[id]||'0'})};
  const location={href:'https://select.vensis.com.tr/catalog.html',origin:'https://select.vensis.com.tr',pathname:'/catalog.html',search:''};
  const window={document,location,addEventListener(){}};
  const context=vm.createContext({window,document,location,console,Intl,URL,URLSearchParams,localStorage:{getItem:()=> 'en'},setTimeout:()=>0,setInterval:()=>0,clearInterval(){},MutationObserver:class{observe(){}}});
  const run=file=>vm.runInContext(read(file),context,{filename:file});
  run('data/ventilation-catalog.js');
  if(extra){
    window.VensisVentilationData.series.push({id:'TEST-FOURTH|AXF',code:'AXF',manufacturer:'Fourth Manufacturer',title:'Test fan',categories:['Duct Fan'],description:{general:['Test feature'],motor:['Test motor'],applications:['Test use']},media:{image:'assets/vensis-logo.png'}});
    window.VensisVentilationData.models.push({id:'TEST-FOURTH|1',seriesId:'TEST-FOURTH|AXF',model:'AXF TEST 1',motor:{power:0.1,speed:1000,voltage:'230 V'},media:{image:'assets/vensis-logo.png',dimensionImage:'assets/products/AXF-technical-drawing.webp'},dimensions:{headers:['A','B'],values:{A:123,B:456},unit:'mm'},pricing:{listPrice:123,currency:'EUR'},performance:{nominalAirflow:200,sourcePoints:[[100,0],[50,100],[0,200]],interpolation:'linear',precomputed:true}});
  }
  for(const f of ['products/ventilation.js','js/catalog-feature-tags.js','js/core/utils.js','js/core/state.js','js/core/selection-engine.js','js/ui/datasheet.js','js/ui/pdf-export.js'])run(f);
  return {window,context,values,run};
}

function renderCards(w,series,models){
  const nodes={catalogLayout:{hidden:false},detailPage:{hidden:true,innerHTML:'',querySelectorAll:()=>[]},
    catalogManufacturers:{innerHTML:'',querySelectorAll:()=>[]},catalogCategories:{innerHTML:'',querySelectorAll:()=>[]},
    catalogCount:{textContent:''},catalogGrid:{innerHTML:''}};
  const document={documentElement:{lang:'en'},getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],title:''};
  const location={search:'?series='+encodeURIComponent(series.id),assign(){},href:'https://select.vensis.com.tr/catalog.html',pathname:'/catalog.html'};
  const catalog={...w.VensisCatalog,series:[series],models,getSeries:()=>series,modelsForSeries:()=>models};
  const window={VensisCatalog:catalog,VensisVentilationDisplay:w.VensisVentilationDisplay,scrollTo(){},addEventListener(){}};
  vm.runInNewContext(read('js/catalog.js'),{window,document,location,URLSearchParams,Intl,console,setTimeout:()=>0},{filename:'js/catalog.js'});
  return nodes.detailPage.innerHTML;
}

test('Vitlo model-code phase reaches 13-field cards and previews without adding a pole box',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  for(const [name,phase] of [
    ['AXB 63-4T-1.5','Three-phase'],['AXD/MOB 35-2M-0.75','Single-phase'],
    ['CR 31-4M','Single-phase'],['AXF 35-2T-1','Three-phase'],['AXJ 31-2/4T','Three-phase']
  ]){
    const m=C.models.find(m=>m.model===name);assert.ok(m,name);
    const card=renderCards(w,C.getSeries(m.seriesId),[m]);
    assert.equal((card.match(/class="model-field(?: model-field-missing)?"/g)||[]).length,13,name);
    assert.ok(card.includes('<span>Phase</span><b>'+phase+'</b>'),name);
    assert.doesNotMatch(card,/<span>(?:Poles|Pole Count|Timer)<\/span>/);
    const preview=w.VensisDirectPreview.html({product:C.product(m.id),model:m});
    assert.ok(preview.includes('<span>Phase</span><b>'+phase+'</b>'),name);
    assert.doesNotMatch(preview,/<span>(?:Poles|Pole Count|Operating Temperature)<\/span>/);
  }
  const unknown=C.models.find(m=>m.seriesId==='CD');
  assert.ok(unknown);
  assert.match(renderCards(w,C.getSeries(unknown.seriesId),[unknown]),/model-field-missing"><span>Phase<\/span><b>-<\/b>/);
  assert.doesNotMatch(w.VensisDirectPreview.html({product:C.product(unknown.id),model:unknown}),/<span>Phase<\/span>/);
});

test('all 1022 card badges agree with real selection curves despite the 43 stale Vitlo flags',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  const ready=new Set(w.VensisState.models.filter(m=>!m.catalogOnly&&w.VensisState.pointsFor(m).length>=2).map(m=>m.productKey));
  let missing=0,available=0,staleVitlo=0;
  for(const series of C.series){
    const models=C.modelsForSeries(series.id),html=renderCards(w,series,models);
    const cards=[...html.matchAll(/<article class="model-card"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length,models.length);
    cards.forEach((card,index)=>{
      const m=models[index],status=card[1].match(/data-selection-status="([^"]+)"/)[1];
      assert.equal(status,ready.has(m.id)?'ready':'missing-curve',m.id);
      if(status==='ready')available++;
      else{
        missing++;
        assert.match(card[1],/Curve data missing · unavailable for fan selection/);
        assert.doesNotMatch(card[1],/selection ready/);
        if(series.manufacturer==='Vitlo'&&!m.catalogOnly)staleVitlo++;
      }
    });
  }
  assert.equal(available,965);assert.equal(missing,57);assert.equal(staleVitlo,43);
});

test('readiness needs a valid curve and still respects explicit catalogue-only exclusions',()=>{
  const {window:w}=harness(),sample=w.VensisCatalog.models[0],series=w.VensisCatalog.getSeries(sample.seriesId);
  const status=(performance,catalogOnly=false)=>renderCards(w,series,[{...sample,performance,catalogOnly}]).match(/data-selection-status="([^"]+)"/)[1];
  const points=[[100,0],[0,100]];
  assert.equal(status({sourcePoints:points}),'ready','legitimate zero endpoints are valid');
  assert.equal(status({points}),'ready');
  assert.equal(status({curves:[{sourcePoints:points}]}),'ready','a source control curve is enough');
  assert.equal(status({sourcePoints:points},true),'catalog-only','valid data does not override the explicit exclusion');
  for(const sourcePoints of [[],[[100,0]],[[100,0],[100,0]],[[null,0],[0,100]],[[NaN,0],[0,100]],[[100,-1],[0,100]]]){
    assert.equal(status({sourcePoints}),'missing-curve');
  }
});

test('ventilation model cards always show 13 selected technical fields and use dash for missing sources',()=>{
  const {window:w}=harness();
  const sample=w.VensisCatalog.models[0];
  const series={...w.VensisCatalog.getSeries(sample.seriesId),description:{general:[],motor:['400 V, 50 Hz.'],applications:[]}};
  const model={
    ...sample,id:'TEST-13-CARD',model:'Verified Example',
    standard:{motorPower:0.008,speed:2400,voltage:'230 V',maxAirflow:95,sound:26.5,price:98},
    pricing:{currency:'EUR'},
    motor:{phase:'1',frequency:'50 Hz',current:0.12,voltage:'230 V'},
    technical:{ipClass:'IPX4',weight:1.5,operatingTemperatureMinC:-10,operatingTemperatureMaxC:40,fireRating:'F300'},
    media:{image:''},catalogOnly:true
  };
  const render=entry=>{
    const nodes={
      catalogLayout:{hidden:false},
      detailPage:{hidden:true,innerHTML:'',querySelectorAll:()=>[]},
      catalogManufacturers:{innerHTML:'',querySelectorAll:()=>[]},
      catalogCategories:{innerHTML:'',querySelectorAll:()=>[]},
      catalogCount:{textContent:''},
      catalogGrid:{innerHTML:''}
    };
    const document={documentElement:{lang:'en'},getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],title:''};
    const location={search:'?series='+encodeURIComponent(series.id)+'&model='+encodeURIComponent(entry.id),assign(){},href:'https://select.vensis.com.tr/catalog.html',pathname:'/catalog.html'};
    const catalog={...w.VensisCatalog,series:[series],models:[entry],getSeries:()=>series,modelsForSeries:()=>[entry]};
    const window={VensisCatalog:catalog,VensisVentilationDisplay:w.VensisVentilationDisplay,VensisCatalogFeatureTags:()=>['F300'],scrollTo(){},addEventListener(){}};
    vm.runInNewContext(read('js/catalog.js'),{
      window,document,location,URLSearchParams,Intl,console,setTimeout:()=>0
    },{filename:'js/catalog.js'});
    return nodes.detailPage.innerHTML;
  };
  const html=render(model);
  const fieldRows=[...html.matchAll(/<div class="model-field(?: model-field-missing)?"><span>([^<]+)<\/span><b>([^<]+)<\/b><\/div>/g)];
  const expected=['Motor Power','Speed','Voltage','Max. Airflow','Sound','Price','Phase','Frequency','Current','IP Class','Weight','Operating Temperature','Fire Rating'];
  assert.deepEqual(fieldRows.map(row=>row[1]),expected);
  const values=Object.fromEntries(fieldRows.map(row=>[row[1],row[2]]));
  assert.equal(values.Sound,'26.5 dB(A)');
  assert.equal(values.Frequency,'50 Hz');
  assert.equal(values['Operating Temperature'],'-10 – 40 °C');
  assert.equal(values['Fire Rating'],'F300');
  assert.match(html,/model-feature-tag">F300/);
  assert.match(html,/<li>230 V, 50 Hz\.<\/li>/);
  assert.doesNotMatch(html,/<li>400 V, 50 Hz\.<\/li>/);
  assert.doesNotMatch(html,/<span>Timer<\/span>|<span>Max Pressure<\/span>/);
  const noData=render({...model,standard:{},motor:{},technical:{},pricing:{}});
  const missing=[...noData.matchAll(/class="model-field model-field-missing"><span>[^<]+<\/span><b>-<\/b><\/div>/g)];
  assert.equal(missing.length,12,'frequency uses the approved 50 Hz display default; the other empty fields remain visible');
  assert.match(noData,/<span>Frequency<\/span><b>50 Hz<\/b>/);
  assert.doesNotMatch(noData,/<span>ATEX Marking<\/span>|<span>Mount Type<\/span>/);
});

test('the legacy current policy preserves unified ventilation card fields after its deferred pass',async()=>{
  async function policy(schemaVersion){
    let removed=false;
    const field={querySelector:()=>({textContent:'Akım'}),remove(){removed=true}};
    const document={readyState:'complete',documentElement:{},getElementById:()=>null,
      querySelectorAll:selector=>selector==='.model-field'?[field]:[]};
    const window={VensisCatalog:{schemaVersion,models:[]}};
    vm.runInNewContext(read('data/no-current-policy.js'),{window,document,setInterval:()=>0,clearInterval(){},MutationObserver:class{observe(){}}});
    await Promise.resolve();
    return removed;
  }
  assert.equal(await policy(3),false,'the live observer must not undo the 13-field decision');
  assert.equal(await policy(2),true,'unrelated legacy policy remains scoped as before');
});

test('display frequency defaults to 50 Hz without overwriting a supplied frequency or raw record',()=>{
  const {window:w}=harness(),display=w.VensisVentilationDisplay;
  for(const value of [undefined,null,'',' ','-','—',0,'0 Hz'])assert.equal(display.frequency({motor:{frequency:value}}),'50 Hz');
  assert.equal(display.frequency({motor:{frequency:'60 Hz'}}),'60 Hz');
  assert.equal(display.frequency({motor:{frequency:'50/60Hz'}}),'50/60Hz');
  assert.equal(display.frequency({motor:{frequency:''},technical:{frequency:'60'}}),'60 Hz');
  const m=w.VensisCatalog.models.find(m=>!m.motor.frequency),before=JSON.stringify(m);
  const html=w.VensisDirectPreview.html({product:w.VensisCatalog.product(m.id),model:m});
  assert.match(html,/<span>Frequency<\/span><b>50 Hz<\/b>/);
  assert.equal(JSON.stringify(m),before,'the default is presentation only');
});

test('previews omit unspecified temperatures, preserve verified limits and use the selected model voltage',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  const temp=t=>w.VensisVentilationDisplay.temperature(t);
  assert.equal(temp({}), '');
  assert.equal(temp({operatingTemperatureMinC:0,operatingTemperatureMaxC:0}), '');
  assert.equal(temp({operatingTemperatureMinC:0,operatingTemperatureMaxC:40}), '0 – 40 °C');
  assert.equal(temp({operatingTemperatureMinC:-20,operatingTemperatureMaxC:40}), '-20 – 40 °C');
  assert.equal(temp({operatingTemperatureMaxC:60}), '≤ 60 °C');
  assert.equal(temp({operatingTemperatureMinC:-10}), '≥ -10 °C');
  let unspecified=0;
  for(const m of C.models){
    if(m.technical.operatingTemperatureMinC!==0||m.technical.operatingTemperatureMaxC!==0)continue;
    const html=w.VensisDirectPreview.html({product:C.product(m.id),model:m});
    assert.doesNotMatch(html,/<span>Operating Temperature<\/span>/,m.id);
    unspecified++;
  }
  assert.equal(unspecified,926); // Forty S&P roof/duct-fan rows now have source-verified limits.
  const heat=C.getModel('VORTICE-ROOF|15301');
  const original=JSON.stringify(C.getSeries(heat.seriesId).description);
  const html=w.VensisDirectPreview.html({product:C.product(heat.id),model:heat});
  assert.match(html,/<li>230 V, 50 Hz\.<\/li>/);
  assert.doesNotMatch(html,/<li>400 V, 50 Hz\.<\/li>/);
  assert.equal(JSON.stringify(C.getSeries(heat.seriesId).description),original);
});

test('feature tags stay model-specific and pending ATEX approval cannot become a verified tag',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  const get=name=>C.models.find(m=>m.model===name);
  assert.ok(w.VensisCatalogFeatureTags(get('SILENT-100 CRZ'),'tr').includes('Zamanlayıcı'));
  assert.ok(!w.VensisCatalogFeatureTags(get('SILENT-100 CZ'),'tr').includes('Zamanlayıcı'));
  assert.ok(w.VensisCatalogFeatureTags(get('E 254 M ATEX'),'tr').includes('ATEX'));
  assert.ok(w.VensisCatalogFeatureTags(C.getModel('VORTICE-ROOF|15301'),'tr').includes('F400'));
  assert.ok(!w.VensisCatalogFeatureTags(get('CRS 50-2T-15'),'tr').includes('ATEX'));
  assert.ok(!w.VensisCatalogFeatureTags({features:{en:'ATEX'},technicalApprovalRequired:true,technical:{atex:{gas_marking:'II 2G'}}}).includes('ATEX'));
});

test('all consumers load one catalog and no manufacturer-specific runtime import',()=>{
  for(const file of ['catalog.html','fan-selection.html','project.html','quotation.html','project-print.html']){
    const html=read(file);
    assert.match(html,/products\/ventilation-loader\.js/);
    assert.doesNotMatch(html,/src="(?:data\/(?:fans-|soler-palau|sp-workbook|vortice-workbook|vitlo-)|products\/registry)/);
  }
});
test('every migrated product resolves by its stable ID through the same product API',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  assert.equal(C.models.length,1022);assert.equal(C.series.length,89);
  for(const model of C.models){
    assert.equal(C.getModel(model.id),model);
    const product=C.product(model.id);
    assert.equal(product.id,model.id);assert.equal(product.performance,model.performance);
    assert.equal(product.motor,model.motor);assert.equal(product.pricing,model.pricing);
    assert.ok(C.modelsForSeries(model.seriesId).includes(model));
    assert.equal(w.VensisProducts.fromResult({productKey:model.id}).id,model.id);
  }
});
test('new manufacturer and a duplicate series code use the common registry and preview',()=>{
  const {window:w}=harness(true),C=w.VensisCatalog;
  const s=C.resolveSeries('AXF','fourth-manufacturer');assert.equal(s.id,'TEST-FOURTH|AXF');
  assert.equal(C.resolveSeries('AXF','Vitlo').manufacturer,'Vitlo');
  const model=C.getModel('TEST-FOURTH|1');
  const html=w.VensisDirectPreview.html({product:C.product(model.id),model});
  for(const value of ['Fourth Manufacturer','Test feature','Test motor','Test use','123 mm','456 mm','data-original-catalog-drawing'])assert.ok(html.includes(value),value);
  assert.ok(w.VensisState.models.some(m=>m.productKey===model.id));
});
test('existing manufacturer drawings and dimensions reach the shared preview',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  for(const brand of C.brands){
    const series=new Set(C.series.filter(s=>s.manufacturer===brand.name).map(s=>s.id));
    const model=C.models.find(m=>series.has(m.seriesId)&&m.dimensions);
    assert.ok(model,brand.name);
    const html=w.VensisDirectPreview.html({product:C.product(model.id),model});
    assert.match(html,/<table class="dimension-table(?: split-values)?">/);
    if(model.media.dimensionImage)assert.ok(html.includes(model.media.dimensionImage));
  }
  const v=C.models.find(m=>m.model==='CA 100 MD EXTRA EU');
  assert.match(w.VensisDirectPreview.html({product:C.product(v.id),model:v}),/vortice-dimensions\/ca-md-extra-eu\.png/);
});
test('missing data is not replaced by another manufacturer drawing or invented dimensions',()=>{
  const {window:w}=harness();
  const html=w.VensisDirectPreview.html({product:{series:{code:'AXF',manufacturer:'Unknown'},description:{general:[]}},model:{model:'Unknown fan',performance:{}}});
  assert.doesNotMatch(html,/data-original-catalog-drawing|<table class="dimension-table">/);
  assert.match(html,/Performance curve data is not available/);
});
test('all manufacturers retain structured descriptions and model-specific overrides',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  for(const brand of C.brands){
    const series=C.series.find(s=>s.manufacturer===brand.name&&s.description.general.length>1);
    assert.ok(series,brand.name);
    const model=C.modelsForSeries(series.id)[0];
    const html=w.VensisDirectPreview.html({product:C.product(model.id),model});
    assert.ok((html.match(/<li>/g)||[]).length>1,brand.name);
  }
  const stainless=C.getModel('VITLO-CRS-ATEX|CRS/ATEX 31-2T-2|SS316');
  assert.equal(stainless.pricing.listPrice,5750);
  assert.equal(stainless.technicalApprovalRequired,true);
  assert.ok(C.product(stainless.id).description.general.some(x=>/stainless/i.test(x)));
});
test('all performance arrays and price data survive runtime registration unchanged',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  for(const source of w.VensisVentilationData.models){
    const m=C.getModel(source.id);
    assert.equal(JSON.stringify(m.performance),JSON.stringify(source.performance),source.id);
    assert.equal(JSON.stringify(m.pricing),JSON.stringify(source.pricing),source.id);
    assert.equal(JSON.stringify(m.motor),JSON.stringify(source.motor),source.id);
  }
  assert.equal(w.VensisState.selectedManufacturers.size,0);
});
test('legacy URLs redirect to the single catalog while retaining query context',()=>{
  for(const file of ['catalog-brand.html','catalog-ventilation.html','catalog-vortice.html','catalog-vortice-stable.html']){
    const html=read(file);assert.match(html,/location\.replace\(target\)/);assert.match(html,/URLSearchParams\(location.search\)/);
    assert.doesNotMatch(html,/VensisCatalogBrand|vortice-manifest-catalog|products\/registry|fileBySeries/);
  }
});


test('all 156 VORTICE products have a source-traceable, local original dimension drawing',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  const series=C.series.filter(s=>s.manufacturer==='VORTICE');
  const ids=new Set(series.map(s=>s.id)),models=C.models.filter(m=>ids.has(m.seriesId));
  assert.equal(series.length,23);assert.equal(models.length,156);
  for(const m of models){
    assert.ok(fs.existsSync(path.join(root,m.media.dimensionImage)),m.model);
    assert.ok(m.dimensions.source.catalogue,m.model);assert.ok(m.dimensions.source.page>0,m.model);
    const html=w.VensisDirectPreview.html({product:C.product(m.id),model:m});
    assert.match(html,/data-original-catalog-drawing/,m.model);
    assert.equal(html.includes('<table class="dimension-table'),m.dimensions.headers.length>0,m.model);
  }
});
test('LINEO dimensions follow the exact manufacturer row, with decimal values preserved',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  const get=name=>C.models.find(m=>m.model===name);
  const basic=get('LINEO 100'),compact=get('LINEO 100 Q'),quiet=get('LINEO 100 QUIET'),ec=get('LINEO 100 QUIET ES');
  assert.equal(basic.dimensions.values.A,188.5);assert.equal(basic.dimensions.values.B,211);
  assert.equal(compact.dimensions.values.A,156);assert.equal(compact.dimensions.values.C,231);
  assert.equal(quiet.dimensions.values.C,639);assert.equal(quiet.dimensions.values['ØD'],97);assert.equal(quiet.dimensions.values.B,294.5);
  assert.equal(ec.dimensions.values.C,639);assert.equal(ec.dimensions.values['ØD'],97);
  for(const [lang,value] of [['en','188.5 mm'],['tr','188,5 mm']]){
    const html=w.VensisDirectPreview.html({product:C.product(basic.id),model:basic,language:lang});
    assert.ok(html.includes(value));assert.ok(!html.includes('189 mm</td></tr><tr><th>B'));
    assert.match(html,/<th>ØD<\/th>/);assert.match(html,lang==='tr'?/<th>Değer<\/th>/:/<th>Value<\/th>/);
  }
});
test('dimension-only data has a compact full-width table, without an empty drawing column',()=>{
  const {window:w}=harness();
  const html=w.VensisDirectPreview.html({product:{dimensions:{headers:['A'],values:{A:12.5}}},model:{model:'No drawing'}});
  assert.match(html,/class="dimension-panel values-only"/);
  assert.doesNotMatch(html,/data-original-catalog-drawing/);
});

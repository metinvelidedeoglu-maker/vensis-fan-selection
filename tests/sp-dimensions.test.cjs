const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const w={};vm.runInNewContext(read('data/ventilation-catalog.js'),{window:w});
const d=w.VensisVentilationData,manifest=JSON.parse(read('docs/sp-dimensions-sources.json'));
const ids=new Set(d.series.filter(s=>s.manufacturer==='Soler & Palau').map(s=>s.id)),models=d.models.filter(m=>ids.has(m.seriesId)),get=name=>models.find(m=>m.model===name);
test('all 28 active S&P series / 163 models have local original source drawings',()=>{
 assert.equal(ids.size,28);assert.equal(models.length,163);assert.equal(Object.keys(manifest.models).length,163);
 assert.equal(new Set(manifest.sources.map(s=>s.sha256)).size,28);
 for(const m of models){
  const record=manifest.models[m.id],drawing=manifest.drawings.find(x=>x.asset===m.media.dimensionImage);
  assert.ok(record,m.id);assert.ok(drawing,m.model);assert.ok(fs.existsSync(path.join(root,drawing.asset)),m.model);
  assert.equal(m.dimensions.drawing.asset,drawing.asset);assert.equal(m.dimensions.source.sha256,drawing.sha256);
  assert.deepEqual(JSON.parse(JSON.stringify(m.dimensions.values)),record.values);
  assert.equal(m.dimensions.source.page,drawing.pdfPage);assert.ok(drawing.pdfPage<=manifest.sources.find(s=>s.sha256===drawing.sha256).pdfPages);
  assert.match(m.dimensions.source.url,/^https:\/\/(?:www\.solerpalau\.com\.tr|statics\.solerpalau\.com)\//);
  for(const val of Object.values(record.values))assert.ok((typeof val==='number'&&Number.isFinite(val))||val==='-',m.model);
 }
 assert.equal(models.filter(m=>m.dimensions.headers.length).length,139);
 assert.equal(models.filter(m=>!m.dimensions.headers.length).length,24);
});
test('roof fans use vertical/horizontal geometry, exact pole columns and decimals',()=>{
 assert.equal(get('CRHB/4-280N').dimensions.values.F,273.5);
 assert.equal(get('CRHB/4-450N').dimensions.values.F,409);
 assert.equal(get('CRVB/4-280N').dimensions.values.F,335);
 assert.equal(get('CTVB/4-180').dimensions.values.BV,378);
 assert.equal(get('CTVT/6-560').dimensions.values.BV,832);
 assert.equal(get('CTVB/4-180').dimensions.source.page,41);
 assert.equal(get('CTVT/6-710').dimensions.values.BV,1161);
 assert.equal(get('HXTR/4-500').dimensions.values.F,13);
 assert.equal(get('HXTR/6-710').dimensions.values.F,11);
 assert.equal(get('HXTR/4-500').dimensions.values.HT,176);
});
test('different duct housings and numeric drawings are never replaced by a shared generic drawing',()=>{
 assert.notEqual(get('HXM-200').media.dimensionImage,get('HXM-400').media.dimensionImage);
 assert.equal(get('HXM-200').dimensions.values.A,222.5);
 assert.equal(get('IRB/4-225').dimensions.values.L,530);
 assert.equal(get('ILT/4-315 EX').dimensions.values.A,725);
 assert.equal(get('JETLINE-315').dimensions.values.E,357.5);
 assert.equal(get('TD-250/100 SILENT').dimensions.values.A,575);
 assert.equal(get('TD-1300/250 SILENT').dimensions.values.A,680);
 assert.equal(get('TD-160/100N SILENT').dimensions.headers.length,0);
 assert.notEqual(get('TD-160/100N SILENT').media.dimensionImage,get('TD-250/100 SILENT').media.dimensionImage);
 assert.equal(get('TD EVO-125').dimensions.values['ØD'],122.5);
 assert.notEqual(get('VENT-315NK').media.dimensionImage,get('VENT-355N').media.dimensionImage);
 assert.equal(get('VENT-400N').dimensions.values['ØJ'],10.5);
 assert.equal(get('TH-1200/315 EX').dimensions.values.B,544);
 assert.equal(get('TH-1200/315 EX').dimensions.source.catalogue,'en-selector.pdf');
 assert.equal(get('CAB-250N').dimensions.source.tableCatalogue,'en-cab.pdf');
 assert.equal(get('CAB-250N').dimensions.values.A,383);
 assert.equal(get('SILENT-200 CZ').dimensions.source.page,7);
 assert.equal(get('SILENT-300 CZ').dimensions.source.page,9);
 assert.equal(get('SILENT-200 DESIGN').dimensions.source.page,7);
 assert.equal(get('SILENT-300 DESIGN').dimensions.source.page,9);
});

// One-time migration of the published legacy imports. The resulting unified
// catalog is authoritative; do not re-run this over later catalog edits.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'data/ventilation-catalog.js');
if(fs.existsSync(output)&&!process.argv.includes('--verify'))throw new Error('Unified catalog exists. Edit it directly; migration will not overwrite it.');
const document={readyState:'loading',documentElement:{lang:'en'},querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}};
const location={pathname:'/fan-selection.html',search:'',href:'https://select.vensis.com.tr/fan-selection.html'};
const window={models:[],document,location,addEventListener(){},setTimeout:()=>0};
const context=vm.createContext({window,document,location,console,URL,URLSearchParams,Intl,structuredClone,localStorage:{getItem:()=> 'en'},setTimeout:()=>0,setInterval:()=>0,clearInterval(){},MutationObserver:class{observe(){}}});
const inputs=[];
const run=file=>{inputs.push(file);vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});};
document.write=(...parts)=>{for(const m of parts.join('').matchAll(/src="([^"]+)"/g)){const file=m[1].split('?')[0];if(file.startsWith('data/'))run(file);}};
for(let i=1;i<=15;i++)run(`data/fans-${String(i).padStart(2,'0')}.js`);
run('data/fans-19.js');run('data/fans-20.js');
for(const file of ['soler-palau-catalog.js','soler-palau-catalog-2.js','soler-palau-catalog-3.js','series-overrides.js','vortice-prices-2026-1.js','vitlo-technical-drawings.js','vitlo-dimensions.js'])run('data/'+file);
const rawById=new Map(window.models.map(row=>[String(row.key||row.model),structuredClone(row)]));
run('products/registry.js');
run('data/crs-atex-prices-r4.js');
run('data/catalog-schema-v2.js');
for(let i=1;i<=5;i++)run(`data/vortice-workbook-2026-2-0${i}.js`);
run('data/vortice-workbook-2026-2.js');run('data/vortice-priced-only-policy.js');
for(let i=1;i<=4;i++)run(`data/sp-workbook-2026-2-0${i}.js`);
run('data/sp-workbook-2026-2.js');run('data/no-current-policy.js');run('data/read-only-ui-policy.js');
window.VensisSPSilentPolicy20260908?.applyCatalog();
const clone=value=>JSON.parse(JSON.stringify(value));
const catalog=window.VensisCatalog;
const baseline={series:clone(catalog.series),models:clone(catalog.models)};
const brands=[{id:'vitlo',slug:'vitlo',name:'Vitlo'},{id:'vortice',slug:'vortice',name:'VORTICE'},{id:'sp',slug:'soler-palau',name:'Soler & Palau'},{id:'seat',slug:'seat',name:'SEAT'}];
const series=catalog.series.map(item=>{
  const s=clone(item);
  s.description=clone(s.descriptionParts||s.description||{general:[],motor:[],applications:[]});
  s.manufacturer=brands.find(b=>b.name.toLowerCase()===s.manufacturer.toLowerCase())?.name||s.manufacturer;
  delete s.descriptionParts;delete s.schemaVersion;delete s.descriptionText;delete s.submodels;delete s.category;
  return s;
});
const seriesById=new Map(series.map(s=>[s.id,s]));
const models=catalog.models.map(item=>{
  const model=clone(item),s=seriesById.get(model.seriesId),raw=rawById.get(model.id)||{};
  // A data conversion only. Runtime dimensions never branch on manufacturer.
  const dimension=s.manufacturer.toLowerCase()==='vitlo'?window.VensisVitloDimensions?.resolve?.(s.code,model):null;
  if(dimension)model.dimensions=clone(dimension);
  else{
    const values=model.technical?.dimensions||{};
    const headers=Object.keys(values).filter(key=>typeof values[key]==='number'||typeof values[key]==='string');
    model.dimensions=headers.length?{headers,values,unit:'mm',source:model.source||{}}:null;
  }
  if(model.dimensions?.drawing?.asset&&!model.media.dimensionImage)model.media.dimensionImage=model.dimensions.drawing.asset;
  model.verification=clone(raw.curveVerification||{status:model.catalogOnly?'catalog-only':'catalog-source'});
  for(const key of ['technicalApprovalRequired','atexCertificationStatus','material','materialEn','modelTr','modelEn','displayTr','displayEn'])if(raw[key]!=null)model[key]=clone(raw[key]);
  if(model.technical?.silentFeaturesEn){
    model.features={en:model.technical.silentFeaturesEn,tr:model.technical.silentFeaturesTr};
    delete model.technical.silentFeaturesEn;delete model.technical.silentFeaturesTr;
  }
  // Derived card fields are always calculated by the common runtime.
  model.performance.maxAirflow=model.standard?.maxAirflow??model.performance.nominalAirflow;
  delete model.standard;
  return model;
});
const payload={schemaVersion:3,migratedFrom:'cb6827462403eb755c0035e167eb7166a85c81eb',brands,series,models};
const stats=brands.map(b=>{const ids=new Set(series.filter(s=>s.manufacturer===b.name).map(s=>s.id));const rows=models.filter(m=>ids.has(m.seriesId));return {brand:b.name,series:ids.size,models:rows.length,drawings:rows.filter(m=>m.media?.dimensionImage).length,dimensions:rows.filter(m=>m.dimensions).length,curves:rows.filter(m=>m.performance?.sourcePoints?.length).length};});
if(process.argv.includes('--verify')){
  const existing=fs.readFileSync(output,'utf8');
  if(!existing.includes(JSON.stringify(payload)))throw new Error('Catalog differs from the original migration.');
}else{
  fs.writeFileSync(output,'// Unified ventilation catalog. All manufacturers use products/ventilation.js.\nwindow.VensisVentilationData='+JSON.stringify(payload)+';\n');
}
if(process.env.VENSIS_MIGRATION_BASELINE)fs.writeFileSync(process.env.VENSIS_MIGRATION_BASELINE,JSON.stringify(baseline));
console.log(JSON.stringify({stats,bytes:Buffer.byteLength(JSON.stringify(payload)),sourceFiles:inputs.length}));

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'fan-selection.html'),'utf8');
const sources=[...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(match=>match[1].split('?')[0]);
const firstCatalogScript=sources.indexOf('data/fans-01.js');
const lastCatalogScript=sources.indexOf('data/read-only-ui-policy.js');
if(firstCatalogScript<0||lastCatalogScript<firstCatalogScript)throw new Error('Fan Selection catalog script boundary was not found.');

const context={
  window:{models:[]},
  console,
  Intl,
  URL,
  URLSearchParams,
  structuredClone,
  setTimeout:()=>0,
  clearTimeout:()=>{},
  setInterval:()=>0,
  clearInterval:()=>{},
  MutationObserver:class{observe(){} disconnect(){}},
  document:{readyState:'loading',body:null,documentElement:{lang:'tr'},getElementById:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},
  location:{search:'',pathname:'/fan-selection.html'},
  localStorage:{getItem:()=>null,setItem:()=>{}}
};
context.globalThis=context;
context.window.window=context.window;
context.window.document=context.document;
context.window.location=context.location;
context.window.setTimeout=context.setTimeout;
context.window.clearTimeout=context.clearTimeout;
context.window.setInterval=context.setInterval;
context.window.clearInterval=context.clearInterval;
context.window.MutationObserver=context.MutationObserver;
vm.createContext(context);

const evaluated=[];
function run(relative){
  const file=path.join(root,relative);
  const source=fs.readFileSync(file,'utf8');
  vm.runInContext(source,context,{filename:relative});
  evaluated.push({relative,source});
}
context.document.write=(...chunks)=>{
  for(const match of chunks.join('').matchAll(/<script\s+src="([^"]+)"/g))run(match[1].split('?')[0]);
};

for(const source of sources.slice(firstCatalogScript,lastCatalogScript+1))run(source);
run('js/core/utils.js');
run('js/core/state.js');

const rawVerification=new Map();
for(const {relative,source} of evaluated.filter(item=>/^data\/fans-\d+\.js$/.test(item.relative))){
  const sandbox={window:{models:[]}};
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox,{filename:relative});
  for(const row of sandbox.window.models){
    rawVerification.set(String(row.key||row.model||''),row.curveVerification||null);
  }
}

const accessoriesContext={};
vm.createContext(accessoriesContext);
vm.runInContext(fs.readFileSync(path.join(root,'data/accessories-catalog.js'),'utf8'),accessoriesContext,{filename:'data/accessories-catalog.js'});
const accessories=accessoriesContext.VensisAccessoriesCatalog;
if(!accessories?.items?.length)throw new Error('Accessory catalog is empty.');

const cleanText=value=>String(value??'').trim();
const cleanNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const models=context.window.VensisState.models.map(model=>{
  const points=context.window.VensisState.pointsFor(model);
  const verification=rawVerification.get(String(model.productKey||model.key||''));
  const verificationStatus=cleanText(verification?.status)||'catalog-source';
  const needsEngineeringReview=verificationStatus==='needs_engineering_review';
  return {
    id:cleanText(model.id),
    productKey:cleanText(model.productKey||model.key),
    model:cleanText(model.model),
    display:cleanText(model.display||model.model),
    control:cleanText(model.control),
    manufacturer:cleanText(model.manufacturer),
    categories:Array.isArray(model.categories)?model.categories.map(cleanText).filter(Boolean):[],
    series:cleanText(model.series),
    seriesTitle:cleanText(model.seriesTitle||model.series),
    image:cleanText(model.image),
    catalogOnly:Boolean(model.catalogOnly),
    quoteEligible:!model.catalogOnly&&!needsEngineeringReview,
    verification:{
      status:verificationStatus,
      sourceCatalogue:cleanText(verification?.sourceCatalogue),
      sourcePage:verification?.sourcePage??model.sourcePage??'',
      caution:cleanText(verification?.caution)
    },
    pricing:{listPrice:cleanNumber(model.price),currency:'EUR'},
    motor:{
      powerKw:cleanNumber(model.kw),speedRpm:cleanNumber(model.rpm),currentA:cleanNumber(model.amps),
      voltage:cleanText(model.voltage),frequency:cleanText(model.frequency)
    },
    technical:{
      nominalAirflowM3h:cleanNumber(model.nominal),soundDbA:cleanNumber(model.spl),
      fireRating:cleanText(model.fireRating),fanType:cleanText(model.fanType),mountType:cleanText(model.mountType),
      productGroup:cleanText(model.productGroup),ipClass:cleanText(model.ipClass),
      hazardousArea:model.hazardousArea||null,safetyWarning:cleanText(model.safetyWarning),
      continuousAirTemperatureC:cleanNumber(model.continuousAirTemperatureC),
      smokeTemperatureC:cleanNumber(model.smokeTemperatureC),smokeDurationMinutes:cleanNumber(model.smokeDurationMinutes)
    },
    sourcePage:model.sourcePage??'',
    selectionPoints:(Array.isArray(points)?points:[]).map(point=>[cleanNumber(point?.[0]),cleanNumber(point?.[1])])
  };
});

const sourceHash=crypto.createHash('sha256');
for(const item of evaluated)sourceHash.update(item.relative).update('\0').update(item.source).update('\0');
sourceHash.update(fs.readFileSync(path.join(root,'data/accessories-catalog.js')));

const payload={
  schemaVersion:1,
  sourceHash:sourceHash.digest('hex'),
  models,
  accessories:{
    source:cleanText(accessories.source),
    currency:cleanText(accessories.currency||'EUR'),
    items:accessories.items.map(item=>({
      id:cleanText(item.id),model:cleanText(item.model),category:cleanText(item.category),
      manufacturer:cleanText(item.manufacturer),price:cleanNumber(item.price),
      specs:cleanText(item.specs),sourcePage:item.sourcePage??''
    }))
  }
};

const output=path.join(root,'api/agent/catalog-v1.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(payload));
console.log(`Wrote ${path.relative(root,output)} with ${models.length} selection variants and ${payload.accessories.items.length} accessories.`);

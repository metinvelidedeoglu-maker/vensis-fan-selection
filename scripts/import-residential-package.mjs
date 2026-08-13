import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const packageDirectory=path.resolve(process.argv[2]||'');
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceFile=path.join(packageDirectory,'residential_selected_products.json');
const targetImages=path.join(projectRoot,'assets','products','vortice-residential');
const targetData=path.join(projectRoot,'data','fans-13.js');
const verifiedCurvesFile=path.join(targetImages,'verified-vector-curves.json');
const verifiedPdfSha256='45a3f2edd581a3917510b83cc84ce5de33b9d74648f34f7f4b63199a342be6f7';

if(!packageDirectory||!fs.existsSync(sourceFile)){
  throw new Error('Usage: node scripts/import-residential-package.mjs /path/to/extracted/package');
}
if(!fs.existsSync(verifiedCurvesFile)){
  throw new Error('Missing verified residential vector curves. Run scripts/extract-residential-vector-curves.py first.');
}

const packageData=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const products=Array.isArray(packageData)?packageData:packageData.products;
const verifiedData=JSON.parse(fs.readFileSync(verifiedCurvesFile,'utf8'));
if(!Array.isArray(products))throw new Error('residential_selected_products.json does not contain a products array.');
if(verifiedData.status!=='verified_against_original_catalogue_vector_graphs'){
  throw new Error(`Unexpected residential vector verification status: ${String(verifiedData.status||'missing')}`);
}
if(verifiedData.source_sha256!==verifiedPdfSha256){
  throw new Error(`Unexpected verified residential source SHA-256: ${String(verifiedData.source_sha256||'missing')}`);
}

const expectedSeries=[
  'PUNTO','PUNTO FILO','PUNTO FOUR','PUNTO GHOST','PUNTO EVO FLEXO','PUNTO EVO',
  'PUNTO EVO ES','PUNTO EVO GOLD','VORTICE VARIO','VORTICE VARIO I',
  'VORT QUADRO','VORT QUADRO I','VORT QUADRO EVO'
];

const titles={
  PUNTO:'PUNTO Wall / Window Axial Fans',
  'PUNTO FILO':'PUNTO FILO Low-Profile Wall Axial Fans',
  'PUNTO FOUR':'PUNTO FOUR Wall Axial Fans',
  'PUNTO GHOST':'PUNTO GHOST Axial Duct Fans',
  'PUNTO EVO FLEXO':'PUNTO EVO FLEXO Wall Axial Fans',
  'PUNTO EVO':'PUNTO EVO Two-Speed Wall Axial Fans',
  'PUNTO EVO ES':'PUNTO EVO ES EC Energy-Saving Wall Axial Fans',
  'PUNTO EVO GOLD':'PUNTO EVO GOLD Decorative Wall Axial Fans',
  'VORTICE VARIO':'VORTICE VARIO Wall / Window Axial Fans',
  'VORTICE VARIO I':'VORTICE VARIO I Flush-Mounted Axial Fans',
  'VORT QUADRO':'VORT QUADRO Centrifugal Duct Fans',
  'VORT QUADRO I':'VORT QUADRO I Flush-Mounted Centrifugal Duct Fans',
  'VORT QUADRO EVO':'VORT QUADRO EVO Residential Centrifugal Extract Fans'
};

function number(value){
  const result=Number(value);
  return Number.isFinite(result)?result:0;
}

function verifiedGraph(product){
  const configurationId=String(product.configuration_id||'');
  const graphId=verifiedData.assignments?.[configurationId];
  const graph=verifiedData.graphs?.[graphId];
  if(!graph)throw new Error(`Missing verified residential graph for ${configurationId}.`);
  if(graph.series!==product.series)throw new Error(`Residential graph series mismatch for ${configurationId}.`);
  return {graphId,graph};
}

function performanceCurves(product){
  const {graphId,graph}=verifiedGraph(product);
  return Object.entries(graph.curves||{}).map(([control,curve])=>({
    control,
    sourcePage:number(graph.source_page),
    sourceGraph:graphId,
    sourceGraphTitle:String(graph.graph_title||''),
    sourceMethod:String(curve.source_method||''),
    interpolation:'linear',
    precomputed:true,
    sourcePoints:(curve.points||[]).map(point=>[number(point.p_pa),number(point.q_m3h)])
  })).filter(curve=>curve.sourcePoints.length);
}

function sourceOperatingPoint(product,control,index,total){
  const source=product.operating_points||[];
  const exact=source.find(point=>String(point.control||'')===String(control));
  if(exact)return exact;
  if(index===0)return source[0]||{};
  if(index===total-1)return source.at(-1)||{};
  return {};
}

function operatingPoints(product,curves){
  return curves.map((curve,index)=>{
    const source=sourceOperatingPoint(product,curve.control,index,curves.length);
    const maximumAirflow=Math.max(...curve.sourcePoints.map(([,airflow])=>airflow));
    const maximumPressure=Math.max(...curve.sourcePoints.map(([pressure])=>pressure));
    return {
      control:curve.control,
      powerW:number(source.power_w),
      powerKw:Number((number(source.power_w)/1000).toFixed(4)),
      currentA:number(source.current_a),
      rpm:number(source.rpm),
      maxAirflowM3h:maximumAirflow,
      maxPressurePa:maximumPressure,
      soundPressureDbA3m:null
    };
  });
}

function isCentrifugal(product){return String(product.series||'').includes('QUADRO')}

function categoriesFor(product){
  return isCentrifugal(product)
    ? ['Residential Fan','Centrifugal Fan','Extract Fan']
    : ['Residential Fan','Axial Fan','Extract Fan'];
}

function mountType(product){
  const series=String(product.series||'');
  if(series==='PUNTO GHOST')return 'In-Line Duct';
  if(series.endsWith(' I'))return 'Flush-Mounted';
  if(series==='VORTICE VARIO')return 'Wall / Window';
  return 'Wall / Ceiling';
}

function catalogueInfo(product,controls){
  const features=[
    product.timer_variant?'timer':null,
    product.humidity_sensor?'humidity sensor':null,
    product.presence_sensor?'presence sensor':null,
    product.long_life?'long-life motor':null,
    product.reversible?'reversible airflow':null
  ].filter(Boolean);
  return {
    general:[
      `${isCentrifugal(product)?'Centrifugal':'Axial'} residential extract fan.`,
      `Catalogue vector controls: ${controls.join(' / ')}.`,
      features.length?`Configuration features: ${features.join(', ')}.`:'Standard configuration.'
    ],
    motor:[
      `${String(product.voltage_v||'')} V, ${String(product.frequency_hz||'')} Hz.`,
      `${String(product.protection_grade||'')} protection.`,
      'Performance curves are precomputed from the original catalogue vector paths.'
    ],
    applications:['Residential room extraction','Bathroom, WC and utility-room ventilation']
  };
}

function sourceImage(filePath){
  const imageFile=path.basename(String(filePath||''));
  const candidates=[path.join(packageDirectory,'images',imageFile),path.join(packageDirectory,imageFile)];
  return candidates.find(candidate=>fs.existsSync(candidate))||candidates[0];
}

const rows=products.map(product=>{
  const curves=performanceCurves(product);
  const points=operatingPoints(product,curves);
  const primary=points.at(-1)||{};
  const productImage=path.basename(String(product.image_path||''));
  const dimensionImage=path.basename(String(product.dimension_image_path||''));
  const categories=categoriesFor(product);
  const centrifugal=isCentrifugal(product);
  const graph=verifiedData.graphs[curves[0].sourceGraph];
  const configurationId=String(product.configuration_id||'');
  return {
    key:`VORTICE-RESIDENTIAL|${configurationId}`,
    configurationId,
    display:`${String(product.model||'')} (${number(primary.maxAirflowM3h)} m³/h)`,
    model:String(product.model||''),
    brand:String(product.brand||'Vortice'),
    manufacturer:String(product.brand||'Vortice'),
    family:String(product.family||product.series||''),
    series:String(product.series||''),
    productCode:String(product.code||''),
    fanType:centrifugal?'Radyal':'Aksiyal',
    mountType:mountType(product),
    productGroup:'Residential Extract Fan',
    fanTypeEn:centrifugal?'Centrifugal':'Axial',
    mountTypeEn:mountType(product),
    productGroupEn:'Residential Extract Fan',
    categories,
    tagsEn:categories,
    catalogNameEn:titles[product.series]||String(product.series||''),
    nominal:number(primary.maxAirflowM3h),
    maxPressure:number(primary.maxPressurePa),
    kw:number(primary.powerKw),
    rpm:number(primary.rpm),
    amps:number(primary.currentA),
    spl:0,
    voltage:`${String(product.voltage_v||'')} V`,
    frequency:`${String(product.frequency_hz||'')} Hz`,
    weight:0,
    ipClass:String(product.protection_grade||''),
    insulationClass:'',
    timerVariant:Boolean(product.timer_variant),
    humiditySensor:Boolean(product.humidity_sensor),
    presenceSensor:Boolean(product.presence_sensor),
    longLife:Boolean(product.long_life),
    reversible:Boolean(product.reversible),
    image:`assets/products/vortice-residential/${productImage}`,
    dimensionImage:`assets/products/vortice-residential/${dimensionImage}`,
    sourcePage:number(graph.source_page),
    sourceCatalogue:String(product.source_catalogue||''),
    curveInterpolation:'linear',
    curveVerification:{
      status:verifiedData.status,
      sourceCatalogue:verifiedData.source_catalogue,
      sourceSha256:verifiedData.source_sha256,
      sourceGraph:curves[0].sourceGraph,
      sourcePage:number(graph.source_page)
    },
    operatingPoints:points,
    curves,
    catalogueInfo:catalogueInfo(product,curves.map(curve=>curve.control))
  };
});

const series=[...new Set(rows.map(row=>row.series))].sort();
const curveCount=rows.reduce((sum,row)=>sum+row.curves.length,0);
const pointCount=rows.reduce((sum,row)=>sum+row.curves.reduce((curveSum,curve)=>curveSum+curve.sourcePoints.length,0),0);
const imageFiles=[...new Set(rows.flatMap(row=>[path.basename(row.image),path.basename(row.dimensionImage)]))].sort();

if(rows.length!==172)throw new Error(`Expected 172 selected residential products, found ${rows.length}.`);
if(JSON.stringify(series)!==JSON.stringify([...expectedSeries].sort()))throw new Error(`Unexpected residential series: ${series.join(', ')}`);
if(curveCount!==243)throw new Error(`Expected 243 catalogue residential curves, found ${curveCount}.`);
if(pointCount!==number(verifiedData.summary?.points))throw new Error(`Expected ${number(verifiedData.summary?.points)} residential curve points, found ${pointCount}.`);
if(new Set(rows.map(row=>row.key)).size!==rows.length)throw new Error('Residential configuration keys are not unique.');
if(rows.some(row=>row.curves.some(curve=>!curve.sourceMethod.includes('axis-calibrated')))){
  throw new Error('Every residential curve must use its verified axis-calibrated catalogue vector.');
}
if(rows.filter(row=>row.productCode==='11203').length!==2||rows.filter(row=>row.productCode==='11223').length!==2){
  throw new Error('PUNTO 12 V controller configurations were not retained separately.');
}
for(const imageFile of imageFiles){
  if(!fs.existsSync(sourceImage(imageFile)))throw new Error(`Missing residential image: ${imageFile}`);
}

fs.mkdirSync(targetImages,{recursive:true});
for(const imageFile of imageFiles)fs.copyFileSync(sourceImage(imageFile),path.join(targetImages,imageFile));
for(const [sourceName,targetName] of [['package_manifest.json','manifest.json'],['validation_report.json','validation-report.json']]){
  const source=path.join(packageDirectory,sourceName);
  if(fs.existsSync(source))fs.copyFileSync(source,path.join(targetImages,targetName));
}
fs.writeFileSync(targetData,`window.models.push(...${JSON.stringify(rows)});\n`);

console.log(JSON.stringify({
  products:rows.length,
  series:series.length,
  curves:curveCount,
  points:pointCount,
  images:imageFiles.length,
  data:path.relative(projectRoot,targetData)
},null,2));

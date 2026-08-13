import fs from 'node:fs';
import path from 'node:path';

const packageDirectory=path.resolve(process.argv[2]||'');
const projectRoot=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const sourceFile=path.join(packageDirectory,'lineo_products.json');
const sourceImages=path.join(packageDirectory,'images');
const targetImages=path.join(projectRoot,'assets','products','lineo');
const targetData=path.join(projectRoot,'data','fans-09.js');

if(!packageDirectory||!fs.existsSync(sourceFile)){
  throw new Error('Usage: node scripts/import-lineo-package.mjs /path/to/extracted/package');
}

const packageData=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const products=Array.isArray(packageData)?packageData:packageData.products;
if(!Array.isArray(products))throw new Error('lineo_products.json does not contain a products array.');

const expectedSeries=['LINEO','LINEO ES','LINEO QUIET','LINEO QUIET ES'];
const titles={
  'LINEO':'LINEO In-Line Mixed-Flow Fans',
  'LINEO ES':'LINEO ES In-Line EC Mixed-Flow Fans',
  'LINEO QUIET':'LINEO QUIET Low-Noise In-Line Mixed-Flow Fans',
  'LINEO QUIET ES':'LINEO QUIET ES Low-Noise In-Line EC Mixed-Flow Fans'
};

function number(value){
  const result=Number(value);
  return Number.isFinite(result)?result:0;
}

function operatingPoint(point={}){
  return {
    control:String(point.control||''),
    powerW:number(point.power_w),
    powerKw:Number((number(point.power_w)/1000).toFixed(4)),
    currentA:number(point.current_a),
    rpm:number(point.rpm),
    maxAirflowM3h:number(point.max_airflow_m3h),
    maxPressurePa:number(point.max_pressure_pa)
  };
}

function performanceCurves(product){
  return Object.entries(product.curves||{}).map(([control,curve])=>({
    control,
    sourcePage:number(curve.source_page),
    interpolation:'linear',
    precomputed:true,
    sourcePoints:(curve.points||[])
      .map(point=>[number(point.p_pa),number(point.q_m3h)])
      .sort((a,b)=>a[0]-b[0])
  }));
}

function categoriesFor(product){
  const categories=['Duct Fan','Mixed Flow Fan'];
  if(String(product.motor_type||'').toUpperCase().includes('EC'))categories.push('EC Fan');
  if(product.quiet_casing)categories.push('Quiet Fan');
  return categories;
}

function catalogueInfo(product,controls){
  const general=[
    'In-line mixed-flow fan for circular duct systems.',
    `Nominal duct connection: ${number(product.nominal_duct_mm)} mm.`,
    `Maximum ambient temperature: ${number(product.max_ambient_c)} °C.`
  ];
  if(product.quiet_casing)general.push('Acoustic casing designed for reduced sound transmission.');
  if(product.timer_variant)general.push('Timer-equipped product variant.');
  return {
    general,
    motor:[
      `${String(product.motor_type||'Motor')}.`,
      `Control levels: ${controls.join(' / ')}.`,
      `${String(product.voltage_v||'')} V, ${String(product.frequency_hz||'')} Hz.`,
      `${String(product.protection_grade||'')} protection.`
    ],
    applications:['Circular duct ventilation','Air supply and exhaust systems']
  };
}

const rows=products.map(product=>{
  const curves=performanceCurves(product);
  const controls=curves.map(curve=>curve.control);
  const points=(product.operating_points||[]).map(operatingPoint);
  const primary=points.find(point=>point.control===controls.at(-1))||points.at(-1)||{};
  const imageFile=path.basename(String(product.image_path||''));
  const categories=categoriesFor(product);
  return {
    key:`VORTICE-LINEO|${String(product.code||'')}|${String(product.model||'')}`,
    display:`${String(product.model||'')} (${number(primary.maxAirflowM3h)} m³/h)`,
    model:String(product.model||''),
    brand:String(product.brand||'Vortice'),
    manufacturer:String(product.brand||'Vortice'),
    family:String(product.family||'LINEO'),
    series:String(product.series||''),
    productCode:String(product.code||''),
    fanType:'Karma Akışlı',
    mountType:'Kanal Tipi',
    productGroup:'Kanal Tipi Fan',
    fanTypeEn:'Mixed Flow',
    mountTypeEn:'In-Line Duct',
    productGroupEn:'Duct Fan',
    categories,
    tagsEn:categories,
    catalogNameEn:titles[product.series]||String(product.series||''),
    nominal:number(primary.maxAirflowM3h),
    kw:number(primary.powerKw),
    rpm:number(primary.rpm),
    amps:number(primary.currentA),
    voltage:`${String(product.voltage_v||'')} V`,
    frequency:`${String(product.frequency_hz||'')} Hz`,
    weight:number(product.weight_kg),
    ipClass:String(product.protection_grade||''),
    nominalDuctMm:number(product.nominal_duct_mm),
    maxAmbientC:number(product.max_ambient_c),
    dimensions:product.dimensions_mm||{},
    motorType:String(product.motor_type||''),
    quietCasing:Boolean(product.quiet_casing),
    timerVariant:Boolean(product.timer_variant),
    image:`assets/products/lineo/${imageFile}`,
    sourcePage:number(curves.at(-1)?.sourcePage),
    sourceCatalogue:String(product.source_catalogue||''),
    curveInterpolation:'linear',
    operatingPoints:points,
    curves,
    catalogueInfo:catalogueInfo(product,controls)
  };
});

const series=[...new Set(rows.map(row=>row.series))].sort();
const curveCount=rows.reduce((sum,row)=>sum+row.curves.length,0);
const pointCount=rows.reduce((sum,row)=>sum+row.curves.reduce((curveSum,curve)=>curveSum+curve.sourcePoints.length,0),0);
const uniqueKeys=new Set(rows.map(row=>row.key));
const imageFiles=[...new Set(rows.map(row=>path.basename(row.image)))].sort();

if(rows.length!==45)throw new Error(`Expected 45 LINEO products, found ${rows.length}.`);
if(JSON.stringify(series)!==JSON.stringify([...expectedSeries].sort()))throw new Error(`Unexpected LINEO series: ${series.join(', ')}`);
if(curveCount!==136)throw new Error(`Expected 136 LINEO curves, found ${curveCount}.`);
if(pointCount!==2855)throw new Error(`Expected 2855 LINEO curve points, found ${pointCount}.`);
if(uniqueKeys.size!==rows.length)throw new Error('LINEO product keys are not unique.');
for(const imageFile of imageFiles){
  if(!fs.existsSync(path.join(sourceImages,imageFile)))throw new Error(`Missing LINEO image: ${imageFile}`);
}

fs.mkdirSync(targetImages,{recursive:true});
for(const imageFile of imageFiles){
  fs.copyFileSync(path.join(sourceImages,imageFile),path.join(targetImages,imageFile));
}
const sourceManifest=path.join(sourceImages,'image_manifest.json');
if(fs.existsSync(sourceManifest))fs.copyFileSync(sourceManifest,path.join(targetImages,'manifest.json'));
fs.writeFileSync(targetData,`window.models.push(...${JSON.stringify(rows)});\n`);

console.log(JSON.stringify({products:rows.length,series:series.length,curves:curveCount,points:pointCount,images:imageFiles.length,data:path.relative(projectRoot,targetData)},null,2));

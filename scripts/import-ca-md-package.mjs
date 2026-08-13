import fs from 'node:fs';
import path from 'node:path';

const packageDirectory=path.resolve(process.argv[2]||'');
const projectRoot=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const sourceFile=path.join(packageDirectory,'ca_md_products.json');
const targetImages=path.join(projectRoot,'assets','products','ca-md');
const targetData=path.join(projectRoot,'data','fans-10.js');

if(!packageDirectory||!fs.existsSync(sourceFile)){
  throw new Error('Usage: node scripts/import-ca-md-package.mjs /path/to/extracted/package');
}

const packageData=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const products=Array.isArray(packageData)?packageData:packageData.products;
if(!Array.isArray(products))throw new Error('ca_md_products.json does not contain a products array.');

const expectedSeries=['CA MD','CA MD EXTRA EU','CA MD E RF'];
const titles={
  'CA MD':'CA MD In-Line Mixed-Flow Duct Fans',
  'CA MD EXTRA EU':'CA MD Extra EU In-Line Mixed-Flow Duct Fans',
  'CA MD E RF':'CA MD E RF Roof-Mounted Mixed-Flow Exhaust Fans'
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
    maxPressurePa:number(point.max_pressure_pa),
    soundPressureDbA3m:point.sound_pressure_db_a_3m==null?null:number(point.sound_pressure_db_a_3m)
  };
}

function performanceCurves(product){
  const source=product.curves||{};
  const controls=[
    ...(product.operating_points||[]).map(point=>String(point.control||'')),
    ...Object.keys(source)
  ].filter((control,index,items)=>control&&items.indexOf(control)===index);
  return controls.map(control=>{
    const curve=source[control]||{};
    return {
      control,
      sourcePage:number(curve.source_page),
      interpolation:'linear',
      precomputed:true,
      sourcePoints:(curve.points||[])
        .map(point=>[number(point.p_pa),number(point.q_m3h)])
        .sort((a,b)=>a[0]-b[0]||b[1]-a[1])
    };
  }).filter(curve=>curve.sourcePoints.length);
}

function isRoof(product){return String(product.series||'')==='CA MD E RF'}

function categoriesFor(product){
  return isRoof(product)?['Roof Fan','Mixed Flow Fan']:['Duct Fan','Mixed Flow Fan'];
}

function catalogueInfo(product,controls){
  const roof=isRoof(product);
  return {
    general:[
      roof?'Roof-mounted mixed-flow exhaust fan for circular duct systems.':'In-line mixed-flow fan for circular duct systems.',
      `Nominal duct connection: ${number(product.nominal_duct_mm)} mm.`,
      `Maximum ambient temperature: ${number(product.max_ambient_c)} °C.`,
      `Availability region: ${String(product.availability_region||'-')}.`
    ],
    motor:[
      `${String(product.motor_type||'Motor')}.`,
      `Control levels: ${controls.join(' / ')}.`,
      `${String(product.voltage_v||'')} V, ${String(product.frequency_hz||'')} Hz.`,
      `${String(product.protection_grade||'')} protection, insulation class ${String(product.insulation_class||'-')}.`
    ],
    applications:roof
      ? ['Roof-mounted air exhaust','Circular duct ventilation']
      : ['Circular duct ventilation','Air supply and exhaust systems']
  };
}

function sourceImage(filePath){
  const imageFile=path.basename(String(filePath||''));
  const candidates=[path.join(packageDirectory,'images',imageFile),path.join(packageDirectory,imageFile)];
  return candidates.find(candidate=>fs.existsSync(candidate))||candidates[0];
}

const rows=products.map(product=>{
  const curves=performanceCurves(product);
  const controls=curves.map(curve=>curve.control);
  const points=(product.operating_points||[]).map(operatingPoint);
  const primary=points.find(point=>point.control==='max')||points.at(-1)||{};
  const productImage=path.basename(String(product.image_path||''));
  const dimensionImage=path.basename(String(product.dimension_image_path||''));
  const categories=categoriesFor(product);
  const roof=isRoof(product);
  return {
    key:`VORTICE-CA-MD|${String(product.code||'')}`,
    display:`${String(product.model||'')} (${number(primary.maxAirflowM3h)} m³/h)`,
    model:String(product.model||''),
    brand:String(product.brand||'Vortice'),
    manufacturer:String(product.brand||'Vortice'),
    family:String(product.family||'CA MD'),
    series:String(product.series||''),
    productCode:String(product.code||''),
    fanType:'Karma Akışlı',
    mountType:roof?'Çatı Tipi':'Kanal Tipi',
    productGroup:roof?'Çatı Tipi Fan':'Kanal Tipi Fan',
    fanTypeEn:'Mixed Flow',
    mountTypeEn:roof?'Roof-Mounted':'In-Line Duct',
    productGroupEn:roof?'Roof Fan':'Duct Fan',
    categories,
    tagsEn:categories,
    catalogNameEn:titles[product.series]||String(product.series||''),
    nominal:number(primary.maxAirflowM3h),
    kw:number(primary.powerKw),
    rpm:number(primary.rpm),
    amps:number(primary.currentA),
    spl:number(primary.soundPressureDbA3m),
    voltage:`${String(product.voltage_v||'')} V`,
    frequency:`${String(product.frequency_hz||'')} Hz`,
    weight:number(product.weight_kg),
    ipClass:String(product.protection_grade||''),
    insulationClass:String(product.insulation_class||''),
    nominalDuctMm:number(product.nominal_duct_mm),
    maxAmbientC:number(product.max_ambient_c),
    dimensions:product.dimensions_mm||{},
    motorType:String(product.motor_type||''),
    availabilityRegion:String(product.availability_region||''),
    image:`assets/products/ca-md/${productImage}`,
    dimensionImage:`assets/products/ca-md/${dimensionImage}`,
    sourcePage:number(curves.find(curve=>curve.control===primary.control)?.sourcePage||curves.at(-1)?.sourcePage),
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
const productImages=[...new Set(rows.map(row=>path.basename(row.image)))].sort();
const dimensionImages=[...new Set(rows.map(row=>path.basename(row.dimensionImage)))].sort();
const imageFiles=[...new Set([...productImages,...dimensionImages])].sort();

if(rows.length!==26)throw new Error(`Expected 26 CA MD products, found ${rows.length}.`);
if(JSON.stringify(series)!==JSON.stringify([...expectedSeries].sort()))throw new Error(`Unexpected CA MD series: ${series.join(', ')}`);
if(curveCount!==66)throw new Error(`Expected 66 CA MD curves, found ${curveCount}.`);
if(pointCount!==1386)throw new Error(`Expected 1386 CA MD curve points, found ${pointCount}.`);
if(uniqueKeys.size!==rows.length)throw new Error('CA MD product keys are not unique.');
if(rows.some(row=>row.model==='CA 125 MD E W'))throw new Error('Catalogue typo CA 125 MD E W must not be imported.');
if(!rows.some(row=>row.model==='CA 125 MD E RF'))throw new Error('Normalized CA 125 MD E RF record is missing.');
for(const imageFile of imageFiles){
  if(!fs.existsSync(sourceImage(imageFile)))throw new Error(`Missing CA MD image: ${imageFile}`);
}

fs.mkdirSync(targetImages,{recursive:true});
for(const imageFile of imageFiles){
  fs.copyFileSync(sourceImage(imageFile),path.join(targetImages,imageFile));
}
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
  productImages:productImages.length,
  dimensionImages:dimensionImages.length,
  data:path.relative(projectRoot,targetData)
},null,2));

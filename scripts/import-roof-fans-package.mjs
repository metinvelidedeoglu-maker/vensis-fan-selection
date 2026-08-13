import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const packageDirectory=path.resolve(process.argv[2]||'');
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceFile=path.join(packageDirectory,'roof_fans_products.json');
const targetImages=path.join(projectRoot,'assets','products','roof-fans');
const targetData=path.join(projectRoot,'data','fans-11.js');

if(!packageDirectory||!fs.existsSync(sourceFile)){
  throw new Error('Usage: node scripts/import-roof-fans-package.mjs /path/to/extracted/package');
}

const packageData=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const products=Array.isArray(packageData)?packageData:packageData.products;
if(!Array.isArray(products))throw new Error('roof_fans_products.json does not contain a products array.');

const expectedSeries=['HEATMASTER F400','SLIMROOF ES'];
const titles={
  'SLIMROOF ES':'SLIMROOF ES EC Centrifugal Roof Fans',
  'HEATMASTER F400':'HEATMASTER F400 Smoke-Extract Centrifugal Roof Fans'
};

function number(value){
  const result=Number(value);
  return Number.isFinite(result)?result:0;
}

function rawCurvePoints(curve){
  return Array.isArray(curve)?curve:Array.isArray(curve?.points)?curve.points:[];
}

function controlOrder(left,right){
  const a=String(left||''),b=String(right||'');
  const aVoltage=a.match(/^(\d+(?:\.\d+)?)V$/i),bVoltage=b.match(/^(\d+(?:\.\d+)?)V$/i);
  if(aVoltage&&bVoltage)return number(aVoltage[1])-number(bVoltage[1]);
  const rank={low:1,high:2};
  if(rank[a.toLowerCase()]||rank[b.toLowerCase()])return (rank[a.toLowerCase()]||99)-(rank[b.toLowerCase()]||99);
  return a.localeCompare(b);
}

function performanceCurves(product){
  return Object.entries(product.curves||{})
    .sort(([left],[right])=>controlOrder(left,right))
    .map(([control,curve])=>({
      control,
      sourcePage:number(curve?.source_page),
      sourceMethod:String(curve?.source_method||'sampled from original PDF vector paths'),
      interpolation:'linear',
      precomputed:true,
      sourcePoints:rawCurvePoints(curve)
        .map(point=>[number(point.p_pa),number(point.q_m3h)])
        .sort((a,b)=>a[0]-b[0]||b[1]-a[1])
    }))
    .filter(curve=>curve.sourcePoints.length);
}

function isHeatmaster(product){return String(product.series||'')==='HEATMASTER F400'}

function isPrimaryControl(control){
  return String(control||'').toLowerCase()==='high'||String(control||'').toUpperCase()==='10V';
}

function lowSpeedPowerW(product){
  const match=String(product.model||'').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*KW/i);
  return match?number(match[2])*1000:0;
}

function operatingPoints(product,curves){
  return curves.map(curve=>{
    const maximumAirflow=Math.max(...curve.sourcePoints.map(point=>point[1]));
    const maximumPressure=Math.max(...curve.sourcePoints.map(point=>point[0]));
    const primary=isPrimaryControl(curve.control);
    const powerW=primary
      ? number(product.motor_power_w)
      : String(curve.control).toLowerCase()==='low'
        ? lowSpeedPowerW(product)
        : 0;
    return {
      control:curve.control,
      powerW,
      powerKw:Number((powerW/1000).toFixed(4)),
      currentA:0,
      rpm:0,
      maxAirflowM3h:primary?number(product.max_airflow_m3h):maximumAirflow,
      maxPressurePa:maximumPressure,
      soundPressureDbA3m:null
    };
  });
}

function categoriesFor(product){
  return isHeatmaster(product)
    ? ['Roof Fan','Centrifugal Fan','Smoke Exhaust Fan']
    : ['Roof Fan','Centrifugal Fan','EC Fan'];
}

function catalogueInfo(product,controls){
  const heatmaster=isHeatmaster(product);
  const temperature=product.operating_temperature_c||{};
  return {
    general:heatmaster
      ? [
          'Radial-discharge, dual-use centrifugal roof fan.',
          `Continuous air-temperature limit: ${number(product.air_temperature_continuous_c)} °C.`,
          `Emergency smoke duty: F400 (${number(product.smoke_temperature_c)} °C / ${number(product.smoke_duration_minutes)} minutes).`
        ]
      : [
          'Radial-discharge centrifugal roof fan with an EC motor.',
          `Operating air-temperature range: ${number(temperature.min)} to +${number(temperature.max)} °C.`,
          `EC control levels supplied in the catalogue: ${controls.join(' / ')}.`
        ],
    motor:[
      `${String(product.motor_type||'Motor')} motor.`,
      `${String(product.voltage_v||'')} V, ${String(product.frequency_hz||'')} Hz.`,
      `${String(product.protection_grade||'')} protection, insulation class ${String(product.insulation_class||'-')}.`
    ],
    applications:heatmaster
      ? ['Normal roof extract ventilation','Emergency smoke extraction at F400 / 120 min']
      : ['Roof extract ventilation','EC-controlled air exhaust systems']
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
  const controls=curves.map(curve=>curve.control);
  const heatmaster=isHeatmaster(product);
  const productImage=path.basename(String(product.image_path||''));
  const dimensionImage=path.basename(String(product.dimension_image_path||''));
  const categories=categoriesFor(product);
  const temperature=product.operating_temperature_c||{};
  const primaryCurve=curves.find(curve=>isPrimaryControl(curve.control))||curves.at(-1);
  return {
    key:`VORTICE-ROOF|${String(product.code||'')}`,
    display:`${String(product.model||'')} (${number(product.max_airflow_m3h)} m³/h)`,
    model:String(product.model||''),
    brand:String(product.brand||'Vortice'),
    manufacturer:String(product.brand||'Vortice'),
    family:String(product.family||product.series||''),
    series:String(product.series||''),
    productCode:String(product.code||''),
    fanType:'Radyal Atışlı Santrifüj',
    mountType:'Çatı Tipi',
    productGroup:'Çatı Tipi Fan',
    fanTypeEn:'Centrifugal',
    mountTypeEn:'Roof-Mounted',
    productGroupEn:'Roof Fan',
    categories,
    tagsEn:categories,
    catalogNameEn:titles[product.series]||String(product.series||''),
    nominal:number(product.max_airflow_m3h),
    kw:Number((number(product.motor_power_w)/1000).toFixed(4)),
    rpm:0,
    amps:0,
    spl:0,
    voltage:`${String(product.voltage_v||'')} V`,
    frequency:`${String(product.frequency_hz||'')} Hz`,
    weight:number(product.weight_kg),
    ipClass:String(product.protection_grade||''),
    insulationClass:String(product.insulation_class||''),
    fire:heatmaster?`F400 / ${number(product.smoke_duration_minutes)} min`:'',
    operatingTemperatureMinC:number(temperature.min),
    operatingTemperatureMaxC:number(temperature.max),
    continuousAirTemperatureC:number(product.air_temperature_continuous_c),
    smokeTemperatureC:number(product.smoke_temperature_c),
    smokeDurationMinutes:number(product.smoke_duration_minutes),
    impellerMm:String(product.impeller_mm||''),
    dimensions:product.dimensions_mm||{},
    motorType:String(product.motor_type||''),
    image:`assets/products/roof-fans/${productImage}`,
    dimensionImage:`assets/products/roof-fans/${dimensionImage}`,
    sourcePage:number(primaryCurve?.sourcePage),
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
const imageFiles=[...new Set(rows.flatMap(row=>[path.basename(row.image),path.basename(row.dimensionImage)]))].sort();

if(rows.length!==31)throw new Error(`Expected 31 roof-fan products, found ${rows.length}.`);
if(JSON.stringify(series)!==JSON.stringify(expectedSeries))throw new Error(`Unexpected roof-fan series: ${series.join(', ')}`);
if(curveCount!==64)throw new Error(`Expected 64 roof-fan curves, found ${curveCount}.`);
if(pointCount!==1334)throw new Error(`Expected 1334 roof-fan curve points, found ${pointCount}.`);
if(new Set(rows.map(row=>row.key)).size!==rows.length)throw new Error('Roof-fan product keys are not unique.');
if(rows.some(row=>row.curves.at(-1)?.control!==(row.series==='SLIMROOF ES'?'10V':'high'))){
  throw new Error('Primary roof-fan control must be stored last.');
}
for(const imageFile of imageFiles){
  if(!fs.existsSync(sourceImage(imageFile)))throw new Error(`Missing roof-fan image: ${imageFile}`);
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

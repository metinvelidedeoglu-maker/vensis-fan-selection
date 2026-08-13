import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const packageDirectory=path.resolve(process.argv[2]||'');
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceFile=path.join(packageDirectory,'eatex_tiracamino_products.json');
const targetImages=path.join(projectRoot,'assets','products','eatex-tiracamino');
const targetData=path.join(projectRoot,'data','fans-12.js');
const verifiedCurvesFile=path.join(targetImages,'verified-vector-curves.json');
const verifiedPdfSha256='7edd786a6a51b40c0a1114bbba1bd04aa67cfa154a9fd1852bb17ce23f37f6ee';

if(!packageDirectory||!fs.existsSync(sourceFile)){
  throw new Error('Usage: node scripts/import-eatex-tiracamino-package.mjs /path/to/extracted/package');
}

const packageData=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const products=Array.isArray(packageData)?packageData:packageData.products;
if(!Array.isArray(products))throw new Error('eatex_tiracamino_products.json does not contain a products array.');
if(!fs.existsSync(verifiedCurvesFile)){
  throw new Error('Missing verified E-ATEX vector curves. Run scripts/extract-eatex-vector-curves.py first.');
}
const verifiedData=JSON.parse(fs.readFileSync(verifiedCurvesFile,'utf8'));
if(verifiedData.status!=='verified_against_original_catalogue_vector_graphs'){
  throw new Error(`Unexpected E-ATEX vector verification status: ${String(verifiedData.status||'missing')}`);
}
if(verifiedData.source_sha256!==verifiedPdfSha256){
  throw new Error(`Unexpected verified E-ATEX source SHA-256: ${String(verifiedData.source_sha256||'missing')}`);
}
if(Object.keys(verifiedData.curves||{}).length!==14){
  throw new Error(`Expected 14 verified E-ATEX vector curves, found ${Object.keys(verifiedData.curves||{}).length}.`);
}

const expectedSeries=['E-ATEX','TIRACAMINO'];
const titles={
  'E-ATEX':'E-ATEX Explosion-Protected Axial Plate Fans',
  TIRACAMINO:'Tiracamino Chimney-Top Extract Fan'
};

function number(value){
  const result=Number(value);
  return Number.isFinite(result)?result:0;
}

function performanceCurves(product){
  const sourceCurves=isEatex(product)
    ? {nominal:verifiedData.curves?.[String(product.code||'')]}
    : product.curves||{};
  if(isEatex(product)&&!sourceCurves.nominal){
    throw new Error(`Missing verified E-ATEX vector curve for product ${String(product.code||'')}.`);
  }
  if(isEatex(product)&&sourceCurves.nominal.model!==product.model){
    throw new Error(`Verified E-ATEX model mismatch for product ${String(product.code||'')}.`);
  }
  return Object.entries(sourceCurves).map(([control,curve])=>({
    control,
    sourcePage:number(curve?.source_page),
    sourceMethod:String(curve?.source_method||''),
    interpolation:'linear',
    precomputed:true,
    sourcePoints:(Array.isArray(curve)?curve:curve?.points||[])
      .map(point=>[number(point.p_pa),number(point.q_m3h)])
      .sort((a,b)=>a[0]-b[0]||b[1]-a[1])
  })).filter(curve=>curve.sourcePoints.length);
}

function isEatex(product){return String(product.series||'')==='E-ATEX'}

function categoriesFor(product){
  return isEatex(product)
    ? ['Axial Fan','Wall-Mounted Fan','Explosion-Proof / ATEX Fan']
    : ['Roof Fan','Centrifugal Fan','Chimney Fan'];
}

function phaseLabel(value){
  if(String(value||'').toLowerCase()==='single')return 'Single Phase';
  if(String(value||'').toLowerCase()==='three')return 'Three Phase';
  return String(value||'');
}

function catalogueInfo(product){
  if(isEatex(product)){
    const atex=product.atex||{};
    const temperature=product.operating_temperature_c||{};
    return {
      general:[
        'Axial plate fan for potentially explosive gas and dust atmospheres.',
        `ATEX gas marking: ${String(atex.gas_marking||'-')}.`,
        `ATEX dust marking: ${String(atex.dust_marking||'-')}.`,
        `Operating air-temperature range: ${number(temperature.min)} to +${number(temperature.max)} °C.`,
        'Hazardous-area suitability must be confirmed against the project classification and manufacturer documentation; X special conditions apply.'
      ],
      motor:[
        `${phaseLabel(product.phase)}, ${number(product.poles)}-pole motor.`,
        `${String(product.voltage_v||'')} V, ${String(product.frequency_hz||'')} Hz.`,
        `${String(product.protection_grade||'')} protection, motor insulation class ${String(product.motor_class||product.insulation_class||'-')}.`
      ],
      applications:['Zone 1 gas atmospheres subject to full compatibility review','Zone 21 dust atmospheres subject to full compatibility review']
    };
  }
  return {
    general:[
      'Chimney-top radial extract fan for fireplace smoke extraction.',
      `Approximate continuous air-temperature capability: ${number(product.approx_continuous_air_temperature_c)} °C.`,
      'Warning: not suitable for gas fires.'
    ],
    motor:[
      `${String(product.voltage_v||'')} V, ${String(product.frequency_hz||'')} Hz.`,
      `${String(product.protection_grade||'')} protection, insulation class ${String(product.insulation_class||'-')}.`,
      `Included speed controller: ${String(product.speed_controller_included||'-')}.`
    ],
    applications:['Fireplace and solid-fuel chimney smoke extraction','Chimney-top installation']
  };
}

function sourceImage(filePath){
  const imageFile=path.basename(String(filePath||''));
  const candidates=[path.join(packageDirectory,'images',imageFile),path.join(packageDirectory,imageFile)];
  return candidates.find(candidate=>fs.existsSync(candidate))||candidates[0];
}

const rows=products.map(product=>{
  const curves=performanceCurves(product);
  const eatex=isEatex(product);
  const categories=categoriesFor(product);
  const productImage=path.basename(String(product.image_path||''));
  const dimensionImage=path.basename(String(product.dimension_image_path||''));
  const temperature=product.operating_temperature_c||{};
  const point={
    control:'nominal',
    powerW:number(product.power_w),
    powerKw:Number((number(product.power_w)/1000).toFixed(4)),
    currentA:number(product.current_a),
    rpm:number(product.rpm),
    maxAirflowM3h:number(product.max_airflow_m3h),
    maxPressurePa:number(product.max_pressure_pa),
    soundPressureDbA3m:product.sound_pressure_db_a_3m==null?null:number(product.sound_pressure_db_a_3m)
  };
  return {
    key:`VORTICE-EATEX-TIRACAMINO|${String(product.code||'')}`,
    display:String(product.display_name||`${product.model||''} (${number(product.max_airflow_m3h)} m³/h)`),
    model:String(product.model||''),
    brand:String(product.brand||'Vortice'),
    manufacturer:String(product.brand||'Vortice'),
    family:String(product.family||product.series||''),
    series:String(product.series||''),
    productCode:String(product.code||''),
    fanType:eatex?'Aksiyal':'Radyal',
    mountType:eatex?'Duvar / Plaka Tipi':'Baca Üstü',
    productGroup:eatex?'Aksiyal Fan':'Baca Fanı',
    fanTypeEn:eatex?'Axial':'Centrifugal',
    mountTypeEn:eatex?'Wall / Plate-Mounted':'Chimney-Top',
    productGroupEn:eatex?'Explosion-Protected Axial Fan':'Chimney Fan',
    categories,
    tagsEn:categories,
    catalogNameEn:titles[product.series]||String(product.series||''),
    nominal:number(product.max_airflow_m3h),
    kw:point.powerKw,
    rpm:point.rpm,
    amps:point.currentA,
    spl:number(product.sound_pressure_db_a_3m),
    maxPressure:number(product.max_pressure_pa),
    voltage:`${String(product.voltage_v||'')} V`,
    frequency:`${String(product.frequency_hz||'')} Hz`,
    weight:number(product.weight_kg),
    ipClass:String(product.protection_grade||''),
    insulationClass:String(product.motor_class||product.insulation_class||''),
    phase:phaseLabel(product.phase),
    poles:number(product.poles),
    operatingTemperatureMinC:number(temperature.min),
    operatingTemperatureMaxC:number(temperature.max),
    approximateContinuousAirTemperatureC:number(product.approx_continuous_air_temperature_c),
    inletDiameterMm:number(product.inlet_diameter_mm),
    gasFireCompatible:product.gas_fire_compatible==null?null:Boolean(product.gas_fire_compatible),
    speedControllerIncluded:String(product.speed_controller_included||''),
    atex:eatex?product.atex||null:null,
    safetyWarning:eatex
      ? 'Hazardous-area compatibility must be confirmed against the project classification and manufacturer documentation. X special conditions apply.'
      : 'Not suitable for gas fires.',
    dimensions:product.dimensions_mm||{},
    image:`assets/products/eatex-tiracamino/${productImage}`,
    dimensionImage:`assets/products/eatex-tiracamino/${dimensionImage}`,
    sourcePage:number(curves[0]?.sourcePage),
    sourceCatalogue:String(product.source_catalogue||''),
    curveVerification:eatex?{
      status:verifiedData.status,
      sourceCatalogue:verifiedData.source_catalogue,
      sourceSha256:verifiedData.source_sha256,
      sourcePage:number(curves[0]?.sourcePage),
      maxNormalizedPathErrorPercent:number(verifiedData.curves?.[String(product.code||'')]?.max_normalized_path_error_percent)
    }:null,
    curveInterpolation:'linear',
    operatingPoints:[point],
    curves,
    catalogueInfo:catalogueInfo(product)
  };
});

const series=[...new Set(rows.map(row=>row.series))].sort();
const curveCount=rows.reduce((sum,row)=>sum+row.curves.length,0);
const pointCount=rows.reduce((sum,row)=>sum+row.curves.reduce((curveSum,curve)=>curveSum+curve.sourcePoints.length,0),0);
const verifiedEatexPointCount=Object.values(verifiedData.curves).reduce((sum,curve)=>sum+(curve.points||[]).length,0);
const imageFiles=[...new Set(rows.flatMap(row=>[path.basename(row.image),path.basename(row.dimensionImage)]))].sort();

if(rows.length!==15)throw new Error(`Expected 15 E-ATEX/Tiracamino products, found ${rows.length}.`);
if(JSON.stringify(series)!==JSON.stringify(expectedSeries))throw new Error(`Unexpected E-ATEX/Tiracamino series: ${series.join(', ')}`);
if(curveCount!==15)throw new Error(`Expected 15 E-ATEX/Tiracamino curves, found ${curveCount}.`);
if(pointCount!==verifiedEatexPointCount+11){
  throw new Error(`Expected ${verifiedEatexPointCount+11} E-ATEX/Tiracamino curve points, found ${pointCount}.`);
}
if(new Set(rows.map(row=>row.key)).size!==rows.length)throw new Error('E-ATEX/Tiracamino product keys are not unique.');
if(rows.filter(row=>row.series==='E-ATEX').some(row=>!row.atex?.special_conditions_X)){
  throw new Error('Every E-ATEX record must retain its X special condition.');
}
if(rows.filter(row=>row.series==='E-ATEX').some(row=>!row.curves[0].sourceMethod.includes('original catalogue vector'))){
  throw new Error('Every E-ATEX record must use its verified original-catalogue vector curve.');
}
if(rows.find(row=>row.series==='TIRACAMINO')?.gasFireCompatible!==false){
  throw new Error('Tiracamino gas-fire warning was not retained.');
}
for(const imageFile of imageFiles){
  if(!fs.existsSync(sourceImage(imageFile)))throw new Error(`Missing E-ATEX/Tiracamino image: ${imageFile}`);
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

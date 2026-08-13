import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const packageDirectory=path.resolve(process.argv[2]||'');
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceFile=path.join(packageDirectory,'qbk_sal_kc_evo_products.json');
const targetImages=path.join(projectRoot,'assets','products','qbk-sal-kc-evo');
const targetData=path.join(projectRoot,'data','fans-14.js');
const verifiedCurvesFile=path.join(targetImages,'verified-vector-curves.json');
const verifiedPdfSha256='892f4e1efad05a5179120f4f2099518649198c64ee6641c0623dc3f5e198e766';

if(!packageDirectory||!fs.existsSync(sourceFile)){
  throw new Error('Usage: node scripts/import-qbk-package.mjs /path/to/extracted/package');
}
if(!fs.existsSync(verifiedCurvesFile)){
  throw new Error('Missing verified QBK vector curves. Run scripts/extract-qbk-vector-curves.py first.');
}

const packageData=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const products=Array.isArray(packageData)?packageData:packageData.products;
const verifiedData=JSON.parse(fs.readFileSync(verifiedCurvesFile,'utf8'));
if(!Array.isArray(products))throw new Error('qbk_sal_kc_evo_products.json does not contain a products array.');
if(verifiedData.status!=='verified_against_original_catalogue_vector_graphs'){
  throw new Error(`Unexpected QBK vector verification status: ${String(verifiedData.status||'missing')}`);
}
if(verifiedData.source_sha256!==verifiedPdfSha256){
  throw new Error(`Unexpected verified QBK source SHA-256: ${String(verifiedData.source_sha256||'missing')}`);
}

function number(value){
  const result=Number(value);
  return Number.isFinite(result)?result:0;
}

function controlOrder(control){
  return {nominal:1,'8_poles':1,'4_poles':2}[String(control||'')]||99;
}

function performanceCurves(product){
  const verified=verifiedData.curves?.[String(product.code||'')];
  if(!verified)throw new Error(`Missing verified QBK curve for code ${String(product.code||'')}.`);
  if(verified.model!==product.model)throw new Error(`Verified QBK model mismatch for code ${String(product.code||'')}.`);
  return Object.entries(verified.curves||{})
    .sort(([left],[right])=>controlOrder(left)-controlOrder(right))
    .map(([control,curve])=>({
      control,
      sourcePage:number(verified.source_page),
      sourceMethod:String(curve.source_method||''),
      interpolation:'linear',
      precomputed:true,
      sourcePoints:(curve.points||[]).map(point=>[number(point.p_pa),number(point.q_m3h)])
    })).filter(curve=>curve.sourcePoints.length);
}

function powerParts(product){
  return String(product.motor_power_w||'').split('/').map(number);
}

function powerFor(product,control){
  const parts=powerParts(product);
  return control==='8_poles'?number(parts[1]):number(parts[0]);
}

function operatingPoints(product,curves){
  return curves.map(curve=>{
    const maximumAirflow=Math.max(...curve.sourcePoints.map(([,airflow])=>airflow));
    const maximumPressure=Math.max(...curve.sourcePoints.map(([pressure])=>pressure));
    const primary=curve.control==='nominal'||curve.control==='4_poles';
    const powerW=powerFor(product,curve.control);
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

function phaseLabel(product){
  return String(product.power_supply||'').toLowerCase().startsWith('single')?'Single Phase':'Three Phase';
}

function voltage(product){return phaseLabel(product)==='Single Phase'?'230 V':'400 V'}

function poles(product){
  const match=String(product.motor_poles||'').match(/(\d+)/);
  return match?number(match[1]):0;
}

function sourceImage(filePath){
  const imageFile=path.basename(String(filePath||''));
  const candidates=[path.join(packageDirectory,'images',imageFile),path.join(packageDirectory,imageFile)];
  return candidates.find(candidate=>fs.existsSync(candidate))||candidates[0];
}

function catalogueInfo(product,controls){
  return {
    general:[
      'Insulated cabinet centrifugal fan with 90-degree inlet/outlet arrangement.',
      `Nominal intake diameter: ${number(product.nominal_intake_diameter_mm)} mm.`,
      `Catalogue vector controls: ${controls.join(' / ')}.`
    ],
    motor:[
      `${phaseLabel(product)}, ${String(product.motor_poles||'')} motor.`,
      `${voltage(product)}, ${number(product.frequency_hz)} Hz.`,
      `${String(product.motor_protection||'')} protection, insulation class ${String(product.motor_insulation_class||'-')}.`
    ],
    applications:['Commercial and industrial air extraction','Cabinet-fan duct installations']
  };
}

const rows=products.map(product=>{
  const curves=performanceCurves(product);
  const points=operatingPoints(product,curves);
  const primary=points.find(point=>point.control==='4_poles')||points.find(point=>point.control==='nominal')||points.at(-1)||{};
  const productImage=path.basename(String(product.image_path||''));
  const dimensionImage=path.basename(String(product.dimension_image_path||''));
  const categories=['Cabinet Fan','Centrifugal Fan','Duct Fan'];
  const verified=verifiedData.curves[String(product.code||'')];
  return {
    key:`VORTICE-QBK-SAL-KC-EVO|${String(product.code||'')}`,
    display:`${String(product.model||'')} (${number(product.max_airflow_m3h)} m³/h)`,
    model:String(product.model||''),
    brand:String(product.brand||'Vortice'),
    manufacturer:String(product.brand||'Vortice'),
    family:String(product.family||product.series||''),
    series:String(product.series||''),
    productCode:String(product.code||''),
    fanType:'Radyal',
    mountType:'Kabin / Kanal Tipi',
    productGroup:'Kabin Tipi Fan',
    fanTypeEn:'Centrifugal',
    mountTypeEn:'Cabinet / Duct-Mounted',
    productGroupEn:'Cabinet Fan',
    categories,
    tagsEn:categories,
    catalogNameEn:'VORT QBK SAL-KC EVO Cabinet Centrifugal Fans',
    nominal:number(product.max_airflow_m3h),
    maxPressure:number(primary.maxPressurePa),
    kw:number(primary.powerKw),
    rpm:0,
    amps:0,
    spl:0,
    voltage:voltage(product),
    frequency:`${number(product.frequency_hz)} Hz`,
    weight:number(product.weight_kg),
    ipClass:String(product.motor_protection||''),
    insulationClass:String(product.motor_insulation_class||''),
    phase:phaseLabel(product),
    poles:poles(product),
    nominalDuctMm:number(product.nominal_intake_diameter_mm),
    maxAmbientC:number(product.max_air_temperature_c),
    dimensions:product.dimensions_mm||{},
    motorType:String(product.motor_poles||''),
    image:`assets/products/qbk-sal-kc-evo/${productImage}`,
    dimensionImage:`assets/products/qbk-sal-kc-evo/${dimensionImage}`,
    sourcePage:number(verified.source_page),
    sourceCatalogue:String(product.source_catalogue||''),
    curveInterpolation:'linear',
    curveVerification:{
      status:verifiedData.status,
      sourceCatalogue:verifiedData.source_catalogue,
      sourceSha256:verifiedData.source_sha256,
      sourcePage:number(verified.source_page)
    },
    operatingPoints:points,
    curves,
    catalogueInfo:catalogueInfo(product,curves.map(curve=>curve.control))
  };
});

const codes=rows.map(row=>number(row.productCode)).sort((a,b)=>a-b);
const curveCount=rows.reduce((sum,row)=>sum+row.curves.length,0);
const pointCount=rows.reduce((sum,row)=>sum+row.curves.reduce((curveSum,curve)=>curveSum+curve.sourcePoints.length,0),0);
const imageFiles=[...new Set(rows.flatMap(row=>[path.basename(row.image),path.basename(row.dimensionImage)]))].sort();

if(rows.length!==21)throw new Error(`Expected 21 QBK products, found ${rows.length}.`);
if(codes.some((code,index)=>code!==43151+index))throw new Error('QBK codes 43151-43171 must be present exactly once.');
if(curveCount!==28)throw new Error(`Expected 28 QBK curves, found ${curveCount}.`);
if(pointCount!==number(verifiedData.summary?.points))throw new Error(`Expected ${number(verifiedData.summary?.points)} QBK points, found ${pointCount}.`);
if(new Set(rows.map(row=>row.key)).size!==rows.length)throw new Error('QBK product keys are not unique.');
if(rows.some(row=>row.curves.some(curve=>!curve.sourceMethod.includes('axis-calibrated')))){
  throw new Error('Every QBK curve must use its verified axis-calibrated catalogue vector.');
}
if(rows.filter(row=>row.curves.length===2).some(row=>row.curves.map(curve=>curve.control).join(',')!=='8_poles,4_poles')){
  throw new Error('Dual-polarity QBK controls must keep 8-pole then 4-pole ordering.');
}
for(const imageFile of imageFiles){
  if(!fs.existsSync(sourceImage(imageFile)))throw new Error(`Missing QBK image: ${imageFile}`);
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
  series:1,
  curves:curveCount,
  points:pointCount,
  images:imageFiles.length,
  data:path.relative(projectRoot,targetData)
},null,2));

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

// The AXW model is deliberately a small, audited runtime addition because the
// unified catalog and the agent snapshot are multi-megabyte historical files.
// Only one derived AXW model and the verified Vitlo AXF/BOX-AXF F300 model-code
// normalization may differ from the historical committed snapshot. Other product
// technical/commercial fields and accessories must remain unchanged.
const modelId = 'AXW|AXW 35-2T-0.37|4000|30';
const committedRaw=execFileSync('git',['show','HEAD:api/agent/catalog-v1.json'],{encoding:'utf8',maxBuffer:12*1024*1024});
const committed=JSON.parse(committedRaw);
const compiled=JSON.parse(fs.readFileSync('api/agent/catalog-v1.json','utf8'));
assert.equal(compiled.schemaVersion,committed.schemaVersion);
assert.deepEqual(compiled.accessories,committed.accessories);
assert.equal(compiled.models.length,committed.models.length+1,'Only one runtime model may be added');
const additions=compiled.models.filter(m=>m.productKey===modelId);
assert.equal(additions.length,1,'AXW 35-2T-0.37 must be added exactly once');
const f300Model=(m)=>m.manufacturer==='Vitlo'&&['AXF','BOX-AXF'].includes(m.series)&&m.technical?.fireRating==='F300';
const expectedExisting=committed.models.map(m=>f300Model(m)?{...m,model:m.model+' F300',display:m.display+' F300'}:m);
assert.equal(committed.models.filter(f300Model).length,96,'Exactly 96 historical Vitlo models must qualify');
assert.deepEqual(compiled.models.filter(m=>m.productKey!==modelId),expectedExisting,'Only the 96 verified Vitlo F300 model names may change');
assert.match(compiled.sourceHash,/^[0-9a-f]{64}$/);
assert.notEqual(compiled.sourceHash,committed.sourceHash,'Shared loader source hash must reflect the new model');

const newModel=additions[0];
const axd=committed.models.find(m=>m.productKey==='AXD|AXD 35-2T-0.37|4000|24');
const wall=committed.models.find(m=>m.productKey==='AXW|AXW 35-4T-0.27|2860|30');
assert.ok(axd&&wall,'Derived model source references must exist');
assert.equal(newModel.model,'AXW 35-2T-0.37');
assert.equal(newModel.series,'AXW');
assert.equal(newModel.manufacturer,'Vitlo');
assert.equal(newModel.quoteEligible,true);
assert.deepEqual(newModel.motor,axd.motor);
assert.deepEqual(newModel.selectionPoints,axd.selectionPoints);
assert.deepEqual(newModel.pricing,axd.pricing);
assert.equal(newModel.pricing.listPrice,550.4);
assert.equal(newModel.image,wall.image);
assert.deepEqual(newModel.categories,wall.categories);
assert.equal(newModel.technical.mountType,'Wall-Mounted');
assert.equal(newModel.technical.ipClass,'IP55');
assert.equal(newModel.technical.productGroup,'Axial Fan');
assert.equal(newModel.technical.fireRating,'');
assert.equal(newModel.technical.hazardousArea,null);
assert.equal(newModel.verification.status,'catalog-derived');
assert.equal(newModel.verification.caution,'');
assert.equal(newModel.technical.safetyWarning,'');
// The compiled snapshot stores a compact verification status; the live PHP
// enrichment retains the full manufacturer-pending and non-ATEX provenance.

// Confirm that the PHP fan-selection endpoint builds the same derived model
// from the original, unmodified committed snapshot.
execFileSync('php',['-l','api/agent/catalog-axw-35-2t-addition.php'],{encoding:'utf8'});
execFileSync('php',['-l','api/agent/domain.php'],{encoding:'utf8'});
const phpCode="require 'api/agent/catalog-axw-35-2t-addition.php'; $catalog=json_decode(stream_get_contents(STDIN),true,256,JSON_THROW_ON_ERROR); $full=agent_catalog_add_axw_35_2t($catalog); $model=$full['models'][count($full['models'])-1]; echo json_encode(['count'=>count($full['models']),'id'=>$model['id'],'price'=>$model['pricing']['listPrice'],'mount'=>$model['technical']['mountType'],'status'=>$model['verification']['status'],'caution'=>$model['verification']['caution'],'warning'=>$model['technical']['safetyWarning'],'pending'=>$model['verification']['derivation']['manufacturerConfirmation'],'notAtex'=>$model['verification']['derivation']['notAtex']],JSON_THROW_ON_ERROR);";
const phpData=JSON.parse(execFileSync('php',['-r',phpCode],{encoding:'utf8',input:committedRaw,maxBuffer:6*1024*1024}));
assert.deepEqual(phpData,{count:compiled.models.length,id:modelId,price:550.4,mount:'Wall-Mounted',status:'catalog-derived',caution:'',warning:'',pending:'pending',notAtex:true});
console.log('PASS: the only compiled change is AXW 35-2T-0.37; existing models/accessories and PHP agent parity verified.');

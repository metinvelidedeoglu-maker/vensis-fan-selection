import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/product-technical-details.js',import.meta.url),'utf8');
const catalog={
  series:[
    {id:'fan-series',title:'Axial Fan',categories:['Axial Fan']},
    {id:'light-series',title:'LED Lighting',categories:['Aydınlatma']}
  ],
  getSeries(id){return this.series.find(series=>series.id===id)||null}
};
const window={VensisCatalog:catalog};
vm.runInNewContext(source,{window,Intl});
const details=window.VensisTechnicalDetails;
const plain=value=>JSON.parse(JSON.stringify(value));

const fan=details.forItem({
  mode:'selection',
  selected:{q:11751,p:245},
  voltage:'400 V',
  frequency:'50 Hz',
  motorPower:3,
  speed:1450,
  current:6.2,
  noise:79
},null,catalog);
assert.equal(fan.type,'fan');
assert.deepEqual(plain(fan.details.slice(0,4)),[
  {label:'Selected Point',value:'11.751 m³/h @ 245 Pa'},
  {label:'Supply',value:'400 V – 50 Hz'},
  {label:'Motor Power',value:'3,00 kW'},
  {label:'Speed',value:'1.450 rpm'}
]);

const lighting=details.forItem({
  mode:'custom',
  productType:'lighting',
  lightingPower:'36',
  luminousFlux:'5200',
  colorTemperature:'4000',
  cri:'80',
  beamAngle:'120',
  voltage:'230 V',
  ipClass:'IP66',
  technicalDetails:'Body Material: Aluminium\nOperating Temperature: -20 / +50 °C'
},null,catalog);
assert.equal(lighting.type,'lighting');
assert.deepEqual(plain(lighting.details),[
  {label:'Power',value:'36 W'},
  {label:'Luminous Flux',value:'5.200 lm'},
  {label:'Colour Temperature',value:'4.000 K'},
  {label:'CRI',value:'80'},
  {label:'Beam Angle',value:'120 °'},
  {label:'Supply',value:'230 V'},
  {label:'IP Class',value:'IP66'},
  {label:'Body Material',value:'Aluminium'},
  {label:'Operating Temperature',value:'-20 / +50 °C'}
]);

const catalogLighting=details.forItem(
  {mode:'catalog'},
  {seriesId:'light-series',lighting:{power:'24 W',lumens:'3100 lm',cct:'3000 K'}},
  catalog
);
assert.equal(catalogLighting.type,'lighting');
assert.equal(catalogLighting.details[1].value,'3100 lm');

const legacyCatalogFan=details.forItem(
  {mode:'catalog',nominalAirflow:7860,motorPower:.55},
  {seriesId:'fan-series'},
  catalog
);
assert.equal(legacyCatalogFan.type,'fan');
assert.equal(legacyCatalogFan.details[0].value,'7.860 m³/h');

const generic=details.forItem({
  mode:'custom',
  productType:'other',
  technicalDetails:'Material: Stainless Steel\nDimensions = 500 x 400 mm'
},null,catalog);
assert.deepEqual(plain(generic.details),[
  {label:'Material',value:'Stainless Steel'},
  {label:'Dimensions',value:'500 x 400 mm'}
]);

console.log('product technical details: ok');

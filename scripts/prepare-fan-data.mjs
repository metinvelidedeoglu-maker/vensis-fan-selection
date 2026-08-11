import fs from 'node:fs';
import path from 'node:path';

const dataDirectory=path.resolve('data');

function cleanPoints(points){
  const values=new Map();
  for(const point of points||[]){
    const pressure=Number(point?.[0]);
    const airflow=Number(point?.[1]);
    if(Number.isFinite(pressure)&&Number.isFinite(airflow))values.set(pressure,airflow);
  }
  return [...values.entries()].sort((a,b)=>a[0]-b[0]);
}

function parseModels(text,file){
  const match=text.match(/^\s*window\.models\.push\(\.\.\.(\[.*\])\);?\s*$/s);
  if(!match)throw new Error(`Unsupported data format: ${file}`);
  return JSON.parse(match[1]);
}

const files=fs.readdirSync(dataDirectory)
  .filter(name=>/^fans-\d+\.js$/.test(name))
  .sort();

let modelCount=0;
let sourcePointCount=0;
for(const file of files){
  const fullPath=path.join(dataDirectory,file);
  const models=parseModels(fs.readFileSync(fullPath,'utf8'),file);
  for(const model of models){
    const source=cleanPoints(model.sourcePoints||model.points);
    model.sourcePoints=source;
    delete model.points;
    sourcePointCount+=source.length;
    modelCount++;
  }
  fs.writeFileSync(fullPath,`window.models.push(...${JSON.stringify(models)});\n`);
  console.log(`${file}: ${models.length} models compacted`);
}

console.log(`Done: ${modelCount} models, ${sourcePointCount} verified catalogue points; interpolation remains runtime-only.`);

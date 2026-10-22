import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/products/vortice/catalogue-details.json'),'utf8'));
const varioSpeeds=new Map(JSON.parse(fs.readFileSync(path.join(root,'assets/products/vortice/vario-maximum-rpm.json'),'utf8')).models.map(m=>[m.productCode,m.displayRpm]));
const base=process.env.VENSIS_TEST_URL||'http://vensis.test';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
if(!process.env.VENSIS_TEST_URL)await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='vensis.test')return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Not found'});
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({status:200,body:fs.readFileSync(file),contentType:mime});
});
await context.addInitScript(()=>{
  if(location.origin==='null')return;
  localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','tr');
});
const page=await context.newPage(),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
page.on('pageerror',e=>errors.push(e.message));
const out='test-results/vortice-catalogue-details';fs.mkdirSync(out,{recursive:true});
const sampleCodes=new Set(['14615','12415','12416','17145','17160','16107','15301','15276','15311']);
const n=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function temperature(t){
  if(t.operatingTemperatureByFrequencyC)return '≤ 50 °C (50 Hz) / ≤ 40 °C (60 Hz)';
  return t.operatingTemperatureMinC===null?`≤ ${t.operatingTemperatureMaxC} °C`:`${t.operatingTemperatureMinC} – ${t.operatingTemperatureMaxC} °C`;
}
try{
  for(const row of evidence.models){
    const code=row.productCode,t=row.technical,temp=temperature(t);
    await page.goto(base+'/catalog.html?brand=vortice&series='+encodeURIComponent(row.seriesId)+'&model='+encodeURIComponent(row.id));
    const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();
    await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
    assert.equal(await card.locator('.model-field').count(),12,code);
    for(const [label,value] of [['IP Sınıfı',t.ipClass],['Çalışma Sıcaklığı',temp],['Ağırlık',n(t.weight)+' kg']]){
      assert.equal(await card.locator('.model-field').filter({hasText:label}).locator('b').innerText(),value,code+' '+label);
    }
    assert.equal(await card.locator('.model-field').filter({hasText:'Yangın Dayanımı'}).count(),0,code);
    if(varioSpeeds.has(code))assert.equal(await card.locator('.model-field').filter({hasText:/^Devir/}).locator('b').innerText(),varioSpeeds.get(code).toLocaleString('en-US')+' rpm',code+' highest RPM');
    if(row.seriesId==='HEATMASTER F400')assert.equal(await card.locator('.model-feature-tag').filter({hasText:/^F400$/}).count(),1,code);
    for(const width of [390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),code+' mobile overflow');
    }
    if(sampleCodes.has(code))await card.screenshot({path:out+'/'+code+'-card.png'});
    await page.getByRole('button',{name:'English',exact:true}).click();
    if(varioSpeeds.has(code))assert.equal(await card.locator('.model-field').filter({hasText:/^Speed/}).locator('b').innerText(),varioSpeeds.get(code).toLocaleString('en-US')+' rpm',code+' EN highest RPM');
    assert.equal(await card.locator('.model-field').filter({hasText:'Operating Temperature'}).locator('b').innerText(),temp,code+' EN temperature');
    await page.getByRole('button',{name:'Türkçe',exact:true}).click();
    await page.setViewportSize({width:1440,height:1000});
    const html=await page.evaluate(id=>window.VensisDirectPreview.html({mode:'catalog',product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),row.id);
    const preview=await context.newPage();await preview.setContent(html,{waitUntil:'networkidle'});
    await preview.waitForFunction(()=>[...document.images].every(img=>img.complete));
    assert.deepEqual(await preview.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).map(img=>img.src)),[],code+' missing images');
    for(const [label,value] of [['IP Sınıfı',t.ipClass],['Çalışma Sıcaklığı',temp],['Ağırlık',Number(t.weight).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg']]){
      assert.equal(await preview.locator('.technical-cell').filter({hasText:label}).locator('b').innerText(),value,code+' preview '+label);
    }
    assert.equal(await preview.locator('.technical-cell').filter({hasText:'Yangın Dayanımı'}).count(),0,code);
    if(varioSpeeds.has(code))assert.equal(await preview.locator('.technical-cell').filter({hasText:/^Devir/}).locator('b').innerText(),varioSpeeds.get(code).toLocaleString('tr-TR')+' rpm',code+' preview highest RPM');
    if(code==='15311')assert.equal(await preview.locator('.technical-cell').filter({hasText:'Faz'}).count(),0,code+' unknown phase stays hidden');
    const clipped=await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent));
    assert.deepEqual(clipped,[],code+' clipped values');
    assert.ok(await preview.locator('.catalog-drawing-image').count(),code+' source drawing');
    if(!row.seriesId.startsWith('VORTICE VARIO'))assert.ok(await preview.locator('.dimension-table').count(),code+' existing measurement table');
    assert.ok(await preview.getByRole('img',{name:'Fan performans eğrisi',exact:true}).count(),code+' curve');
    assert.ok(await preview.locator('.curve svg path').first().getAttribute('d'),code+' curve path');
    await preview.pdf({path:out+'/'+code+'.pdf',format:'A4',printBackground:true});
    if(sampleCodes.has(code))await preview.screenshot({path:out+'/'+code+'-preview.png',fullPage:true});
    await preview.close();
    console.log('PASS '+code+' '+row.catalogueModel);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: all 46 VORTICE models, 12 fields, source limits, TR/EN, 390/430px, curves, dimensions and PDFs.');
}finally{await browser.close();}

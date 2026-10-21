import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/products/vitlo/catalogue-ip-temperature.json'),'utf8'));
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
  if(location.origin==='null')return; // Blank print documents have no storage origin.
  localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','tr');
});
const page=await context.newPage(),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
page.on('pageerror',e=>errors.push(e.message));
const out='test-results/vitlo-operating-conditions';fs.mkdirSync(out,{recursive:true});
try{
  for(const [series,condition] of Object.entries(evidence.series)){
    const row=evidence.models.find(m=>m.seriesId===series&&(series!=='AXB'||m.catalogueModel==='AXB 63-4T-1,5'));
    assert.ok(row,series);
    await page.goto(base+'/catalog.html?brand=vitlo&series='+encodeURIComponent(series)+'&model='+encodeURIComponent(row.id));
    const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();
    await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
    assert.equal(await card.locator('.model-field').count(),13,series);
    assert.equal(await card.locator('.model-field').filter({hasText:'IP Sınıfı'}).locator('b').innerText(),condition.ipClass,series);
    const temperature=condition.operatingTemperatureMinC===null?'≤ 50 °C':`-20 – ${condition.operatingTemperatureMaxC} °C`;
    assert.equal(await card.locator('.model-field').filter({hasText:'Çalışma Sıcaklığı'}).locator('b').innerText(),temperature,series);
    assert.equal(await card.locator('.model-field').filter({hasText:'Ağırlık'}).locator('b').innerText(),'-',series+' unprovided weight');
    for(const width of [390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),series+' mobile overflow');
    }
    if(['AXB','AXF','AXW/ATEX','CD','CR-EC'].includes(series))await page.screenshot({path:out+'/'+series.replaceAll('/','-')+'-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    const html=await page.evaluate(id=>window.VensisDirectPreview.html({mode:'catalog',product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),row.id);
    const preview=await context.newPage();await preview.setContent(html,{waitUntil:'networkidle'});
    await preview.waitForFunction(()=>[...document.images].every(img=>img.complete));
    assert.deepEqual(await preview.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).map(img=>img.src)),[],series+' missing images');
    assert.equal(await preview.locator('.technical-cell').filter({hasText:'IP Sınıfı'}).locator('b').innerText(),condition.ipClass,series);
    assert.equal(await preview.locator('.technical-cell').filter({hasText:'Çalışma Sıcaklığı'}).locator('b').innerText(),temperature,series);
    assert.equal(await preview.locator('.technical-cell').filter({hasText:'Ağırlık'}).count(),0,series+' missing weight must be hidden');
    const clipped=await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent));
    assert.deepEqual(clipped,[],series+' clipped values');
    assert.ok(await preview.locator('.dimension-table').count(),series+' measurement table');
    if(await preview.getByRole('img',{name:'Fan performans eğrisi',exact:true}).count())assert.ok(await preview.locator('.curve svg path').first().getAttribute('d'),series+' source curve');
    await preview.pdf({path:out+'/'+series.replaceAll('/','-')+'.pdf',format:'A4',printBackground:true});
    if(['AXB','AXF','AXW/ATEX','CD','CR-EC'].includes(series))await preview.screenshot({path:out+'/'+series.replaceAll('/','-')+'-preview.png',fullPage:true});
    await preview.close();
  }
  const excluded=evidence.excluded.find(m=>m.model==='CRK/ATEX 31-4T');
  await page.goto(base+'/catalog.html?brand=vitlo&series='+encodeURIComponent(excluded.seriesId)+'&model='+encodeURIComponent(excluded.id));
  const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();
  for(const name of ['IP Sınıfı','Çalışma Sıcaklığı'])assert.equal(await card.locator('.model-field').filter({hasText:name}).locator('b').innerText(),'-');
  assert.equal(await card.locator('.model-field').count(),13);
  assert.deepEqual(errors,[]);
  console.log('PASS: 35 Vitlo series, source IP/normal temperatures, 13 fields, retained unknowns, 390/430px, drawings, source curves and PDFs.');
}finally{await browser.close();}

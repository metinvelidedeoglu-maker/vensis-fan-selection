import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raw={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/ventilation-catalog.js'),'utf8'),raw);
const groups=new Map();
for(const m of raw.window.VensisVentilationData.models.filter(m=>m.verification?.userConfirmedSupply)){
  // Include a timer variant when a family has one: T must not become three-phase.
  if(!groups.has(m.seriesId)||m.technical.timerVariant)groups.set(m.seriesId,m);
}
assert.equal(groups.size,23);
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
page.on('pageerror',e=>errors.push(e.message));
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const out='test-results/confirmed-single-phase';fs.mkdirSync(out,{recursive:true});
try{
  for(const [series,m] of groups){
    await page.goto(base+'/catalog.html?series='+encodeURIComponent(series)+'&model='+encodeURIComponent(m.id));
    const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();
    await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
    assert.equal(await card.locator('.model-field').count(),12,series);
    assert.equal(await card.locator('.model-field').filter({hasText:/^Faz/}).locator('b').innerText(),'Single-phase',series);
    for(const width of [390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),series+' mobile overflow');
    }
    if(['PUNTO','SILENT','HCM-N'].includes(series))await card.screenshot({path:out+'/'+series+'-card.png'});
    await page.getByRole('button',{name:'English',exact:true}).click();
    assert.equal(await card.locator('.model-field').filter({hasText:/^Phase/}).locator('b').innerText(),'Single-phase',series+' EN');
    await page.getByRole('button',{name:'Türkçe',exact:true}).click();
    await page.setViewportSize({width:1440,height:1000});
    const html=await page.evaluate(id=>window.VensisDirectPreview.html({mode:'catalog',product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),m.id);
    const preview=await context.newPage();await preview.setContent(html,{waitUntil:'networkidle'});
    await preview.waitForFunction(()=>[...document.images].every(img=>img.complete));
    assert.equal(await preview.locator('.technical-cell').filter({hasText:/^Faz/}).locator('b').innerText(),'Single-phase',series+' preview');
    assert.deepEqual(await preview.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).map(img=>img.src)),[],series+' broken image');
    assert.deepEqual(await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],series+' clipped values');
    await preview.pdf({path:out+'/'+series.replaceAll('/','-')+'.pdf',format:'A4',printBackground:true});
    if(['PUNTO','SILENT','HCM-N'].includes(series))await preview.screenshot({path:out+'/'+series+'-preview.png',fullPage:true});
    await preview.close();
    console.log('PASS '+series+' '+m.model);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: 23 confirmed single-phase families, 12-field cards, TR/EN, 390/430px, previews and PDFs.');
}finally{await browser.close();}

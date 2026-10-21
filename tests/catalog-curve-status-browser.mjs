import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.VENSIS_TEST_URL||'http://vensis.test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
if(!process.env.VENSIS_TEST_URL)await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='vensis.test')return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname).replace(/^\/(?:tr|en)\//,'/'));
  if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Not found'});
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({status:200,body:fs.readFileSync(file),contentType:mime});
});
await context.addInitScript(()=>{localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','tr')});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const out='test-results/catalog-curve-status';fs.mkdirSync(out,{recursive:true});
try{
  await page.goto(base+'/catalog.html');
  await page.waitForFunction(()=>Boolean(window.VensisCatalog));
  const affected=await page.evaluate(()=>{
    const C=window.VensisCatalog;
    return C.series.filter(s=>C.modelsForSeries(s.id).some(m=>{
      const p=m.performance||{};return !p.points?.length&&!p.sourcePoints?.length&&!p.curves?.some(c=>c.sourcePoints?.length);
    })).map(s=>({id:s.id,count:C.modelsForSeries(s.id).length}));
  });
  assert.equal(affected.length,9);
  let total=0;
  for(const series of affected){
    await page.goto(base+'/catalog.html?series='+encodeURIComponent(series.id));
    await page.waitForSelector('.model-card .vensis-preview-classic');
    const badges=page.locator('[data-selection-status="missing-curve"]');
    assert.equal(await badges.count(),series.count,series.id);
    assert.equal(await page.locator('[data-selection-status="ready"]').count(),0,series.id);
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-selection-status="missing-curve"]')].every(n=>n.textContent==='Eğri verisi eksik · fan seçimine uygun değil'));
    assert.equal(await page.locator('.model-field').count(),series.count*12,series.id);
    for(const width of [390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile overflow '+series.id);
      const clipped=await badges.evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+1));
      assert.equal(clipped,false,series.id+' clipped status');
    }
    if(series.id==='AXJ')await page.screenshot({path:out+'/axj-mobile-tr.png',fullPage:true});
    await page.getByRole('button',{name:'English',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-selection-status="missing-curve"]')].every(n=>n.textContent==='Curve data missing · unavailable for fan selection'));
    await page.getByRole('button',{name:'Türkçe',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-selection-status="missing-curve"]')].every(n=>n.textContent==='Eğri verisi eksik · fan seçimine uygun değil'));
    total+=series.count;
    await page.setViewportSize({width:1440,height:1000});
  }
  assert.equal(total,57);
  for(const series of ['AXF','HCTB / HCTT','ILB / ILT']){
    await page.goto(base+'/catalog.html?series='+encodeURIComponent(series));
    await page.waitForSelector('.model-card .vensis-preview-classic');
    assert.equal(await page.locator('[data-selection-status="missing-curve"]').count(),0,series);
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-selection-status="ready"]')].every(n=>n.textContent==='Eğri mevcut · seçime hazır'));
    assert.ok(await page.locator('[data-selection-status="ready"]').count()>0,series);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: all 57 missing-curve badges across 9 series, TR/EN switching, 12 fields, mobile and ready-series regression.');
}finally{await browser.close();}

// Integration check against a real browser. Run with a PHP server and Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const base=process.env.VENSIS_TEST_URL||'http://127.0.0.1:8123';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','en');});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
fs.mkdirSync('test-results/ventilation',{recursive:true});
try{
  await page.goto(base+'/catalog.html');
  await page.waitForFunction(()=>window.VensisCatalog?.models.length===1022);
  assert.equal(await page.locator('.series-card').count(),89);
  const brands=await page.evaluate(()=>window.VensisCatalog.brands);
  for(const brand of brands){
    await page.goto(base+'/catalog.html?brand='+brand.slug);
    await page.waitForSelector('.series-card');
    const count=await page.evaluate(()=>window.VensisCatalog.series.filter(s=>s.manufacturer===window.VensisCatalog.brand(new URLSearchParams(location.search).get('brand')).name).length);
    assert.equal(await page.locator('.series-card').count(),count,brand.name);
    const sample=await page.evaluate(name=>{
      const C=window.VensisCatalog,s=C.series.find(s=>s.manufacturer===name&&C.modelsForSeries(s.id).some(m=>m.dimensions)),m=C.modelsForSeries(s.id).find(m=>m.dimensions);
      return {series:s.id,id:m.id,name:m.model};
    },brand.name);
    await page.goto(base+'/catalog.html?brand='+brand.slug+'&series='+encodeURIComponent(sample.series)+'&model='+encodeURIComponent(sample.id));
    await page.waitForSelector('.model-card:not([hidden]) .vensis-preview-classic');
    assert.equal(await page.locator('.model-card:not([hidden])').count(),1);
    const popupPromise=context.waitForEvent('page');
    await page.locator('.model-card:not([hidden]) .vensis-preview-classic').click();
    const popup=await popupPromise;popup.on('pageerror',error=>errors.push(error.message));
    await popup.waitForSelector('.dimension-table');
    assert.ok((await popup.locator('body').innerText()).includes(sample.name));
    await popup.screenshot({path:'test-results/ventilation/'+brand.slug+'-preview.png',fullPage:true});
    await popup.pdf({path:'test-results/ventilation/'+brand.slug+'-preview.pdf',format:'A4',printBackground:true});
    await popup.setViewportSize({width:390,height:844});
    assert.ok(await popup.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'mobile overflow: '+brand.name);
    await popup.close();
  }
  await page.goto(base+'/catalog.html?brand=vortice');
  await page.locator('#catalogManufacturers input[value="Vitlo"]').check();
  await page.reload();
  assert.equal(await page.locator('#catalogManufacturers input:checked').count(),2);
  assert.equal(await page.locator('.series-card').count(),59);
  await page.goto(base+'/catalog-vortice.html?series=CA%20MD%20EXTRA%20EU&project=regression-project');
  await page.waitForSelector('.model-card');
  assert.equal(new URL(page.url()).searchParams.get('project'),'regression-project');
  await page.goto(base+'/projects.html');
  await page.waitForFunction(()=>Boolean(window.VensisProjects?.create));
  const projectId=await page.evaluate(()=>window.VensisProjects.create({name:'Ventilation integration fixture'}).id);
  for(const file of ['fan-selection.html','project.html','quotation.html','project-print.html']){
    console.log('Checking consumer:',file);
    await page.goto(base+'/'+file+'?project='+encodeURIComponent(projectId));
    await page.waitForFunction(()=>window.VensisCatalog?.models.length===1022).catch(error=>{throw new Error(file+': '+error.message)});
    assert.equal(await page.evaluate(()=>Boolean(window.VensisDimensions?.resolve)),true,file);
  }
  await page.goto(base+'/catalog.html');
  const expected=await page.evaluate(()=>{const C=window.VensisCatalog,R=window.VensisVentilationRoutes;return C.models.map(m=>R.url(C.getSeries(m.seriesId),m).replace(location.origin,'https://select.vensis.com.tr'));});
  const xml=await (await context.request.get(base+'/sitemap-fans.php')).text();
  for(const url of expected)assert.ok(xml.includes('<loc>'+url+'</loc>'),url);
  assert.deepEqual(errors,[]);
  console.log('PASS: all brands, legacy navigation, filters, preview/PDF/mobile, consumers and 1,022 sitemap model routes.');
}finally{await browser.close();}

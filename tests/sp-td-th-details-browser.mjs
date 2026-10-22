import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/products/soler-palau/td-th-catalogue-details.json'),'utf8'));
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
await context.addInitScript(()=>{if(location.origin==='null')return;localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','tr');});
const page=await context.newPage(),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
const out='test-results/sp-td-th-details';fs.mkdirSync(out,{recursive:true});
try{
  for(const row of evidence.models){
    await page.goto(base+'/catalog.html?series='+encodeURIComponent(row.seriesId)+'&model='+encodeURIComponent(row.id));
    const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();
    await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
    for(const lang of ['tr','en']){
      await page.getByRole('button',{name:lang==='tr'?'Türkçe':'English',exact:true}).click();
      assert.equal(await card.locator('.model-field').count(),12,row.model);
      assert.equal(await card.locator('.model-field-missing').count(),0,row.model);
      const expected=await page.evaluate(({id,lang})=>window.VensisCatalogFeatureTags(window.VensisCatalog.getModel(id),lang),{id:row.id,lang});
      assert.deepEqual(await card.locator('.model-feature-tag').allTextContents(),expected,row.model+' tags');
      assert.equal(expected.includes('ATEX'),row.seriesId!=='TH-MIXVENT');
      const sound=card.locator('.model-field').filter({hasText:/^(?:Ses|Sound)/});
      const note=await page.evaluate(({id,lang})=>window.VensisVentilationDisplay.measurementNote(window.VensisCatalog.getModel(id).technical,'sound',lang),{id:row.id,lang});
      assert.ok((await sound.innerText()).includes(note),row.model+' card acoustic context');
      for(const width of [390,430]){
        await page.setViewportSize({width,height:844});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),row.model+' mobile overflow');
        assert.deepEqual(await card.locator('.model-field b,.model-feature-tag').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],row.model+' card clipped values');
      }
      await page.setViewportSize({width:1440,height:1000});
      const html=await page.evaluate(({id,lang})=>window.VensisDirectPreview.html({mode:'catalog',outputLanguage:lang,product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),{id:row.id,lang});
      const preview=await context.newPage();await preview.setContent(html,{waitUntil:'load'});
      await preview.waitForFunction(()=>[...document.images].every(img=>img.complete));
      assert.deepEqual(await preview.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).map(img=>img.alt)),[],row.model+' images');
      assert.deepEqual(await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],row.model+' preview clipped values');
      assert.deepEqual(await preview.locator('.feature-tag').allTextContents(),expected,row.model+' preview tags');
      assert.ok((await preview.locator('.technical-grid').innerText()).includes(note),row.model+' preview acoustic context');
      assert.ok((await preview.locator('.feature-card').innerText()).includes(evidence.series[row.seriesId].applications[lang][0]),row.model+' complete translated application');
      if(row.seriesId!=='TH-MIXVENT')assert.ok((await preview.locator('.feature-warning').innerText()).includes(row.technical.atex.gas_marking),row.model+' literal ATEX marking');
      assert.ok(await preview.locator('.catalog-drawing-image').count(),row.model+' drawing');
      assert.ok(await preview.locator('svg').count(),row.model+' performance curve');
      await preview.pdf({path:out+'/'+row.model.replaceAll('/','-')+'-'+lang+'.pdf',format:'A4',printBackground:true});
      if(['TD-800/200 EX','TH-1200/315 EX','TH-2000'].includes(row.model)&&lang==='tr')await preview.screenshot({path:out+'/'+row.model.replaceAll('/','-')+'.png',fullPage:true});
      await preview.close();
    }
    console.log('PASS '+row.model);
  }
  assert.deepEqual(errors,[]);console.log('PASS: 10 TD/TH models, 12 filled fields, model-specific safety, mobile and 20 bilingual PDFs.');
}finally{await browser.close();}

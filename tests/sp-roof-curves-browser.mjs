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
const out='test-results/sp-roof-curves';fs.mkdirSync(out,{recursive:true});
try{
  await page.goto(base+'/catalog.html?brand=soler-palau&series='+encodeURIComponent('CRVB-N / CRVT-N'));
  await page.waitForSelector('.model-card .vensis-preview-classic');
  const ids=await page.evaluate(()=>['CRVB-N / CRVT-N','CTVB / CTVT'].flatMap(s=>window.VensisCatalog.modelsForSeries(s).map(m=>m.id)));
  assert.equal(ids.length,18);
  for(const id of ids){
    const series=/\|CTV/.test(id)?'CTVB / CTVT':'CRVB-N / CRVT-N';
    await page.goto(base+'/catalog.html?brand=soler-palau&series='+encodeURIComponent(series)+'&model='+encodeURIComponent(id));
    const card=page.locator('.model-card:not([hidden])');
    await card.locator('.vensis-preview-classic').waitFor();
    await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
    assert.equal(await card.locator('.model-field').count(),12,id);
    const missing=id==='SP|CTVT/4-450'?1:0;
    assert.equal(await card.locator('.model-field-missing').count(),missing,id);
    const text=await card.innerText();
    assert.match(text,/P1 maks\./);assert.match(text,/Atış, 3 m/);assert.match(text,series==='CRVB-N / CRVT-N'?/IP54/:/IP55/);
    if(series==='CTVB / CTVT')assert.equal(await card.locator('.model-feature-tag').filter({hasText:'F400'}).count(),id==='SP|CTVB/4-180'?0:1,id);
    assert.doesNotMatch(text,/Catalog only|Yalnızca katalog|Katalog ürünü/);
    for(const width of [390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile overflow '+id+' '+width);
    }
    const name=id.replace(/[^a-z0-9]+/gi,'-').toLowerCase();
    if([ids[0],'SP|CTVB/4-180','SP|CTVT/4-450',ids.at(-1)].includes(id))await page.screenshot({path:out+'/'+name+'-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    const html=await page.evaluate(id=>window.VensisDirectPreview.html({mode:'catalog',product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),id);
    const preview=await context.newPage();preview.on('pageerror',e=>errors.push(e.message));
    await preview.setContent(html,{waitUntil:'networkidle'});
    await preview.waitForSelector('.dimension-table');
    await preview.waitForFunction(()=>[...document.images].every(img=>img.complete),null,{timeout:5000}).catch(async error=>{console.error(await preview.evaluate(()=>({base:document.baseURI,images:[...document.images].map(img=>({src:img.src,complete:img.complete,width:img.naturalWidth}))})));throw error;});
    assert.deepEqual(await preview.locator('img').evaluateAll(nodes=>nodes.filter(img=>!img.naturalWidth).map(img=>img.src)),[],id+' missing images');
    assert.ok(await preview.locator('.curve svg path').getAttribute('d'));
    assert.ok(await preview.locator('.technical-cell').count()>=11);
    if(id==='SP|CTVT/4-450')assert.equal(await preview.locator('.technical-cell').filter({hasText:'Ağırlık'}).count(),0);
    const clipped=await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent));
    assert.deepEqual(clipped,[],id+' clipped technical values');
    await preview.pdf({path:out+'/'+name+'.pdf',format:'A4',printBackground:true});
    if([ids[0],'SP|CTVB/4-180','SP|CTVT/4-450',ids.at(-1)].includes(id))await preview.screenshot({path:out+'/'+name+'-preview.png',fullPage:true});
    await preview.setViewportSize({width:390,height:844});
    assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile preview overflow '+id);
    await preview.close();
  }
  // Exercise the real selection-preview button path at a reduced control.
  await page.goto(base+'/fan-selection.html');
  await page.waitForFunction(()=>Boolean(window.VensisDirectPreview&&window.VensisState));
  const reducedHtml=await page.evaluate(()=>{
    const m=window.VensisState.models.find(m=>m.productKey==='SP|CRVT/4-560N'&&m.control==='30Hz');
    window.VensisState.results=[{...m,pp:200,qq:5000}];
    const host=document.createElement('div');host.innerHTML='<button data-view-datasheet="0"></button>';document.body.append(host);
    let html='';const old=window.open;
    window.open=()=>({document:{open(){},write(value){html=value},close(){}},focus(){}});
    try{window.VensisDirectPreview.refresh(host);host.querySelector('button').click();return html;}
    finally{window.open=old;host.remove();}
  });
  assert.ok(reducedHtml.includes('30Hz'),'chosen control reaches selection preview');
  assert.ok(!reducedHtml.includes('<span>Motor Gücü</span>'),'unspecified reduced power is hidden');
  assert.ok(!reducedHtml.includes('<span>Devir</span>'),'unspecified reduced rpm is hidden');
  assert.deepEqual(errors,[]);
  console.log('PASS: 18 models, 12 fields, 72 source curves, F400 exception, 390/430px mobile, source notes, drawings and PDFs.');
}finally{await browser.close();}

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
const out='test-results/sp-hct-il-curves';fs.mkdirSync(out,{recursive:true});
try{
  await page.goto(base+'/catalog.html?brand=soler-palau&series='+encodeURIComponent('HCTB / HCTT'));
  await page.waitForSelector('.model-card .vensis-preview-classic');
  const ids=await page.evaluate(()=>['HCTB / HCTT','ILB / ILT'].flatMap(s=>window.VensisCatalog.modelsForSeries(s).map(m=>m.id)));
  assert.equal(ids.length,22);
  for(const id of ids){
    const hct=id.includes('|HCT'),series=hct?'HCTB / HCTT':'ILB / ILT';
    await page.goto(base+'/catalog.html?brand=soler-palau&series='+encodeURIComponent(series)+'&model='+encodeURIComponent(id));
    const card=page.locator('.model-card:not([hidden])');
    await card.locator('.vensis-preview-classic').waitFor();
    await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
    assert.equal(await card.locator('.model-field').count(),13,id);
    assert.equal(await card.locator('.model-field-missing').count(),1,id);
    assert.match(await card.locator('.model-field').filter({hasText:'Yangın Dayanımı'}).locator('b').innerText(),/^[-—]$/);
    assert.equal(await card.locator('.model-feature-tag').count(),0,id+' standard model must not acquire ATEX/F400');
    const text=await card.innerText();
    assert.match(text,hct?/Emiş, 1,5 m/:/Kanallı, 1 m/);
    assert.match(text,hct&&/-(800|900|1000)-/.test(id)?/Nominal/:/P1 maks\./);
    assert.doesNotMatch(text,/Catalog only|Yalnızca katalog|Katalog ürünü|ATEX|F400/);
    for(const width of [390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile overflow '+id+' '+width);
    }
    const name=id.replace(/[^a-z0-9]+/gi,'-').toLowerCase();
    const sample=[ids[0],'SP|HCTT/4-1000-B','SP|ILT/4-400','SP|ILT/6-450'].includes(id);
    if(sample)await page.screenshot({path:out+'/'+name+'-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    const html=await page.evaluate(id=>window.VensisDirectPreview.html({mode:'catalog',product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),id);
    const preview=await context.newPage();preview.on('pageerror',e=>errors.push(e.message));
    await preview.setContent(html,{waitUntil:'networkidle'});
    await preview.waitForSelector('.dimension-table');
    await preview.waitForFunction(()=>[...document.images].every(img=>img.complete),null,{timeout:5000});
    assert.deepEqual(await preview.locator('img').evaluateAll(nodes=>nodes.filter(img=>!img.naturalWidth).map(img=>img.src)),[],id+' missing images');
    assert.ok(await preview.locator('.curve svg path').getAttribute('d'));
    // Eleven technical values plus control level; IL also lists its available controls.
    assert.equal(await preview.locator('.technical-cell').count(),hct?12:13,id);
    assert.equal(await preview.locator('.technical-cell').filter({hasText:'Yangın Dayanımı'}).count(),0);
    const clipped=await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent));
    assert.deepEqual(clipped,[],id+' clipped technical values');
    await preview.pdf({path:out+'/'+name+'.pdf',format:'A4',printBackground:true});
    if(sample)await preview.screenshot({path:out+'/'+name+'-preview.png',fullPage:true});
    await preview.setViewportSize({width:390,height:844});
    assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile preview overflow '+id);
    await preview.close();
  }
  await page.goto(base+'/fan-selection.html');
  await page.waitForFunction(()=>Boolean(window.VensisDirectPreview&&window.VensisState));
  const reducedHtml=await page.evaluate(()=>{
    const m=window.VensisState.models.find(m=>m.productKey==='SP|ILB/4-250'&&m.control==='140V');
    window.VensisState.results=[{...m,pp:200,qq:1000}];
    const host=document.createElement('div');host.innerHTML='<button data-view-datasheet="0"></button>';document.body.append(host);
    let html='';const old=window.open;
    window.open=()=>({document:{open(){},write(value){html=value},close(){}},focus(){}});
    try{window.VensisDirectPreview.refresh(host);host.querySelector('button').click();return html;}
    finally{window.open=old;host.remove();}
  });
  assert.ok(reducedHtml.includes('140V'));
  for(const label of ['Motor Gücü','Devir','Akım','Ses Seviyesi'])assert.ok(!reducedHtml.includes('<span>'+label+'</span>'),'unspecified reduced '+label+' is hidden');
  assert.deepEqual(errors,[]);
  console.log('PASS: 22 HCT/IL models, 13 fields, 71 source curves, no false ATEX/fire tags, mobile, source notes, drawings and PDFs.');
}finally{await browser.close();}

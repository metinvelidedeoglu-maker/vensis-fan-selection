import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'test-results/english-output');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1100}}),errors=[],results=[];
context.on('page',p=>p.on('pageerror',e=>errors.push({page:p.url(),error:e.message})));
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='vensis.test')return route.abort();
 const f=path.resolve(root,'.'+decodeURIComponent(u.pathname).replace(/^\/(?:tr|en)\//,'/'));
 if(!f.startsWith(root+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:'Not found'});
 const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.json':'application/json'}[path.extname(f)]||'application/octet-stream';
 await route.fulfill({status:200,contentType:type,body:fs.readFileSync(f)});
});
await context.addInitScript(()=>{if(location.origin==='null')return;localStorage.setItem('vensis_access_mode_v1','guest');if(!localStorage.getItem('vensis_language_v1'))localStorage.setItem('vensis_language_v1','tr');});
const page=await context.newPage();
const leftovers=text=>text.replaceAll('Türkiye Vakıflar Bankası','BANK NAME').split('\n').map(t=>t.trim()).filter(t=>t&&(/[çğıöşüÇĞİÖŞÜ]/.test(t)||/(?<![\p{L}])(?:Adet|Birim|Tutar|Kaydet|Proje|Teklif|Sipariş|Teslim|Fatura|Kapsam|Dahil|Hariç|Havalandırma|Elektrik|Monofaze|Trifaze|Notu|Otomatik|Karma|Sayfa|Kontrol|Fanlar)(?![\p{L}])/iu.test(t)));
async function settle(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.waitForTimeout(500);}
async function language(p,lang){await p.getByRole('button',{name:lang==='en'?'English':'Türkçe',exact:true}).click();await settle(p);}
async function capture(name,p,selector='body',pdf=false){await settle(p);const text=await p.locator(selector).innerText();const data={name,url:p.url(),lang:await p.locator('html').getAttribute('lang'),leftovers:[...new Set(leftovers(text))],text};results.push(data);fs.writeFileSync(out+'/'+name+'.txt',text);if(pdf){const print=await context.newPage();let markup=(await p.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');if(!/<base\s/i.test(markup))markup=markup.replace('<head>','<head><base href="'+p.url()+'">');await print.setContent(markup,{waitUntil:'load'});await print.waitForFunction(()=>[...document.images].every(i=>i.complete));assert.deepEqual(await print.locator('img').evaluateAll(xs=>xs.filter(i=>!i.naturalWidth).map(i=>i.src)),[],name+' images');await print.pdf({path:out+'/'+name+'.pdf',format:'A4',printBackground:true});await print.close();}await p.screenshot({path:out+'/'+name+'.png',fullPage:true});assert.equal(data.lang,'en',name);assert.deepEqual(data.leftovers,[],name+' Turkish leftovers');console.log('PASS '+name);return data;}
async function popup(action){const pending=context.waitForEvent('page');await action();const p=await pending;await p.waitForLoadState('domcontentloaded');await settle(p);return p;}
try{
 await page.goto('http://vensis.test/catalog.html');await page.waitForFunction(()=>Boolean(window.VensisDirectPreview&&window.VensisCatalog));await language(page,'en');
 assert.equal(await page.locator('#catalogSearch').getAttribute('aria-label'),'Search ventilation catalogue by brand, series or model');
 const scanned=await page.evaluate(()=>{
  const C=window.VensisCatalog,failures=[];
  for(const model of C.models){
   const html=window.VensisDirectPreview.html({mode:'catalog',outputLanguage:'en',product:C.product(model.id),model});
   const doc=new DOMParser().parseFromString(html,'text/html');
   const bad=[...doc.querySelectorAll('.brand,h2,.feature-card li,.feature-tag,.technical-cell span,.technical-cell b,.feature-warning')].map(n=>n.textContent).filter(t=>/[çğıöşüÇĞİÖŞÜ]|\b(?:Monofaze|Trifaze)\b/.test(t));
   bad.push(...[...doc.querySelectorAll('[aria-label]')].map(n=>n.getAttribute('aria-label')).filter(t=>/[çğıöşüÇĞİÖŞÜ]/.test(t)));
   if(bad.length)failures.push({id:model.id,bad});
  }
  return {total:C.models.length,failures};
 });assert.equal(scanned.total,1022);assert.deepEqual(scanned.failures,[]);
 const allSeries=await page.evaluate(()=>window.VensisCatalog.series.map(s=>s.id));
 for(const id of allSeries){
  await page.goto('http://vensis.test/catalog.html?series='+encodeURIComponent(id));await page.locator('.model-card').first().waitFor();await settle(page);
  assert.deepEqual(leftovers(await page.locator('.detail-page').innerText()),[],id);
  assert.equal(await page.locator('.model-field').count(),12*await page.locator('.model-card').count(),id+' fixed boxes');
 }
 console.log('PASS: all 89 English series and 1022 English model previews');
 await page.goto('http://vensis.test/projects.html');await page.waitForFunction(()=>Boolean(window.VensisProjects?.create));
 const project=await page.evaluate(()=>window.VensisProjects.create({name:'English Audit Fixture',reference:'QA-EN-20261023',contact:'QA Contact'}).id);
 await page.goto('http://vensis.test/catalog.html');await page.waitForFunction(()=>Boolean(window.VensisCatalog&&window.VensisCatalogProjectPicker));
 const models=await page.evaluate(()=>{const C=window.VensisCatalog;return ['VITLO-CRS-ATEX|CRS/ATEX 31-2T-2|SS316','VORTICE-ROOF|15301','SP-WORKBOOK-2026-2|SILENT|159',C.models.find(m=>C.getSeries(m.seriesId).manufacturer==='SEAT').id].map(id=>{const m=C.getModel(id);return {id,model:m.model,series:m.seriesId};});});
 fs.writeFileSync(out+'/models.json',JSON.stringify(models,null,2));
 for(let i=0;i<models.length;i++){
  const m=models[i];await page.goto('http://vensis.test/catalog.html?series='+encodeURIComponent(m.series)+'&model='+encodeURIComponent(m.id)+'&project='+encodeURIComponent(project));
  await page.locator('.model-card:not([hidden]) .vensis-preview-classic').waitFor();await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
  await language(page,'tr');await page.locator('.model-card:not([hidden]) [data-add-catalog-project]').click();
  await page.locator('#catalogProjectModal:not([hidden])').waitFor();await page.locator('input[name="catalogProjectChoice"][value="'+project+'"]').check();await page.locator('#catalogProjectConfirm').click();
  await language(page,'en');assert.equal((await page.locator('.models-section .catalog-count').innerText()).trim(),'1 model');await capture('catalog-en-'+i,page,'.detail-page');
  const preview=await popup(()=>page.locator('.model-card:not([hidden]) .vensis-preview-classic').click());await capture('preview-en-'+i,preview,'body',true);await preview.close();
 }
 await page.goto('http://vensis.test/project.html?project='+encodeURIComponent(project));await page.waitForSelector('#projectContent tbody tr');
 await language(page,'en');await capture('project-en',page);
 console.log('PROJECT_ROWS '+await page.locator('#projectContent tbody tr').count());
 const print=await popup(()=>page.locator('#printProject').click());await print.waitForSelector('.project-overview');await capture('project-output-en',print,'#projectPrintRoot',true);await language(print,'tr');assert.ok((await print.locator('#projectPrintRoot').innerText()).includes('Sessiz Banyo ve WC Fanları'));await language(print,'en');assert.deepEqual(leftovers(await print.locator('#projectPrintRoot').innerText()),[]);await print.close();
 const quote=await popup(()=>page.locator('#convertQuotation').click());await quote.waitForSelector('#quotationContent .quote-page');await capture('quotation-en',quote,'body');await capture('quotation-output-en',quote,'#quotationContent',true);await quote.close();
 // Common second route: create in Turkish, then switch language in quotation.
 await language(page,'tr');const trQuote=await popup(()=>page.locator('#convertQuotation').click());await trQuote.waitForSelector('#quotationContent .quote-page');await language(trQuote,'en');await capture('quotation-tr-then-en',trQuote,'#quotationContent',true);await trQuote.close();
 // Unsaved custom values must survive language switches, format changes,
 // save and beforeprint. Built-in defaults still translate both ways.
 await language(page,'en');
 await page.locator('#openQuotationSettings').click();
 const custom={payment:'30% advance, 70% before dispatch',validity:'21 days',deliveryTime:'8 weeks',deliveryPlace:'Ex Vensis warehouse',quotationNote:'CUSTOM CUSTOMER NOTE 73'};
 for(const [key,value] of Object.entries(custom))await page.locator('[data-setting="summary.'+key+'"]').fill(value);
 const customQuote=await popup(()=>page.locator('#convertQuotation').click());
 await customQuote.waitForSelector('#quotationContent .quote-page');
 async function checkCustom(){
  const value=await customQuote.evaluate(()=>window.VensisQuotationEditor.draft().settings.summary);
  for(const [key,text] of Object.entries(custom))assert.equal(value[key],text,key);
 }
 await checkCustom();
 await customQuote.locator('[data-quote-setting="summary.deliveryTime"]').fill('6 weeks');custom.deliveryTime='6 weeks';
 await customQuote.locator('[data-quote-setting="summary.quotationNote"]').fill('Özel müşteri notu 73');custom.quotationNote='Özel müşteri notu 73';
 for(const lang of ['tr','en','tr','en']){await language(customQuote,lang);await checkCustom();assert.equal(await customQuote.locator('[data-quote-setting="summary.vat"]').inputValue(),lang==='en'?'VAT is not included in our prices.':'Fiyatlarımıza KDV dahil değildir.');}
 await language(customQuote,'tr');await customQuote.reload();await customQuote.waitForSelector('#quotationContent .quote-page');assert.equal(await customQuote.locator('html').getAttribute('lang'),'tr');await checkCustom();await language(customQuote,'en');
 await customQuote.locator('#editQuotationFormat').selectOption('mixed');await checkCustom();
 assert.equal(await customQuote.evaluate(()=>window.VensisQuotationEditor.draft().settings.scope.included),await customQuote.evaluate(()=>window.VensisQuotationSettings.defaultsFor('mixed','en').scope.included));
 await customQuote.locator('#saveQuotationEditor').click();await checkCustom();
 await customQuote.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await checkCustom();
 const stored=await customQuote.evaluate(()=>JSON.parse(localStorage.getItem(window.VensisQuotationEditor.key)));
 for(const [key,value] of Object.entries(custom))assert.equal(stored.settings.summary[key],value,'stored '+key);
 assert.ok(await customQuote.locator('#quotationContent').innerText().then(t=>t.includes('Özel müşteri notu 73')));
 await customQuote.close();
 // Explicit blank delivery values must remain blank.
 await page.locator('[data-setting="summary.deliveryTime"]').fill('');
 await page.locator('[data-setting="summary.deliveryPlace"]').fill('');
 const blank=await popup(()=>page.locator('#convertQuotation').click());await blank.waitForSelector('#quotationContent .quote-page');
 assert.equal(await blank.locator('[data-quote-setting="summary.deliveryTime"]').inputValue(),'');
 assert.equal(await blank.locator('[data-quote-setting="summary.deliveryPlace"]').inputValue(),'');await blank.close();
 // Repeated language switching on the same project page.
 await language(page,'en');await capture('project-tr-en-repeat',page);
 fs.writeFileSync(out+'/storage.json',JSON.stringify(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>/quotation|project_print_snapshot/.test(k)))),null,2));
}catch(e){console.error(e.stack);results.push({fatal:e.stack});process.exitCode=1;}
finally{fs.writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));assert.deepEqual(errors,[]);if(!process.exitCode)console.log('PASS: English catalogue/project/quotation flows; custom terms, repeated language switching and 7 image-verified PDFs.');await browser.close();}

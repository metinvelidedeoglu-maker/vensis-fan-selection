const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('private application pages receive a server-level X-Robots noindex header',()=>{
  const htaccess=read('.htaccess');
  assert.match(htaccess,/SetEnvIf Request_URI/);
  assert.match(htaccess,/X-Robots-Tag "noindex, nofollow"/);
  for(const name of ['index','fan-selection','catalog','projects','project','customers','custom-products','quotation','order','project-print','detail']){
    assert.match(htaccess,new RegExp(`\\b${name.replace('-','\\-')}\\b`),name);
  }
});

test('root-only private-page rule does not noindex public catalogs',()=>{
  const htaccess=read('.htaccess');
  const rule=(htaccess.match(/SetEnvIf Request_URI "([^"]+)"/)||[])[1]||'';
  const matcher=new RegExp(rule);
  assert.equal(matcher.test('/index.html'),true);
  assert.equal(matcher.test('/project.html'),true);
  assert.equal(matcher.test('/catalog.html'),true);
  for(const publicPath of ['/catalog-hub.html','/catalog-ventilation.html','/catalog-brand.html','/catalog-vortice-stable.html','/catalog-vortice.html','/electrical/index.html']){
    assert.equal(matcher.test(publicPath),false,publicPath);
  }
});

test('robots only blocks APIs so crawlers can observe private-page noindex headers',()=>{
  const robots=read('robots.txt');
  assert.match(robots,/Disallow: \/api\//);
  assert.doesNotMatch(robots,/Disallow: \/projects\.html/);
  assert.doesNotMatch(robots,/Disallow: \/quotation\.html/);
  assert.match(robots,/Sitemap: https:\/\/select\.vensis\.com\.tr\/sitemap\.xml/);
});

test('client-side robots remains a backup with public catalogs indexable',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/isPublicCatalog\?'index,follow/);
  assert.match(gate,/:\s*'noindex,nofollow'/);
  assert.match(gate,/catalog-hub\.html/);
  assert.match(gate,/electrical\/index\.html/);
});

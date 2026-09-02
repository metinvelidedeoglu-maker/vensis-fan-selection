const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('public catalog boot prefers the TR or EN URL prefix before legacy language state',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/path\.match\(\/\^\\\/\(tr\|en\)/);
  assert.match(gate,/pathLanguage==='tr'\|\|pathLanguage==='en'/);
  assert.match(gate,/vensis_language_v1/);
  assert.match(gate,/seo-bilingual\.js\?v=20260902-r1/);
  assert.match(gate,/seo-locale-paths\.js\?v=20260902-r1/);
  assert.match(gate,/localeUrls\.async=false/);
});

test('locale URL layer publishes path-based canonical and reciprocal hreflang links',()=>{
  const seo=read('js/seo-locale-paths.js');
  assert.match(seo,/stripLocale/);
  assert.match(seo,/url\.searchParams\.delete\('lang'\)/);
  assert.match(seo,/url\.pathname=`\/\$\{lang\}\$\{stripLocale\(url\.pathname\)\}`/);
  assert.match(seo,/setAlternate\('en',en\)/);
  assert.match(seo,/setAlternate\('tr',tr\)/);
  assert.match(seo,/setAlternate\('x-default',en\)/);
  assert.match(seo,/history\.replaceState/);
  assert.match(seo,/withLanguage:localeUrl/);
});

test('Turkish and English pages still share one product data architecture',()=>{
  const bilingual=read('js/seo-bilingual.js');
  const locale=read('js/seo-locale-paths.js');
  assert.match(bilingual,/window\.VensisCatalog/);
  assert.match(bilingual,/Vensis Ürün Kataloğu/);
  assert.match(bilingual,/Endüstriyel Havalandırma Fan Kataloğu/);
  assert.match(bilingual,/patchJsonLd/);
  assert.match(bilingual,/inLanguage/);
  assert.match(locale,/PUBLIC_PATHS/);
  assert.doesNotMatch(locale,/window\.models\s*=/);
});

test('static sitemap exposes real TR and EN directory URLs without lang query parameters',()=>{
  const sitemap=read('sitemap-static.xml');
  assert.match(sitemap,/xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(sitemap,/https:\/\/select\.vensis\.com\.tr\/en\/catalog-hub\.html/);
  assert.match(sitemap,/https:\/\/select\.vensis\.com\.tr\/tr\/catalog-hub\.html/);
  assert.match(sitemap,/hreflang="en"/);
  assert.match(sitemap,/hreflang="tr"/);
  assert.match(sitemap,/hreflang="x-default"/);
  assert.doesNotMatch(sitemap,/\?lang=/);
  assert.doesNotMatch(sitemap,/&amp;lang=/);
});

test('fan and electrical sitemaps prefix URLs with locale directories instead of lang query parameters',()=>{
  for(const file of ['sitemap-fans.php','sitemap-electrical.php']){
    const source=read(file);
    assert.match(source,/xmlns:xhtml/);
    assert.match(source,/hreflang=\\?"en\\?"/);
    assert.match(source,/hreflang=\\?"tr\\?"/);
    assert.match(source,/hreflang=\\?"x-default\\?"/);
    assert.match(source,/rawurlencode\(\$lang\)/);
    assert.doesNotMatch(source,/['"]lang=['"]/);
  }
});

test('Apache strips locale prefix internally while keeping private workspace noindex rules',()=>{
  const htaccess=read('.htaccess');
  assert.match(htaccess,/RewriteRule \^\(tr\|en\)\/\(\.\*\)\$ \$2 \[L,QSA\]/);
  assert.match(htaccess,/\(tr\/\|en\/\)\?/);
  assert.match(htaccess,/X-Robots-Tag "noindex, nofollow"/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {window: {}, console};
vm.createContext(context);
for (const file of ['data/ventilation-catalog.js', 'products/ventilation.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
const data = context.window.VensisVentilationData;
const catalog = context.window.VensisCatalog;
const agent = JSON.parse(fs.readFileSync(path.join(root, 'api/agent/catalog-v1.json'), 'utf8'));
// Approved commercial values, independent of the catalogue's pricing metadata.
const expected = [
  ['31-2T-2', 2300, 3050], ['40-2T-5.5', 4300, 5100],
  ['45-2T-10', 5720, 6620], ['50-2T-15', 6720, 7720],
  ['56-2T-20', 8720, 9870], ['63-2T-40', 17000, 18350],
  ['31-4T', 1752, 2502], ['35-4T', 1929.6, 2704.6],
  ['40-4T', 2110.4, 2910.4], ['45-4T', 2467.2, 3367.2],
  ['50-4T', 3038.4, 4038.4], ['56-4T', 3500.8, 4650.8],
  ['63-4T', 5124.8, 6474.8], ['71-4T', 6902.4, 8402.4],
  ['80-4T-25', 10700, 12700]
];

test('all 45 standard ATEX models have the approved price through catalogue and agent selection', () => {
  for (const [tail, basePrice, cellPrice] of expected) {
    for (const series of ['CRS/ATEX', 'CRD/ATEX', 'CRK/ATEX']) {
      const matches = data.models.filter(m => m.model === `${series} ${tail}`);
      assert.equal(matches.length, 1, `${series} ${tail}`);
      const model = matches[0];
      const price = series === 'CRK/ATEX' ? cellPrice : basePrice;
      assert.equal(model.pricing.listPrice, price, model.model);
      assert.equal(model.pricing.currency, 'EUR');
      assert.equal(catalog.getModel(model.id).pricing.listPrice, price);
      const variants = agent.models.filter(m => m.productKey === model.id);
      assert.ok(variants.length, model.model);
      for (const variant of variants) {
        assert.equal(variant.pricing.listPrice, price, variant.model);
        assert.equal(variant.pricing.currency, 'EUR');
        assert.equal(variant.quoteEligible, true);
      }
    }
  }
});

test('matching capacity profiles retain their distinct construction and original model IDs', () => {
  for (const [tail] of expected) {
    const base = data.models.find(m => m.model === `CRS/ATEX ${tail}`);
    for (const [series, mount] of [['CRD/ATEX', 'Duct'], ['CRK/ATEX', 'Cabinet']]) {
      const model = data.models.find(m => m.model === `${series} ${tail}`);
      assert.deepEqual(model.motor, base.motor);
      assert.deepEqual(model.performance, base.performance);
      assert.equal(model.technical.mountType, mount);
      assert.notEqual(model.media.image, base.media.image);
      assert.ok(data.series.find(s => s.id === series).modelIds.includes(model.id));
    }
  }
});

test('stainless steel variants retain their separate prices and no family-price rule', () => {
  const models = data.models.filter(m => m.seriesId === 'CRS/ATEX' && m.model.includes('STAINLESS'));
  assert.equal(models.length, 2);
  assert.equal(models.find(m => m.model.includes('31-2T-2')).pricing.listPrice, 5750);
  assert.equal(models.find(m => m.model.includes('45-4T')).pricing.listPrice, 10000);
  for (const model of models) assert.equal(model.pricing.rule, undefined);
});

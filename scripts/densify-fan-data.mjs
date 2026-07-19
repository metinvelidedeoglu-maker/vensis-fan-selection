import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const TARGET_COUNT = 200;

function cleanPoints(points) {
  const map = new Map();
  for (const point of points || []) {
    const p = Number(point?.[0]);
    const q = Number(point?.[1]);
    if (Number.isFinite(p) && Number.isFinite(q)) map.set(p, q);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function pchipSlopes(points) {
  const n = points.length;
  if (n < 2) return [];
  if (n === 2) {
    const slope = (points[1][1] - points[0][1]) / (points[1][0] - points[0][0]);
    return [slope, slope];
  }

  const h = [];
  const delta = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = points[i + 1][0] - points[i][0];
    delta[i] = (points[i + 1][1] - points[i][1]) / h[i];
  }

  const d = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] === 0 || delta[i] === 0 || Math.sign(delta[i - 1]) !== Math.sign(delta[i])) {
      d[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }

  d[0] = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  if (Math.sign(d[0]) !== Math.sign(delta[0])) d[0] = 0;
  else if (Math.sign(delta[0]) !== Math.sign(delta[1]) && Math.abs(d[0]) > Math.abs(3 * delta[0])) d[0] = 3 * delta[0];

  const k = n - 1;
  d[k] = ((2 * h[k - 1] + h[k - 2]) * delta[k - 1] - h[k - 1] * delta[k - 2]) / (h[k - 1] + h[k - 2]);
  if (Math.sign(d[k]) !== Math.sign(delta[k - 1])) d[k] = 0;
  else if (Math.sign(delta[k - 1]) !== Math.sign(delta[k - 2]) && Math.abs(d[k]) > Math.abs(3 * delta[k - 1])) d[k] = 3 * delta[k - 1];

  return d;
}

function pchipValue(points, slopes, x) {
  if (x < points[0][0] || x > points.at(-1)[0]) return null;
  if (points.length === 1) return points[0][1];

  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] <= x) lo = mid;
    else hi = mid;
  }

  if (x === points[hi][0]) return points[hi][1];
  const [x0, y0] = points[lo];
  const [x1, y1] = points[hi];
  const h = x1 - x0;
  const t = (x - x0) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  const h11 = t ** 3 - t ** 2;
  return h00 * y0 + h10 * h * slopes[lo] + h01 * y1 + h11 * h * slopes[hi];
}

function pressureGrid(source, targetCount) {
  const values = new Set(source.map(([p]) => p));
  while (values.size < targetCount) {
    const sorted = [...values].sort((a, b) => a - b);
    let bestA = sorted[0];
    let bestB = sorted[1];
    let bestGap = -Infinity;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1] - sorted[i];
      if (gap > bestGap) {
        bestGap = gap;
        bestA = sorted[i];
        bestB = sorted[i + 1];
      }
    }
    if (!(bestGap > 0)) break;
    values.add((bestA + bestB) / 2);
  }
  return [...values].sort((a, b) => a - b).slice(0, targetCount);
}

function densify(points, targetCount = TARGET_COUNT) {
  const source = cleanPoints(points);
  if (source.length < 3 || source.length >= targetCount) return source;
  const slopes = pchipSlopes(source);
  const pressures = pressureGrid(source, targetCount);
  return pressures.map((pressure) => {
    const flow = pchipValue(source, slopes, pressure);
    return [Number(pressure.toFixed(4)), Number(Math.max(0, flow).toFixed(4))];
  });
}

function parseModels(text, file) {
  const match = text.match(/^\s*window\.models\.push\(\.\.\.(\[.*\])\);?\s*$/s);
  if (!match) throw new Error(`Unsupported data format: ${file}`);
  return JSON.parse(match[1]);
}

const files = fs.readdirSync(DATA_DIR)
  .filter((name) => /^fans-\d+\.js$/.test(name))
  .sort();

let modelCount = 0;
for (const file of files) {
  const fullPath = path.join(DATA_DIR, file);
  const models = parseModels(fs.readFileSync(fullPath, 'utf8'), file);

  for (const model of models) {
    const original = cleanPoints(model.sourcePoints || model.points);
    model.sourcePoints = original;
    model.points = densify(original, TARGET_COUNT);
    if (original.length >= 3 && original.length < TARGET_COUNT && model.points.length !== TARGET_COUNT) {
      throw new Error(`${file} / ${model.key || model.model}: expected ${TARGET_COUNT}, got ${model.points.length}`);
    }
    modelCount++;
  }

  fs.writeFileSync(fullPath, `window.models.push(...${JSON.stringify(models)});\n`);
  console.log(`${file}: ${models.length} models updated`);
}

console.log(`Done: ${modelCount} models processed; each eligible curve now has ${TARGET_COUNT} stored points.`);

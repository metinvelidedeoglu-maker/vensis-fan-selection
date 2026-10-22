#!/usr/bin/env python3
"""Apply reviewed product copy from 12 exact user-supplied manufacturer PDFs.

Usage: python3 scripts/import-catalogue-content.py /path/to/source-pdfs
The source directory contains the Vitlo PDF, seven VORTICE PDFs and four S&P
PDFs. The last four may be in an upload sibling. No technical values change.
"""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
AUDIT = 'assets/products/catalogue-content-details.json'


def normalized(value):
    value = unicodedata.normalize('NFKD', value.casefold()).replace('ı', 'i')
    return re.sub(r'\s+', '', ''.join(c for c in value if not unicodedata.combining(c)))


def verify_sources(source_dir, audit):
    import fitz
    pages = {}
    for key, source in audit['sources'].items():
        candidates = [source_dir / source['filename'], source_dir.parent / 'upload' / source['filename']]
        pdf_path = next((p for p in candidates if p.is_file()), None)
        assert pdf_path, ('Missing source PDF', source['filename'])
        assert hashlib.sha256(pdf_path.read_bytes()).hexdigest() == source['sha256'], key
        pdf = fitz.open(pdf_path)
        assert len(pdf) == source['pages'], (key, len(pdf), source['pages'])
        pages[key] = [page.get_text() for page in pdf]
    for sid, row in audit['series'].items():
        assert all(1 <= page <= len(pages[row['source']]) for page in row.get('descriptionPages', [])), sid
        text = normalized(pages[row['source']][row['featurePage'] - 1])
        for tag in row['tags']:
            assert tag['evidence'] and normalized(tag['evidence']) in text, (sid, tag)
    for mid, patch in audit['modelPatches'].items():
        row = next(row for row in audit['models'] if row['id'] == mid)
        text = pages[row['source']][patch.get('featurePage', row['featurePage']) - 1]
        assert normalized(patch['evidence']) in normalized(text), mid


def apply(data, audit):
    original = deepcopy(data)
    models = {m['id']: m for m in data['models']}
    series = {s['id']: s for s in data['series']}
    eligibility = {}
    for row in audit['models']:
        path = row['eligibilityAudit']
        if path not in eligibility:
            eligibility[path] = {m['id']: m for m in json.loads((ROOT / path).read_text())['models']}
        prior = eligibility[path][row['id']]
        assert prior['seriesId'] == row['seriesId'] == models[row['id']]['seriesId']
        assert row['source'] == prior.get('source', 'vitlo.pdf')
    translations = data.setdefault('contentTranslations', {})
    for sid, content in audit['series'].items():
        target = series[sid]
        assert any(row['seriesId'] == sid for row in audit['models'])
        if 'description' in content:
            target['description'] = deepcopy(content['description']['en'])
            for field, english in content['description']['en'].items():
                translations.update(zip(english, content['description']['tr'][field]))
        if 'descriptionPatch' in content:
            target['description'] = deepcopy(content['descriptionPatch']['value'])
            translations.update(content['descriptionPatch']['translations'])
    for row in audit['models']:
        target = models[row['id']]
        content = audit['series'][row['seriesId']]
        patch = audit['modelPatches'].get(row['id'], {})
        tags = [(tag['tr'], tag['en']) for tag in content['tags']] + patch.get('tags', [])
        features = target.setdefault('features', {'tr': [], 'en': []})
        assert isinstance(features, dict), row['id']
        for index, lang in enumerate(['tr', 'en']):
            existing = features.get(lang, [])
            assert isinstance(existing, list), row['id']
            features[lang] = list(dict.fromkeys(existing + [tag[index] for tag in tags]))
        if patch.get('description'):
            target['description'] = deepcopy(patch['description']['en'])
            for field, english in patch['description']['en'].items():
                translations.update(zip(english, patch['description']['tr'][field]))
        target.setdefault('verification', {})['catalogueContent'] = {
            'audit': AUDIT, 'source': row['source'],
            'sha256': audit['sources'][row['source']]['sha256'],
            'featurePage': patch.get('featurePage', row['featurePage']),
            'sourcePages': sorted(set(content.get('descriptionPages', [row['featurePage']]) + [patch.get('featurePage', row['featurePage'])])),
            'scope': 'source-matched-construction-and-product-copy-only',
        }
    # Structural invariants: the whole model record except copy/provenance is exact.
    assert len(data['models']) == len(original['models'])
    for before, after in zip(original['models'], data['models']):
        for key in set(before) | set(after):
            if key not in ('features', 'description', 'verification'):
                assert before.get(key) == after.get(key), (after['id'], key)
        for key, value in before.get('verification', {}).items():
            if key != 'catalogueContent':
                assert after['verification'][key] == value
    for before, after in zip(original['series'], data['series']):
        assert {k: v for k, v in before.items() if k != 'description'} == {k: v for k, v in after.items() if k != 'description'}
    return sum(a != b for a, b in zip(original['models'], data['models']))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir', type=Path)
    args = parser.parse_args()
    audit = json.loads((ROOT / AUDIT).read_text())
    verify_sources(args.source_dir, audit)
    path = ROOT / 'data/ventilation-catalog.js'
    source = path.read_text()
    data = json.loads(source.split('window.VensisVentilationData=', 1)[1].strip().rstrip(';'))
    changed = apply(data, audit)
    prefix = source.split('window.VensisVentilationData=', 1)[0]
    path.write_text(prefix + 'window.VensisVentilationData=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(json.dumps({'matchedModels': len(audit['models']), 'seriesReviewed': len(audit['series']), 'changedModels': changed}))


if __name__ == '__main__':
    main()

"""Reverse only the approved price change when checking older immutable audits."""
import copy
import json
from pathlib import Path


def before_cr_atex_pricing(data):
    result = copy.deepcopy(data)
    audit = json.loads((Path(__file__).parents[1] / 'fixtures/cr-atex-pricing-20261112.json').read_text())
    for change in reversed(audit['changes']):
        obj = result[change['scope']]
        if 'id' in change:
            obj = next(item for item in obj if item['id'] == change['id'])
        for key in change['path'][:-1]:
            obj = obj[key]
        key = change['path'][-1]
        assert obj[key] == change['value'], change
        if change['previousPresent']:
            obj[key] = change['previous']
        else:
            del obj[key]
    return result

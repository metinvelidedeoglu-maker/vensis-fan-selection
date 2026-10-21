"""Fill missing Vitlo operating conditions from the exact supplied catalogue.

Usage: python3 scripts/import-vitlo-operating-conditions.py /path/catalogue.pdf
Only model codes printed in the correct series table are eligible. General
motor protection and normal/continuous temperatures never certify ATEX/fire
variants or replace a model-specific source.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SHA256 = "4ab6811a59763ee92248210c307ab74c65143c061687a59adfde9a55a9241b9f"
EVIDENCE = "assets/products/vitlo/catalogue-ip-temperature.json"
# Feature page, model-table page, motor IP, minimum normal C, maximum normal C.
ROWS = {
    "AXF": (4, 5, "IP55", -20, 55),
    "AXJ": (6, 6, "IP55", -20, 55),
    "TUNEL-AXF": (8, 9, "IP55", -20, 55),
    "BOX-AXF": (10, 11, "IP55", -20, 55),
    "AXW/ATEX": (14, 15, "IP65", -20, 55),
    "AXD/ATEX": (16, 17, "IP65", -20, 55),
    "MOB-AXD/ATEX": (18, 19, "IP65", -20, 55),
    "AXR/ATEX": (20, 21, "IP65", -20, 55),
    "CRH/ATEX": (22, 23, "IP65", -20, 120),
    "CRD/ATEX": (24, 24, "IP65", -20, 120),
    "CRS/ATEX": (25, 25, "IP65", -20, 120),
    "AXD": (26, 27, "IP55", -20, 55),
    "AXD/MOB": (28, 29, "IP55", -20, 55),
    "AXS": (30, 31, "IP55", -20, 55),
    "AXW": (32, 33, "IP55", -20, 55),
    "AXB": (34, 35, "IP55", -20, 120),
    "AXH": (36, 37, "IP55", -20, 55),
    "CD": (38, 38, "IP44", None, 50),
    "CRB": (39, 39, "IP54", None, 50),
    "CRD": (40, 40, "IP55", -20, 120),
    "CRK": (41, 41, "IP55", -20, 120),
    "CRC": (42, 42, "IP54", None, 50),
    "CRS": (43, 43, "IP55", -20, 120),
    "CR": (44, 44, "IP54", None, 50),
    "CRH": (45, 45, "IP55", -20, 120),
    "CRV": (46, 46, "IP55", -20, 120),
    "CRU": (47, 47, "IP54", None, 50),
    "AXR": (48, 49, "IP55", -20, 55),
    "AXV": (50, 51, "IP55", -20, 55),
    "CR-EC": (52, 52, "IP54", None, 50),
    "CRU-EC": (53, 53, "IP54", None, 50),
    "CRB-EC": (54, 54, "IP54", None, 50),
    "CRC-EC": (55, 55, "IP54", None, 50),
    "VHR": (56, 56, "IP54", None, 50),
    "CRR": (57, 57, "IP54", None, 50),
}


def normalized(value):
    return re.sub(r"\s+", "", value).upper().replace(",", ".").replace("º", "°")


def catalogue_model(model):
    name, sid = model["model"], model["seriesId"]
    if sid.endswith("-EC"):
        return name.removeprefix(sid + " ")
    # Existing registry label repeats the AXR/ATEX prefix; do not rename the row.
    if name == "AXR/ATEX AXR/ATEX63-4T-1":
        return "AXR/ATEX63-4T-1"
    return name


def extract(pdf_path, data):
    if hashlib.sha256(pdf_path.read_bytes()).hexdigest() != SHA256:
        raise ValueError("Supplied Vitlo catalogue hash mismatch")
    import fitz
    pdf = fitz.open(pdf_path)
    assert len(pdf) == 60
    series, tables = {}, {}
    for sid, (feature, table, ip, low, high) in ROWS.items():
        text = pdf[feature - 1].get_text()
        tr, en = re.split(r"\n\s*EN\s*\n", text, maxsplit=1)
        header = "MOB-AXD" if sid == "AXD/MOB" else sid
        assert header in tr, (sid, "series heading mismatch")
        quotes = {}
        for language, body in [("tr", tr), ("en", en)]:
            lines = body.splitlines()
            ip_line = next(line for line in lines if re.search(r"\bIP\s*\d", line))
            assert re.search(r"IP\s*(\d+)", ip_line)[1] == ip[2:]
            expected = f"{low}°C/+{high}°C" if low is not None else f"+{high}°C"
            temp_line = next(line for line in lines if expected in normalized(line))
            quotes[language] = {"motorIP": ip_line.strip(), "normalTemperature": temp_line.strip()}
        series[sid] = {
            "featurePage": feature, "modelTablePage": table,
            "ipClass": ip, "ipBasis": "motor-protection-not-junction-box",
            "operatingTemperatureMinC": low, "operatingTemperatureMaxC": high,
            "continuousAirTemperatureC": high,
            "temperatureBasis": "normal-continuous-operation-not-fire-S2",
            "lowerLimitSpecified": low is not None, "sourceExcerpts": quotes,
        }
        tables[sid] = {normalized(line): line.strip() for line in pdf[table - 1].get_text().splitlines()}
    brands = {s["id"]: s["manufacturer"] for s in data["series"]}
    models, excluded = [], []
    for model in data["models"]:
        sid = model["seriesId"]
        if brands[sid] != "Vitlo":
            continue
        name = catalogue_model(model)
        if sid not in tables or normalized(name) not in tables[sid]:
            excluded.append({"id": model["id"], "seriesId": sid, "model": model["model"],
                             "reason": "series-not-in-supplied-catalogue" if sid not in tables else "exact-variant-not-listed-in-series-table"})
            continue
        models.append({"id": model["id"], "seriesId": sid, "catalogueModel": tables[sid][normalized(name)]})
    return {
        "schemaVersion": 1, "status": "source-pages-visually-verified-2026-10-21",
        "source": {"catalogue": pdf_path.name, "sha256": SHA256, "pages": len(pdf), "origin": "user-supplied-manufacturer-catalogue"},
        "policy": {"exactModelTableMatchRequired": True, "existingValuesPreserved": True,
                   "unknownLowerLimit": None, "newSafetyCertificationInferred": False},
        "summary": {"series": len(series), "matchedModels": len(models), "excludedModels": len(excluded)},
        "series": series, "models": models, "excluded": excluded,
    }


def apply(artifact, data):
    models = {m["id"]: m for m in data["models"]}
    brands = {s["id"]: s["manufacturer"] for s in data["series"]}
    counts = Counter()
    for match in artifact["models"]:
        model = models[match["id"]]
        sid = match["seriesId"]
        assert model["seriesId"] == sid and brands[sid] == "Vitlo"
        evidence = artifact["series"][sid]
        technical = model["technical"]
        fields = []
        if technical.get("ipClass") in (None, "", "-", "—"):
            technical["ipClass"] = evidence["ipClass"]
            fields.append("ipClass")
            counts["ipClass"] += 1
        low, high = technical.get("operatingTemperatureMinC"), technical.get("operatingTemperatureMaxC")
        # The old imported 0/0 pair is an unspecified range. A true 0/+X range
        # is not missing. A +50-only source must not acquire an invented 0C low.
        range_missing = (low, high) == (0, 0) or (low in (None, "") and high in (None, ""))
        continuous = technical.get("continuousAirTemperatureC")
        continuous_missing = continuous in (None, "", 0)
        if range_missing and (continuous_missing or continuous == evidence["continuousAirTemperatureC"]):
            for key in ("operatingTemperatureMinC", "operatingTemperatureMaxC"):
                technical[key] = evidence[key]
                fields.append(key)
            counts["operatingTemperature"] += 1
        if continuous_missing and (range_missing or high == evidence["continuousAirTemperatureC"]):
            technical["continuousAirTemperatureC"] = evidence["continuousAirTemperatureC"]
            fields.append("continuousAirTemperatureC")
            counts["continuousAirTemperature"] += 1
        if fields:
            model.setdefault("verification", {})["catalogueOperatingConditions"] = {
                "evidence": EVIDENCE, "sourceSha256": SHA256,
                "featurePage": evidence["featurePage"], "modelTablePage": evidence["modelTablePage"],
                "catalogueModel": match["catalogueModel"], "fields": fields,
                "scope": "motor-IP-and-normal-continuous-operation-only",
            }
            counts["modelsUpdated"] += 1
    return dict(counts)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    target = ROOT / "data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    artifact = extract(args.pdf, data)
    summary = apply(artifact, data)
    (ROOT / EVIDENCE).write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
    target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({**artifact["summary"], "completed": summary}))

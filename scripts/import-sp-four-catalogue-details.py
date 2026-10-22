#!/usr/bin/env python3
"""Fill the 16 existing HDT, HV, HXTR and ILT EX records from four supplied PDFs.

Empty technical/motor fields and their full-speed operating metadata are
completed. Four exact catalogue maximum-airflow corrections are explicit;
curves, selection airflow values, catalogue-only flags and prices are preserved.
Run with the directory containing the four hash-locked PDFs.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = "assets/products/soler-palau/four-catalogue-details.json"
SOURCES = {
    "hdt-atex-0.pdf": ("b2f6c9e71b56119f5fbc7fe416ef973eef2b56c766d2aa11ca4c3d35c0cf8e9d", 3, 2),
    "hv-styvent-0.pdf": ("e206d1527f02b72f5d66ad45c0e7d5e0a49ee20fca70c90bb27346c2943ecd58", 7, 4),
    "hxbr-hxtr-4.pdf": ("f218ab3f4803ccfb6fe7661ba6c0a6c2f906a8ebbc4b4833a463649f694cb900", 14, 2),
    "ilt-atex-4-6a3a1c726c9da.pdf": ("799ea62fe93eb92b2bde4674c951b3c01147e4201ea4b02c126d55a25262ce33", 5, 2),
}
# Name: RPM, kW, A230, A400, tabulated maximum m3/h, LpA, kg.
HDT = {
    "HDT/4-315": (1330, .12, .9, .52, 2240, 56, 9.5),
    "HDT/4-355": (1340, .18, 1.14, .66, 3120, 60, 11),
    "HDT/4-400": (1370, .37, 1.9, 1.1, 4780, 65, 15),
    "HDT/4-450": (1380, .55, 2.6, 1.5, 8000, 66, 20),
    "HDT/4-560": (1390, 1.1, 5.02, 2.9, 13700, 73, 29),
}
# Name: RPM, maximum P1 W, A230, maximum high-speed exhaust m3/h, LpA, kg.
HV = {"HV-150 AE": (2350, 30, .19, 238, 39, 2),
      "HV-230 A": (1140, 28, .11, 489, 40, 3.5),
      "HV-300 A": (1150, 68, .3, 1100, 46, 5.1)}
# Name: RPM, maximum P1 W, A400, tabulated m3/h, LpA, maximum C, kg.
HXTR = {"HXTR/4-500": (1410, 943, 1.9, 9490, 67, 70, 16),
        "HXTR/4-560": (1410, 1218, 2.4, 11990, 69, 70, 21.5),
        "HXTR/4-630": (1420, 1216, 2.3, 13540, 67, 60, 24),
        "HXTR/6-710": (930, 1116, 2.4, 15710, 62, 40, 27)}
PREVIOUS_HXTR_MAXIMUM = {"HXTR/4-500": 9550, "HXTR/4-560": 12040,
                        "HXTR/4-630": 13720, "HXTR/6-710": 16110}
# Name: RPM, maximum P1 W, A230, A400, m3/h, inlet/outlet LpA, kg.
ILT = {"ILT/4-225 EX": (1200, 565, 1.7, 1, 1720, 62, 66, 20),
       "ILT/4-250 EX": (1240, 1150, 3.3, 1.9, 2610, 67, 70, 25),
       "ILT/4-285 EX": (1200, 1430, 4, 2.3, 3260, 67, 72, 32),
       "ILT/4-315 EX": (1370, 2300, 8.5, 4.9, 4000, 72, 77, 42)}


def source_row(page, name):
    lines = [line.strip() for line in page.get_text().splitlines() if line.strip()]
    starts = [i for i, line in enumerate(lines) if line == name]
    assert len(starts) == 1, (name, "exact PDF row required")
    start = starts[0]
    end = next((i for i in range(start + 1, len(lines))
                if re.match(r"^(?:HDB|HDT|HV|HVE|HXBR|HXTR|ILT)[-/]", lines[i])), len(lines))
    return "\n".join(lines[start:end])


def verify_numbers(excerpt, expected):
    numbers = [float(line.replace(".", "").replace(",", "."))
               for line in excerpt.splitlines() if re.fullmatch(r"[-+]?\d[\d.,]*", line)]
    assert numbers[:len(expected)] == list(expected), (excerpt.splitlines()[0], numbers, expected)


def extract(directory, data):
    import fitz
    pdfs, sources = {}, {}
    for name, (sha, count, table) in SOURCES.items():
        raw = (directory / name).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == sha, name
        pdf = fitz.open(stream=raw, filetype="pdf")
        assert len(pdf) == count, name
        pdfs[name] = pdf
        sources[name] = {"sha256": sha, "pages": count, "tablePage": table,
                         "origin": "user-supplied-manufacturer-catalogue", "verifiedOn": "2026-10-22"}
    brands = {s["id"]: s["manufacturer"] for s in data["series"]}
    rows = []
    groups = [(HDT, "HDB / HDT ATEX", "hdt-atex-0.pdf"), (HV, "HV-STYLVENT", "hv-styvent-0.pdf"),
              (HXTR, "HXBR / HXTR", "hxbr-hxtr-4.pdf"), (ILT, "ILT ATEX", "ilt-atex-4-6a3a1c726c9da.pdf")]
    for group, sid, name in groups:
        for label, values in group.items():
            matches = [m for m in data["models"] if m["model"] == label and m["seriesId"] == sid
                       and brands[sid] == "Soler & Palau"]
            assert len(matches) == 1, label
            model = matches[0]
            page = sources[name]["tablePage"]
            excerpt = source_row(pdfs[name][page - 1], label)
            if group is HDT:
                speed, power, a230, current, flow, sound, weight = values
                verify_numbers(excerpt, values)
                voltage, low, high, ip = "400 V", -20, 40, "IP55"
                technical = {"current230A": a230, "current400A": current, "insulationClass": "F",
                             "poles": 4, "powerBasis": "nominal-motor-power",
                             "soundBasis": "sound-pressure-1_5m-free-field", "soundMeasurementDistanceM": 1.5,
                             "atex": {"gas_marking": "II 2G EExd IIB T5", "gas_group": "IIB", "temperature_class": "T5"},
                             "safetyWarning": "ATEX işaretlemesini ürün etiketi ve proje şartlarıyla doğrulayın. IIC T4 motor seçeneği standart teslimata dahil kabul edilmemelidir."}
            elif group is HV:
                speed, watts, current, flow, sound, weight = values
                verify_numbers(excerpt, (speed, watts, current, flow) + (() if label == "HV-150 AE" else ((430, 296) if label == "HV-230 A" else (750, 700))) + (sound,) + (() if label == "HV-150 AE" else ((39,) if label == "HV-230 A" else (38,))) + (weight,))
                power, voltage, low, high, ip = watts / 1000, "230 V", None, 45, "IPX4"
                technical = {"current230A": current, "insulationClass": "II",
                             "powerBasis": "maximum-electrical-input-P1", "soundBasis": "sound-pressure-3m-high-speed",
                             "soundMeasurementDistanceM": 3, "reversible": label != "HV-150 AE"}
            elif group is HXTR:
                speed, watts, current, flow, sound, high, weight = values
                verify_numbers(excerpt, (speed, watts, current, sound, flow, -40, high, weight))
                power, voltage, low, ip = watts / 1000, "400 V", -40, "IP54"
                diameter = int(label.split("-")[-1])
                technical = {"current400A": current, "insulationClass": "F", "poles": int(label[5]),
                             "powerBasis": "maximum-electrical-input-P1",
                             "soundBasis": "sound-pressure-3D-minimum-1_5m-free-field",
                             "soundMeasurementDistanceM": max(1.5, 3 * diameter / 1000)}
            else:
                speed, watts, a230, current, flow, sound, outlet, weight = values
                verify_numbers(excerpt, values)
                power, voltage, low, high, ip = watts / 1000, "230/400 V", -20, 55, "IP55"
                technical = {"current230A": a230, "current400A": current, "insulationClass": "F", "poles": 4,
                             "powerBasis": "maximum-electrical-input-P1",
                             "soundBasis": "inlet-sound-pressure-1_5m-free-field-operating-point-A",
                             "soundInletDbA1_5m": sound, "soundOutletDbA1_5m": outlet,
                             "soundMeasurementDistanceM": 1.5, "soundOperatingPoint": "A",
                             "atex": {"gas_marking": "II 2G Ex eb IIB T3 Gb", "gas_group": "IIB", "temperature_class": "T3", "epl": "Gb"},
                             "safetyWarning": "Voltajla hız ayarında ATEX sertifikasını korumak için S&P RMT kullanılmalıdır. ATEX işaretlemesini ürün etiketi ve proje şartlarıyla doğrulayın."}
            technical.update({"phase": "Single-phase" if group is HV else "Three-phase", "weight": weight,
                              "ipClass": ip, "operatingTemperatureMinC": low, "operatingTemperatureMaxC": high,
                              "currentReferenceVoltageV": 230 if group is HV else 400})
            rows.append({"id": model["id"], "model": label, "seriesId": sid, "productCode": model["technical"]["productCode"],
                         "source": name, "tablePage": page, "featurePages": [1, 2, 3] if group is HV else [1],
                         "sourceRowExcerpt": excerpt,
                         "motor": {"power": power, "speed": speed, "current": current, "voltage": voltage, "frequency": "50 Hz", "sound": sound},
                         "technical": technical, "sourceMaxAirflow": flow})
    corrections = [{"id": r["id"], "field": "performance.maxAirflow", "previous": PREVIOUS_HXTR_MAXIMUM[r["model"]],
                  "sourceValue": r["sourceMaxAirflow"], "source": r["source"], "page": r["tablePage"],
                  "action": "corrected-catalogue-maximum-only-selection-airflow-and-curves-preserved"}
                 for r in rows if r["model"] in PREVIOUS_HXTR_MAXIMUM]
    return {"schemaVersion": 1, "verifiedOn": "2026-10-22", "sources": sources, "models": rows,
            "policy": {"exactModelAndSeriesRequired": True, "fillMissingMotorAndTechnicalOnly": True,
                       "curvesAndSelectionAirflowChanged": False, "pricesAndCatalogueOnlyChanged": False,
                       "optionalAtexMotorsAreNotStandard": True}, "correctedExistingValues": corrections}


def apply(artifact, data):
    models = {m["id"]: m for m in data["models"]}
    brands = {s["id"]: s["manufacturer"] for s in data["series"]}
    changed = 0
    missing = lambda value: value is None or value == "" or value == "-" or value == "—" or value == 0
    for row in artifact["models"]:
        model = models[row["id"]]
        assert model["seriesId"] == row["seriesId"] and model["model"] == row["model"]
        assert brands[row["seriesId"]] == "Soler & Palau" and model["technical"]["productCode"] == row["productCode"]
        fields = []
        for field, value in row["motor"].items():
            if missing(model["motor"].get(field)):
                model["motor"][field] = value
                fields.append("motor." + field)
        technical = model["technical"]
        unknown_range = (technical.get("operatingTemperatureMinC"), technical.get("operatingTemperatureMaxC")) in ((0, 0), (None, None))
        for field, value in row["technical"].items():
            if field in technical and technical[field] == value:
                continue
            if field.startswith("operatingTemperature"):
                if not unknown_range:
                    continue
            elif not missing(technical.get(field)):
                continue
            technical[field] = value
            fields.append("technical." + field)
        for point in model["performance"].get("operatingPoints", []):
            if point["control"].lower() not in ("nominal", "50hz"):
                continue
            for field in ("power", "speed", "current", "sound"):
                if missing(point.get(field)):
                    point[field] = row["motor"][field]
                    fields.append("performance.operatingPoints[" + point["control"] + "]." + field)
        if row["model"] in PREVIOUS_HXTR_MAXIMUM:
            existing = model["performance"]["maxAirflow"]
            assert existing in (PREVIOUS_HXTR_MAXIMUM[row["model"]], row["sourceMaxAirflow"]), (row["model"], "unreviewed airflow override")
            if existing != row["sourceMaxAirflow"]:
                model["performance"]["maxAirflow"] = row["sourceMaxAirflow"]
                fields.append("performance.maxAirflow")
        if fields:
            assert "fourCatalogueDetails" not in model.setdefault("verification", {})
            model["verification"]["fourCatalogueDetails"] = {
                "evidence": EVIDENCE, "source": row["source"], "sourceSha256": artifact["sources"][row["source"]]["sha256"],
                "tablePage": row["tablePage"], "featurePages": row["featurePages"], "fields": fields,
                "verifiedOn": "2026-10-22"}
            changed += 1
    return changed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    target = ROOT / "data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    artifact = extract(args.directory, data)
    count = apply(artifact, data)
    target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    (ROOT / EVIDENCE).write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"modelsUpdated": count, "modelsMatched": len(artifact["models"]), "verifiedMaximumAirflowCorrections": len(artifact["correctedExistingValues"])}))

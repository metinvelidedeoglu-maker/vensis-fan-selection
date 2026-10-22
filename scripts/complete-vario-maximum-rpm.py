#!/usr/bin/env python3
"""Apply Metin's maximum-directional-RPM decision to the six existing VARIOs.

The manufacturer prints two directional maxima. Keep both in the evidence;
show only their maximum in catalogue and nominal selection motor metadata.
Never rescale the existing performance curves or change another motor field.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = "assets/products/vortice/vario-maximum-rpm.json"
# Product code: (intake RPM, extract RPM), per the PDF's numbered footnotes.
RPM = {"14615": (2520, 2110), "12455": (1200, 1300), "12415": (1215, 1280),
       "12616": (2080, 2460), "12456": (1160, 1260), "12416": (1230, 1310)}
PREVIOUS_NOMINAL = {"14615": 1340, "12455": 790, "12415": 840,
                    "12616": 1330, "12456": 810, "12416": 850}


def complete(data):
    previous = json.loads((ROOT / "assets/products/vortice/catalogue-details.json").read_text())
    brands = {s["id"]: s["manufacturer"] for s in data["series"]}
    rows, changed = [], 0
    for code, (intake, extract) in RPM.items():
        source = next(r for r in previous["models"] if r["productCode"] == code)
        assert source["seriesId"] in ("VORTICE VARIO", "VORTICE VARIO I")
        assert re.search(r"\b" + str(intake) + r"\(1\)", source["sourceRowExcerpt"])
        assert re.search(r"\b" + str(extract) + r"\(2\)", source["sourceRowExcerpt"])
        matches = [m for m in data["models"] if m["id"] == source["id"]
                   and m["seriesId"] == source["seriesId"]
                   and m.get("technical", {}).get("productCode") == code
                   and brands[m["seriesId"]] == "VORTICE"]
        assert len(matches) == 1, (code, "exact model match required")
        model = matches[0]
        speed = max(intake, extract)
        row = {"id": model["id"], "seriesId": model["seriesId"], "productCode": code,
               "source": source["source"], "sourceSha256": previous["sources"][source["source"]]["sha256"],
               "modelTablePage": 1, "printedTablePage": previous["sources"][source["source"]]["printedTablePage"],
               "directionalRpm": {"intake": intake, "extract": extract}, "displayRpm": speed}
        rows.append(row)
        nominal = [p for p in model["performance"].get("operatingPoints", []) if p["control"] == "nominal"]
        assert len(nominal) == 1, (code, "one nominal operating point required")
        assert model["motor"].get("speed") in (0, speed), (code, "unexpected motor override")
        assert nominal[0].get("speed") in (PREVIOUS_NOMINAL[code], speed), (code, "unexpected nominal override")
        provenance = {"evidence": EVIDENCE, "source": row["source"], "sourceSha256": row["sourceSha256"],
                      "modelTablePage": 1, "basis": "maximum-of-catalogue-directional-rpm",
                      "requestedBy": "Metin", "requestedOn": "2026-10-22",
                      "fields": ["motor.speed", "performance.operatingPoints[nominal].speed"]}
        if (model["motor"].get("speed"), nominal[0].get("speed"), model.get("verification", {}).get("catalogueSpeed")) != (speed, speed, provenance):
            model["motor"]["speed"] = speed
            nominal[0]["speed"] = speed
            model.setdefault("verification", {})["catalogueSpeed"] = provenance
            changed += 1
    artifact = {"schemaVersion": 1, "verifiedOn": "2026-10-22",
                "decision": {"requestedBy": "Metin", "instruction": "yüksek devirleri yaz sadece",
                             "basis": "maximum-of-catalogue-directional-rpm", "curvesRescaled": False},
                "sourceEvidence": "assets/products/vortice/catalogue-details.json", "models": rows}
    return artifact, changed


if __name__ == "__main__":
    target = ROOT / "data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    artifact, count = complete(data)
    target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    (ROOT / EVIDENCE).write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"modelsUpdated": count, "sourceMatchedModels": len(artifact["models"])}))

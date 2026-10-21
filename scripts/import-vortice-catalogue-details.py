#!/usr/bin/env python3
"""Fill missing display metadata from the seven exact user-supplied VORTICE PDFs.

Usage: python3 scripts/import-vortice-catalogue-details.py /path/Desktop.zip
No new models, motor/selection values, curves, features or safety ratings are made.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = "assets/products/vortice/catalogue-details.json"
SOURCES = {
    "vortice-vario.pdf": ("d2b408be8c5a1e998f2baee19c797e8b4f82b040264ec168bc31ce6a8011f9e1", 3, 1, 1, 42),
    "vortice-vario-i.pdf": ("35de5b64788986db801a715e9b5be3f5b1c634417a1c6136d773a74fb93ed61c", 3, 1, 1, 50),
    "lineo.pdf": ("fb8aaef62f53780acce389699372f5ae07db9af0c6617838bf4ccc5d723d0186", 5, 1, 1, 24),
    "lineo-quiet.pdf": ("41972583a437c0a749caafd78c7f9b48bc6032776f6377b1c0cfdb6c8047a169", 3, 1, 1, 16),
    "ca-md.pdf": ("a4f38b8901b30121e008df88baa8d2c81c8eb2db03f7919b36ba6f7a014ab667", 8, 1, 2, 41),
    "heatmaster.pdf": ("ec6a6f47e5eaeefcfe7a90ba04b2cf5f4a04e1ee398a8c08a1dd88b8bd84bcec", 8, 2, 3, 6),
    "slimroof.pdf": ("842745889a1e1e921b4a3294f0ff6cb128692dec8e263532f50b2790cc25433d", 6, 2, 3, 28),
}
# Code, weight, maximum temperature. Null is an unspecified lower limit.
GROUPS = {
    "VORTICE VARIO": ("vortice-vario.pdf", "IPX4", [
        ("14615", 2.07, 50), ("12455", 3.45, 50), ("12415", 6.13, None)]),
    "VORTICE VARIO I": ("vortice-vario-i.pdf", "IPX4", [
        ("12616", 2.52, 50), ("12456", 3.88, 50), ("12416", 7.2, None)]),
    "LINEO": ("lineo.pdf", None, [
        ("17144", 1.8, 60), ("17143", 1.8, 60), ("17145", 1.8, 60),
        ("17146", 2.5, 60), ("17180", 4.9, 50), ("17181", 5.3, 50), ("17182", 9.5, 50)]),
    "LINEO QUIET": ("lineo-quiet.pdf", None, [
        ("17160", 3.8, 45), ("17161", 3.6, 45), ("17162", 5.4, 55),
        ("17164", 8.6, 50), ("17165", 13.4, 50), ("17166", 28.3, 50)]),
    "CA MD EXTRA EU": ("ca-md.pdf", "IP44", [
        ("16107", 2.97, 50), ("16108", 3, 50), ("16153", 5.52, 50),
        ("16109", 2.98, 50), ("16155", 5.43, 50), ("16156", 6.55, 50), ("16157", 9.47, 50)]),
    "HEATMASTER F400": ("heatmaster.pdf", "IP55", [
        ("15301", 35.5, 60), ("15261", 35.5, 60), ("15302", 41, 60),
        ("15262", 41, 60), ("15303", 45, 60), ("15263", 45, 60),
        ("15264", 85, 60), ("15265", 96, 60), ("15266", 104, 60), ("15267", 140, 60)]),
    "SLIMROOF ES": ("slimroof.pdf", "IP54", [
        ("15271", 5, 60), ("15272", 5, 60), ("15273", 7, 60),
        ("15274", 9, 60), ("15275", 16, 60), ("15276", 17.5, 60),
        ("15277", 19, 60), ("15278", 73, 60), ("15279", 85, 60), ("15311", 100, 60)]),
}


def normalized(value):
    return re.sub(r'[\s"”*]+', '', value).upper()


def catalogue_name(model):
    name = model["model"]
    if model["seriesId"] == "CA MD EXTRA EU":
        name = name.removeprefix("CA MD EXTRA EU ").removesuffix(" EXTRA EU")
    return name


def missing(value):
    return value in (None, "", "-", "—", 0)


def extract(archive, data):
    import fitz
    pdfs, sources = {}, {}
    with zipfile.ZipFile(archive) as bundle:
        for name, (sha, count, feature, table, printed) in SOURCES.items():
            raw = bundle.read(name)
            if hashlib.sha256(raw).hexdigest() != sha:
                raise ValueError("Source hash mismatch: " + name)
            pdf = fitz.open(stream=raw, filetype="pdf")
            assert len(pdf) == count, name
            pdfs[name] = pdf
            sources[name] = {"sha256": sha, "pages": count, "featurePage": feature,
                             "modelTablePage": table, "printedTablePage": printed,
                             "origin": "user-supplied-manufacturer-catalogue", "editionYear": None}
    brands = {s["id"]: s["manufacturer"] for s in data["series"]}
    rows = []
    for sid, (name, common_ip, items) in GROUPS.items():
        source = sources[name]
        page = pdfs[name][source["modelTablePage"] - 1]
        features = pdfs[name][source["featurePage"] - 1].get_text()
        if sid == "CA MD EXTRA EU":
            assert "-25 °C / + 50 °C" in features and "IP44" in features
        if sid == "HEATMASTER F400":
            assert "-25°C" in features and "+60°C" in features and "80°C (120°C on" in features
        for code, weight, high in items:
            candidates = [m for m in data["models"] if m["seriesId"] == sid
                          and m["technical"].get("productCode") == code and brands[sid].upper() == "VORTICE"]
            assert len(candidates) == 1, (sid, code, "ambiguous or missing registry match")
            model = candidates[0]
            code_word = next(w for w in page.get_text("words") if w[4] == code)
            # Read only the named model's table row, never a neighbouring variant.
            box = fitz.Rect(0, code_word[1] - 3, page.rect.width, code_word[3] + 3)
            excerpt = page.get_text(clip=box).strip()
            model_box = fitz.Rect(0, code_word[1] - 3, code_word[0] - 2, code_word[3] + 3)
            printed_name = " ".join(line.strip() for line in page.get_text(clip=model_box).splitlines()
                                    if line.strip() != "NEW" and not line.strip().isdigit())
            assert normalized(printed_name) == normalized(catalogue_name(model)), (code, printed_name, model["model"])
            ip = common_ip
            if not ip:
                ip = re.search(r"\bIP(?:44|45|X5)\b", excerpt)[0]
            assert ip in features or ip in excerpt, (sid, code, ip)
            if sid.startswith("VORTICE VARIO"):
                assert re.search(r"\n" + re.escape(str(weight)) + r"0?\s*$", excerpt), (code, weight)
            elif sid in ("HEATMASTER F400", "SLIMROOF ES"):
                assert float(excerpt.splitlines()[-1]) == weight, (code, weight)
            low = -25 if sid in ("CA MD EXTRA EU", "HEATMASTER F400", "SLIMROOF ES") else None
            technical = {"ipClass": ip, "weight": weight,
                         "operatingTemperatureMinC": low, "operatingTemperatureMaxC": high}
            basis = "maximum-operating-temperature-no-lower-limit-specified"
            if sid == "HEATMASTER F400":
                basis = "operating-environment-range-not-treated-air-S1-or-fire-S2"
                technical["phase"] = "Single-phase" if " M4 " in model["model"] else "Three-phase"
            elif sid == "SLIMROOF ES":
                basis = "model-table-operating-range-overrides-general-family-range"
                # Page 2 names 610 T ES, but the table contains 630 T ES. Do not
                # silently repair that source typo to claim an exact phase match.
                if code != "15311":
                    assert model["model"] in features
                    technical["phase"] = "Single-phase" if " M ES" in model["model"] else "Three-phase"
            elif sid == "CA MD EXTRA EU":
                basis = "continuous-operating-range"
            elif code in ("12415", "12416"):
                assert "50 (50 Hz)" in excerpt and "40 (60 Hz)" in excerpt
                technical["operatingTemperatureByFrequencyC"] = {
                    "50": {"min": None, "max": 50}, "60": {"min": None, "max": 40}}
                basis = "frequency-specific-maximum-no-lower-limit-specified"
            rows.append({"id": model["id"], "seriesId": sid, "productCode": code,
                         "catalogueModel": printed_name.replace("\n", " "), "source": name,
                         "modelTablePage": source["modelTablePage"], "featurePage": source["featurePage"],
                         "technical": technical, "temperatureBasis": basis,
                         "ipBasis": "ducted-appliance" if sid in ("LINEO", "LINEO QUIET", "CA MD EXTRA EU") else "manufacturer-table-or-motor-protection",
                         "sourceRowExcerpt": excerpt})
    matched = {r["id"] for r in rows}
    excluded = [{"id": m["id"], "seriesId": m["seriesId"], "model": m["model"],
                 "reason": "exact-series-or-product-code-not-in-supplied-seven-PDFs"}
                for m in data["models"] if brands[m["seriesId"]].upper() == "VORTICE" and m["id"] not in matched]
    # Audit existing motor values without changing any selection input.
    conflicts = []
    for code, power, current in [("14615", .035, .17), ("12455", .035, .19), ("12415", .075, .41),
                                 ("12616", .035, .17), ("12456", .035, .19), ("12416", .075, .41)]:
        row = next(r for r in rows if r["productCode"] == code)
        model = next(m for m in data["models"] if m["id"] == row["id"])
        for field, value in [("power", power), ("current", current)]:
            if model["motor"][field] != value:
                conflicts.append({"id": row["id"], "field": "motor." + field,
                                  "existing": model["motor"][field], "sourceValueAt50Hz": value,
                                  "source": row["source"], "page": 1,
                                  "action": "preserved-pending-coordinated-motor-direction-and-curve-review"})
    for code, value in [("17145", 43), ("17146", 50.5)]:
        row = next(r for r in rows if r["productCode"] == code)
        model = next(m for m in data["models"] if m["id"] == row["id"])
        if model["motor"]["sound"] != value:
            conflicts.append({"id": row["id"], "field": "motor.sound", "existing": model["motor"]["sound"],
                              "sourceValueAtMaximumSpeed": value, "source": "lineo.pdf", "page": 1,
                              "action": "preserved-pending-operating-point-and-sound-basis-review"})
    return {"schemaVersion": 1, "status": "source-pages-visually-verified-2026-10-21",
            "sourceArchive": {"name": archive.name, "sha256": hashlib.sha256(archive.read_bytes()).hexdigest()},
            "sources": sources, "policy": {"exactCodeAndModelRequired": True, "fillMissingOnly": True,
                "motorAndSelectionDataChanged": False, "optionalSensorsAreNotIncludedFeatures": True,
                "unknownLowerLimit": None, "phaseRequiresExplicitModelSupplyStatement": True},
            "summary": {"series": len(GROUPS), "matchedModels": len(rows), "excludedModels": len(excluded)},
            "models": rows, "excluded": excluded, "existingValueConflicts": conflicts,
            "openSourceIssues": [
                {"source": "slimroof.pdf", "page": 2, "code": "15311", "issue": "Supply paragraph names 610 T ES; model table names 630 T ES. Phase remains unspecified for 15311."},
                {"source": "heatmaster.pdf", "page": 3, "code": "15267", "issue": "Voltage column prints 680; page 2 describes 400-690 V by size. Existing voltage retained pending manufacturer confirmation."},
                {"source": "vortice-vario.pdf / vortice-vario-i.pdf", "page": 1, "issue": "Two directional RPM/airflow values; no single RPM filled independently of the existing curves and motor data."},
                {"source": "lineo.pdf", "page": 1, "issue": "17180/17181/17182 table is 50 Hz, existing motor frequency is 50/60 Hz. Preserved pending exact model supply verification."}]}


def apply(artifact, data):
    models = {m["id"]: m for m in data["models"]}
    brands = {s["id"]: s["manufacturer"] for s in data["series"]}
    counts = Counter()
    for row in artifact["models"]:
        model = models[row["id"]]
        assert model["seriesId"] == row["seriesId"] and brands[model["seriesId"]].upper() == "VORTICE"
        assert model["technical"]["productCode"] == row["productCode"]
        technical, source = model["technical"], artifact["sources"][row["source"]]
        completed = []
        for field in ("ipClass", "weight", "phase"):
            if field in row["technical"] and missing(technical.get(field)):
                technical[field] = row["technical"][field]
                completed.append(field)
                counts[field] += 1
        low, high = technical.get("operatingTemperatureMinC"), technical.get("operatingTemperatureMaxC")
        range_missing = (low, high) == (0, 0) or (low in (None, "") and high in (None, ""))
        if range_missing and not technical.get("operatingTemperatureByFrequencyC"):
            for field in ("operatingTemperatureMinC", "operatingTemperatureMaxC", "operatingTemperatureByFrequencyC"):
                if field in row["technical"]:
                    technical[field] = row["technical"][field]
                    completed.append(field)
            counts["operatingTemperature"] += 1
        if completed:
            verification = model.setdefault("verification", {})
            assert "catalogueDetails" not in verification, "Do not replace older field provenance"
            verification["catalogueDetails"] = {
                "evidence": EVIDENCE, "source": row["source"], "sourceSha256": source["sha256"],
                "modelTablePage": row["modelTablePage"], "featurePage": row["featurePage"],
                "catalogueModel": row["catalogueModel"], "fields": completed,
                "temperatureBasis": row["temperatureBasis"]}
            counts["modelsUpdated"] += 1
    return dict(counts)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    target = ROOT / "data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    artifact = extract(args.archive, data)
    result = apply(artifact, data)
    (ROOT / EVIDENCE).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / EVIDENCE).write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
    target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({**artifact["summary"], "completed": result, "conflictsPreserved": len(artifact["existingValueConflicts"])}))

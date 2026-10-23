#!/usr/bin/env python3
"""Complete six existing 230 V DESIGN records from two supplied source PDFs.

No speed/current is invented from ECOWATT, 12 V kits, PLUS or sensor variants.
DECOR uses its model-table IPX4 with the conflicting prose IP44 recorded openly.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = "assets/products/soler-palau/design-catalogue-details.json"
SOURCES = {
    "decor-design-0.pdf": {"sha256": "b2d3c15cf329fd1beaf9b8110fa88c43cfbbb8c639b27b4c616678547975555d", "pages": 6},
    "silent-design-0.pdf": {"sha256": "2f57c1b79d33495f5423e9eaf99acc6ea1a60d98483b1ea3e3d4ec58c6a3e193", "pages": 9},
}
# Existing name, source row, table/description pages, P1 W, LpA at 3 m, flow, kg.
ROWS = [
    ("DECOR-100 DESIGN", "DECOR-100 DESIGN", 2, 1, 10.7, 33, 80, .55),
    ("DECOR-200 DESIGN", "DECOR-200 DESIGN", 4, 3, 19.7, 39, 163, .9),
    ("DECOR-300 DESIGN", "DECOR-300 DESIGN", 6, 5, 23, 40, 230, 1.6),
    ("SILENT-100 DESIGN", "SILENT-100 DESIGN 3C", 3, 1, 8, 26.5, 85, .65),
    ("SILENT-200 DESIGN", "SILENT-200 DESIGN-3C", 7, 6, 16, 35, 175, .88),
    ("SILENT-300 DESIGN", "SILENT-300 DESIGN", 9, 8, 26, 38, 250, 1.5),
]


def descriptions():
    return {
        "DECOR DESIGN": {
            "general": [
                ("Decorative plastic axial exhaust fans for bathroom and toilet ventilation.", "Banyo ve WC havalandırması için plastik enjeksiyon gövdeli dekoratif aksiyel egzoz fanlarıdır."),
                ("An air-pressure-operated backdraught shutter closes when the fan stops, limiting reverse airflow and heat loss.", "Hava basıncıyla açılan geri akış klapesi fan durduğunda kapanarak ters hava akışını ve ısı kaybını azaltır."),
                ("A neon operating indicator is provided on C, CR and CH versions.", "Katalogdaki C, CR ve CH versiyonlarında neon çalışma göstergesi bulunur."),
                ("CR versions include a 1–30 minute timer; CH versions also have adjustable humidity control.", "CR versiyonunda 1–30 dakika zamanlayıcı; CH versiyonunda ayrıca ayarlanabilir nem kontrolü bulunur."),
                ("A silver front cover is available as an option.", "Gümüş ön kapak isteğe bağlı bir yüzey seçeneğidir.")],
            "motor": [
                ("Single-phase 230 V, 50 Hz; class B motor insulation and overload protection.", "Monofaze 230 V, 50 Hz motorlar B motor yalıtım sınıfına ve aşırı yük korumasına sahiptir."),
                ("Class II electrical protection; model tables state IPX4, whereas the prose states IP44. Verify the rating on the product label.", "Model tablolarında Sınıf II elektriksel koruma ve IPX4 belirtilir. Açıklama sayfalarında IP44 yazdığından kesin koruma sınıfı ürün etiketiyle doğrulanmalıdır."),
                ("Maximum air temperature is 40 °C; the lower limit is not specified.", "Belgelenen maksimum hava sıcaklığı 40 °C’dir; alt sıcaklık sınırı belirtilmemiştir.")],
            "applications": [("Bathroom and toilet exhaust ventilation with the selected duct size.", "Seçilen model için belirtilen kanal çapıyla banyo ve WC egzoz havalandırmasında kullanılır.")]},
        "SILENT DESIGN": {
            "general": [
                ("Decorative plastic axial exhaust fans for bathroom and toilet ventilation.", "Banyo ve WC havalandırması için plastik enjeksiyon gövdeli dekoratif aksiyel egzoz fanlarıdır."),
                ("Elastic motor mounts reduce vibration and sound transmission to the surrounding structure.", "Motor, titreşimin ve sesin çevre yapıya iletimini azaltan elastik sessiz takozlar üzerine yerleştirilmiştir."),
                ("A backdraught shutter, pilot light and ball bearings are standard on the 3C versions.", "Standart 3C versiyonlarında geri akış klapesi, pilot ışığı ve bilyalı rulman bulunur."),
                ("CRZ versions have a 1–30 minute timer; CHZ versions also include adjustable humidity control.", "CRZ versiyonunda 1–30 dakika zamanlayıcı; CHZ versiyonunda ayrıca ayarlanabilir nem kontrolü bulunur."),
                ("ECOWATT, 12 V kits and SILENT-300 PLUS are separate versions.", "ECOWATT, 12 V kitleri ve SILENT-300 PLUS ayrı versiyonlardır.")],
            "motor": [
                ("Single-phase 230 V, 50 Hz; class B motor insulation, overload protection, Class II electrical protection and IP45.", "Monofaze 230 V, 50 Hz motorlarda B motor yalıtımı, aşırı yük koruması, Sınıf II elektriksel koruma ve IP45 bulunur."),
                ("Maximum air temperature is 40 °C; the lower limit is not specified.", "Belgelenen maksimum hava sıcaklığı 40 °C’dir; alt sıcaklık sınırı belirtilmemiştir.")],
            "applications": [("Bathroom and toilet exhaust ventilation with the selected duct size.", "Seçilen model için belirtilen kanal çapıyla banyo ve WC egzoz havalandırmasında kullanılır.")]}}


def extract(directory, data):
    import fitz
    sources, pdfs = copy.deepcopy(SOURCES), {}
    for name, source in sources.items():
        raw = (directory / name).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source["sha256"], name
        pdfs[name] = fitz.open(stream=raw, filetype="pdf")
        assert len(pdfs[name]) == source["pages"]
        source.update(origin="user-supplied-manufacturer-catalogue", verifiedOn="2026-10-23")
    descriptions_by_series = descriptions()
    rows = []
    for label, source_label, table, narrative, watts, sound, flow, weight in ROWS:
        silent = label.startswith("SILENT")
        sid, name = ("SILENT DESIGN", "silent-design-0.pdf") if silent else ("DECOR DESIGN", "decor-design-0.pdf")
        matches = [m for m in data["models"] if m["model"] == label and m["seriesId"] == sid]
        assert len(matches) == 1, label
        model = matches[0]
        table_text = pdfs[name][table - 1].get_text()
        assert source_label in table_text, (name, source_label)
        assert model["motor"]["voltage"] == "230 V" and model["performance"]["maxAirflow"] == flow
        basis = "free-air-electrical-input-P1" if silent and "300" not in label else "maximum-electrical-input-P1"
        technical = {"ipClass": "IP45" if silent else "IPX4", "weight": weight,
                     "operatingTemperatureMinC": None, "operatingTemperatureMaxC": 40,
                     "phase": "Single-phase", "insulationClass": "B", "electricalProtectionClass": "II",
                     "overloadProtection": True, "powerBasis": basis,
                     "soundBasis": "sound-pressure-3m-free-field", "soundMeasurementDistanceM": 3}
        features = {"en": ["Backdraught Shutter", "Pilot Light" if silent else "Neon Indicator", "Overload Protection", "Class II"],
                    "tr": ["Geri Tepme Ventili", "Pilot Işığı" if silent else "Neon Gösterge", "Aşırı Yük Koruması", "Sınıf II"]}
        if silent:
            features["en"] += ["Vibration-Isolating Mounts", "Ball-Bearing Motor"]
            features["tr"] += ["Titreşim Sönümleyici Takozlar", "Rulmanlı Motor"]
        else:
            # The model and series descriptions expose this note in both languages.
            technical["ipSourceConflict"] = {"modelTable": "IPX4", "narrative": "IP44", "used": "IPX4"}
        desc = {key: [pair[0] for pair in pairs] for key, pairs in descriptions_by_series[sid].items()}
        rows.append({"id": model["id"], "model": label, "seriesId": sid, "productCode": model["technical"]["productCode"],
                     "source": name, "tablePage": table, "narrativePage": narrative, "sourceRowLabel": source_label,
                     "motor": {"power": watts / 1000, "sound": sound, "voltage": "230 V", "frequency": "50 Hz"},
                     "technical": technical, "features": features, "description": desc,
                     "sourceMaxAirflow": flow, "unknownFields": ["motor.speed", "motor.current"],
                     "sourceTableText": table_text[table_text.index("TEKNİK ÖZELLİKLER"):].split("ÖLÇÜLER")[0]})
    return {"schemaVersion": 1, "verifiedOn": "2026-10-23", "sources": sources, "models": rows,
            "series": {sid: {key: {"en": [p[0] for p in pairs], "tr": [p[1] for p in pairs]} for key, pairs in desc.items()}
                       for sid, desc in descriptions_by_series.items()},
            "policy": {"existing230VRowsOnly": True, "rpmAndCurrentNotInferred": True, "lowerTemperatureNotInferred": True,
                       "optionalTimerHumidityAndFinishNotAssigned": True, "preserveCurvesPricesDimensionsAndAirflow": True},
            "sourceConflicts": [{"seriesId": "DECOR DESIGN", "narrative": "IP44", "modelTables": "IPX4",
                                 "used": "IPX4", "action": "model-table-used-with-visible-source-conflict-warning"}]}


def apply(artifact, data):
    models = {m["id"]: m for m in data["models"]}
    series = {s["id"]: s for s in data["series"]}
    changes, series_changes = [], []
    missing = lambda value: value is None or value in ("", "-", "—", 0)

    def set_value(obj, path, value, ledger, identity):
        parent = obj
        for key in path[:-1]: parent = parent[key]
        key = path[-1]
        if key in parent and parent[key] == value: return
        ledger.append({"id": identity, "path": path, "previousPresent": key in parent,
                       "previous": copy.deepcopy(parent.get(key)), "value": copy.deepcopy(value)})
        parent[key] = copy.deepcopy(value)

    for row in artifact["models"]:
        m = models[row["id"]]
        assert (m["model"], m["seriesId"], m["technical"]["productCode"]) == (row["model"], row["seriesId"], row["productCode"])
        assert series[m["seriesId"]]["manufacturer"] == "Soler & Palau"
        start = len(changes)
        for field, value in row["motor"].items():
            if missing(m["motor"].get(field)): set_value(m, ["motor", field], value, changes, m["id"])
        t = m["technical"]
        unknown_range = (t.get("operatingTemperatureMinC"), t.get("operatingTemperatureMaxC")) in ((0, 0), (None, None))
        for field, value in row["technical"].items():
            if field.startswith("operatingTemperature"):
                if not unknown_range: continue
            elif not missing(t.get(field)): continue
            set_value(m, ["technical", field], value, changes, m["id"])
        for field in ["features", "description"]:
            if not m.get(field): set_value(m, [field], row[field], changes, m["id"])
        for i, point in enumerate(m["performance"].get("operatingPoints", [])):
            if point["control"] != "Nominal": continue
            for field in ["power", "sound"]:
                if missing(point.get(field)): set_value(m, ["performance", "operatingPoints", i, field], row["motor"][field], changes, m["id"])
        if len(changes) != start:
            assert "designCatalogue" not in m["verification"]
            set_value(m, ["verification", "designCatalogue"], {"evidence": EVIDENCE, "source": row["source"],
                "sha256": artifact["sources"][row["source"]]["sha256"], "tablePage": row["tablePage"],
                "narrativePage": row["narrativePage"], "verifiedOn": artifact["verifiedOn"]}, changes, m["id"])
    for sid, desc in artifact["series"].items():
        target = {key: values["en"] for key, values in desc.items()}
        old = series[sid]["description"]
        if old == target: continue
        assert any("Bilgiler üreticinin" in s for s in old["general"]), sid
        set_value(series[sid], ["description"], target, series_changes, sid)
    translations = data.setdefault("contentTranslations", {})
    for desc in artifact["series"].values():
        for values in desc.values():
            for en, tr in zip(values["en"], values["tr"]):
                assert en not in translations or translations[en] == tr, en
                translations[en] = tr
    return changes, series_changes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    target = ROOT / "data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    artifact = extract(args.directory, data)
    changes, series_changes = apply(artifact, data)
    evidence = ROOT / EVIDENCE
    if not changes and not series_changes and evidence.exists():
        old = json.loads(evidence.read_text())
        assert old["sources"] == artifact["sources"] and old["models"] == artifact["models"]
    else:
        assert not evidence.exists(), "Preserve the original source audit"
        artifact["preservation"] = {"baseCommit": "9e8a2a0ddcabb1551e7d36183b3d1b03663a3e60", "modelChanges": changes, "seriesChanges": series_changes}
        evidence.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
        target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({"modelsMatched": len(artifact["models"]), "modelsUpdated": len({c["id"] for c in changes}), "seriesUpdated": len(series_changes)}))

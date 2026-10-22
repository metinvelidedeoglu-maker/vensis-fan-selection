#!/usr/bin/env python3
"""Complete ten existing TD/TH models from the three supplied, hash-locked PDFs.

Catalogue cards use the high-speed exhaust duty. Existing selection geometry,
flow coordinates, dimensions, prices and product IDs are preserved. The TH ATEX
table and its original marking are image text, independently read and OCR checked.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = "assets/products/soler-palau/td-th-catalogue-details.json"
SOURCES = {
    "td-atex-0.pdf": {"sha256": "24e45310124fc1774d4a8cd3a7e0119278c7cab243a34a4b3c965bee13771860", "pages": 4, "tablePage": 2},
    "th-atex-0.pdf": {"sha256": "a3a04f5176a4aefa6ff2e6e6cb4c2dd4206aad49c932a0a77a67f3edf9f29580", "pages": 3, "tablePage": 1},
    "th-mixvent-0.pdf": {"sha256": "b543b4b48e9c44a6b26f473bd94ed308f6930c421c58a53d72f63a8575a9b5d8", "pages": 6, "tablePage": 2},
}
# RPM, maximum P1 W, A230, maximum m3/h, inlet/radiated/outlet LpA, kg.
TD = {"TD-800/200 EX": (2450, 130, .54, 1020, 53, 43, 55, 5),
      "TD-1100/250 EX": (2630, 197, .81, 1130, 59, 46, 65, 20),
      "TD-1200/315 EX": (2600, 170, .71, 1320, 56, 44, 59, 25)}
# RPM, maximum P1 W, A230, maximum m3/h, inlet/outlet LpA, kg.
TH_EX = {"TH-800/200 EX": (2450, 120, .50, 800, 58, 59, 8),
         "TH-1100/250 EX": (2630, 197, .85, 965, 55, 63, 22),
         "TH-1200/315 EX": (2600, 170, .74, 1150, 52, 56, 28)}
# Exhaust HS/LS RPM, HS/LS P1 W, HS/LS A230, HS/LS flow, HS LpA, kg, minimum C.
TH = {"TH-500/150": (2450, 1800, 50, 45, .23, .18, 470, 355, 49.5, 3.8, -20),
      "TH-800": (2500, 2100, 120, 118, .52, .50, 775, 620, 53, 5.6, -20),
      "TH-1300": (2400, 1800, 170, 120, .83, .52, 1100, 780, 59.5, 11.2, -40),
      "TH-2000": (2480, 1750, 255, 160, 1.27, .79, 1725, 1200, 67, 17.2, -40)}


def bilingual(pairs):
    return {"en": [p[0] for p in pairs], "tr": [p[1] for p in pairs]}


def descriptions():
    return {
        "TD ATEX": {
            "general": bilingual([
                ("Low-profile mixed-flow duct fans for potentially explosive gas extraction.", "Potansiyel patlayıcı gazların tahliyesi için düşük profilli, kanal tipi karma akışlı fanlardır."),
                ("The motor and impeller assembly can be removed without disconnecting the ducts.", "Motor ve pervane grubu, kanal bağlantıları sökülmeden çıkarılabilir."),
                ("The 800 model has an antistatic plastic casing; the 1100 and 1200 models use polyester-coated steel.", "800 modelinde antistatik plastik gövde; 1100 ve 1200 modellerinde polyester boyalı çelik gövde kullanılır."),
                ("An accessible external terminal box, ATEX capacitor and earth connection are provided.", "Kolay erişilen harici bağlantı kutusu, ATEX kondansatör ve topraklama bağlantısı bulunur.")]),
            "motor": bilingual([
                ("Single-phase 230 V, 50 Hz motors with IP44 protection and class B insulation.", "Monofaze 230 V, 50 Hz motorlar IP44 koruma ve B yalıtım sınıfına sahiptir."),
                ("The catalogue specifies an operating temperature range of -20 to +40 °C.", "Katalogda çalışma sıcaklığı aralığı -20 ile +40 °C olarak belirtilir.")]),
            "applications": bilingual([
                ("Match the equipment marking, certificate and installation conditions to the hazardous-area assessment.", "Ürün işaretlemesi, sertifika ve montaj koşulları tehlikeli alan değerlendirmesiyle eşleştirilmelidir.")])},
        "TH ATEX": {
            "general": bilingual([
                ("Roof-mounted mixed-flow fans for extraction of hazardous and potentially explosive gases.", "Tehlikeli ve potansiyel patlayıcı gazların tahliyesi için çatı tipi karma akışlı fanlardır."),
                ("Bird protection is provided, and the fan unit can be removed without disconnecting the duct.", "Kuş koruması bulunur; fan ünitesi kanal bağlantısı sökülmeden çıkarılabilir."),
                ("The 800/200 version uses antistatic plastic; the larger models have epoxy-polyester-coated steel construction.", "800/200 versiyonunda antistatik plastik; büyük modellerde epoksi-polyester boyalı çelik yapı kullanılır."),
                ("The accessible external electrical connection box is IP55; the motor protection rating is IP44.", "Kolay erişilen harici elektrik bağlantı kutusu IP55, motor koruma sınıfı ise IP44’tür.")]),
            "motor": bilingual([
                ("Single-phase 230 V, 50 Hz motors with class B insulation; operation from -20 to +40 °C.", "Monofaze 230 V, 50 Hz ve B yalıtım sınıfı motorlarla -20 ile +40 °C arasında çalışır.")]),
            "applications": bilingual([
                ("Verify the original equipment marking and certificate against the project requirements before installation.", "Montajdan önce ürünün orijinal işaretlemesi ve sertifikası proje gereklilikleriyle doğrulanmalıdır.")])},
        "TH-MIXVENT": {
            "general": bilingual([
                ("Roof-mounted mixed-flow fans supplied in the standard exhaust configuration.", "Standart olarak egzoz düzeninde sunulan çatı tipi karma akışlı fanlardır."),
                ("The 500 and 800 bodies are reinforced moulded plastic; the 1300 and 2000 bodies are pressed steel.", "500 ve 800 gövdeleri takviyeli kalıplanmış plastikten; 1300 ve 2000 gövdeleri preslenmiş çelikten üretilir."),
                ("All models have a steel mounting base, bird protection and a cable gland; metal parts have a weather-resistant black epoxy-polyester coating.", "Tüm modellerde çelik montaj kaidesi, kuş koruması ve kablo rakoru bulunur; metal parçalar dış hava koşullarına dayanıklı siyah epoksi-polyester boyalıdır."),
                ("Two clamps release the motor and impeller assembly for maintenance.", "İki kelepçe sayesinde motor ve pervane grubu bakım için çıkarılabilir."),
                ("Supply operation requires rotating the motor and fan assembly by 180 degrees; its performance values differ from exhaust duty.", "Besleme kullanımı için motor ve fan grubu 180 derece döndürülür; bu düzenin performans değerleri egzozdan farklıdır.")]),
            "motor": bilingual([
                ("Single-phase 230 V, 50 Hz, IP44 class B motors with thermal protection and long-life ball bearings.", "Monofaze 230 V, 50 Hz motorlar IP44, B yalıtım sınıfı, termal koruma ve uzun ömürlü rulman yataklara sahiptir."),
                ("Two-speed connections are provided; electronic or autotransformer voltage control is also supported.", "Çift devir bağlantısı bulunur; elektronik veya ototransformatörlü voltaj kontrolüyle de hız ayarı yapılabilir."),
                ("The card uses high-speed exhaust data; the temperature limits are specific to each model.", "Kartta yüksek devir egzoz verileri kullanılır; sıcaklık sınırları modele göre değişir.")]),
            "applications": bilingual([
                ("Exhaust ventilation through circular rigid or flexible ducts.", "Yuvarlak rijit veya esnek kanallarla egzoz havalandırması için kullanılır.")])}}


def extract(directory, data):
    import fitz
    pdfs = {}
    sources = copy.deepcopy(SOURCES)
    for name, source in sources.items():
        raw = (directory / name).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source["sha256"], name
        pdfs[name] = fitz.open(stream=raw, filetype="pdf")
        assert len(pdfs[name]) == source["pages"], name
        source.update(origin="user-supplied-manufacturer-catalogue", verifiedOn="2026-10-22")
    rows = []
    groups = [(TD, "TD ATEX", "td-atex-0.pdf"), (TH_EX, "TH ATEX", "th-atex-0.pdf"), (TH, "TH-MIXVENT", "th-mixvent-0.pdf")]
    desc = descriptions()
    for group, sid, name in groups:
        for label, values in group.items():
            matches = [m for m in data["models"] if m["model"] == label and m["seriesId"] == sid]
            assert len(matches) == 1, label
            model = matches[0]
            technical = {"phase": "Single-phase", "ipClass": "IP44", "insulationClass": "B",
                         "powerBasis": "maximum-electrical-input-P1", "current230A": values[2] if group is not TH else values[4],
                         "currentReferenceVoltageV": 230}
            controls = {}
            if group is TD:
                rpm, watts, amps, flow, inlet, radiated, outlet, weight = values
                sound, minimum, maximum = radiated, -20, 40
                technical.update(soundBasis="radiated-sound-pressure-3m-free-field-operating-point-B",
                                 soundRadiatedDbA3m=radiated, soundInletDbA=inlet, soundOutletDbA=outlet,
                                 soundOperatingPoint="B", externalTerminalBoxIpClass="IP55")
                features = bilingual([("Removable Motor Assembly", "Sökülebilir Motor Grubu"), ("External Terminal Box", "Harici Bağlantı Kutusu")])
                marking = "II 2G Ex eb IIB T3 Gb"
                source_label = label.replace(" EX", " ATEX")
                assert source_label in pdfs[name][1].get_text(), source_label
            elif group is TH_EX:
                rpm, watts, amps, flow, sound, outlet, weight = values
                minimum, maximum = -20, 40
                technical.update(soundBasis="inlet-sound-pressure-3m-free-field-operating-point-A",
                                 soundInletDbA3m=sound, soundOutletDbA3m=outlet, soundOperatingPoint="A",
                                 externalTerminalBoxIpClass="IP55")
                features = bilingual([("Bird Protection", "Kuş Koruması"), ("Removable Motor Assembly", "Sökülebilir Motor Grubu")])
                # Preserve this source's literal image marking; do not infer II 2G or borrow TD's IIB.
                marking = "IIG Exe IIC T3 Gb"
                source_label = label
            else:
                rpm, low_rpm, watts, low_watts, amps, low_amps, flow, low_flow, sound, weight, minimum = values
                maximum = 60
                technical.update(soundBasis="sound-pressure-3m-high-speed-exhaust", thermalProtection=True)
                features = bilingual([("Two Speeds", "İki Hız"), ("Thermal Protection", "Termal Koruma"),
                                      ("Bird Protection", "Kuş Koruması"), ("Ball-Bearing Motor", "Rulmanlı Motor")])
                controls = {"HS": {"power": watts / 1000, "speed": rpm, "current": amps, "sound": sound},
                            "LS": {"power": low_watts / 1000, "speed": low_rpm, "current": low_amps}}
                source_label = label
                assert label in pdfs[name][1].get_text(), label
            technical.update(weight=weight, operatingTemperatureMinC=minimum, operatingTemperatureMaxC=maximum,
                             soundMeasurementDistanceM=3)
            if group is not TH:
                certificate = "LOM 08 ATEX 2052 X Ek 2" if "800/200" in label else "LOM 11 ATEX 2021 X Ek 1"
                technical["atex"] = {"gas_marking": marking, "gas_group": "IIB" if group is TD else "IIC",
                                     "temperature_class": "T3", "epl": "Gb", "certificate": certificate}
                technical["safetyWarning"] = ("Katalogdaki ATEX işaretlemesi: " + marking + ". " +
                    "Ürün etiketi, sertifika ve proje koşullarıyla doğrulayın; bağlantı kutusunun IP55 değeri motorun IP44 koruma sınıfını değiştirmez.")
            row_desc = {key: value["en"] for key, value in desc[sid].items()}
            rows.append({"id": model["id"], "model": label, "seriesId": sid,
                         "productCode": model["technical"]["productCode"], "source": name,
                         "tablePage": sources[name]["tablePage"], "featurePages": [1],
                         "sourceRowLabel": source_label, "sourceRowValues": list(values),
                         "extractionMethod": "page-image-transcription-cross-checked-with-OCR" if group is TH_EX else "PDF-table-and-page-image-cross-check",
                         "motor": {"power": watts / 1000, "speed": rpm, "current": amps, "voltage": "230 V", "frequency": "50 Hz", "sound": sound},
                         "technical": technical, "features": features, "description": row_desc,
                         "controls": controls, "sourceMaxAirflow": flow})
    return {"schemaVersion": 1, "verifiedOn": "2026-10-22", "sources": sources, "models": rows, "series": desc,
            "policy": {"cardDuty": "high-speed-exhaust", "preserveSelectionGeometry": True,
                       "preservePricesAndDimensions": True, "motorIp44NotTerminalBoxIp55": True,
                       "tdRadiatedLpA3mBNotLwA": True, "thInletLpA3mANotLwA": True,
                       "lowSpeedSoundNotInferred": True, "thOriginalAtexMarkingPreserved": True},
            "sourceCaveats": ["TH-MIXVENT page 1 lists a 1200 cap-material version although its table has TH-1300; this unsupported material detail is not copied.",
                              "TH ATEX original image marking is IIG Exe IIC T3 Gb; its literal text is retained and label/certificate verification is required."]}


def apply(artifact, data):
    models = {m["id"]: m for m in data["models"]}
    series = {s["id"]: s for s in data["series"]}
    model_changes, series_changes = [], []
    missing = lambda v: v is None or v == "" or v == "-" or v == "—" or v == 0

    def set_value(obj, path, value, changes, identity):
        parent = obj
        for key in path[:-1]:
            parent = parent[key]
        key = path[-1]
        if key in parent and parent[key] == value:
            return
        changes.append({"id": identity, "path": path, "previousPresent": key in parent,
                        "previous": copy.deepcopy(parent.get(key)), "value": copy.deepcopy(value)})
        parent[key] = copy.deepcopy(value)

    for row in artifact["models"]:
        m = models[row["id"]]
        assert (m["seriesId"], m["model"], m["technical"]["productCode"]) == (row["seriesId"], row["model"], row["productCode"])
        assert series[m["seriesId"]]["manufacturer"] == "Soler & Palau"
        start = len(model_changes)
        for field, value in row["motor"].items():
            if missing(m["motor"].get(field)):
                set_value(m, ["motor", field], value, model_changes, m["id"])
        t = m["technical"]
        unknown_range = (t.get("operatingTemperatureMinC"), t.get("operatingTemperatureMaxC")) in ((0, 0), (None, None))
        for field, value in row["technical"].items():
            if field.startswith("operatingTemperature"):
                if not unknown_range:
                    continue
            elif not missing(t.get(field)):
                continue
            set_value(m, ["technical", field], value, model_changes, m["id"])
        for field in ["features", "description"]:
            if not m.get(field):
                set_value(m, [field], row[field], model_changes, m["id"])
        for i, point in enumerate(m["performance"].get("operatingPoints", [])):
            values = row["motor"] if point["control"] == "Nominal" else row["controls"].get(point["control"], {})
            for field in ["power", "speed", "current", "sound"]:
                if field in values and missing(point.get(field)):
                    set_value(m, ["performance", "operatingPoints", i, field], values[field], model_changes, m["id"])
        # These two card maximums disagree with the exact exhaust table. Do not change curve/selection flow coordinates.
        old_max = {"TH-500/150": 500, "TH-2000": 1720}.get(m["model"])
        if old_max is not None:
            assert m["performance"]["maxAirflow"] in (old_max, row["sourceMaxAirflow"]), m["model"]
            set_value(m, ["performance", "maxAirflow"], row["sourceMaxAirflow"], model_changes, m["id"])
        if len(model_changes) != start:
            assert "tdThCatalogue" not in m["verification"], "Do not overwrite previous verification"
            set_value(m, ["verification", "tdThCatalogue"], {
                "evidence": EVIDENCE, "source": row["source"], "sha256": artifact["sources"][row["source"]]["sha256"],
                "tablePage": row["tablePage"], "featurePages": [1], "verifiedOn": artifact["verifiedOn"]}, model_changes, m["id"])
    for sid, desc in artifact["series"].items():
        old = series[sid]["description"]
        if old == {key: values["en"] for key, values in desc.items()}:
            continue
        assert len(old.get("general", [])) == 2 and any("Bilgiler üreticinin" in s for s in old["general"]), sid
        set_value(series[sid], ["description"], {key: values["en"] for key, values in desc.items()}, series_changes, sid)
    translations = data.setdefault("contentTranslations", {})
    for desc in artifact["series"].values():
        for values in desc.values():
            for en, tr in zip(values["en"], values["tr"]):
                assert en not in translations or translations[en] == tr, en
                translations[en] = tr
    return model_changes, series_changes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    target = ROOT / "data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    artifact = extract(args.directory, data)
    model_changes, series_changes = apply(artifact, data)
    evidence = ROOT / EVIDENCE
    if not model_changes and not series_changes and evidence.exists():
        prior = json.loads(evidence.read_text())
        assert prior["sources"] == artifact["sources"] and prior["models"] == artifact["models"]
    else:
        assert not evidence.exists(), "Keep the original audit history"
        artifact["preservation"] = {"baseCommit": "fa9bb277c98b1039dedd819da6ef36dac7c6965f",
                                    "modelChanges": model_changes, "seriesChanges": series_changes}
        evidence.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n")
        target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({"modelsMatched": len(artifact["models"]), "modelsUpdated": len({c["id"] for c in model_changes}),
                      "seriesUpdated": len(series_changes)}))

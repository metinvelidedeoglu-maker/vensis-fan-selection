#!/usr/bin/env python3
"""Complete 23 existing S&P duct/cabinet fans from five supplied catalogues.

Motor and terminal-box IP classes, standard/timer/three-phase versions, acoustic
references and the JETLINE-315 source weight discrepancy are kept distinct.
No selection curve, operating-point flow, price or dimension is changed.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = "assets/products/soler-palau/duct-catalogue-details.json"
BASE = "e4d608b395a6cdac3ae60d1d332fa9b959209a54"
SOURCES = {
    "cab-0.pdf": {"sha256": "65254a4fda2be46353601be4e51ac7b15616da23f4b6d42fc42edfe0dc5dd856", "pages": 5},
    "jetline-3.pdf": {"sha256": "ac6b5547fde34ae02cebb01d54834c561bdecc67e6961c09b5b06ee0d53cb3e2", "pages": 7},
    "silentub-0.pdf": {"sha256": "a5c6334013cec74691969f6aabce0932e30d6c9d3c4f3b04b2100f805f4a256a", "pages": 2},
    "tdm-0.pdf": {"sha256": "9d0ea00199f22b39f2b81e221b30c8bec63526e1d37935e09bb5d0f32ffbbb40", "pages": 2},
    "td-0.pdf": {"sha256": "25e584f68572b8925d9c612950d5314fa4cdd8f1fd59e3acb0cc462e106fba68", "pages": 12},
}
# Exact standard model, RPM, electrical W, A (None = absent), LpA, Qmax, kg.
ROWS = {
    "CAB": [("CAB-125",1350,50,.2,29,240,16), ("CAB-200",2000,205,.7,37,690,22),
            ("CAB-250N",2000,370,1.4,38,1230,27), ("CAB-315",1400,430,1.8,37,2210,33),
            ("CAB-355",1400,1100,4.6,44,3150,35), ("CAB-400",1400,1100,4.6,44,3400,35)],
    "JETLINE": [("JETLINE-100",2650,16,.10,39,267,3), ("JETLINE-125",2680,38,.18,47,411,3.4),
                ("JETLINE-150",2720,75,.40,50,717,4.5), ("JETLINE-160",2720,79,.40,51,750,4.5),
                ("JETLINE-200",2620,117,.55,54,1040,5.6), ("JETLINE-250",2715,160,.67,58,1279,6.5),
                ("JETLINE-315",2595,215,.89,60,1610,8.4)],
    "SILENTUB": [("SILENTUB-100",2450,12,None,37.5,100,.5)],
    "TDM": [("TDM-100",2500,13,None,40,110,.4), ("TDM-200",2600,25,None,44.5,200,.6),
            ("TDM-300",2200,35,None,45,300,1.5)],
    "TD-MIXVENT": [("TD-250/100",2140,28,.12,34,250,2), ("TD-350/125",2050,25,.11,33,330,2),
                   ("TD-500/150",2590,53,.21,35,560,2.7), ("TD-800/200",2480,132,.55,40,1040,4.9),
                   ("TD-4000/355",1360,407,1.69,41,3750,19), ("TD-6000/400",1400,580,2.42,43,5100,26)],
}
FILE = {"CAB":"cab-0.pdf", "JETLINE":"jetline-3.pdf", "SILENTUB":"silentub-0.pdf", "TDM":"tdm-0.pdf", "TD-MIXVENT":"td-0.pdf"}
OLD_MAX = {"CAB-125":220,"CAB-200":920,"CAB-250N":1180,"CAB-355":3200,"CAB-400":3080}


def descriptions():
    return {
        "CAB": {
            "general": [
                ("Galvanised-steel acoustic cabinets contain directly coupled, forward-curved centrifugal fans.", "Galvaniz çelik akustik kabin içinde doğrudan akuple, ileri eğik kanatlı radyal fan bulunur."),
                ("A 50 mm M0 glass-wool lining reduces noise; gasketed inlet and outlet flanges limit air leakage.", "50 mm M0 sınıfı cam yünü kaplama sesi azaltır; contalı emiş ve atış flanşları hava kaçaklarını sınırlar."),
                ("Quick-fix access simplifies maintenance; four feet support wall, ceiling or floor mounting in any orientation.", "Hızlı açılır bakım erişimi ve dört montaj ayağıyla duvar, tavan veya zemine farklı konumlarda montaj yapılabilir."),
                ("The cabinets are suitable for outdoor installation.", "Kabinler dış ortama montaja uygundur.")],
            "motor": [
                ("Single-phase 230 V, 50 Hz, ball bearings and thermal protection; voltage speed control is supported.", "Monofaze 230 V, 50 Hz motorlar rulman yataklı ve termal korumalıdır; voltajla hız kontrolüne uygundur."),
                ("CAB-125 to 315 motors are IP44/class B; CAB-315N to 400 motors are IP55/class F. The external terminal box is IP55.", "CAB-125–315 motorları IP44/B; CAB-315N–400 motorları IP55/F sınıfındadır. Harici terminal kutusu IP55’tir."),
                ("Operating air temperature: -20 to +40 °C.", "Çalışma havası sıcaklığı -20 ile +40 °C arasındadır.")],
            "applications": [("Acoustically treated duct ventilation with access for servicing.", "Ses yalıtımı ve bakım erişimi gereken kanallı havalandırma tesisatları için kullanılır.")]},
        "JETLINE": {
            "general": [
                ("Compact circular duct fans have a low-profile galvanised-steel casing.", "Düşük profilli galvaniz çelik gövdeli, kompakt yuvarlak kanal fanlarıdır."),
                ("A moulded-plastic impeller, guide vanes and outlet diffuser improve airflow and reduce noise.", "Plastik pervane, kılavuz kanatlar ve çıkış difüzörü hava akışını iyileştirmek ve sesi azaltmak için tasarlanmıştır."),
                ("Rubber flange seals limit leakage; elastic motor mounts reduce vibration transmission.", "Flanşlardaki kauçuk contalar hava kaçaklarını; elastik motor takozları titreşim iletimini azaltır."),
                ("The mounting bracket supports two installation positions without adding to the low-profile body height.", "Montaj ayağı, gövdenin düşük profilini koruyarak iki farklı montaj konumuna olanak verir.")],
            "motor": [
                ("External-rotor single-phase AC motor, 220–240 V, class F, IP44; the separate terminal box is IP65.", "Harici rotorlu monofaze AC motor 220–240 V, F sınıfı ve IP44’tür; ayrı terminal kutusu IP65’tir."),
                ("Voltage speed control and manual-reset thermal protection; -20 to +60 °C operation.", "Voltajla hız kontrolüne ve -20 ile +60 °C çalışmaya uygundur; manuel resetli termal koruma bulunur."),
                ("JETLINE-100 to 250 support 50/60 Hz; JETLINE-315 is rated for 50 Hz only.", "JETLINE-100–250 modelleri 50/60 Hz; JETLINE-315 yalnız 50 Hz beslemeye uygundur.")],
            "applications": [("Circular duct installations where available mounting height is limited.", "Montaj yüksekliğinin sınırlı olduğu yuvarlak kanal tesisatlarında kullanılır.")]},
        "SILENTUB": {
            "general": [
                ("An axial transfer fan for duct installation or recessed mounting within a wall.", "Kanal içine veya duvar içine gömülü montaj için tasarlanmış aksiyel transfer fanıdır."),
                ("An automatic backdraught shutter limits reverse airflow and heat loss while the fan is stopped.", "Otomatik geri akış klapesi, fan dururken ters hava akışını ve ısı kaybını sınırlar."),
                ("Elastic motor mounts reduce vibration and sound transmission to the surrounding structure.", "Motor, titreşimin ve sesin çevre yapıya iletimini azaltan elastik sessiz takozlar üzerine yerleştirilmiştir.")],
            "motor": [("Single-phase 230 V, 50 Hz, IP44 and Class II electrical protection, with long-life ball bearings.", "Monofaze 230 V, 50 Hz motor IP44 ve Sınıf II elektriksel korumaya, uzun ömürlü bilyalı rulmanlara sahiptir.")],
            "applications": [("Air and heat transfer between adjacent rooms, or ventilation of small spaces.", "Komşu odalar arasında hava ve ısı transferi veya küçük hacimlerin havalandırılması için kullanılır.")]},
        "TDM": {
            "general": [
                ("Axial duct fans designed for ventilation systems with low pressure losses.", "Basınç kaybı düşük kanal sistemleri için tasarlanmış aksiyel fanlardır."),
                ("TDM-100 and TDM-200 can be recessed into a wall for air transfer between adjacent rooms.", "TDM-100 ve TDM-200, komşu odalar arasında hava transferi için duvar içine gömülebilir."),
                ("Long-life ball bearings belong to the separate Z versions.", "Uzun ömürlü bilyalı rulman özelliği ayrı Z versiyonlarına aittir.")],
            "motor": [
                ("Single-phase 230 V, 50 Hz, IPX4 and Class II electrical protection, with overheating protection.", "Monofaze 230 V, 50 Hz motor IPX4 ve Sınıf II elektriksel korumaya, aşırı ısınma korumasına sahiptir."),
                ("Maximum operating air temperature is 40 °C; the lower limit is not specified.", "Maksimum çalışma havası sıcaklığı 40 °C’dir; alt sıcaklık sınırı belirtilmemiştir.")],
            "applications": [("Short, low-resistance ventilation ducts and local exhaust applications.", "Kısa ve düşük dirençli havalandırma kanalları ile yerel egzoz uygulamalarında kullanılır.")]},
        "TD-MIXVENT": {
            "general": [
                ("Low-profile mixed-flow fans for circular ventilation ducts.", "Yuvarlak havalandırma kanalları için düşük profilli karma akışlı fanlardır."),
                ("For servicing, the motor and impeller assembly lifts out without disconnecting the ducts.", "Motor ve pervane grubu, kanal bağlantıları sökülmeden bakım için çıkarılabilir."),
                ("TD-250/350 have two speeds; TD-500/150 and TD-800/200 3V have three speeds. TD-4000/6000 use voltage speed control.", "TD-250/350 iki; TD-500/150 ve TD-800/200 3V üç hızlıdır. TD-4000/6000 voltajla hız kontrolüne uygundur."),
                ("Timer functions belong to the separate T versions; three-phase versions use separate motor data.", "Zamanlayıcı ayrı T versiyonlarına aittir; trifaze versiyonların motor verileri farklıdır.")],
            "motor": [
                ("TD-160–2000 motors are class B/IP44; TD-4000/6000 are class F/IP54. All have ball bearings and overload protection.", "TD-160–2000 motorları B/IP44; TD-4000/6000 motorları F/IP54 sınıfındadır. Rulman ve aşırı yük koruması bulunur."),
                ("Single-phase supply is 230 V; TD-160–350 use 50 Hz and larger single-phase versions use 50/60 Hz.", "Monofaze besleme 230 V’tur; TD-160–350 modelleri 50 Hz, daha büyük monofaze versiyonlar 50/60 Hz kullanır.")],
            "applications": [("Duct ventilation in restricted-height spaces, with service access to the motor assembly.", "Montaj yüksekliğinin sınırlı olduğu ve motor grubuna bakım erişimi gereken kanallı havalandırmada kullanılır.")]}}


def extract(directory, data):
    import fitz
    sources = copy.deepcopy(SOURCES)
    pdfs = {}
    for name, meta in sources.items():
        raw = (directory / name).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == meta["sha256"], name
        pdfs[name] = fitz.open(stream=raw, filetype="pdf")
        assert len(pdfs[name]) == meta["pages"]
        meta.update(origin="user-supplied-manufacturer-catalogue", verifiedOn="2026-10-23")
    desc = descriptions()
    # Model descriptions contain only the selected model's supply/protection data.
    rows, extra_translations = [], {}
    for sid, values in ROWS.items():
        for label, rpm, watts, amps, sound, flow, weight in values:
            m = next(m for m in data["models"] if m["model"] == label and m["seriesId"] == sid)
            name = FILE[sid]
            page = 3 if sid == "TD-MIXVENT" else 1 if sid == "TDM" else 2
            large = label in ("TD-4000/355", "TD-6000/400")
            big_cab = label in ("CAB-355", "CAB-400")
            voltage = "220–240 V" if sid == "JETLINE" else "230 V"
            frequency = "50/60 Hz" if (sid == "JETLINE" and label != "JETLINE-315") or (sid == "TD-MIXVENT" and label not in ("TD-250/100", "TD-350/125")) else "50 Hz"
            ip = "IP55" if big_cab else "IP54" if large else "IPX4" if sid == "TDM" else "IP44"
            technical = {"phase":"Single-phase", "ipClass":ip, "weight":weight}
            features = {"en":[], "tr":[]}
            def tag(en, tr):
                features["en"].append(en); features["tr"].append(tr)
            model_desc = {k:[p[0] for p in pairs] for k,pairs in desc[sid].items()}
            if sid == "CAB":
                technical.update(insulationClass="F" if big_cab else "B", terminalBoxIpClass="IP55", thermalProtection=True,
                                 operatingTemperatureMinC=-20, operatingTemperatureMaxC=40,
                                 soundBasis="radiated-sound-pressure-free-field-two-thirds-max-flow")
                for en,tr in [("Acoustic Insulation","Akustik İzolasyon"),("Ball-Bearing Motor","Rulmanlı Motor"),("Thermal Protection","Termal Koruma"),("Voltage Speed Control","Voltajla Hız Kontrolü")]: tag(en,tr)
            elif sid == "JETLINE":
                technical.update(insulationClass="F", terminalBoxIpClass="IP65", thermalProtection=True, thermalProtectionReset="manual",
                                 operatingTemperatureMinC=-20, operatingTemperatureMaxC=60,
                                 soundBasis="outlet-sound-pressure-1_5m-free-field-operating-point-2", soundMeasurementDistanceM=1.5,
                                 powerBasis="maximum-electrical-input-P1")
                for en,tr in [("Vibration-Isolating Mounts","Titreşim Sönümleyici Takozlar"),("Manual-Reset Thermal Protection","Manuel Resetli Termal Koruma"),("Voltage Speed Control","Voltajla Hız Kontrolü")]: tag(en,tr)
                if label == "JETLINE-315":
                    technical["weightSourceConflict"] = {"technicalTableKg":8.4,"dimensionTableKg":8.9,"usedKg":8.4}
                    en = "JETLINE-315 weight is 8.4 kg in the technical table and 8.9 kg in the dimension table; confirm against the product label."
                    tr = "JETLINE-315 ağırlığı teknik tabloda 8,4 kg, ölçü tablosunda 8,9 kg’dır; ürün etiketiyle doğrulanmalıdır."
                    model_desc["general"].append(en);extra_translations[en]=tr
            elif sid == "SILENTUB":
                technical.update(electricalProtectionClass="II", powerBasis="maximum-electrical-input-P1",
                                 soundBasis="inlet-sound-pressure-1_5m-free-field", soundMeasurementDistanceM=1.5)
                for en,tr in [("Backdraught Shutter","Geri Tepme Ventili"),("Vibration-Isolating Mounts","Titreşim Sönümleyici Takozlar"),("Ball-Bearing Motor","Rulmanlı Motor"),("Class II","Sınıf II")]: tag(en,tr)
            elif sid == "TDM":
                technical.update(electricalProtectionClass="II", thermalProtection=True,
                                 operatingTemperatureMinC=None, operatingTemperatureMaxC=40,
                                 powerBasis="maximum-electrical-input-P1", soundBasis="inlet-sound-pressure-1_5m-free-field", soundMeasurementDistanceM=1.5)
                tag("Thermal Protection","Termal Koruma");tag("Class II","Sınıf II")
            else:
                technical.update(insulationClass="F" if large else "B", electricalProtectionClass="I" if large else "II", overloadProtection=True,
                                 operatingTemperatureMinC=-40 if large else -20, operatingTemperatureMaxC=40 if large or label in ("TD-250/100","TD-350/125") else 60,
                                 powerBasis="maximum-electrical-input-P1", soundBasis="radiated-sound-pressure-3m-free-field-with-ducts", soundMeasurementDistanceM=3)
                tag("Ball-Bearing Motor","Rulmanlı Motor");tag("Overload Protection","Aşırı Yük Koruması")
                if not large: tag("Class II","Sınıf II")
                tag("Voltage Speed Control","Voltajla Hız Kontrolü")
                if not large: tag("Two Speeds" if label in ("TD-250/100","TD-350/125") else "Three Speeds", "İki Hız" if label in ("TD-250/100","TD-350/125") else "Üç Hız")
            if amps is not None: technical["currentReferenceVoltageV"] = 230
            if sid in ("CAB","JETLINE","TD-MIXVENT"):
                en = f"Selected motor: single-phase {voltage}, {frequency}, {ip}, insulation class {technical['insulationClass']}."
                tr = f"Seçilen motor: monofaze {voltage}, {frequency}, {ip}, {technical['insulationClass']} yalıtım sınıfı."
                # Keep general motor family alternatives in the series only.
                model_desc["motor"] = [en]
                extra_translations[en] = tr
            unknown = ["motor.current"] if amps is None else []
            if sid == "SILENTUB": unknown.append("technical.operatingTemperature")
            rows.append({"id":m["id"],"model":label,"seriesId":sid,"productCode":m["technical"]["productCode"],
                         "source":name,"tablePage":page,"featurePages":[1,3] if sid=="TD-MIXVENT" else [1],
                         "sourceRowLabel":label + " 3V" if label in ("TD-500/150","TD-800/200") else label,
                         "rowVerification":"visually-checked-standard-single-phase-model-table" if sid=="TD-MIXVENT" else "text-and-render-checked",
                         "motor":{"power":watts/1000,"speed":rpm,"sound":sound,"voltage":voltage,"frequency":frequency,**({"current":amps} if amps is not None else {})},
                         "technical":technical,"features":features,"description":model_desc,"sourceMaxAirflow":flow,"unknownFields":unknown})
    return {"schemaVersion":1,"verifiedOn":"2026-10-23","sources":sources,"models":rows,
            "series":{sid:{k:{"en":[p[0] for p in pairs],"tr":[p[1] for p in pairs]} for k,pairs in value.items()} for sid,value in desc.items()},
            "extraTranslations":extra_translations,
            "sourceConflicts":[{"model":"JETLINE-315","field":"weight","technicalTableKg":8.4,"dimensionTableKg":8.9,"usedKg":8.4,"page":2}],
            "policy":{"standardModelsOnly":True,"noCurrentOrTemperatureInference":True,"noTimerOrZVariantCopy":True,"preserveCurvesSelectionFlowsPricesDimensions":True}}


def apply(artifact, data):
    models = {m["id"]:m for m in data["models"]};series = {s["id"]:s for s in data["series"]}
    changes,series_changes=[],[]
    missing=lambda v:v is None or v in ("","-","—",0)
    def set_value(obj,path,value,ledger,identity):
        parent=obj
        for key in path[:-1]:parent=parent[key]
        key=path[-1]
        if key in parent and parent[key]==value:return
        ledger.append({"id":identity,"path":path,"previousPresent":key in parent,"previous":copy.deepcopy(parent.get(key)),"value":copy.deepcopy(value)})
        parent[key]=copy.deepcopy(value)
    for row in artifact["models"]:
        m=models[row["id"]];start=len(changes)
        assert (m["model"],m["seriesId"],m["technical"]["productCode"])==(row["model"],row["seriesId"],row["productCode"])
        assert series[m["seriesId"]]["manufacturer"]=="Soler & Palau"
        # Existing non-empty values must match this exact model, never overwritten.
        for field,value in row["motor"].items():
            if missing(m["motor"].get(field)):set_value(m,["motor",field],value,changes,m["id"])
        t=m["technical"]
        unknown_range=(t.get("operatingTemperatureMinC"),t.get("operatingTemperatureMaxC")) in ((0,0),(None,None))
        for field,value in row["technical"].items():
            if field.startswith("operatingTemperature"):
                if not unknown_range:continue
            elif not missing(t.get(field)):continue
            set_value(m,["technical",field],value,changes,m["id"])
        for field in ("features","description"):
            if not m.get(field):set_value(m,[field],row[field],changes,m["id"])
        old=OLD_MAX.get(m["model"])
        if old is not None:
            assert m["performance"]["maxAirflow"] in (old,row["sourceMaxAirflow"])
            set_value(m,["performance","maxAirflow"],row["sourceMaxAirflow"],changes,m["id"])
        if len(changes)!=start:
            assert "ductCatalogue" not in m["verification"]
            set_value(m,["verification","ductCatalogue"],{"evidence":EVIDENCE,"source":row["source"],"sha256":artifact["sources"][row["source"]]["sha256"],"tablePage":row["tablePage"],"featurePages":row["featurePages"],"verifiedOn":artifact["verifiedOn"]},changes,m["id"])
    for sid,desc in artifact["series"].items():
        value={k:v["en"] for k,v in desc.items()}
        if series[sid]["description"]==value:continue
        assert any("Bilgiler üreticinin" in s for s in series[sid]["description"]["general"]),sid
        set_value(series[sid],["description"],value,series_changes,sid)
    translations=data.setdefault("contentTranslations",{})
    pairs=dict(artifact["extraTranslations"])
    for desc in artifact["series"].values():
        for value in desc.values():pairs.update(zip(value["en"],value["tr"]))
    for en,tr in pairs.items():
        assert en not in translations or translations[en]==tr,en
        translations[en]=tr
    return changes,series_changes


def protected_models(data):
    return [{**{k:m.get(k) for k in ("id","seriesId","model","source","dimensions","media","pricing","catalogOnly")},
             "performance":{k:v for k,v in m["performance"].items() if k!="maxAirflow"}} for m in data["models"]]


def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("directory",type=Path);args=parser.parse_args()
    target=ROOT/"data/ventilation-catalog.js";prefix,payload=target.read_text().split("window.VensisVentilationData=",1)
    data=json.loads(payload.strip().removesuffix(";"));artifact=extract(args.directory,data)
    protected=digest(protected_models(data))
    changes,series_changes=apply(artifact,data);evidence=ROOT/EVIDENCE
    assert digest(protected_models(data))==protected
    if not changes and not series_changes and evidence.exists():
        old=json.loads(evidence.read_text());assert old["sources"]==artifact["sources"] and old["models"]==artifact["models"]
    else:
        assert not evidence.exists(),"Preserve the first source audit"
        artifact["preservation"]={"baseCommit":BASE,"protectedModelsSha256":protected,"modelChanges":changes,"seriesChanges":series_changes}
        evidence.write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+"\n")
        target.write_text(prefix+"window.VensisVentilationData="+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n")
    print(json.dumps({"modelsMatched":len(artifact["models"]),"modelsUpdated":len({c['id'] for c in changes}),"seriesUpdated":len(series_changes)}))

#!/usr/bin/env python3
"""Verify 14 existing standard SILENT, DECOR and EDM records from supplied PDFs.

SILENT timer/silver variants remain specific. EDM options are not assigned to
unqualified records, and all missing currents remain unknown. No curve is added.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE="6d5a7ae76e33dae2653b54eff38373d363601c5b"
EVIDENCE="assets/products/soler-palau/bath-catalogue-details.json"
SOURCES={
    "edm-0.pdf":{"sha256":"32612e469eaa3ef607117bae2a0def0d5e9aa19168e83f28fc96210a7a6c27a8","pages":7},
    "silent-4-69aeb6f4ad3c8.pdf":{"sha256":"6fbd2da01dca8478181b41613d407b03f1c1d15f87c15335017cf2efa6017d4e","pages":9},
    "decor-0.pdf":{"sha256":"9028394ddf16b03ea7e32badbf9a4d71c8e855e16d7f68d6d0befa1ef7cc68ee","pages":7},
}
# Model family, source table/narrative pages, RPM, P1 W, LpA, Qmax, kg.
ROWS={
    "EDM-80 N":("EDM",2,1,2350,9,33,80,.4),
    "EDM-100":("EDM",4,3,2450,13,40,95,.48),
    "EDM-200":("EDM",7,6,2500,25,42,180,.9),
    "DECOR-100":("DECOR",2,1,2500,13,40,95,.44),
    "DECOR-200":("DECOR",5,4,2500,20,45,185,.8),
    "DECOR-300":("DECOR",7,6,2200,35,47,280,1.44),
    "SILENT-100":("SILENT",2,1,2400,8,26.5,95,.57),
    "SILENT-200":("SILENT",7,6,2350,16,33,180,.77),
    "SILENT-300":("SILENT",9,8,2200,29,32,260,1.25),
}
FILE={"EDM":"edm-0.pdf","SILENT":"silent-4-69aeb6f4ad3c8.pdf","DECOR":"decor-0.pdf"}


def descriptions():
    return {
        "SILENT":{
            "general":[
                ("Plastic axial extract fans for bathroom and toilet ventilation.","Banyo ve WC havalandırması için plastik gövdeli aksiyel egzoz fanlarıdır."),
                ("Elastic motor mounts reduce vibration transmission to the surrounding structure.","Elastik motor takozları titreşimin çevre yapıya iletimini azaltır."),
                ("An automatic backdraught shutter limits reverse airflow and heat loss when stopped.","Otomatik geri akış klapesi fan dururken ters hava akışını ve ısı kaybını sınırlar."),
                ("CZ and CRZ versions have a pilot light and ball bearings; CRZ also has a 1–30 minute timer.","CZ ve CRZ versiyonlarında pilot ışığı ve bilyalı rulman bulunur; CRZ ayrıca 1–30 dakika zamanlayıcı içerir."),
                ("SILVER identifies a silver front cover. ECOWATT, 12 V and SILENT-300 PLUS use separate technical data.","SILVER, gümüş ön kapağı belirtir. ECOWATT, 12 V ve SILENT-300 PLUS versiyonlarının teknik verileri ayrıdır.")],
            "motor":[
                ("Single-phase 230 V, 50 Hz; class B motor insulation, overload protection, Class II electrical protection and IP45.","Monofaze 230 V, 50 Hz motorlarda B motor yalıtımı, aşırı yük koruması, Sınıf II elektriksel koruma ve IP45 bulunur."),
                ("The documented maximum air temperature is 40 °C; no lower limit is stated.","Belgelenen maksimum hava sıcaklığı 40 °C’dir; alt sınır belirtilmemiştir.")],
            "applications":[("Local exhaust ventilation through the selected model's circular duct connection.","Seçilen modelin yuvarlak kanal bağlantısıyla yerel egzoz havalandırmasında kullanılır.")]},
        "DECOR":{
            "general":[
                ("Plastic axial bathroom extract fans have a slim front cover and neon operating indicator.","İnce ön kapaklı plastik aksiyel banyo fanlarında neon çalışma göstergesi bulunur."),
                ("An air-pressure-operated backdraught shutter closes when the fan stops, limiting reverse airflow and heat loss.","Hava basıncıyla açılan geri akış klapesi fan durduğunda kapanarak ters hava akışını ve ısı kaybını azaltır."),
                ("Timer, humidity and PIR functions belong to their specified variants; ball bearings belong to Z versions.","Zamanlayıcı, nem ve PIR işlevleri ilgili versiyonlara; bilyalı rulmanlar Z versiyonlarına aittir.")],
            "motor":[
                ("Single-phase 230 V, 50 Hz; class B motor insulation and overload protection.","Monofaze 230 V, 50 Hz motorlar B motor yalıtım sınıfına ve aşırı yük korumasına sahiptir."),
                ("Class II electrical protection; model tables state IPX4, whereas the prose states IP44. Verify the rating on the product label.","Model tablolarında Sınıf II elektriksel koruma ve IPX4 belirtilir. Açıklama sayfalarında IP44 yazdığından kesin koruma sınıfı ürün etiketiyle doğrulanmalıdır."),
                ("The documented maximum air temperature is 40 °C; no lower limit is stated.","Belgelenen maksimum hava sıcaklığı 40 °C’dir; alt sınır belirtilmemiştir.")],
            "applications":[("Bathroom and toilet extract ventilation using the selected model's duct size.","Seçilen modelin kanal çapıyla banyo ve WC egzoz havalandırmasında kullanılır.")]},
        "EDM":{
            "general":[
                ("Compact plastic axial extract fans for small-space ventilation.","Küçük hacimlerin havalandırılması için kompakt plastik aksiyel egzoz fanlarıdır."),
                ("EDM-80 N has exhaust-direction guide vanes; EDM-100 uses a 100 mm duct and EDM-200 a 120 mm duct.","EDM-80 N egzoz yönlendirme kanatlarına sahiptir; EDM-100 100 mm, EDM-200 120 mm kanal bağlantısı kullanır."),
                ("Timers, shutters, humidity controls and window kits depend on the model suffix; long-life bearings belong to Z versions.","Zamanlayıcı, panjur, nem kontrolü ve pencere kiti model son ekine bağlıdır; uzun ömürlü rulmanlar Z versiyonlarına aittir."),
                ("EDM-100 S has no neon indicator. H versions are IP40; the separate 12 V EDM-100 versions are IP57/Class III.","EDM-100 S neon gösterge içermez. H versiyonları IP40; ayrı 12 V EDM-100 versiyonları IP57/Sınıf III’tür.")],
            "motor":[
                ("Standard 230 V, 50 Hz single-phase motors have class B insulation, overload protection, IP44 and Class II electrical protection.","Standart monofaze 230 V, 50 Hz motorlar B yalıtım sınıfı, aşırı yük koruması, IP44 ve Sınıf II elektriksel korumaya sahiptir."),
                ("The documented maximum air temperature is 40 °C; no lower limit is stated.","Belgelenen maksimum hava sıcaklığı 40 °C’dir; alt sınır belirtilmemiştir.")],
            "applications":[("Local exhaust ventilation in bathrooms, toilets and other small spaces.","Banyo, WC ve diğer küçük hacimlerin yerel egzoz havalandırmasında kullanılır.")]}}


def legacy_features(label):
    silver="SILVER" in label;timer="CRZ" in label
    en=("Chrome finish, backdraft damper" if silver else "Pilot lamp, backdraft damper")+(", timer" if timer else "")
    tr=("Krom renk, geri tepme ventili" if silver else "Pilot lamba, geri tepme ventili")+(", timer" if timer else "")
    return {"en":en,"tr":tr}


def extract(directory,data):
    import fitz
    sources=copy.deepcopy(SOURCES);pdfs={}
    for name,meta in sources.items():
        raw=(directory/name).read_bytes();assert hashlib.sha256(raw).hexdigest()==meta["sha256"],name
        pdfs[name]=fitz.open(stream=raw,filetype="pdf");assert len(pdfs[name])==meta["pages"]
        meta.update(origin="user-supplied-manufacturer-catalogue",verifiedOn="2026-10-23")
    desc=descriptions();rows=[];extra={}
    for m in data["models"]:
        if m["seriesId"] not in FILE:continue
        label=m["model"];sid=m["seriesId"]
        source_label=label.split()[0] if sid=="SILENT" else label
        row_sid,table,narrative,rpm,watts,sound,flow,weight=ROWS[source_label];assert sid==row_sid
        name=FILE[sid];table_text=pdfs[name][table-1].get_text();assert source_label in table_text
        timer=sid=="SILENT" and "CRZ" in label;silver=sid=="SILENT" and "SILVER" in label
        technical={"phase":"Single-phase","weight":weight,"ipClass":"IP45" if sid=="SILENT" else "IPX4" if sid=="DECOR" else "IP44",
                   "insulationClass":"B","electricalProtectionClass":"II","overloadProtection":True,
                   "operatingTemperatureMinC":None,"operatingTemperatureMaxC":40,
                   "powerBasis":"maximum-electrical-input-P1" if sid=="DECOR" else "free-air-electrical-input-P1",
                   "soundBasis":"sound-pressure-3m-free-field" if sid=="SILENT" else "sound-pressure-1_5m-free-field",
                   "soundMeasurementDistanceM":3 if sid=="SILENT" else 1.5}
        features={"en":["Overload Protection","Class II"],"tr":["Aşırı Yük Koruması","Sınıf II"]}
        def tag(en,tr):features["en"].append(en);features["tr"].append(tr)
        model_desc={k:[p[0] for p in values] for k,values in desc[sid].items()}
        if sid=="SILENT":
            technical["timerVariant"]=timer
            for en,tr in [("Backdraught Shutter","Geri Tepme Ventili"),("Pilot Light","Pilot Işığı"),("Vibration-Isolating Mounts","Titreşim Sönümleyici Takozlar"),("Ball-Bearing Motor","Rulmanlı Motor")]:tag(en,tr)
            model_desc["general"]=model_desc["general"][:3]
            en="The selected CRZ version includes a pilot light, ball bearings and a 1–30 minute timer." if timer else "The selected CZ version includes a pilot light and ball bearings, without a timer."
            tr="Seçilen CRZ versiyonu pilot ışığı, bilyalı rulman ve 1–30 dakika zamanlayıcı içerir." if timer else "Seçilen CZ versiyonu pilot ışığı ve bilyalı rulman içerir; zamanlayıcı içermez."
            model_desc["general"].append(en);extra[en]=tr
            if silver:
                tag("Silver Front Cover","Gümüş Ön Kapak")
                en="This SILVER model has a silver front cover.";extra[en]="Bu SILVER modelinde gümüş ön kapak bulunur.";model_desc["general"].append(en)
        elif sid=="DECOR":
            tag("Backdraught Shutter","Geri Tepme Ventili");tag("Neon Indicator","Neon Gösterge")
            technical["ipSourceConflict"]={"modelTable":"IPX4","narrative":"IP44","used":"IPX4"}
        else:
            if label=="EDM-80 N":
                tag("Exhaust Guide Vanes","Egzoz Yönlendirme Kanatları")
                pairs=[("EDM-80 N is a compact plastic axial extract fan for a 100 mm circular duct.","EDM-80 N, 100 mm yuvarlak kanal için kompakt plastik aksiyel egzoz fanıdır."),
                       ("Its exhaust-direction guide vanes are standard; timers belong to NT/NTZ/LR variants and ball bearings to Z variants.","Egzoz yönlendirme kanatları standarttır; zamanlayıcı NT/NTZ/LR, bilyalı rulman ise Z versiyonlarına aittir.")]
            elif label=="EDM-100":
                pairs=[("EDM-100 is a plastic axial extract fan for 100 mm circular ducts.","EDM-100, 100 mm yuvarlak kanallar için plastik aksiyel egzoz fanıdır."),
                       ("Shutters, timers, neon indicators, sensors and window kits depend on the selected suffix; this unqualified record does not specify these options.","Panjur, zamanlayıcı, neon gösterge, sensör ve pencere kiti seçilen son eke bağlıdır; son eksiz bu kayıt bu seçenekleri kesinleştirmez."),
                       ("H versions use IP40; 12 V versions use IP57/Class III, and Z versions have long-life bearings.","H versiyonları IP40; 12 V versiyonları IP57/Sınıf III’tür; uzun ömürlü rulmanlar Z versiyonlarına aittir.")]
            else:
                tag("Neon Indicator","Neon Gösterge")
                pairs=[("EDM-200 is a plastic axial extract fan for 120 mm circular ducts, with a neon operating indicator.","EDM-200, 120 mm yuvarlak kanallar için neon çalışma göstergeli plastik aksiyel egzoz fanıdır."),
                       ("Automatic shutters belong to C variants; timer, humidity and bearing options depend on the suffix.","Otomatik panjur C versiyonlarına aittir; zamanlayıcı, nem ve rulman seçenekleri model son ekine bağlıdır."),
                       ("Humidity-control H versions are IP40 rather than the standard IP44.","Nem kontrollü H versiyonları, standart IP44 yerine IP40 koruma sınıfındadır.")]
            model_desc["general"]=[]
            for en,tr in pairs:model_desc["general"].append(en);extra[en]=tr
            if label in ("EDM-100","EDM-200"):
                en="The existing performance curve does not match this catalogue; verify it before using the fan for selection."
                tr="Mevcut performans eğrisi bu katalogla uyuşmuyor; fan seçiminde kullanılmadan önce doğrulanmalıdır."
                model_desc["general"].append(en);extra[en]=tr
                technical["curveSourceReview"]={"status":"requires-engineering-review","source":name,"page":table,
                                               "issue":"grid-lines-instead-of-fan-curve" if label=="EDM-100" else "airflow-axis-scale-mismatch",
                                               "action":"existing-geometry-preserved-with-visible-bilingual-review-note"}
        rows.append({"id":m["id"],"model":label,"seriesId":sid,"productCode":m["technical"].get("productCode",""),
                     "source":name,"sourceRowLabel":source_label,"tablePage":table,"narrativePage":narrative,
                     "motor":{"power":watts/1000,"speed":rpm,"sound":sound,"voltage":"230 V","frequency":"50 Hz"},
                     "technical":technical,"features":features,"description":model_desc,"sourceMaxAirflow":flow,
                     "unknownFields":["motor.current"],"standard230VOnly":True})
    assert len(rows)==14
    return {"schemaVersion":1,"verifiedOn":"2026-10-23","sources":sources,"models":rows,
            "series":{sid:{k:{"en":[p[0] for p in pairs],"tr":[p[1] for p in pairs]} for k,pairs in value.items()} for sid,value in desc.items()},
            "extraTranslations":extra,"sourceConflicts":[{"seriesId":"DECOR","narrative":"IP44","modelTables":"IPX4","used":"IPX4"},
                {"model":"EDM-100","field":"performanceCurve","issue":"existing-plot-contains-grid-lines","sourcePage":4,"action":"preserved-with-review-note"},
                {"model":"EDM-200","field":"performanceCurve","issue":"existing-airflow-axis-scale-mismatch","sourcePage":7,"action":"preserved-with-review-note"}],
            "policy":{"noCurrentInference":True,"noLowerTemperatureInference":True,"noOptionalEDMFeaturesAssigned":True,"noNewCurvesOrSelectionEligibilityChanges":True}}


def apply(artifact,data):
    models={m["id"]:m for m in data["models"]};series={s["id"]:s for s in data["series"]};changes=[];series_changes=[]
    missing=lambda v:v is None or v in ("","-","—",0)
    def set_value(obj,path,value,ledger,identity):
        p=obj
        for k in path[:-1]:p=p[k]
        key=path[-1]
        if key in p and p[key]==value:return
        ledger.append({"id":identity,"path":path,"previousPresent":key in p,"previous":copy.deepcopy(p.get(key)),"value":copy.deepcopy(value)})
        p[key]=copy.deepcopy(value)
    for row in artifact["models"]:
        m=models[row["id"]];start=len(changes)
        assert (m["model"],m["seriesId"],m["technical"].get("productCode",""))==(row["model"],row["seriesId"],row["productCode"])
        for field,value in row["motor"].items():
            if missing(m["motor"].get(field)):set_value(m,["motor",field],value,changes,m["id"])
        # Two known workbook RPM values conflict with the exact standard table.
        if m["model"] in ("SILENT-300 CZ","SILENT-300 CRZ"):
            assert m["motor"]["speed"] in (1700,2200)
            set_value(m,["motor","speed"],2200,changes,m["id"])
        t=m["technical"];unknown_range=(t.get("operatingTemperatureMinC"),t.get("operatingTemperatureMaxC")) in ((0,0),(None,None))
        for field,value in row["technical"].items():
            if field.startswith("operatingTemperature"):
                if not unknown_range:continue
            elif not missing(t.get(field)):continue
            set_value(m,["technical",field],value,changes,m["id"])
        if not m.get("features") or (m["seriesId"]=="SILENT" and m["features"]==legacy_features(m["model"])):
            set_value(m,["features"],row["features"],changes,m["id"])
        if not m.get("description"):set_value(m,["description"],row["description"],changes,m["id"])
        if m["model"]=="DECOR-300":
            assert m["performance"]["maxAirflow"] in (250,280)
            set_value(m,["performance","maxAirflow"],280,changes,m["id"])
        if len(changes)!=start:
            assert "bathCatalogue" not in m["verification"]
            set_value(m,["verification","bathCatalogue"],{"evidence":EVIDENCE,"source":row["source"],"sha256":artifact["sources"][row["source"]]["sha256"],"tablePage":row["tablePage"],"narrativePage":row["narrativePage"],"verifiedOn":artifact["verifiedOn"]},changes,m["id"])
    for sid,desc in artifact["series"].items():
        value={k:v["en"] for k,v in desc.items()}
        if series[sid]["description"]==value:continue
        assert any("Bilgiler üreticinin" in s for s in series[sid]["description"]["general"]),sid
        set_value(series[sid],["description"],value,series_changes,sid)
    pairs=dict(artifact["extraTranslations"])
    for desc in artifact["series"].values():
        for value in desc.values():pairs.update(zip(value["en"],value["tr"]))
    tr=data.setdefault("contentTranslations",{})
    for en,value in pairs.items():
        assert en not in tr or tr[en]==value,en
        tr[en]=value
    return changes,series_changes


def protected_models(data):
    return [{**{k:m.get(k) for k in ("id","seriesId","model","source","dimensions","media","pricing","catalogOnly")},
             "performance":{k:v for k,v in m["performance"].items() if k!="maxAirflow"}} for m in data["models"]]


def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("directory",type=Path);args=parser.parse_args()
    target=ROOT/"data/ventilation-catalog.js";prefix,payload=target.read_text().split("window.VensisVentilationData=",1)
    data=json.loads(payload.strip().removesuffix(";"));artifact=extract(args.directory,data);protected=digest(protected_models(data))
    changes,series_changes=apply(artifact,data);assert digest(protected_models(data))==protected;evidence=ROOT/EVIDENCE
    if not changes and not series_changes and evidence.exists():
        old=json.loads(evidence.read_text());assert old["sources"]==artifact["sources"] and old["models"]==artifact["models"]
    else:
        assert not evidence.exists(),"Preserve the first source audit"
        artifact["preservation"]={"baseCommit":BASE,"protectedModelsSha256":protected,"modelChanges":changes,"seriesChanges":series_changes}
        evidence.write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+"\n")
        target.write_text(prefix+"window.VensisVentilationData="+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n")
    print(json.dumps({"modelsMatched":len(artifact["models"]),"modelsUpdated":len({c['id'] for c in changes}),"seriesUpdated":len(series_changes)}))

#!/usr/bin/env python3
"""Build the Soler & Palau dataset from supplied catalogue text and curves.

The source PDFs stay outside the web project.  This importer deliberately records
only model identities plus table values whose column order is unambiguous.
Selection-enabled rows use separately verified, axis-calibrated PDF vectors.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


SERIES = [
    ("CCH-BDB", "CCH-BDB", "Geriye Eğik Kanatlı Radyal Fanlar", "Cabinet Fan", "cch-bdb.webp", r"\bCCH-BDB-\d+\b"),
    ("CCH-BPHM", "CCH-BPHM", "Geriye Eğik Kanatlı Plug Fanlar", "Cabinet Fan", "cch-bphm.webp", r"\bCCH-BPHM-\d+(?:-MTF)?\b"),
    ("CCH-CBP", "CCH-CBP", "İleri Eğik Kanatlı Radyal Fanlar", "Cabinet Fan", "cch-cbp.webp", r"\bCCH-(?:CBP-\d+/\d+|FDA-\d+-CL)\b"),
    ("CGT", "CGT", "Kabinli Aksiyel Fanlar", "Axial Fan", "cgt.jpg", r"\bCGT/\d(?:/\d)?-\d+(?:-\d+)?/-?\s?\d+(?:,\d+)?\b"),
    ("CHAT", "CHAT", "Akustik Kabinli Duman Egzoz Fanları", "Smoke Extract Fan", "chat.jpg", r"\bCHAT/\d(?:/\d)?-\d+\s*N(?:\s+\d+(?:,\d+)?(?:/\d+(?:,\d+)?)?\s*kW)?\b"),
    ("CHGT", "CHGT", "Kabinli Aksiyel Duman Egzoz Fanları", "Smoke Extract Fan", "chgt.webp", r"\bCHGT/\d(?:/\d)?-\d+(?:-\d+)?/-?\s?\d+(?:,\d+)?\b"),
    ("CRHB-N / CRHT-N", "CRHB-N-CRHT-N", "Yatay Atışlı Çatı Tipi Radyal Fanlar", "Roof Fan", "crhb-n-crht-n.webp", r"\bCRH[BT]/\d-\d+N\b"),
    ("CRVB-N / CRVT-N", "CRVB-N-CRVT-N", "Dikey Atışlı Çatı Tipi Radyal Fanlar", "Roof Fan", "crvb-n-crvt-n.webp", r"\bCRV[BT]/\d-\d+N\b"),
    ("CTVB / CTVT", "CTVB-CTVT", "Çatı Tipi Duman Egzoz Fanları", "Smoke Extract Fan", "ctvb-ctvt.webp", r"\bCTV[BT]/\d(?:/\d)?-\d+\b"),
    ("CVAB-N / CVAT-N", "CVAB-N-CVAT-N", "Akustik Kabinli Radyal Fanlar", "Cabinet Fan", "cvab-n-cvat-n.png", r"\bCVA[BT]/\d-\d+/\d+N(?:\s+D)?\b"),
    ("CVHT", "CVHT", "Kayış Kasnaklı Kabinli Duman Egzoz Fanları", "Smoke Extract Fan", "cvht.png", r"\bCVHT-\d+/\d+\b"),
    ("CVTT", "CVTT", "Kayış Kasnaklı Hücreli Fanlar", "Cabinet Fan", "cvtt.webp", r"\bCVTT-\d+/\d+\b"),
    ("HCFB / HCFT", "HCBB-HCBT", "Duvar Tipi Aksiyel Fanlar", "Wall Fan", "hcfb-hcft.jpg", r"\bHCF[BT]/\d(?:/\d)?-\d+(?:/[HL])?(?:-X-\d+(?:,\d+)?)?\b"),
    ("CBM", "HCBM", "Düşük Basınçlı Direkt Akuple Radyal Fanlar", "Centrifugal Fan", "cbm.webp", r"\bCBM-\d+/\d+\s+\d+\s+\dP(?:\s+C)?(?:\s+VR)?\b"),
    ("HCTB / HCTT", "HCTB-HCTT", "Çatı Tipi Aksiyel Fanlar", "Roof Fan", "hctb-hctt.jpg", r"\bHCT[BT]/\d(?:/\d)?-\d+(?:-[A-Z])?\b"),
    ("HDB / HDT ATEX", "HDT-ATEX", "Duvar Tipi Ex-Proof Aksiyel Fanlar", "Explosion-Proof / ATEX Fan", "hdt-atex.webp", r"\bHD[BT]/\d-\d+(?:/[A-Z])?(?:\s+ATEX)?\b"),
    ("HV-STYLVENT", "HV-STYLVENT", "Duvar ve Pencere Tipi Aksiyel Fanlar", "Wall Fan", "hv-stylvent.webp", r"\bHV-\d+(?:\s+[A-Z]+)?\b"),
    ("HXBR / HXTR", "HXBR-HXTR", "Duvar Tipi Aksiyel Fanlar", "Wall Fan", "hxbr-hxtr.jpg", r"\bHXT?[BR]/\d(?:/\d)?-\d+(?:-[A-Z])?\b"),
    ("HXM", "HXM", "Duvar Tipi Aksiyel Fanlar", "Wall Fan", "hxm.jpg", r"\bHXM-\d+\b"),
    ("IFHT", "IFHT", "Radyal Jet Fanlar", "Jet Fan", "ifht.webp", r"\bIFHT/\d/\d+-\d+N-C\b"),
    ("ILB / ILT", "ILB-ILT", "Dikdörtgen Kanal Tipi Fanlar", "Duct Fan", "ilb-ilt.webp", r"\bIL[BT]/\d(?:/\d)?-\d+(?:\s+[A-Z]{1,3})?\b"),
    ("ILHB / ILHT", "ILHT", "Kanal Tipi Duman Egzoz Fanları", "Smoke Extract Fan", "ilht.webp", r"\bILH[BT]/\d(?:/\d)?-\d+(?:\s+(?:CC|MV))?\b"),
    ("ILT ATEX", "ILT-ATEX", "Dikdörtgen Kanal Tipi Ex-Proof Fanlar", "Explosion-Proof / ATEX Fan", "ilt-atex.webp", r"\bILT/\d-\d+\s+EX\b"),
    ("IRB / IRT", "IRB-IRT", "Dikdörtgen Kanal Tipi Fanlar", "Duct Fan", "irb-irt.webp", r"\bIR[BT]/\d-\d+(?:\s+[AB])?\b"),
    ("MAX-TEMP CTHB / CTHT", "MAX-TEMP-CTHB-CTHT", "Çatı Tipi Duman Egzoz Fanları", "Smoke Extract Fan", "max-temp-cthb-ctht.webp", r"\bCTH[BT]/\d(?:/\d)?-\d+\b"),
    ("TD ATEX", "TD-ATEX", "Kanal Tipi Ex-Proof Karma Akışlı Fanlar", "Explosion-Proof / ATEX Fan", "td-atex.webp", r"\bTD-\d+/\d+\s+(?:ATEX|EXE?)\b"),
    ("TD-EVO PF ECOWATT", "TD-EVO-PF-ECOWATT", "EC Motorlu Yuvarlak Kanal Tipi Karma Akışlı Fanlar", "Duct Fan", "td-evo.webp", r"\bTD-EVO(?:-PF)?-?\d+/\d+(?:\s+[A-Z]+)?\b"),
    ("TGT", "TGT", "Silindirik Gövdeli Aksiyel Fanlar", "Axial Fan", "tgt.jpg", r"\bTGT/\d(?:/\d)?-\d+(?:-\d+)?/-?\s?\d+(?:,\d+)?(?:\s+L)?\b"),
    ("TH ATEX", "TH-ATEX", "Yatay Atışlı Çatı Tipi Ex-Proof Fanlar", "Explosion-Proof / ATEX Fan", "th-atex.webp", r"\bTH-\d+/\d+\s+EX\b"),
    ("TH-MIXVENT", "TH-MIXVENT", "Yatay Atışlı Çatı Tipi Karma Akışlı Fanlar", "Roof Fan", "th-mixvent.jpg", r"\bTH-(?:\d+/\d+|\d+\s*N?)\b"),
    ("THGT", "THGT", "Silindirik Gövdeli Aksiyel Duman Egzoz Fanları", "Smoke Extract Fan", "thgt.webp", r"\bTHGT/\d(?:/\d)?-\d+(?:-\d+)?/-?\s?\d+(?:,\d+)?(?:\s+L)?\b"),
    ("TJHT / TJHU", "TJHU-TJHT", "Aksiyel Duman Egzoz Jet Fanları", "Jet Fan", "tjhu-tjht.webp", r"\bTJH[UT]/\d(?:/\d)?-\d+-C(?:N)?\b"),
    ("CAB", "cab", "Akustik Kabinli Fanlar", "Cabinet Fan", "cab.webp", r"\bCAB-\d+N?\b"),
    ("EDM", "edm", "Mini Aksiyel Fanlar", "Bathroom Fan", "edm.webp", r"\bEDM-(?:80\s+[NL]|100(?:S|C)?(?:\s+12V)?|200)\b"),
    ("HCM-N", "hcm", "Mini Aksiyel Fanlar", "Wall Fan", "hcm.webp", r"\bHCM-\d+\s+N\b"),
    ("JETLINE", "jetline", "Radyal Kanal Tipi Fanlar", "Duct Fan", "jetline.webp", r"\bJETLINE-\d+\b"),
    ("SILENTUB", "silen-tub", "Sessiz Kanal Tipi Transfer Fanları", "Duct Fan", "silentub.webp", r"\bSILENTUB-\d+\b"),
    ("DECOR DESIGN", "silent-decor-design", "Dekoratif Banyo ve WC Fanları", "Bathroom Fan", "decor-design.webp", r"\bDECOR-\d+\s+DESIGN\b"),
    ("DECOR", "silent-decor", "Banyo ve WC Fanları", "Bathroom Fan", "decor.webp", r"\bDECOR-\d+(?:\s+(?:C\s+12V|12V|CDZ?|CHZ\s+VISUAL))?\b"),
    ("SILENT DESIGN", "silent-design-katolog", "Dekoratif Sessiz Banyo ve WC Fanları", "Bathroom Fan", "silent-design.webp", r"\bSILENT-\d+\s+DESIGN(?:-?3C|\s+ECOWATT|\s+12VDC\s+ECOWATT)?\b"),
    ("SILENT DUAL", "silent-dual", "Akıllı Banyo Egzoz Fanları", "Bathroom Fan", "silent-dual.webp", r"\bSILENT(?:-|\s+)DUAL\s+\d+\b"),
    ("SILENT", "silent", "Sessiz Banyo ve WC Fanları", "Bathroom Fan", "silent.webp", r"\bSILENT-\d+(?:\s+(?:12V|ECOWATT|PLUS|CDZ|CHZ\s+VISUAL))?\b"),
    ("TD-EVO", "td-evo-serisi", "Yuvarlak Kanal Tipi Karma Akışlı Fanlar", "Duct Fan", "td-evo.webp", r"\bTD-EVO-?\d+/\d+(?:\s+[A-Z]+)?\b"),
    ("TD-MIXVENT", "td-mixvent", "Kanal Tipi Karma Akışlı Fanlar", "Duct Fan", "td-mixvent.webp", r"\bTD-(?:\d+/\d+\s*N?|\d+)(?:\s*T)?\b"),
    ("TD-SILENT", "td-silent", "Ultra Sessiz Kanal Tipi Karma Akışlı Fanlar", "Duct Fan", "td-silent.webp", r"\bTD-\d+/\d+N?\s+SILENT(?:-T)?\b"),
    ("TDM", "tdm", "Kanal Tipi Aksiyel Fanlar", "Duct Fan", "tdm.webp", r"\bTDM-\d+\b"),
    ("VENT-NK / VENT-N", "vent-nk", "Yuvarlak Kanal Tipi Radyal Fanlar", "Duct Fan", "vent-nk.webp", r"\bVENT-\d+\s?(?:NK|N)(?:\s+T)?\b"),
]


FALLBACK_MODELS = {
    "CTVB / CTVT": ["CTVB/4-140", "CTVT/4-140"],
    "HCTB / HCTT": ["HCTB/4-250", "HCTT/4-250"],
    "MAX-TEMP CTHB / CTHT": ["CTHB/4-225", "CTHT/4-225"],
    "TD-EVO PF ECOWATT": ["TD-EVO PF 100", "TD-EVO PF 125", "TD-EVO PF 160", "TD-EVO PF 200", "TD-EVO PF 250", "TD-EVO PF 315"],
    "TD-EVO": ["TD-EVO 160/100", "TD-EVO 250/100", "TD-EVO 350/125", "TD-EVO 500/150", "TD-EVO 800/200", "TD-EVO 1300/250", "TD-EVO 2000/315"],
    "TD-MIXVENT": ["TD-160/100 N", "TD-250/100", "TD-350/125", "TD-500/150", "TD-800/200", "TD-1300/250", "TD-2000/315", "TD-4000", "TD-6000"],
    "TD-SILENT": ["TD-160/100N SILENT", "TD-250/100 SILENT", "TD-350/125 SILENT", "TD-500/150 SILENT", "TD-800/200 SILENT", "TD-1000/200 SILENT", "TD-1300/250 SILENT", "TD-2000/315 SILENT"],
}

FORCED_MODELS = {
    "TD-EVO PF ECOWATT": FALLBACK_MODELS["TD-EVO PF ECOWATT"],
    "TD-EVO": FALLBACK_MODELS["TD-EVO"],
    "TD-MIXVENT": FALLBACK_MODELS["TD-MIXVENT"],
    "TD-SILENT": FALLBACK_MODELS["TD-SILENT"],
    "VENT-NK / VENT-N": [
        "VENT-100NK", "VENT-125NK", "VENT-150NK", "VENT-160NK", "VENT-200NK",
        "VENT-250NK", "VENT-315NK", "VENT-355N", "VENT-400N", "VENT-355N T",
        "VENT-400N T",
    ],
}

TECHNICAL_OVERRIDES = {
    "VENT-355N T": {"rpm": 1370, "kw": 0.270, "amps": 1.1, "nominal": 2640, "spl": 43, "voltage": "230/400 V"},
    "VENT-400N T": {"rpm": 1370, "kw": 0.492, "amps": 1.9, "nominal": 3830, "spl": 47, "voltage": "230/400 V"},
}


def tidy_model(value: str) -> str:
    value = value.replace("–", "-").replace("—", "-")
    value = re.sub(r"\s*/\s*", "/", value)
    value = re.sub(r"\s+", " ", value).strip(" .,:;")
    value = re.sub(r"/-(\s+)", "/-", value)
    value = re.sub(r"^SILENT-DUAL\b", "SILENT DUAL", value, flags=re.IGNORECASE)
    return value


def parse_number(value: str) -> float:
    value = value.strip().replace(".", "").replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return 0.0


def simple_values(source_file: str, model: str, text: str) -> dict:
    """Parse only table layouts with stable, checked column orders."""
    expected_counts = {
        "cab": 11, "edm": 10, "hcm": 7, "jetline": 11,
        "silen-tub": 7, "silent-decor-design": 7,
        "silent-decor": 7, "silent-design-katolog": 7,
        "silent": 8, "tdm": 7, "vent-nk": 13, "HXM": 10,
    }
    candidates = []
    for raw in text.splitlines():
        clean = " ".join(raw.split())
        normalized_line = tidy_model(clean)
        normalized_model = tidy_model(model)
        if normalized_model not in normalized_line:
            continue
        tail = normalized_line.split(normalized_model, 1)[-1].strip()
        if not re.match(r"^\d+(?:[.,]\d+)?(?=\s|/|-|$)", tail):
            continue
        count = len(re.findall(r"(?<![A-Za-z])\d+(?:[.,]\d+)?", tail))
        candidates.append((clean, count))
    expected = expected_counts.get(source_file)
    line = min(candidates, key=lambda item: abs(item[1] - expected))[0] if candidates and expected else (candidates[0][0] if candidates else "")
    if not line:
        return {}
    tail = tidy_model(line).split(tidy_model(model), 1)[-1].strip()
    nums = re.findall(r"(?<![A-Za-z])\d+(?:[.,]\d+)?", tail)
    values = [parse_number(value) for value in nums]
    result: dict[str, float | str] = {}
    if source_file == "CCH-BDB" and len(values) >= 3:
        result.update(kw=values[0], rpm=values[1], nominal=values[2])
    elif source_file == "CCH-BPHM" and len(values) >= 6:
        result.update(kw=values[1], rpm=values[3], nominal=values[5])
    elif source_file == "CCH-CBP" and len(values) >= 3:
        result.update(kw=values[0], rpm=values[1], nominal=values[2])
    elif source_file == "cab" and len(values) >= 9:
        result.update(rpm=values[2], kw=values[3] / 1000, amps=values[4], nominal=values[5], spl=values[8])
    elif source_file == "edm" and len(values) >= 5:
        result.update(rpm=values[0], kw=values[1] / 1000, voltage=f"{int(values[2])} V", spl=values[3], nominal=values[4])
    elif source_file == "hcm" and len(values) >= 5:
        result.update(rpm=values[0], kw=values[1] / 1000, voltage=f"{int(values[2])} V", nominal=values[3], spl=values[4])
    elif source_file == "jetline" and len(values) >= 7:
        result.update(rpm=values[0], kw=values[1] / 1000, amps=values[2], nominal=values[3], spl=values[6])
    elif source_file == "silen-tub" and len(values) >= 5:
        result.update(rpm=values[0], kw=values[1] / 1000, nominal=values[3], spl=values[4])
    elif source_file == "silent-decor-design" and len(values) >= 4:
        result.update(kw=values[0] / 1000, voltage=f"{int(values[1])} V", spl=values[3], nominal=values[4])
    elif source_file == "silent-decor" and len(values) >= 5:
        result.update(rpm=values[0], kw=values[1] / 1000, voltage=f"{int(values[2])} V", spl=values[3], nominal=values[4])
    elif source_file == "silent-design-katolog" and len(values) >= 4:
        result.update(kw=values[0] / 1000, voltage=f"{int(values[1])} V", spl=values[2], nominal=values[3])
    elif source_file == "silent" and len(values) >= 5:
        result.update(rpm=values[0], kw=values[1] / 1000, voltage=f"{int(values[2])} V", spl=values[3], nominal=values[4])
    elif source_file == "tdm" and len(values) >= 5:
        result.update(rpm=values[0], kw=values[1] / 1000, nominal=values[3], spl=values[4])
    elif source_file == "vent-nk" and len(values) >= 10:
        result.update(rpm=values[3], kw=values[4] / 1000, amps=values[5], nominal=values[6], spl=values[9])
    elif source_file == "HXM" and len(values) >= 6:
        result.update(rpm=values[0], kw=values[2] / 1000, amps=values[3], spl=values[4], nominal=values[5])
    return {key: value for key, value in result.items() if value not in (0, "0 V")}


def build(text_dir: Path, curves_path: Path | None = None) -> list[dict]:
    curve_models = {}
    if curves_path:
        curve_models = json.loads(curves_path.read_text(encoding="utf-8")).get("models", {})
    rows = []
    for code, source_file, title, category, image, pattern in SERIES:
        source_path = text_dir / f"{source_file}.txt"
        text = source_path.read_text(encoding="utf-8", errors="ignore") if source_path.exists() else ""
        normalized = text.replace("–", "-").replace("—", "-")
        models = [tidy_model(value) for value in re.findall(pattern, normalized, flags=re.IGNORECASE)]
        if source_file in {"CGT", "CHGT", "TGT", "THGT"}:
            # These catalogues repeat the same fan geometry for many motor-power
            # combinations.  Keep one catalogue card per physical configuration;
            # motor sizing remains a catalogue/engineering decision.
            models = [re.sub(r"/-\d+(?:,\d+)?(?:\s+L)?$", "", value) for value in models]
        models = list(dict.fromkeys(value.upper().replace("KW", "kW") for value in models))
        if code in FORCED_MODELS:
            models = FORCED_MODELS[code]
        if not models:
            models = FALLBACK_MODELS.get(code, [code])
        for model in models:
            row = {
                "key": f"SP|{model}",
                "display": model,
                "model": model,
                "brand": "Soler & Palau",
                "manufacturer": "Soler & Palau",
                "family": code,
                "series": code,
                "seriesCode": code,
                "productCode": re.sub(r"[^A-Z0-9]+", "", model.upper()),
                "productGroup": category,
                "productGroupEn": category,
                "categories": [category, "Soler & Palau"],
                "tagsEn": [category, "Soler & Palau"],
                "catalogNameEn": title,
                "image": f"assets/products/soler-palau/{image}",
                "sourceCatalogue": f"{source_file}.pdf",
                "catalogueInfo": {
                    "general": [title, "Bilgiler üreticinin sağlanan teknik kataloğundan aktarılmıştır."],
                    "motor": [],
                    "applications": [],
                },
                "price": 0,
                "catalogOnly": True,
            }
            row.update(simple_values(source_file, model, text))
            row.update(TECHNICAL_OVERRIDES.get(model, {}))
            curve = curve_models.get(model)
            if curve:
                source_points = curve["sourcePoints"]
                row["catalogOnly"] = False
                row["sourcePage"] = curve["sourcePage"]
                row["sourcePoints"] = source_points
                row["curves"] = [{
                    "control": "Nominal",
                    "sourcePage": curve["sourcePage"],
                    "sourceMethod": curve["sourceMethod"],
                    "interpolation": curve["interpolation"],
                    "precomputed": True,
                    "sourcePoints": source_points,
                }]
                row["operatingPoints"] = [{
                    "control": "Nominal",
                    "powerKw": row.get("kw", 0),
                    "rpm": row.get("rpm", 0),
                    "currentA": row.get("amps", 0),
                    "maxAirflowM3h": row.get("nominal", curve["maxAirflowM3h"]),
                    "maxPressurePa": curve["maxPressurePa"],
                    "soundPressureDbA3m": row.get("spl", 0),
                }]
            rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--curves", type=Path)
    args = parser.parse_args()
    rows = build(args.text_dir, args.curves)
    payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    args.output.write_text(f"window.models.push(...{payload});\n", encoding="utf-8")
    print(json.dumps({"series": len(SERIES), "models": len(rows), "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

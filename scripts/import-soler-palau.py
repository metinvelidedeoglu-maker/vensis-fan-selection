#!/usr/bin/env python3
"""Build the Soler & Palau dataset from supplied catalogue text and curves.

The source PDFs stay outside the web project.  This importer deliberately records
only model identities plus table values whose column order is unambiguous.
Selection-enabled rows use separately verified, axis-calibrated PDF vectors.
"""

from __future__ import annotations

import argparse
import json
import math
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
    "TD-EVO PF ECOWATT": ["TD EVO-100 PF ECOWATT", "TD EVO-125 PF ECOWATT", "TD EVO-150 PF ECOWATT", "TD EVO-160 PF ECOWATT", "TD EVO-200 PF ECOWATT", "TD EVO-250 PF ECOWATT", "TD EVO-315 PF ECOWATT"],
    "TD-EVO": ["TD EVO-100", "TD EVO-125", "TD EVO-150", "TD EVO-160", "TD EVO-200", "TD EVO-250", "TD EVO-315"],
    "TD-MIXVENT": ["TD-160/100 N", "TD-250/100", "TD-350/125", "TD-500/150", "TD-800/200N", "TD-800/200", "TD-1300/250N", "TD-2000/315N", "TD-4000/355", "TD-6000/400"],
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

MULTI_SPEED_VALUES = {
    "SILENT DUAL 100": {
        "En üst": {"rpm": 2200, "kw": 0.008, "amps": 0.08, "nominal": 90, "spl": 26.5},
        "PIR + zamanlayıcı": {"rpm": 1670, "kw": 0.006, "amps": 0.08, "nominal": 65, "spl": 22},
        "Sürekli": {"rpm": 910, "kw": 0.004, "amps": 0.07, "nominal": 25, "spl": 19},
    },
    "SILENT DUAL 200": {
        "En üst": {"rpm": 2280, "kw": 0.017, "amps": 0.12, "nominal": 170, "spl": 34},
        "PIR + zamanlayıcı": {"rpm": 1870, "kw": 0.013, "amps": 0.11, "nominal": 120, "spl": 29},
        "Sürekli": {"rpm": 1010, "kw": 0.007, "amps": 0.09, "nominal": 60, "spl": 19},
    },
    "SILENT DUAL 300": {
        "En üst": {"rpm": 2120, "kw": 0.026, "amps": 0.16, "nominal": 235, "spl": 37},
        "PIR + zamanlayıcı": {"rpm": 1800, "kw": 0.020, "amps": 0.14, "nominal": 190, "spl": 33},
        "Sürekli": {"rpm": 1010, "kw": 0.011, "amps": 0.11, "nominal": 100, "spl": 19},
    },
    "TD EVO-100 PF ECOWATT": {
        "10V": {"rpm": 2250, "kw": 0.009, "amps": 0.10, "nominal": 190, "spl": 18},
        "8V": {"rpm": 1940, "kw": 0.007, "amps": 0.10, "nominal": 170, "spl": 14},
        "6V": {"rpm": 1530, "kw": 0.005, "amps": 0.10, "nominal": 130, "spl": 11},
        "4V": {"rpm": 1120, "kw": 0.003, "amps": 0.10, "nominal": 90, "spl": 10},
    },
    "TD EVO-125 PF ECOWATT": {
        "10V": {"rpm": 2250, "kw": 0.014, "amps": 0.10, "nominal": 310, "spl": 20},
        "8V": {"rpm": 1930, "kw": 0.010, "amps": 0.10, "nominal": 260, "spl": 16},
        "6V": {"rpm": 1520, "kw": 0.006, "amps": 0.10, "nominal": 210, "spl": 11},
        "4V": {"rpm": 1100, "kw": 0.004, "amps": 0.10, "nominal": 150, "spl": 10},
    },
    "TD EVO-150 PF ECOWATT": {
        "10V": {"rpm": 2650, "kw": 0.038, "amps": 0.30, "nominal": 560, "spl": 30},
        "8V": {"rpm": 2240, "kw": 0.024, "amps": 0.20, "nominal": 480, "spl": 26},
        "6V": {"rpm": 1740, "kw": 0.012, "amps": 0.10, "nominal": 360, "spl": 21},
        "4V": {"rpm": 1250, "kw": 0.006, "amps": 0.10, "nominal": 260, "spl": 14},
    },
    "TD EVO-160 PF ECOWATT": {
        "10V": {"rpm": 2650, "kw": 0.037, "amps": 0.30, "nominal": 580, "spl": 29},
        "8V": {"rpm": 2250, "kw": 0.024, "amps": 0.20, "nominal": 490, "spl": 25},
        "6V": {"rpm": 1760, "kw": 0.013, "amps": 0.10, "nominal": 370, "spl": 20},
        "4V": {"rpm": 1250, "kw": 0.006, "amps": 0.10, "nominal": 260, "spl": 12},
    },
    "TD EVO-200 PF ECOWATT": {
        "10V": {"rpm": 2630, "kw": 0.075, "amps": 0.60, "nominal": 850, "spl": 30},
        "8V": {"rpm": 2250, "kw": 0.050, "amps": 0.40, "nominal": 740, "spl": 27},
        "6V": {"rpm": 1750, "kw": 0.026, "amps": 0.20, "nominal": 570, "spl": 21},
        "4V": {"rpm": 1260, "kw": 0.012, "amps": 0.10, "nominal": 400, "spl": 14},
    },
    "TD EVO-250 PF ECOWATT": {
        "10V": {"rpm": 2640, "kw": 0.141, "amps": 0.90, "nominal": 1380, "spl": 36},
        "8V": {"rpm": 2270, "kw": 0.094, "amps": 0.60, "nominal": 1180, "spl": 32},
        "6V": {"rpm": 1770, "kw": 0.049, "amps": 0.40, "nominal": 910, "spl": 27},
        "4V": {"rpm": 1280, "kw": 0.022, "amps": 0.20, "nominal": 650, "spl": 20},
    },
    "TD EVO-315 PF ECOWATT": {
        "10V": {"rpm": 2640, "kw": 0.225, "amps": 1.50, "nominal": 1780, "spl": 41},
        "8V": {"rpm": 2280, "kw": 0.145, "amps": 1.00, "nominal": 1520, "spl": 38},
        "6V": {"rpm": 1770, "kw": 0.073, "amps": 0.50, "nominal": 1170, "spl": 32},
        "4V": {"rpm": 1280, "kw": 0.035, "amps": 0.30, "nominal": 840, "spl": 25},
    },
    "TD EVO-100": {
        "HS": {"rpm": 2450, "kw": 0.016, "amps": 0.10, "nominal": 210, "spl": 19},
        "MS": {"rpm": 2170, "kw": 0.013, "amps": 0.10, "nominal": 170, "spl": 16},
        "LS": {"rpm": 1960, "kw": 0.012, "amps": 0.10, "nominal": 150, "spl": 13},
    },
    "TD EVO-125": {
        "HS": {"rpm": 2320, "kw": 0.029, "amps": 0.10, "nominal": 310, "spl": 26},
        "MS": {"rpm": 1810, "kw": 0.021, "amps": 0.10, "nominal": 240, "spl": 19},
        "LS": {"rpm": 1600, "kw": 0.019, "amps": 0.10, "nominal": 210, "spl": 17},
    },
    "TD EVO-150": {
        "HS": {"rpm": 2610, "kw": 0.045, "amps": 0.20, "nominal": 560, "spl": 32},
        "MS": {"rpm": 2350, "kw": 0.038, "amps": 0.20, "nominal": 490, "spl": 29},
        "LS": {"rpm": 2110, "kw": 0.033, "amps": 0.10, "nominal": 430, "spl": 26},
    },
    "TD EVO-160": {
        "HS": {"rpm": 2600, "kw": 0.045, "amps": 0.20, "nominal": 560, "spl": 32},
        "MS": {"rpm": 2330, "kw": 0.037, "amps": 0.20, "nominal": 500, "spl": 29},
        "LS": {"rpm": 2090, "kw": 0.033, "amps": 0.10, "nominal": 440, "spl": 26},
    },
    "TD EVO-200": {
        "HS": {"rpm": 2700, "kw": 0.107, "amps": 0.50, "nominal": 900, "spl": 33},
        "MS": {"rpm": 2500, "kw": 0.076, "amps": 0.30, "nominal": 790, "spl": 31},
        "LS": {"rpm": 2280, "kw": 0.064, "amps": 0.30, "nominal": 710, "spl": 28},
    },
    "TD EVO-250": {
        "HS": {"rpm": 2710, "kw": 0.181, "amps": 0.80, "nominal": 1400, "spl": 37},
        "MS": {"rpm": 2520, "kw": 0.153, "amps": 0.60, "nominal": 1310, "spl": 35},
        "LS": {"rpm": 2290, "kw": 0.132, "amps": 0.50, "nominal": 1180, "spl": 33},
    },
    "TD EVO-315": {
        "HS": {"rpm": 2640, "kw": 0.273, "amps": 1.10, "nominal": 1840, "spl": 40},
        "MS": {"rpm": 2500, "kw": 0.231, "amps": 0.90, "nominal": 1730, "spl": 38},
        "LS": {"rpm": 2290, "kw": 0.200, "amps": 0.80, "nominal": 1620, "spl": 36},
    },
    "TD-160/100 N": {
        "HS": {"rpm": 2400, "kw": 0.029, "amps": 0.17, "nominal": 180, "spl": 24},
        "LS": {"rpm": 2200, "kw": 0.018, "amps": 0.11, "nominal": 150, "spl": 22},
    },
    "TD-250/100": {
        "HS": {"rpm": 2140, "kw": 0.028, "amps": 0.12, "nominal": 250, "spl": 34},
        "LS": {"rpm": 1700, "kw": 0.022, "amps": 0.10, "nominal": 200, "spl": 28},
    },
    "TD-350/125": {
        "HS": {"rpm": 2050, "kw": 0.025, "amps": 0.11, "nominal": 330, "spl": 33},
        "LS": {"rpm": 1590, "kw": 0.020, "amps": 0.09, "nominal": 250, "spl": 28},
    },
    "TD-500/150": {
        "HS": {"rpm": 2590, "kw": 0.053, "amps": 0.21, "nominal": 560, "spl": 35},
        "MS": {"rpm": 2150, "kw": 0.044, "amps": 0.19, "nominal": 470, "spl": 31},
        "LS": {"rpm": 1820, "kw": 0.041, "amps": 0.18, "nominal": 390, "spl": 26},
    },
    "TD-800/200N": {
        "HS": {"rpm": 2190, "kw": 0.103, "amps": 0.50, "nominal": 890, "spl": 38},
        "MS": {"rpm": 1870, "kw": 0.093, "amps": 0.47, "nominal": 750, "spl": 34},
        "LS": {"rpm": 1660, "kw": 0.088, "amps": 0.45, "nominal": 660, "spl": 31},
    },
    "TD-800/200": {
        "HS": {"rpm": 2480, "kw": 0.132, "amps": 0.55, "nominal": 1040, "spl": 40},
        "MS": {"rpm": 2290, "kw": 0.133, "amps": 0.56, "nominal": 940, "spl": 37},
        "LS": {"rpm": 2080, "kw": 0.131, "amps": 0.55, "nominal": 850, "spl": 34},
    },
    "TD-1300/250N": {
        "HS": {"rpm": 2710, "kw": 0.181, "amps": 0.80, "nominal": 1400, "spl": 40},
        "MS": {"rpm": 2520, "kw": 0.153, "amps": 0.60, "nominal": 1310, "spl": 39},
        "LS": {"rpm": 2290, "kw": 0.132, "amps": 0.50, "nominal": 1180, "spl": 37},
    },
    "TD-2000/315N": {
        "HS": {"rpm": 2640, "kw": 0.273, "amps": 1.10, "nominal": 1840, "spl": 39},
        "MS": {"rpm": 2500, "kw": 0.231, "amps": 0.90, "nominal": 1730, "spl": 38},
        "LS": {"rpm": 2290, "kw": 0.200, "amps": 0.80, "nominal": 1620, "spl": 37},
    },
    "TD-4000/355": {
        "230V": {"rpm": 1360, "kw": 0.407, "amps": 1.69, "nominal": 3750, "spl": 41},
    },
    "TD-6000/400": {
        "230V": {"rpm": 1400, "kw": 0.580, "amps": 2.42, "nominal": 5100, "spl": 43},
    },
    "TD-160/100N SILENT": {
        "HS": {"rpm": 2400, "kw": 0.029, "amps": 0.17, "nominal": 180, "spl": 24},
        "LS": {"rpm": 2200, "kw": 0.018, "amps": 0.11, "nominal": 150, "spl": 22},
    },
    "TD-250/100 SILENT": {
        "HS": {"rpm": 2210, "kw": 0.027, "amps": 0.12, "nominal": 250, "spl": 25},
        "LS": {"rpm": 1680, "kw": 0.021, "amps": 0.10, "nominal": 200, "spl": 20},
    },
    "TD-350/125 SILENT": {
        "HS": {"rpm": 2100, "kw": 0.027, "amps": 0.12, "nominal": 330, "spl": 23},
        "LS": {"rpm": 1650, "kw": 0.021, "amps": 0.10, "nominal": 260, "spl": 18},
    },
    "TD-500/150 SILENT": {
        "HS": {"rpm": 2480, "kw": 0.059, "amps": 0.26, "nominal": 590, "spl": 27},
        "MS": {"rpm": 2060, "kw": 0.050, "amps": 0.22, "nominal": 450, "spl": 22},
        "LS": {"rpm": 1610, "kw": 0.045, "amps": 0.20, "nominal": 350, "spl": 17},
    },
    "TD-800/200 SILENT": {
        "HS": {"rpm": 2170, "kw": 0.102, "amps": 0.50, "nominal": 910, "spl": 28},
        "MS": {"rpm": 1870, "kw": 0.092, "amps": 0.47, "nominal": 780, "spl": 24},
        "LS": {"rpm": 1660, "kw": 0.090, "amps": 0.46, "nominal": 690, "spl": 22},
    },
    "TD-1000/200 SILENT": {
        "HS": {"rpm": 2450, "kw": 0.130, "amps": 0.55, "nominal": 1040, "spl": 29},
        "MS": {"rpm": 2210, "kw": 0.127, "amps": 0.55, "nominal": 910, "spl": 27},
        "LS": {"rpm": 1920, "kw": 0.122, "amps": 0.53, "nominal": 790, "spl": 24},
    },
    "TD-1300/250 SILENT": {
        "HS": {"rpm": 2530, "kw": 0.204, "amps": 0.85, "nominal": 1320, "spl": 36},
        "MS": {"rpm": 2230, "kw": 0.163, "amps": 0.68, "nominal": 1160, "spl": 33},
        "LS": {"rpm": 2030, "kw": 0.144, "amps": 0.60, "nominal": 1040, "spl": 31},
    },
    "TD-2000/315 SILENT": {
        "HS": {"rpm": 2670, "kw": 0.293, "amps": 1.25, "nominal": 1770, "spl": 39},
        "MS": {"rpm": 2490, "kw": 0.232, "amps": 0.97, "nominal": 1610, "spl": 38},
        "LS": {"rpm": 2240, "kw": 0.190, "amps": 0.78, "nominal": 1480, "spl": 36},
    },
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
            speed_values = MULTI_SPEED_VALUES.get(model, {})
            if speed_values:
                row.update(next(iter(speed_values.values())))
            curve = curve_models.get(model)
            if curve:
                extracted_curves = curve.get("curves") or [{
                    "control": "Nominal",
                    "sourcePage": curve["sourcePage"],
                    "sourceMethod": curve["sourceMethod"],
                    "interpolation": curve["interpolation"],
                    "precomputed": True,
                    "sourcePoints": curve["sourcePoints"],
                    "maxAirflowM3h": curve["maxAirflowM3h"],
                    "maxPressurePa": curve["maxPressurePa"],
                }]
                source_points = extracted_curves[0]["sourcePoints"]
                row["catalogOnly"] = False
                row["sourcePage"] = extracted_curves[0]["sourcePage"]
                row["sourcePoints"] = source_points
                row["curves"] = [{
                    "control": item["control"],
                    "sourcePage": item["sourcePage"],
                    "sourceMethod": item["sourceMethod"],
                    "interpolation": item["interpolation"],
                    "precomputed": True,
                    "sourcePoints": item["sourcePoints"],
                } for item in extracted_curves]
                row["operatingPoints"] = []
                for item in extracted_curves:
                    values = speed_values.get(item["control"], {})
                    row["operatingPoints"].append({
                        "control": item["control"],
                        "powerKw": values.get("kw", row.get("kw", 0)),
                        "rpm": values.get("rpm", row.get("rpm", 0)),
                        "currentA": values.get("amps", row.get("amps", 0)),
                        "maxAirflowM3h": values.get("nominal", row.get("nominal", item["maxAirflowM3h"])),
                        "maxPressurePa": item["maxPressurePa"],
                        "soundPressureDbA3m": values.get("spl", row.get("spl", 0)),
                    })
            rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--curves", type=Path)
    parser.add_argument("--chunks", type=int, default=3)
    args = parser.parse_args()
    rows = build(args.text_dir, args.curves)
    chunk_count = max(1, min(args.chunks, len(rows)))
    chunk_size = math.ceil(len(rows) / chunk_count)
    outputs = []
    for index in range(chunk_count):
        chunk = rows[index * chunk_size:(index + 1) * chunk_size]
        suffix = "" if index == 0 else f"-{index + 1}"
        output = args.output.with_name(f"{args.output.stem}{suffix}{args.output.suffix}")
        payload = json.dumps(chunk, ensure_ascii=False, separators=(",", ":"))
        output.write_text(f"window.models.push(...{payload});\n", encoding="utf-8")
        outputs.append(str(output))
    print(json.dumps({"series": len(SERIES), "models": len(rows), "outputs": outputs}, ensure_ascii=False))


if __name__ == "__main__":
    main()

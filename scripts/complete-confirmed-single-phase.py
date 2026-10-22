#!/usr/bin/env python3
"""Complete the supply phase of the exact VORTICE/S&P families confirmed by Metin.

The confirmation applies to these existing series, not to all fans of either
brand, and never derives phase from a T suffix (which can mean timer).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIRMED = {
    "VORTICE": {
        "PUNTO", "PUNTO FILO", "PUNTO FOUR", "PUNTO GHOST", "PUNTO EVO FLEXO",
        "PUNTO EVO", "PUNTO EVO GOLD", "VORT QUADRO", "VORT QUADRO I", "VORT QUADRO EVO",
        "VORTICE VARIO", "VORTICE VARIO I", "LINEO", "LINEO QUIET", "LINEO QUIET ES",
        "CA MD EXTRA EU", "CA MD E RF",
    },
    "Soler & Palau": {"EDM", "DECOR", "DECOR DESIGN", "SILENT", "SILENT DESIGN", "HCM-N"},
}


def complete(data):
    series = {s["id"]: s for s in data["series"]}
    updated, conflicts = [], []
    for model in data["models"]:
        sid = model["seriesId"]
        brand = series[sid]["manufacturer"]
        if sid not in CONFIRMED.get(brand, set()):
            continue
        technical = model.setdefault("technical", {})
        value = technical.get("phase")
        if value not in (None, "", "-", "—", 0):
            normalized = "".join(c for c in str(value).lower() if c.isalpha())
            if normalized not in ("singlephase", "monofaze", "monophase"):
                conflicts.append({"id": model["id"], "existingPhase": value})
            continue
        technical["phase"] = "Single-phase"
        model.setdefault("verification", {})["userConfirmedSupply"] = {
            "basis": "user-confirmed-series-supply",
            "confirmedBy": "Metin", "confirmedOn": "2026-10-22",
            "manufacturer": brand, "seriesId": sid, "fields": ["phase"],
        }
        updated.append(model["id"])
    return {"modelsUpdated": len(updated), "ids": updated, "conflictsPreserved": conflicts}


if __name__ == "__main__":
    target = ROOT / "data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    result = complete(data)
    target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({k: v for k, v in result.items() if k != "ids"}))

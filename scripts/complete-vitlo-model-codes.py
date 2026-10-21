"""Fill missing phase/pole metadata using Metin's 2026-10-21 Vitlo naming rule.

This is user-confirmed model-code interpretation, not a manufacturer data import.
No variants are created. Existing values, selection poles and curves are retained.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TOKEN = re.compile(r"(?:^|[\s-])([24](?:/[24])?)([TM])(?=$|[\s-])", re.I)


def complete(data):
    series = {row["id"]: row for row in data["series"]}
    counts = Counter()
    for model in data["models"]:
        if series[model["seriesId"]]["manufacturer"] != "Vitlo":
            continue
        matches = list(TOKEN.finditer(model["model"]))
        # Ambiguous/unrecognised codes need their own source, not a guessed value.
        if len(matches) != 1:
            counts["unmatched"] += 1
            continue
        match = matches[0]
        poles, phase_code = match[1], match[2].upper()
        token = poles + phase_code
        technical = model.setdefault("technical", {})
        fields = []
        if technical.get("phase") in (None, "", 0, "0", "-", "—"):
            technical["phase"] = "Three-phase" if phase_code == "T" else "Single-phase"
            fields.append("phase")
            counts["phase"] += 1
        if "/" in poles:
            # A 2/4T token must never become a single technical.poles value.
            counts["dualPoleRetained"] += 1
        elif technical.get("poles") in (None, "", 0, "0", "-", "—"):
            technical["poles"] = int(poles)
            fields.append("poles")
            counts["poles"] += 1
        if fields:
            model.setdefault("verification", {})["modelCodeDerivation"] = {
                "basis": "user-confirmed-model-code",
                "confirmedBy": "Metin",
                "confirmedOn": "2026-10-21",
                "token": token,
                "fields": fields,
                "rule": "2/4=pole count; T=three-phase; M=single-phase; dual poles retained",
            }
            counts["modelsUpdated"] += 1
    return dict(counts)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=ROOT / "data/ventilation-catalog.js")
    args = parser.parse_args()
    prefix, payload = args.catalog.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    summary = complete(data)
    args.catalog.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps(summary))

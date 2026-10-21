"""Import only the eight existing CRVB/CRVT records from the supplied S&P PDF.

Usage: python3 scripts/import-crvb-crvt-catalogue.py /path/crvb-n-crvt-n-2.pdf
Coordinates refer to original PDF points, not a screenshot. Curve domains are
retained exactly; no shut-off extension, affinity scaling or extrapolation.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
SHA256 = "d8347fa6475f2fd273478b81a6c2dd55018bf1b6d4d0eb8549159727cd5cd642"
URL = "https://www.solerpalau.com.tr/img/urunlerpdf/fanlar/cati-tipi-fanlar/crvb-n-crvt-n-2.pdf"
ARTIFACT = ROOT / "assets/products/soler-palau/crvb-crvt-verified-curves.json"
# Page 4, exact model rows. W is maximum absorbed electrical input P1.
# rpm, W, A at 230 V, A at 400 V, m3/h, inlet/outlet LpA at 3m, max C, kg.
ROWS = {
    "CRVB/2-250N": [2640, 231, 1.0, None, 1320, 52, 58, 70, 11.5],
    "CRVB/4-280N": [1280, 99, 0.4, None, 1350, 43, 48, 70, 17.5],
    "CRVB/4-315N": [1380, 156, 0.7, None, 2050, 48, 53, 70, 27],
    "CRVB/4-355N": [1370, 296, 1.2, None, 2960, 51, 57, 70, 29.5],
    "CRVT/4-400N": [1380, 504, 1.9, 1.1, 4540, 54, 58, 70, 28],
    "CRVT/4-450N": [1390, 900, 3.1, 1.8, 6080, 58, 63, 70, 38.5],
    "CRVT/4-500N": [1420, 1588, 5.4, 3.1, 8530, 64, 68, 70, 54.5],
    "CRVT/4-560N": [1350, 2639, 8.0, 4.6, 12710, 65, 71, 60, 70],
}
# Model, page, primary drawing, combined three reduced-control drawings.
GRAPHS = [
    ("CRVB/2-250N", 21, 1084, 1085),
    ("CRVB/4-280N", 23, 27, 28),
    ("CRVB/4-315N", 23, 1074, 1075),
    ("CRVB/4-355N", 24, 20, 21),
    ("CRVT/4-400N", 31, 20, 21),
    ("CRVT/4-450N", 31, 1066, 1067),
    ("CRVT/4-500N", 32, 20, 21),
    ("CRVT/4-560N", 32, 1074, 1075),
]


def split_paths(drawing):
    paths = []
    for item in drawing["items"]:
        if item[0] != "l":
            raise ValueError("Expected original straight vector segments")
        a, b = item[1:]
        if not paths or math.hypot(a.x - paths[-1][-1][0], a.y - paths[-1][-1][1]) > 0.02:
            paths.append([(a.x, a.y)])
        paths[-1].append((b.x, b.y))
    if any(len(path) != 200 for path in paths):
        raise ValueError("Original vector path segment count changed")
    return paths


def linear_fit(ticks):
    x_mean = sum(x for x, _ in ticks) / len(ticks)
    y_mean = sum(y for _, y in ticks) / len(ticks)
    slope = sum((x - x_mean) * (y - y_mean) for x, y in ticks) / sum((x - x_mean)**2 for x, _ in ticks)
    intercept = y_mean - slope * x_mean
    # Printed grid strokes differ by hundredths of a PDF point. Check the
    # residual in page coordinates so large airflow scales have equal tolerance.
    if max(abs(slope * x + intercept - y) for x, y in ticks) / abs(slope) > 0.05:
        raise ValueError(f"Printed axis calibration is not linear: {ticks}")
    return slope, intercept


def calibration(page, path):
    baseline = path[-1][1]
    side_min, side_max = (0, 300) if path[0][0] < 300 else (300, 590)
    xs, ys, horizontal_lefts = set(), set(), []
    for drawing in page.get_drawings():
        color = drawing.get("color")
        if not color or max(color) > 0.3 or drawing.get("width", 0) > 0.8:
            continue
        for item in drawing["items"]:
            if item[0] != "l":
                continue
            a, b = item[1:]
            if not (side_min < a.x < side_max and side_min < b.x < side_max):
                continue
            if min(a.y, b.y) < 170 or max(a.y, b.y) > baseline + 0.6:
                continue
            if abs(a.x - b.x) < 0.005 and abs(a.y - b.y) > 80:
                xs.add(round(a.x, 4))
            if abs(a.y - b.y) < 0.005 and abs(a.x - b.x) > 100:
                ys.add(round(a.y, 4))
                horizontal_lefts.append(min(a.x, b.x))
    if len(xs) < 3 or len(ys) < 3:
        raise ValueError(f"Insufficient original plot grid: {xs}, {ys}")
    left = min(horizontal_lefts)
    xs = {x for x in xs if x >= left - 0.1}
    x_ticks, y_ticks = [], []
    for x0, y0, x1, y1, text, *_ in page.get_text("words"):
        if not text.isdecimal():
            continue
        value = int(text)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if side_min < cx < side_max and baseline + 1 < y0 < baseline + 15:
            position = min(xs, key=lambda x: abs(x - cx))
            if abs(position - cx) < 3:
                x_ticks.append((position, value))
        if left - 20 < x1 < left - 2 and 170 < cy < baseline + 6:
            position = min(ys, key=lambda y: abs(y - cy))
            if abs(position - cy) < 4:
                y_ticks.append((position, value))
    if len(x_ticks) < 3 or len(y_ticks) < 3:
        raise ValueError(f"Insufficient printed axis ticks: {x_ticks}, {y_ticks}; grid: {xs}, {ys}")
    return {"airflowTicks": x_ticks, "pressureTicks": y_ticks,
            "airflowTransform": linear_fit(x_ticks), "pressureTransform": linear_fit(y_ticks)}


def extract(pdf):
    actual = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if actual != SHA256:
        raise ValueError(f"Unexpected catalogue SHA-256: {actual}")
    document = fitz.open(pdf)
    models = {}
    for name, pn, primary_index, reduced_index in GRAPHS:
        page = document[pn - 1]
        if name not in page.get_text():
            raise ValueError(f"Model label absent from page {pn}: {name}")
        drawings = page.get_drawings()
        primary = split_paths(drawings[primary_index])
        reduced = split_paths(drawings[reduced_index])
        assert len(primary) == 1 and len(reduced) == 3
        try:
            axes = calibration(page, primary[0])
        except ValueError as error:
            raise ValueError(f"{name}: {error}") from error
        qa, qb = axes["airflowTransform"]
        pa, pb = axes["pressureTransform"]
        controls = ["230V", "180V", "140V", "100V"] if name.startswith("CRVB") else ["50Hz", "40Hz", "30Hz", "25Hz"]
        curves = []
        for control, raw in zip(controls, primary + reduced):
            # Confirm the printed control label lies beside the correct path.
            labels = [w for w in page.get_text("words") if w[4] == control]
            assert any(abs(w[0] - raw[0][0]) < 20 and abs(w[1] - raw[0][1]) < 12 for w in labels), (name, control)
            points = [[round(max(0, pa * y + pb), 3), round(qa * x + qb, 3)] for x, y in raw]
            if points[0][1] > points[-1][1]:
                points.reverse()
            # The independently stroked zero grid and curve can differ by a
            # fraction of a PDF point. Snap only the existing zero endpoint.
            assert abs(points[-1][0]) < 0.5, (name, control, points[-1])
            points[-1][0] = 0
            assert all(p >= 0 and q >= 0 for p, q in points)
            assert all(a[1] < b[1] for a, b in zip(points, points[1:]))
            # Retain real stall-region pressure rises (560N at 30Hz). The
            # common selection engine accepts an ordered, multivalued polyline.
            curves.append({"control": control, "sourcePage": pn,
                           "sourceDrawingIndex": primary_index if control == controls[0] else reduced_index,
                           "sourceSubpathIndex": 0 if control == controls[0] else controls.index(control) - 1,
                           "sourceMethod": "original vector path calibrated to printed m3/h and static Pa grid",
                           "sourceFrequencyHz": 50 if name.startswith("CRVB") else int(control[:-2]),
                           "interpolation": "linear", "precomputed": True, "sourcePoints": points})
        # Runtime default is the nominal/full-control curve, stored last.
        curves.reverse()
        models[name] = {"technicalTablePage": 4, "technicalTableRow": ROWS[name],
                        "calibration": axes, "curves": curves}
    return {"schemaVersion": 1, "status": "verified_against_original_catalogue_vector_graphs",
            "extrapolation": False, "source": {"catalogue": "crvb-n-crvt-n-2.pdf", "sha256": SHA256, "url": URL},
            "summary": {"models": 8, "curves": 32, "points": 6400}, "models": models}


def apply(artifact):
    target = ROOT / "data/ventilation-catalog.js"
    original = target.read_text()
    prefix, payload = original.split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    matches = [m for m in data["models"] if m["seriesId"] == "CRVB-N / CRVT-N"]
    assert {m["model"] for m in matches} == set(ROWS)
    for model in matches:
        name = model["model"]
        rpm, watts, a230, a400, airflow, inlet, outlet, max_c, weight = ROWS[name]
        mono = name.startswith("CRVB")
        curves = artifact["models"][name]["curves"]
        primary = curves[-1]
        rated_hz = "50 Hz" if name in ("CRVT/4-450N", "CRVT/4-560N") else "50/60 Hz"
        model["motor"].update(power=watts / 1000, speed=rpm, current=a230 if mono else a400,
                              voltage="230 V" if mono else "230/400 V", frequency=rated_hz, sound=outlet)
        model["technical"].update(weight=weight, ipClass="IP54", insulationClass="F", phase="Single-phase" if mono else "Three-phase",
                                  poles=2 if "/2-" in name else 4, operatingTemperatureMinC=-40, operatingTemperatureMaxC=max_c,
                                  current230A=a230, current400A=a400 or 0, currentReferenceVoltageV=230 if mono else 400,
                                  powerBasis="maximum-electrical-input-P1", soundBasis="outlet-sound-pressure-3m-operating-point-2",
                                  soundInletDbA3m=inlet, soundOutletDbA3m=outlet)
        if name in ("CRVB/2-250N", "CRVB/4-315N"):
            model["technical"]["speedControlledMaxCurrentA"] = 1.1 if "/2-" in name else 0.8
        model["pole"] = model["technical"]["poles"]
        model["catalogOnly"] = False
        operating_points = []
        for curve in curves:
            full = curve is primary
            operating_points.append({"control": curve["control"], "power": watts / 1000 if full else 0,
                                     "speed": rpm if full else 0, "current": (a230 if mono else a400) if full else 0,
                                     "sound": outlet if full else 0,
                                     "nominalAirflow": airflow if full else max(p[1] for p in curve["sourcePoints"]),
                                     "maxPressure": max(p[0] for p in curve["sourcePoints"])})
        model["performance"].update(nominalAirflow=airflow, maxAirflow=airflow, points=[], sourcePoints=primary["sourcePoints"],
                                     curves=curves, control=primary["control"], controls=[c["control"] for c in curves],
                                     operatingPoints=operating_points, interpolation="linear", precomputed=True)
        current_note = f"50 Hz katalog akımı: 230 V için {a230:g} A" + ("." if mono else f", 400 V için {a400:g} A.")
        model["description"] = {
            "general": ["Dikey atışlı çatı tipi radyal fan.", "Güç: katalogdaki maksimum çekilen elektriksel giriş gücü (P1).",
                        f"Ses basıncı: atış {outlet} dB(A), emiş {inlet} dB(A); 3 m, katalog çalışma noktası 2."],
            "motor": [f"{model['motor']['voltage']}, {rated_hz}.", "IP54 motor, F sınıfı yalıtım.", current_note],
            "applications": []}
        model["source"].update(page=4, catalogue="crvb-n-crvt-n-2.pdf", url=URL, sha256=SHA256,
                               curvePages=[primary["sourcePage"]])
        model["verification"] = {"status": "catalog-source", "sourceCatalogue": "crvb-n-crvt-n-2.pdf", "sourcePage": 4,
                                 "sourceSha256": SHA256, "curvePages": [primary["sourcePage"]],
                                 "caution": "Curves retain their published domains. Reduced-control motor data are unspecified. Power is maximum electrical input P1; sound is outlet LpA at 3m, point 2."}
    ARTIFACT.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")) + "\n")
    target.write_text(prefix + "window.VensisVentilationData=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    result = extract(args.pdf)
    apply(result)
    print(json.dumps(result["summary"]))

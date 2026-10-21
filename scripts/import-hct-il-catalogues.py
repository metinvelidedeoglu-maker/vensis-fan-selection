"""Import the 22 existing HCTB/HCTT and ILB/ILT models from the supplied PDFs.

Usage: python3 scripts/import-hct-il-catalogues.py /path/hct.pdf /path/il.pdf
The hash-locked catalogues are the same editions used for existing dimensions.
IL curves are original 200-point vector polylines. HCT curves are expanded,
filled vector strokes: sample their centre inside the printed stroke bounds.
Neither representation is extended to zero flow or zero pressure.
"""
import argparse
import hashlib
import importlib.util
import json
import statistics
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("roof_vectors", ROOT / "scripts/import-crvb-crvt-catalogue.py")
vectors = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vectors)
HCT_SHA = "ad37df64e714cfe3b4d3dc75060ba4de58ff4aa9e4c28f5ab46b75f344a7a551"
IL_SHA = "395ee9effb5f658e2ee0ec2dd16093997d78e3fa4a91e18b2784c4709b865ca8"
HCT_URL = "https://www.solerpalau.com.tr/img/urunlerpdf/fanlar/cati-tipi-fanlar/hctb-hctt-4-67f3c03ef10a7.pdf"
IL_URL = "https://www.solerpalau.com.tr/img/urunlerpdf/fanlar/dikdortgen-kanal-tipi-fanlar/ilb-ilt-0.pdf"
# rpm, W, A230, A400, maximum m3/h, inlet/outlet LpA at 1.5m, kg.
# The 800/900/1000 rows carry ** nominal motor power, not maximum P1.
HCT_ROWS = {
    "HCTB/4-400-B": [1290, 340, 1.64, None, 3700, 59, 58, 16.5],
    "HCTB/4-450-B": [1290, 480, 2.3, None, 5600, 62, 61, 23.5],
    "HCTB/4-500-B": [1290, 650, 3.0, None, 7100, 69, 67, 25.4],
    "HCTB/4-560-B": [1200, 980, 4.9, None, 9820, 73, 69, 40],
    "HCTB/4-630-B": [1290, 1700, 7.6, None, 13000, 74, 70, 42.6],
    "HCTT/4-710-B": [1300, 2200, None, 4.0, 18400, 82, 80, 60],
    "HCTT/4-800-B": [1400, 3000, None, 7.3, 23800, 89, 86, 67],
    "HCTT/4-900-B": [1400, 4000, None, 9.5, 30000, 92, 89, 77],
    "HCTT/4-1000-B": [1450, 5500, None, 12.0, 38500, 93, 90, 123],
}
# rpm, maximum P1 W, A230, A400, maximum m3/h, ducted LpA at 1m,
# minimum/maximum working temperature C, kg. Blank 230V cells stay blank.
IL_ROWS = {
    "ILB/4-200": [1240, 240, 1.15, None, 1090, 57, -40, 70, 15],
    "ILB/4-225": [1130, 520, 2.45, None, 1670, 56, -40, 70, 20],
    "ILB/4-250": [1130, 950, 4.4, None, 2350, 60, -40, 70, 25],
    "ILB/6-285": [825, 660, 3.2, None, 2650, 55, -40, 70, 32],
    "ILB/6-355": [800, 1300, 6.3, None, 4070, 60, -40, 70, 60],
    "ILT/4-250": [1170, 930, 3.0, 1.8, 2650, 62, -40, 70, 25],
    "ILT/4-285": [1070, 1260, 4.2, 2.4, 3100, 61, -40, 70, 32],
    "ILT/4-315": [1390, 2440, 8.0, 4.6, 4160, 68, -40, 70, 42],
    "ILT/4-400": [1350, 6350, None, 9.3, 7765, 69, -20, 60, 80],
    "ILT/6-355": [875, 1380, 5.2, 3.0, 4200, 61, -40, 70, 65],
    "ILT/6-400": [950, 3000, 11.0, 6.4, 7400, 66, -20, 60, 80],
    "ILT/6-450": [900, 5350, 17.3, 10.0, 10850, 67, -20, 40, 100],
    "ILT/8-400": [700, 1340, 6.4, 3.7, 5350, 59, -20, 70, 80],
}
# Page, expanded full-speed B/Delta stroke(s), plot bounds, printed frame scales.
# These grids have imperfect legacy alignment; use the actual original frame,
# not the displaced text centres. 900/1000 curves span two touching fills.
HCT_GRAPHS = {
    "HCTB/4-400-B": (4, [39], [351.790, 166.843, 538.656, 318.759], 4000, 160),
    "HCTB/4-450-B": (4, [54], [82.931, 386.479, 269.461, 538.121], 6000, 220),
    "HCTB/4-500-B": (4, [122], [351.801, 387.237, 536.807, 537.641], 8000, 240),
    "HCTB/4-560-B": (4, [82], [88.629, 606.710, 263.762, 749.087], 10500, 300),
    "HCTB/4-630-B": (4, [157], [354.444, 605.194, 531.147, 748.847], 14000, 350),
    "HCTT/4-710-B": (5, [11], [82.968, 174.767, 262.013, 320.324], 21000, 300),
    "HCTT/4-800-B": (5, [36], [349.599, 171.960, 529.428, 318.155], 32000, 500),
    "HCTT/4-900-B": (5, [56, 57], [83.434, 395.089, 262.044, 540.293], 35000, 500),
    "HCTT/4-1000-B": (5, [68, 69], [358.737, 396.914, 534.708, 539.972], 45000, 500),
}
# Page, nominal/reduced polyline drawings, vertical/horizontal grid drawings,
# printed frame m3/h / static Pa and controls in the original drawing order.
IL_GRAPHS = {
    "ILB/4-200": (6, 246, 244, 240, 242, 1400, 400, [230, 170, 140, 115, 95]),
    "ILB/4-225": (6, 266, 264, 260, 262, 2000, 500, [230, 170, 140, 115]),
    "ILB/4-250": (7, 18, 16, 12, 14, 2800, 600, [230, 170, 140, 115]),
    "ILB/6-285": (7, 78, 76, 72, 74, 3200, 400, [230, 200, 170, 140]),
    "ILB/6-355": (7, 116, 114, 110, 112, 4500, 550, [230, 170, 140, 115, 95]),
    "ILT/4-250": (8, 102, 100, 96, 98, 2800, 600, [400, 300, 250, 200, 160]),
    "ILT/4-285": (8, 122, 120, 116, 118, 3500, 800, [400, 300, 250, 200, 160]),
    "ILT/4-315": (8, 42, 40, 36, 38, 4500, 800, [400, 300, 250, 200, 160]),
    "ILT/4-400": (9, 23, 20, 16, 18, 8000, 1400, [400, 300, 250, 200, 160]),
    "ILT/6-355": (10, 18, 16, 12, 14, 4500, 500, [400, 300, 250, 200, 160]),
    "ILT/6-400": (10, 38, 36, 32, 34, 8000, 700, [400, 300, 250, 200, 160]),
    "ILT/6-450": (10, 58, 56, 52, 54, 12000, 700, [400, 300, 250, 200, 160]),
    "ILT/8-400": (10, 98, 96, 92, 94, 6000, 350, [400, 300, 250, 200, 160]),
}


def edges(drawings):
    result = []
    for drawing in drawings:
        assert drawing["type"] == "f"
        for item in drawing["items"]:
            if item[0] == "l":
                result.append((tuple(item[1]), tuple(item[2])))
            elif item[0] == "re":
                r = item[1]
                vertices = [tuple(p) for p in [r.tl, r.tr, r.br, r.bl, r.tl]]
                result.extend(zip(vertices, vertices[1:]))
            else:
                raise ValueError("Expanded vector stroke representation changed")
    return result


def stroke_centre(drawings):
    segments = edges(drawings)
    # Stay inside the ~1.4pt expanded stroke, including its end caps. This trims
    # a fraction of a point instead of extending a drawn line to an axis.
    low = min(p[0] for edge in segments for p in edge) + 0.75
    high = max(p[0] for edge in segments for p in edge) - 0.75
    path = []
    for i in range(201):
        x = low + (high-low)*i/200
        intersections = [a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0])
                         for a, b in segments if min(a[0], b[0]) <= x <= max(a[0], b[0]) and abs(a[0]-b[0]) > 1e-8]
        if not intersections:
            raise ValueError("Gap in original expanded curve stroke")
        assert max(intersections)-min(intersections) < 18, "Separate curves were mixed"
        path.append((x, (min(intersections)+max(intersections))/2))
    return path


def convert(path, bounds, qmax, pmax, pressure_transform=None):
    x0, y0, x1, y1 = bounds
    result = []
    for x, y in path:
        p = pressure_transform[0]*y+pressure_transform[1] if pressure_transform else (y1-y)*pmax/(y1-y0)
        q = (x-x0)*qmax/(x1-x0)
        # Only printed stroke/axis rounding is clamped. No endpoint is added.
        assert p > -2 and q > -1, (p, q)
        result.append([round(max(0, p), 3), round(max(0, q), 3)])
    # Original near-vertical tails can contain equal or slightly returning flow
    # coordinates. The selection engine accepts ordered polylines: do not sort
    # or perturb these real source points to force a single-valued function.
    assert result[0][1] < result[-1][1]
    return result


def il_bounds(drawings, vertical_index, horizontal_index):
    v = [item for item in drawings[vertical_index]["items"] if item[0] == "l"]
    h = [item for item in drawings[horizontal_index]["items"] if item[0] == "l"]
    assert all(abs(a.x-b.x) < 0.01 for _, a, b in v)
    assert all(abs(a.y-b.y) < 0.01 for _, a, b in h)
    return [min(a.x for _, a, b in h), min(min(a.y, b.y) for _, a, b in v),
            max(b.x for _, a, b in h), max(max(a.y, b.y) for _, a, b in v)]


def printed_ticks(page, bounds, qmax, pmax, calibrate_pa=False):
    x0, y0, x1, y1 = bounds
    xt, yt = [], []
    for a, b, c, d, value, *_ in page.get_text("words"):
        if not value.isdecimal():
            continue
        value = int(value)
        cx, cy = (a+c)/2, (b+d)/2
        if x0-5 < cx < x1+5 and y1+1 < b < y1+13:
            predicted = (cx-x0)*qmax/(x1-x0)
            if abs(predicted-value) < qmax*0.025:
                xt.append([cx, value])
        if x0-45 < c < x0-2 and y0-5 < cy < y1+5:
            predicted = (y1-cy)*pmax/(y1-y0)
            if value > 0 and abs(predicted-value) < pmax*0.025:
                yt.append([cy, value])
    if calibrate_pa:
        # This edition's Pa and mmWG numerals do not share exactly the same
        # spacing. Calibrate directly to the Pa column, never multiply the
        # mmWG/frame scale by ten. Anchor its printed zero to the real baseline
        # to remove the text font's vertical alignment offset.
        ticks = [[(b+d)/2, int(value)] for a,b,c,d,value,*_ in page.get_text("words")
                 if value.isdecimal() and x0-40<c<x0-15 and y0-6<(b+d)/2<y1+5]
        zero = next(y for y, value in ticks if value == 0)
        scale = statistics.median(value/(zero-y) for y, value in ticks if value > 0)
        # ILB/4-225 has a misprinted extra 150 at the 50-Pa position. Keep that
        # rejected source label in the audit, and require all other ticks agree.
        accepted = [[y, value] for y, value in ticks if abs((zero-y)*scale-value) < 0.15]
        rejected = [tick for tick in ticks if tick not in accepted]
        assert len(accepted) >= 5 and len(rejected) <= 1, (accepted, rejected)
        assert not rejected or (len(rejected) == 1 and rejected[0][1] == 150)
        pmax = scale*(y1-y0)
        yt = accepted
    assert len(xt) >= 3 and len(yt) >= 3, (xt, yt, bounds, qmax, pmax)
    result = {"plotBounds": bounds, "maxAirflowM3h": qmax, "maxStaticPressurePa": pmax,
              "checkedPrintedAirflowTicks": xt, "checkedPrintedPressureTicks": yt}
    if calibrate_pa:
        result.update(pressureTransform=[-scale, scale*y1], rejectedPrintedPressureTicks=rejected,
                      pressureCalibration="printed Pa numerals with text-zero aligned to original grid baseline; not mmWG conversion")
    return result


def extract(pdf, family):
    hct = family == "hct"
    sha, url, rows, graphs = (HCT_SHA, HCT_URL, HCT_ROWS, HCT_GRAPHS) if hct else (IL_SHA, IL_URL, IL_ROWS, IL_GRAPHS)
    assert hashlib.sha256(pdf.read_bytes()).hexdigest() == sha, "Unexpected source edition"
    doc, models = fitz.open(pdf), {}
    for name, graph in graphs.items():
        pn = graph[0]
        page = doc[pn-1]
        drawings = page.get_drawings()
        if hct:
            _, indexes, bounds, qmax, pmax = graph
            paths = [stroke_centre([drawings[index] for index in indexes])]
            origins, controls = [(indexes, 0)], ["230V" if name.startswith("HCTB") else "400V"]
            method = "centre of original expanded filled vector stroke, inside printed B/Delta full-speed domain"
        else:
            _, full, reduced, v, h, qmax, pmax, levels = graph
            assert name in page.get_text(), name
            bounds = il_bounds(drawings, v, h)
            paths = vectors.split_paths(drawings[full]) + vectors.split_paths(drawings[reduced])
            origins = [([full], 0)] + [([reduced], i) for i in range(len(paths)-1)]
            controls, method = [f"{n}V" for n in levels], "original vector polyline calibrated to printed m3/h and static Pa grid"
        assert len(paths) == len(controls)
        calibration = printed_ticks(page, bounds, qmax, pmax, calibrate_pa=not hct)
        curves = []
        for path, control, (indexes, subpath) in zip(paths, controls, origins):
            points = convert(path, bounds, qmax, pmax, calibration.get("pressureTransform"))
            curves.append({"control": control, "sourcePage": pn, "sourceDrawingIndexes": indexes,
                           "sourceSubpathIndex": subpath, "sourceMethod": method, "sourceFrequencyHz": 50,
                           "interpolation": "linear", "precomputed": True, "sourcePoints": points})
        ratio = curves[0]["sourcePoints"][-1][1]/rows[name][4]
        # ILT/4-400 ends at high pressure before its tabulated maximum flow.
        # Its dashed system curve is not a continuation of the fan curve.
        assert (0.94 < ratio < 1 if name == "ILT/4-400" else abs(ratio-1) < 0.05), (name, curves[0]["sourcePoints"][-1], rows[name][4])
        curves.reverse()  # Shared runtime defaults to the final nominal curve.
        models[name] = {"technicalTablePage": 2, "technicalTableRow": rows[name], "calibration": calibration,
                        "limitedCurveDomain": name == "ILT/4-400",
                        "tabulatedMaxAirflowM3h": rows[name][4], "drawnNominalCurveEndAirflowM3h": curves[-1]["sourcePoints"][-1][1],
                        "curves": curves}
    return {"schemaVersion": 1, "status": "verified_against_original_catalogue_vector_graphs", "extrapolation": False,
            "source": {"catalogue": pdf.name, "sha256": sha, "url": url},
            "summary": {"models": len(models), "curves": sum(len(m["curves"]) for m in models.values()),
                        "points": sum(len(c["sourcePoints"]) for m in models.values() for c in m["curves"])},
            "models": models}


def apply(data, artifact, family):
    hct = family == "hct"
    rows = HCT_ROWS if hct else IL_ROWS
    series = "HCTB / HCTT" if hct else "ILB / ILT"
    matches = [m for m in data["models"] if m["seriesId"] == series]
    assert {m["model"] for m in matches} == set(rows)
    for m in matches:
        name = m["model"]
        row = rows[name]
        rpm, watts, a230, a400, flow = row[:5]
        mono = name.startswith(("HCTB", "ILB"))
        if hct:
            inlet, outlet, weight = row[5:]
            large = name in {"HCTT/4-800-B", "HCTT/4-900-B", "HCTT/4-1000-B"}
            low, high, ip, sound = (-30, 40, "IP55", inlet) if large else (-40, 70, "IP65", inlet)
            nominal_power = large
            voltage = "230 V" if mono else "400 V"
        else:
            sound, low, high, weight = row[5:]
            ip, nominal_power = "IP55", False
            voltage = "230 V" if mono else "400 V" if a230 is None else "230/400 V"
        curves, source = artifact["models"][name]["curves"], artifact["source"]
        primary = curves[-1]
        m["motor"].update(power=watts/1000, speed=rpm, current=a230 if mono else a400, voltage=voltage, frequency="50 Hz", sound=sound)
        m["technical"].update(weight=weight, ipClass=ip, insulationClass="F", phase="Single-phase" if mono else "Three-phase",
                              poles=int(name.split("/")[1].split("-")[0]), operatingTemperatureMinC=low, operatingTemperatureMaxC=high,
                              current230A=a230, current400A=a400, currentReferenceVoltageV=230 if mono else 400,
                              powerBasis="nominal-motor-power" if nominal_power else "maximum-electrical-input-P1",
                              soundBasis="inlet-sound-pressure-1_5m-free-field" if hct else "sound-pressure-1m-free-field-with-ducts")
        if hct:
            m["technical"].update(soundInletDbA1_5m=inlet, soundOutletDbA1_5m=outlet)
        m["pole"] = m["technical"]["poles"]
        m["catalogOnly"] = False
        operating = [{"control": c["control"], "power": watts/1000 if c is primary else 0,
                      "speed": rpm if c is primary else 0, "current": (a230 if mono else a400) if c is primary else 0,
                      "sound": sound if c is primary else 0,
                      "nominalAirflow": flow if c is primary else max(p[1] for p in c["sourcePoints"]),
                      "maxPressure": max(p[0] for p in c["sourcePoints"])} for c in curves]
        m["performance"].update(nominalAirflow=flow, maxAirflow=flow, points=[], sourcePoints=primary["sourcePoints"], curves=curves,
                                  control=primary["control"], controls=[c["control"] for c in curves], operatingPoints=operating,
                                  interpolation="linear", precomputed=True)
        power_note = "Güç: katalog dipnotundaki nominal motor gücü." if nominal_power else "Güç: katalogdaki maksimum çekilen elektriksel giriş gücü (P1)."
        sound_note = (f"Ses basıncı: emiş {inlet} dB(A), atış {outlet} dB(A); 1,5 m, serbest alan." if hct
                      else f"Ses basıncı: {sound} dB(A); emiş ve atış kanalları bağlı, serbest alanda 1 m.")
        general = ["İçeriden dışarıya aspirasyon için yatay atışlı çatı tipi aksiyel fan (B)." if hct
                   else "İleri eğik radyal kanatlı dikdörtgen kanal tipi fan; bakım için müdahale kapağı.", power_note, sound_note]
        motor_notes = [f"{voltage}, 50 Hz.", f"{ip} motor, F sınıfı yalıtım."]
        if hct and name in {"HCTB/4-560-B", "HCTB/4-630-B"}:
            motor_notes.append("Katalogda trafo ile hız kontrolü kapsamı dışındadır.")
        elif not hct:
            motor_notes.append("Voltaj ayarı ile hız kontrolüne uygundur." + ("" if mono else " Trifaze motor inverter ile de kontrol edilebilir."))
        m["description"] = {"general": general, "motor": motor_notes, "applications": []}
        m["source"].update(page=2, catalogue=source["catalogue"], url=source["url"], sha256=source["sha256"], curvePages=[primary["sourcePage"]])
        caution = ("Only printed curve domains; no extrapolation or affinity-derived controls. "
                   + ("Power is nominal motor power. " if nominal_power else "Power is maximum electrical input P1. ")
                   + ("Sound is inlet LpA at 1.5m. " if hct else "Sound is free-field LpA at 1m with inlet/outlet ducts. Reduced-control motor data are unspecified. Pressure uses the printed Pa scale, not conversion of the separate mmWG column. ")
                   + "ATEX versions are separate; F insulation is not a fire classification.")
        m["verification"] = {"status": "catalog-source", "sourceCatalogue": source["catalogue"], "sourcePage": 2,
                             "sourceSha256": source["sha256"], "curvePages": [primary["sourcePage"]],
                             "drawnNominalCurveEndAirflowM3h": primary["sourcePoints"][-1][1], "tabulatedMaxAirflowM3h": flow,
                             "caution": caution}
        assert m["dimensions"]["source"]["sha256"] == source["sha256"]
    name = "hctb-hctt" if hct else "ilb-ilt"
    (ROOT/f"assets/products/soler-palau/{name}-verified-curves.json").write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":"))+"\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("hct_pdf", type=Path)
    parser.add_argument("il_pdf", type=Path)
    args = parser.parse_args()
    target = ROOT/"data/ventilation-catalog.js"
    prefix, payload = target.read_text().split("window.VensisVentilationData=", 1)
    data = json.loads(payload.strip().removesuffix(";"))
    for pdf, family in [(args.hct_pdf, "hct"), (args.il_pdf, "il")]:
        artifact = extract(pdf, family)
        apply(data, artifact, family)
        print(family, json.dumps(artifact["summary"]))
    target.write_text(prefix+"window.VensisVentilationData="+json.dumps(data, ensure_ascii=False, separators=(",", ":"))+";\n")

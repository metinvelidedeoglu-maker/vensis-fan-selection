#!/usr/bin/env python3
"""Extract verified Soler & Palau fan curves from the supplied vector PDFs.

The drawing indexes are intentionally pinned to the SHA-256 of the exact source
catalogues.  Axis values are calibrated from the printed tick labels; no curve
endpoint or synthetic fan-law approximation is used.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from pathlib import Path

import fitz


CATALOGUES = {
    "cab.pdf": {
        "sha256": "65254a4fda2be46353601be4e51ac7b15616da23f4b6d42fc42edfe0dc5dd856",
        "graphs": [
            ("CAB-100", 3, 21), ("CAB-125", 3, 57),
            ("CAB-150", 3, 33), ("CAB-160", 3, 69),
            ("CAB-200", 3, 45), ("CAB-250", 3, 81),
            ("CAB-250N", 4, 56), ("CAB-315", 4, 68),
            ("CAB-315N", 4, 20), ("CAB-355", 4, 44),
            ("CAB-400", 4, 32),
        ],
    },
    "vent-nk.pdf": {
        "sha256": "42ae980b3140d048472f6099af4e513f42c394b0787a47bda3d0cdf1f1fcc833",
        "graphs": [
            ("VENT-100NK", 3, 19), ("VENT-125NK", 3, 56),
            ("VENT-150NK", 4, 19), ("VENT-160NK", 4, 57),
            ("VENT-200NK", 5, 19), ("VENT-250NK", 5, 56),
            ("VENT-315NK", 6, 19), ("VENT-355N", 6, 57),
            ("VENT-400N", 7, 19),
        ],
    },
    "jetline.pdf": {
        "sha256": "ac6b5547fde34ae02cebb01d54834c561bdecc67e6961c09b5b06ee0d53cb3e2",
        "graphs": [
            ("JETLINE-100", 3, 1236), ("JETLINE-125", 3, 1409),
            ("JETLINE-150", 4, 1252), ("JETLINE-160", 4, 1438),
            ("JETLINE-200", 5, 1419), ("JETLINE-250", 5, 1225),
            ("JETLINE-315", 6, 664),
        ],
    },
    "HXM.pdf": {
        "sha256": "01a728ad4e37621c5edbd1b0ba5596384170ed66047c5dea1fa6520082ac62bb",
        "graphs": [
            ("HXM-200", 3, 123), ("HXM-250", 3, 365),
            ("HXM-300", 3, 226), ("HXM-350", 4, 98),
            ("HXM-400", 4, 133),
        ],
    },
    "silen-tub.pdf": {
        "sha256": "a5c6334013cec74691969f6aabce0932e30d6c9d3c4f3b04b2100f805f4a256a",
        "graphs": [("SILENTUB-100", 2, 11)],
    },
    "tdm.pdf": {
        "sha256": "9d0ea00199f22b39f2b81e221b30c8bec63526e1d37935e09bb5d0f32ffbbb40",
        "graphs": [
            ("TDM-100", 2, 168, 14, 27),
            ("TDM-200", 2, 168, 0, 14),
            ("TDM-300", 2, 172),
        ],
    },
    "td-silent.pdf": {
        "sha256": "e219f27255f939cbc79f4505c50571e80d08a0c38a409ffd03d2471c190adb67",
        "graphs": [
            ("TD-160/100N SILENT", 6, 315, "HS"),
            ("TD-160/100N SILENT", 6, 316, "LS"),
            ("TD-250/100 SILENT", 6, 490, "HS"),
            ("TD-250/100 SILENT", 6, 491, "LS"),
            ("TD-350/125 SILENT", 7, 2867, "HS"),
            ("TD-350/125 SILENT", 7, 2868, "LS"),
            ("TD-500/150 SILENT", 7, 3050, "HS"),
            ("TD-500/150 SILENT", 7, 3051, "MS", 0, 199),
            ("TD-500/150 SILENT", 7, 3051, "LS", 199, 398),
            ("TD-800/200 SILENT", 8, 327, "HS"),
            ("TD-800/200 SILENT", 8, 328, "MS", 0, 199),
            ("TD-800/200 SILENT", 8, 328, "LS", 199, 398),
            ("TD-1000/200 SILENT", 8, 547, "HS"),
            ("TD-1000/200 SILENT", 8, 548, "MS", 0, 199),
            ("TD-1000/200 SILENT", 8, 548, "LS", 199, 398),
            ("TD-1300/250 SILENT", 9, 3792, "HS"),
            ("TD-1300/250 SILENT", 9, 3793, "MS", 0, 199),
            ("TD-1300/250 SILENT", 9, 3793, "LS", 199, 398),
            ("TD-2000/315 SILENT", 9, 4036, "HS"),
            ("TD-2000/315 SILENT", 9, 4037, "MS", 0, 199),
            ("TD-2000/315 SILENT", 9, 4037, "LS", 199, 398),
        ],
    },
    "td-mixvent.pdf": {
        "sha256": "25e584f68572b8925d9c612950d5314fa4cdd8f1fd59e3acb0cc462e106fba68",
        "graphs": [
            ("TD-160/100 N", 6, 3336, "HS"),
            ("TD-160/100 N", 6, 3337, "LS"),
            ("TD-250/100", 6, 3504, "HS"),
            ("TD-250/100", 6, 3505, "LS"),
            ("TD-350/125", 7, 146, "HS"),
            ("TD-350/125", 7, 147, "LS"),
            ("TD-500/150", 7, 318, "HS"),
            ("TD-500/150", 7, 319, "MS", 0, 199),
            ("TD-500/150", 7, 319, "LS", 199, 398),
            ("TD-800/200N", 8, 3645, "HS"),
            ("TD-800/200N", 8, 3646, "MS", 0, 199),
            ("TD-800/200N", 8, 3646, "LS", 199, 398),
            ("TD-800/200", 8, 3858, "HS"),
            ("TD-800/200", 8, 3859, "MS", 0, 199),
            ("TD-800/200", 8, 3859, "LS", 199, 398),
            ("TD-1300/250N", 9, 1782, "HS"),
            ("TD-1300/250N", 9, 1783, "MS"),
            ("TD-1300/250N", 9, 1784, "LS"),
            ("TD-2000/315N", 9, 3396, "HS"),
            ("TD-2000/315N", 9, 3397, "MS"),
            ("TD-2000/315N", 9, 3398, "LS"),
            ("TD-4000/355", 10, 4963, "230V"),
            ("TD-4000/355", 10, 4964, "170V", 0, 199),
            ("TD-4000/355", 10, 4964, "140V", 199, 398),
            ("TD-4000/355", 10, 4964, "115V", 398, 597),
            ("TD-6000/400", 11, 289, "230V"),
            ("TD-6000/400", 11, 290, "170V"),
            ("TD-6000/400", 11, 291, "140V"),
        ],
    },
    "td-evo-serisi.pdf": {
        "sha256": "d2103fe55a4768c4dd7fd1973a9996aa59377aa6d2d3abb8d56f115ece13533e",
        "graphs": [
            ("TD EVO-100", 5, 3132, "HS"), ("TD EVO-100", 5, 3133, "MS"), ("TD EVO-100", 5, 3134, "LS"),
            ("TD EVO-125", 5, 3448, "HS"), ("TD EVO-125", 5, 3449, "MS"), ("TD EVO-125", 5, 3450, "LS"),
            ("TD EVO-150", 6, 3151, "HS"), ("TD EVO-150", 6, 3152, "MS"), ("TD EVO-150", 6, 3153, "LS"),
            ("TD EVO-160", 6, 3450, "HS"), ("TD EVO-160", 6, 3451, "MS"), ("TD EVO-160", 6, 3452, "LS"),
            ("TD EVO-200", 7, 3116, "HS"), ("TD EVO-200", 7, 3117, "MS"), ("TD EVO-200", 7, 3118, "LS"),
            ("TD EVO-250", 7, 3355, "HS"), ("TD EVO-250", 7, 3356, "MS"), ("TD EVO-250", 7, 3357, "LS"),
            ("TD EVO-315", 8, 1813, "HS"), ("TD EVO-315", 8, 1814, "MS"), ("TD EVO-315", 8, 1815, "LS"),
        ],
    },
    "TD-EVO-PF-ECOWATT.pdf": {
        "sha256": "0a15973b15ff9cea7b219e15a7f09880f3457855260ddea73e15f5e15f6f8841",
        "graphs": [
            ("TD EVO-100 PF ECOWATT", 5, 1655, "10V"), ("TD EVO-100 PF ECOWATT", 5, 1572, "8V"), ("TD EVO-100 PF ECOWATT", 5, 1573, "6V"), ("TD EVO-100 PF ECOWATT", 5, 1574, "4V"),
            ("TD EVO-125 PF ECOWATT", 5, 1948, "10V"), ("TD EVO-125 PF ECOWATT", 5, 1831, "8V"), ("TD EVO-125 PF ECOWATT", 5, 1832, "6V"), ("TD EVO-125 PF ECOWATT", 5, 1833, "4V"),
            ("TD EVO-150 PF ECOWATT", 6, 1705, "10V"), ("TD EVO-150 PF ECOWATT", 6, 1594, "8V"), ("TD EVO-150 PF ECOWATT", 6, 1595, "6V"), ("TD EVO-150 PF ECOWATT", 6, 1596, "4V"),
            ("TD EVO-160 PF ECOWATT", 6, 1998, "10V"), ("TD EVO-160 PF ECOWATT", 6, 1887, "8V"), ("TD EVO-160 PF ECOWATT", 6, 1888, "6V"), ("TD EVO-160 PF ECOWATT", 6, 1889, "4V"),
            ("TD EVO-200 PF ECOWATT", 7, 1711, "10V"), ("TD EVO-200 PF ECOWATT", 7, 1600, "8V"), ("TD EVO-200 PF ECOWATT", 7, 1601, "6V"), ("TD EVO-200 PF ECOWATT", 7, 1602, "4V"),
            ("TD EVO-250 PF ECOWATT", 7, 2001, "10V"), ("TD EVO-250 PF ECOWATT", 7, 1893, "8V"), ("TD EVO-250 PF ECOWATT", 7, 1894, "6V"), ("TD EVO-250 PF ECOWATT", 7, 1895, "4V"),
            ("TD EVO-315 PF ECOWATT", 8, 959, "10V"), ("TD EVO-315 PF ECOWATT", 8, 847, "8V"), ("TD EVO-315 PF ECOWATT", 8, 848, "6V"), ("TD EVO-315 PF ECOWATT", 8, 849, "4V"),
        ],
    },
    "silent-dual.pdf": {
        "sha256": "8c77163c13a8e48c4ea16ca697ba722f735d0881860b0cc11656fc23b5d1ce43",
        "graphs": [
            ("SILENT DUAL 100", 2, 256, "En üst"), ("SILENT DUAL 100", 2, 257, "PIR + zamanlayıcı"), ("SILENT DUAL 100", 2, 258, "Sürekli"),
            ("SILENT DUAL 200", 4, 201, "En üst"), ("SILENT DUAL 200", 4, 202, "PIR + zamanlayıcı"), ("SILENT DUAL 200", 4, 203, "Sürekli"),
            ("SILENT DUAL 300", 6, 189, "En üst"), ("SILENT DUAL 300", 6, 190, "PIR + zamanlayıcı"), ("SILENT DUAL 300", 6, 191, "Sürekli"),
        ],
    },
}

# Some older PDF pages outline their axis labels as vector glyphs instead of
# searchable text.  These values are the printed pressure-axis maxima and the
# technical-table maximum airflows on those same catalogue pages.  The grid
# drawing supplies the exact plot bounds.
FIXED_AXES = {
    "JETLINE-100": {"grid": 1198, "pressureMax": 200, "airflowMax": 267},
    "JETLINE-125": {"grid": 1370, "pressureMax": 250, "airflowMax": 411},
    "JETLINE-150": {"grid": 1204, "pressureMax": 400, "airflowMax": 717},
    "JETLINE-160": {"grid": 1390, "pressureMax": 400, "airflowMax": 750},
    "JETLINE-200": {"grid": 1375, "pressureMax": 500, "airflowMax": 1040},
    "JETLINE-250": {"grid": 1191, "pressureMax": 400, "airflowMax": 1279},
    "JETLINE-315": {"grid": 625, "pressureMax": 500, "airflowMax": 1610},
    "TD-160/100N SILENT": {"plot": [77.7, 178.5, 260.1, 349.4], "pressureMax": 120, "airflowMax": 200},
    "TD-250/100 SILENT": {"plot": [354.0, 178.5, 536.4, 349.4], "pressureMax": 160, "airflowMax": 300},
    "TD-350/125 SILENT": {"plot": [59.9, 178.4, 242.3, 349.2], "pressureMax": 160, "airflowMax": 400},
    "TD-500/150 SILENT": {"plot": [337.4, 178.5, 519.7, 349.4], "pressureMax": 300, "airflowMax": 600},
    "TD-800/200 SILENT": {"plot": [77.8, 178.5, 260.1, 349.4], "pressureMax": 350, "airflowMax": 1000},
    "TD-1000/200 SILENT": {"plot": [354.9, 178.9, 537.2, 349.7], "pressureMax": 350, "airflowMax": 1200},
    "TD-1300/250 SILENT": {"plot": [60.8, 179.2, 243.1, 350.1], "pressureMax": 600, "airflowMax": 1400},
    "TD-2000/315 SILENT": {"plot": [337.9, 178.5, 520.2, 349.4], "pressureMax": 800, "airflowMax": 2100},
    "TD-160/100 N": {"plot": [78.1, 178.7, 259.4, 348.7], "pressureMax": 120, "airflowMax": 200},
    "TD-250/100": {"plot": [355.2, 179.1, 536.5, 349.0], "pressureMax": 160, "airflowMax": 300},
    "TD-350/125": {"plot": [60.6, 178.7, 242.0, 348.6], "pressureMax": 160, "airflowMax": 400},
    "TD-500/150": {"plot": [338.8, 179.2, 520.2, 349.1], "pressureMax": 300, "airflowMax": 600},
    "TD-800/200N": {"plot": [79.6, 181.0, 261.9, 351.9], "pressureMax": 350, "airflowMax": 1000},
    "TD-800/200": {"plot": [354.5, 178.1, 536.9, 349.0], "pressureMax": 400, "airflowMax": 1200},
    "TD-1300/250N": {"plot": [61.7, 174.4, 248.8, 349.9], "pressureMax": 500, "airflowMax": 1500},
    "TD-2000/315N": {"plot": [335.2, 174.4, 522.0, 349.7], "pressureMax": 600, "airflowMax": 2000},
    "TD-4000/355": {"plot": [80.6, 174.5, 262.0, 344.4], "pressureMax": 280, "airflowMax": 4000},
    "TD-6000/400": {"plot": [66.3, 181.7, 245.5, 349.7], "pressureMax": 350, "airflowMax": 6000},
    "TD EVO-100": {"plot": [81.6, 172.1, 258.4, 337.8], "pressureMax": 160, "airflowMax": 240},
    "TD EVO-125": {"plot": [356.6, 172.1, 533.5, 337.8], "pressureMax": 180, "airflowMax": 350},
    "TD EVO-150": {"plot": [64.9, 172.1, 241.4, 337.5], "pressureMax": 300, "airflowMax": 600},
    "TD EVO-160": {"plot": [340.0, 172.1, 516.5, 337.5], "pressureMax": 300, "airflowMax": 600},
    "TD EVO-200": {"plot": [82.1, 172.1, 258.4, 337.3], "pressureMax": 350, "airflowMax": 1000},
    "TD EVO-250": {"plot": [359.0, 172.5, 535.3, 337.9], "pressureMax": 500, "airflowMax": 1500},
    "TD EVO-315": {"plot": [65.4, 172.1, 241.4, 337.1], "pressureMax": 600, "airflowMax": 2000},
    "TD EVO-100 PF ECOWATT": {"plot": [90.9, 164.2, 251.9, 315.1], "pressureMax": 125, "airflowMax": 200},
    "TD EVO-125 PF ECOWATT": {"plot": [365.0, 164.2, 526.9, 316.0], "pressureMax": 180, "airflowMax": 350},
    "TD EVO-150 PF ECOWATT": {"plot": [73.4, 164.2, 234.8, 315.6], "pressureMax": 300, "airflowMax": 600},
    "TD EVO-160 PF ECOWATT": {"plot": [348.5, 164.2, 509.9, 315.6], "pressureMax": 300, "airflowMax": 600},
    "TD EVO-200 PF ECOWATT": {"plot": [90.7, 164.5, 251.7, 315.4], "pressureMax": 350, "airflowMax": 1000},
    "TD EVO-250 PF ECOWATT": {"plot": [367.8, 164.2, 527.1, 313.5], "pressureMax": 500, "airflowMax": 1500},
    "TD EVO-315 PF ECOWATT": {"plot": [75.7, 164.2, 235.0, 313.6], "pressureMax": 700, "airflowMax": 2000},
    "SILENT DUAL 100": {"plot": [145.4, 348.4, 428.7, 518.4], "pressureMax": 45, "airflowMax": 100},
    "SILENT DUAL 200": {"plot": [145.4, 348.5, 428.7, 518.4], "pressureMax": 60, "airflowMax": 200},
    "SILENT DUAL 300": {"plot": [145.3, 348.5, 428.7, 518.4], "pressureMax": 70, "airflowMax": 250},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def printed_number(text: str) -> float | None:
    if not re.fullmatch(r"\d+(?:[.,]\d+)?", text.strip()):
        return None
    try:
        return float(text.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def linear_fit(points: list[tuple[float, float]]) -> tuple[float, float]:
    if len(points) < 2:
        raise ValueError("Axis has fewer than two printed calibration ticks")
    x_mean = sum(point[0] for point in points) / len(points)
    y_mean = sum(point[1] for point in points) / len(points)
    denominator = sum((point[0] - x_mean) ** 2 for point in points)
    if math.isclose(denominator, 0):
        raise ValueError("Axis calibration ticks have no coordinate range")
    slope = sum(
        (point[0] - x_mean) * (point[1] - y_mean) for point in points
    ) / denominator
    return slope, y_mean - slope * x_mean


def axis_ticks(page: fitz.Page, drawing: dict) -> tuple[list, list]:
    rect = drawing["rect"]
    words = page.get_text("words")
    zeros = []
    margin = 22
    for candidate_margin in (22, 105):
        for x0, y0, x1, y1, text, *_ in words:
            value = printed_number(text)
            if value == 0 and rect.x0 - candidate_margin <= x1 <= rect.x0 + 3 and rect.y1 - 12 <= y0 <= rect.y1 + 85:
                zeros.append(((y0 + y1) / 2, y0))
        if zeros:
            margin = candidate_margin
            break
    if not zeros:
        raise ValueError("Printed zero-pressure tick was not found")
    baseline_center, baseline_top = min(zeros, key=lambda item: abs(item[0] - rect.y1))

    x_ticks = []
    y_ticks = []
    for x0, y0, x1, y1, text, *_ in words:
        value = printed_number(text)
        if value is None:
            continue
        center_x = (x0 + x1) / 2
        center_y = (y0 + y1) / 2
        if baseline_top + 1 <= y0 <= baseline_top + 22 and rect.x0 - margin <= center_x <= rect.x0 + 220:
            x_ticks.append((center_x, value))
        if rect.x0 - max(42, margin) <= x1 <= rect.x0 - 2 and rect.y0 - 24 <= center_y <= baseline_center + 6:
            y_ticks.append((center_y, value))

    # The neighbouring power plot can place another vertical scale on the right;
    # grouping by coordinate removes it while retaining every printed fan-axis tick.
    x_ticks = sorted(set(x_ticks))
    y_ticks = sorted(set(y_ticks))
    # A few compact-fan graphs print a secondary mmH2O scale beside the Pa
    # scale.  It shares the coordinate column but its 1–4 labels are not Pa.
    if y_ticks and max(value for _, value in y_ticks) >= 20:
        threshold = max(value for _, value in y_ticks) / 9
        filtered = [point for point in y_ticks if point[1] == 0 or point[1] >= threshold]
        if len(filtered) >= 2:
            y_ticks = filtered
    if len(x_ticks) < 2 or len(y_ticks) < 2:
        raise ValueError(f"Insufficient printed ticks: x={x_ticks}, y={y_ticks}")
    return x_ticks, y_ticks


def drawing_points(drawing: dict) -> list[tuple[float, float]]:
    points = []
    for item in drawing["items"]:
        if item[0] == "l":
            segment = (item[1], item[2])
        elif item[0] == "c":
            segment = (item[1], item[4])
        else:
            continue
        for point in segment:
            pair = (point.x, point.y)
            if not points or math.hypot(pair[0] - points[-1][0], pair[1] - points[-1][1]) > 1e-6:
                points.append(pair)
    if len(points) < 2:
        raise ValueError("Curve drawing has fewer than two points")
    if points[0][0] > points[-1][0]:
        points.reverse()
    return points


def simplify(points: list[tuple[float, float]], count: int = 31) -> list[tuple[float, float]]:
    if len(points) <= count:
        return points
    indexes = sorted({round(index * (len(points) - 1) / (count - 1)) for index in range(count)})
    return [points[index] for index in indexes]


def extract(pdf_dir: Path) -> dict:
    models = {}
    sources = []
    for filename, specification in CATALOGUES.items():
        path = pdf_dir / filename
        actual_hash = sha256(path)
        if actual_hash != specification["sha256"]:
            raise ValueError(f"Unexpected {filename} SHA-256: {actual_hash}")
        document = fitz.open(path)
        sources.append({"catalogue": filename, "sha256": actual_hash})
        for graph in specification["graphs"]:
            model, page_number, drawing_index = graph[:3]
            control = graph[3] if len(graph) >= 4 and isinstance(graph[3], str) else "Nominal"
            page = document[page_number - 1]
            drawings = page.get_drawings()
            if drawing_index >= len(drawings):
                raise ValueError(f"{model}: drawing {drawing_index} is unavailable")
            drawing = drawings[drawing_index]
            if len(graph) == 5 and not isinstance(graph[3], str):
                drawing = {**drawing, "items": drawing["items"][graph[3]:graph[4]]}
            elif len(graph) == 6:
                drawing = {**drawing, "items": drawing["items"][graph[4]:graph[5]]}
            raw_points = drawing_points(drawing)
            if model in FIXED_AXES:
                axes = FIXED_AXES[model]
                if "plot" in axes:
                    x0, y0, x1, y1 = axes["plot"]
                    q_slope = axes["airflowMax"] / (x1 - x0)
                    q_intercept = -q_slope * x0
                    p_slope = -axes["pressureMax"] / (y1 - y0)
                    p_intercept = -p_slope * y1
                    source_method = "axis-calibrated from original catalogue vector performance path and printed plot bounds"
                else:
                    grid = drawings[axes["grid"]]["rect"]
                    q_slope = axes["airflowMax"] / (raw_points[-1][0] - raw_points[0][0])
                    q_intercept = -q_slope * raw_points[0][0]
                    p_slope = -axes["pressureMax"] / (drawing["rect"].y1 - grid.y0)
                    p_intercept = -p_slope * drawing["rect"].y1
                    source_method = "calibrated from original vector path, printed pressure scale and technical-table free-air endpoint"
            else:
                try:
                    x_ticks, y_ticks = axis_ticks(page, drawing)
                except ValueError as error:
                    raise ValueError(f"{model} ({control}): {error}") from error
                q_slope, q_intercept = linear_fit(x_ticks)
                p_slope, p_intercept = linear_fit(y_ticks)
                source_method = "axis-calibrated from original catalogue vector performance path"
            calibrated = []
            for x, y in simplify(raw_points):
                airflow = max(0.0, q_slope * x + q_intercept)
                pressure = max(0.0, p_slope * y + p_intercept)
                point = [round(pressure, 1), round(airflow, 1)]
                if not calibrated or point != calibrated[-1]:
                    calibrated.append(point)
            if len(calibrated) < 10:
                raise ValueError(f"{model}: extracted curve is unexpectedly short")
            if calibrated[-1][1] <= calibrated[0][1]:
                raise ValueError(f"{model}: airflow direction is invalid")
            curve = {
                "control": control,
                "sourcePage": page_number,
                "sourceDrawingIndex": drawing_index,
                "sourceMethod": source_method,
                "interpolation": "linear",
                "precomputed": True,
                "sourcePoints": calibrated,
                "maxAirflowM3h": round(max(point[1] for point in calibrated), 1),
                "maxPressurePa": round(max(point[0] for point in calibrated), 1),
            }
            model_record = models.setdefault(model, {
                "catalogue": filename,
                "curves": [],
            })
            model_record["curves"].append(curve)
            if len(model_record["curves"]) == 1:
                model_record.update({key: value for key, value in curve.items() if key != "control"})
    return {
        "schemaVersion": "1.0",
        "status": "verified_against_original_catalogue_vector_graphs",
        "extrapolation": False,
        "sources": sources,
        "summary": {
            "catalogues": len(sources),
            "models": len(models),
            "curves": sum(len(model["curves"]) for model in models.values()),
            "points": sum(
                len(curve["sourcePoints"])
                for model in models.values()
                for curve in model["curves"]
            ),
        },
        "models": models,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = extract(args.pdf_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["summary"] | {"output": str(args.output)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

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
            page = document[page_number - 1]
            drawings = page.get_drawings()
            if drawing_index >= len(drawings):
                raise ValueError(f"{model}: drawing {drawing_index} is unavailable")
            drawing = drawings[drawing_index]
            if len(graph) == 5:
                drawing = {**drawing, "items": drawing["items"][graph[3]:graph[4]]}
            raw_points = drawing_points(drawing)
            if model in FIXED_AXES:
                axes = FIXED_AXES[model]
                grid = drawings[axes["grid"]]["rect"]
                q_slope = axes["airflowMax"] / (raw_points[-1][0] - raw_points[0][0])
                q_intercept = -q_slope * raw_points[0][0]
                p_slope = -axes["pressureMax"] / (drawing["rect"].y1 - grid.y0)
                p_intercept = -p_slope * drawing["rect"].y1
                source_method = "calibrated from original vector path, printed pressure scale and technical-table free-air endpoint"
            else:
                x_ticks, y_ticks = axis_ticks(page, drawing)
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
            models[model] = {
                "catalogue": filename,
                "sourcePage": page_number,
                "sourceDrawingIndex": drawing_index,
                "sourceMethod": source_method,
                "interpolation": "linear",
                "precomputed": True,
                "sourcePoints": calibrated,
                "maxAirflowM3h": round(max(point[1] for point in calibrated), 1),
                "maxPressurePa": round(max(point[0] for point in calibrated), 1),
            }
    return {
        "schemaVersion": "1.0",
        "status": "verified_against_original_catalogue_vector_graphs",
        "extrapolation": False,
        "sources": sources,
        "summary": {
            "catalogues": len(sources),
            "models": len(models),
            "curves": len(models),
            "points": sum(len(model["sourcePoints"]) for model in models.values()),
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

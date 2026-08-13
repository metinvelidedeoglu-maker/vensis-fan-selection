#!/usr/bin/env python3
"""Extract selected Vortice residential curves from the original vector PDF."""

from __future__ import annotations

import hashlib
import json
import math
import re
import sys
from pathlib import Path

import fitz


EXPECTED_PDF_SHA256 = "45a3f2edd581a3917510b83cc84ce5de33b9d74648f34f7f4b63199a342be6f7"

# Drawing indices are intentionally tied to the exact source PDF hash above.
# Axis maxima are the printed outer tick values, not package-derived endpoints.
GRAPHS = {
    "PUNTO_100": {"series": "PUNTO", "title": "M 100/4", "page": 9, "grid": 81, "axes": (100, 33), "curves": {"nominal": 106}},
    "PUNTO_120": {"series": "PUNTO", "title": "M 120/5", "page": 9, "grid": 110, "axes": (190, 49), "curves": {"nominal": 135}},
    "PUNTO_150": {"series": "PUNTO", "title": "M 150/6", "page": 9, "grid": 139, "axes": (375, 66), "curves": {"nominal": 164}},
    "FILO_90": {"series": "PUNTO FILO", "title": "MF 90/3.5", "page": 14, "grid": 104, "axes": (73, 28), "curves": {"nominal": 129}},
    "FILO_100": {"series": "PUNTO FILO", "title": "MF 100/4", "page": 14, "grid": 133, "axes": (95, 33), "curves": {"nominal": 158}},
    "FILO_120": {"series": "PUNTO FILO", "title": "MF 120/5", "page": 14, "grid": 162, "axes": (195, 55), "curves": {"nominal": 187}},
    "FILO_150": {"series": "PUNTO FILO", "title": "MF 150/6", "page": 14, "grid": 191, "axes": (375, 66), "curves": {"nominal": 216}},
    "FOUR_90": {"series": "PUNTO FOUR", "title": "MFO 90/3.5", "page": 18, "grid": 26, "axes": (73, 28), "curves": {"nominal": 51}},
    "FOUR_100": {"series": "PUNTO FOUR", "title": "MFO 100/4", "page": 18, "grid": 55, "axes": (95, 35), "curves": {"nominal": 80}},
    "FOUR_120": {"series": "PUNTO FOUR", "title": "MFO 120/5", "page": 18, "grid": 84, "axes": (195, 54), "curves": {"nominal": 109}},
    "GHOST_90": {"series": "PUNTO GHOST", "title": "MG 90/3.5", "page": 22, "grid": 11, "axes": (73, 23), "curves": {"nominal": 36}},
    "GHOST_100": {"series": "PUNTO GHOST", "title": "MG 100/4", "page": 22, "grid": 100, "axes": (89, 29), "curves": {"nominal": 125}},
    "GHOST_120": {"series": "PUNTO GHOST", "title": "MG 120/5", "page": 22, "grid": 40, "axes": (180, 49), "curves": {"nominal": 65}},
    "GHOST_150": {"series": "PUNTO GHOST", "title": "MG 150/6", "page": 22, "grid": 69, "axes": (360, 66), "curves": {"nominal": 94}},
    "FLEXO_100": {"series": "PUNTO EVO FLEXO", "title": "MEX 100/4", "page": 27, "grid": 12, "axes": (100, 44), "curves": {"nominal": 37}},
    "FLEXO_120": {"series": "PUNTO EVO FLEXO", "title": "MEX 120/5", "page": 27, "grid": 41, "axes": (195, 55), "curves": {"nominal": 66}},
    "EVO_100": {"series": "PUNTO EVO", "title": "ME 100/4 LL", "page": 32, "grid": 11, "axes": (106, 52), "curves": {"min": 38, "max": 36}},
    "EVO_120": {"series": "PUNTO EVO", "title": "ME 120/5 LL", "page": 32, "grid": 42, "axes": (195, 55), "curves": {"min": 69, "max": 67}},
    "EVO_ES_100": {"series": "PUNTO EVO ES", "title": "ME 100/4 ES", "page": 36, "grid": 17, "axes": (106, 56), "curves": {"min": 44, "max": 42}},
    "EVO_ES_120": {"series": "PUNTO EVO ES", "title": "ME 120/5 ES", "page": 36, "grid": 48, "axes": (200, 64), "curves": {"min": 75, "max": 73}},
    "EVO_GOLD_100": {"series": "PUNTO EVO GOLD", "title": "ME 100/4", "page": 40, "grid": 11, "axes": (106, 52), "curves": {"min": 38, "max": 36}},
    "VARIO_150": {"series": "VORTICE VARIO", "title": "150/6 P - 150/6 AR", "page": 43, "grid": 96, "axes": (265, 28), "curves": {"nominal": 121}},
    "VARIO_150_LL": {"series": "VORTICE VARIO", "title": "150/6 P/AR LL S", "page": 43, "grid": 68, "axes": (430, 69), "curves": {"nominal": 93}},
    "VARIO_230": {"series": "VORTICE VARIO", "title": "230/9 P - 230/9 AR", "page": 43, "grid": 40, "axes": (540, 23), "curves": {"nominal": 65}},
    "VARIO_230_LL": {"series": "VORTICE VARIO", "title": "230/9 P/AR LL S", "page": 43, "grid": 12, "axes": (780, 44), "curves": {"nominal": 37}},
    "VARIO_300": {"series": "VORTICE VARIO", "title": "300/12 AR", "page": 44, "grid": 11, "axes": (1250, 33), "curves": {"nominal": 36}},
    "VARIO_300_LL": {"series": "VORTICE VARIO", "title": "300/12 AR LL S", "page": 44, "grid": 39, "axes": (1850, 77), "curves": {"nominal": 64}},
    "VARIO_I_150": {"series": "VORTICE VARIO I", "title": "150/6 ARI", "page": 51, "grid": 510, "axes": (265, 28), "curves": {"nominal": 535}},
    "VARIO_I_150_LL": {"series": "VORTICE VARIO I", "title": "150/6 ARI LL S", "page": 51, "grid": 482, "axes": (430, 69), "curves": {"nominal": 507}},
    "VARIO_I_230": {"series": "VORTICE VARIO I", "title": "230/9 ARI", "page": 51, "grid": 454, "axes": (540, 23), "curves": {"nominal": 479}},
    "VARIO_I_230_LL": {"series": "VORTICE VARIO I", "title": "230/9 ARI LL S", "page": 51, "grid": 426, "axes": (780, 44), "curves": {"nominal": 451}},
    "VARIO_I_300": {"series": "VORTICE VARIO I", "title": "300/12 ARI", "page": 52, "grid": 11, "axes": (1250, 33), "curves": {"nominal": 36}},
    "VARIO_I_300_LL": {"series": "VORTICE VARIO I", "title": "300/12 ARI LL S", "page": 52, "grid": 39, "axes": (1850, 77), "curves": {"nominal": 64}},
    "QUADRO_MICRO_80": {"series": "VORT QUADRO", "title": "MICRO 80", "page": 86, "grid": 11, "axes": (107, 293), "curves": {"min": 38, "max": 36}},
    "QUADRO_MICRO_100": {"series": "VORT QUADRO", "title": "MICRO 100", "page": 86, "grid": 42, "axes": (103, 243), "curves": {"min": 69, "max": 67}},
    "QUADRO_MEDIO": {"series": "VORT QUADRO", "title": "MEDIO", "page": 86, "grid": 73, "axes": (200, 400), "curves": {"min": 98, "med": 102, "max": 100}},
    "QUADRO_SUPER": {"series": "VORT QUADRO", "title": "SUPER", "page": 86, "grid": 106, "axes": (300, 500), "curves": {"min": 131, "max": 133}},
    "QUADRO_I_MICRO_100": {"series": "VORT QUADRO I", "title": "MICRO 100 I", "page": 92, "grid": 89, "axes": (200, 300), "curves": {"speed_1": 116, "speed_2": 120, "speed_3": 114, "speed_4": 118}},
    "QUADRO_I_MEDIO": {"series": "VORT QUADRO I", "title": "MEDIO I", "page": 92, "grid": 11, "axes": (200, 400), "curves": {"min": 36, "med": 40, "max": 38}},
    "QUADRO_I_SUPER": {"series": "VORT QUADRO I", "title": "SUPER I", "page": 92, "grid": 44, "axes": (300, 500), "curves": {"min": 69, "med": 71, "max": 73}},
    "QE_60": {"series": "VORT QUADRO EVO", "title": "QE 60", "page": 101, "grid": 70, "axes": (79, 425), "curves": {"nominal": 95}},
    "QE_60_35": {"series": "VORT QUADRO EVO", "title": "QE 60/35", "page": 101, "grid": 102, "axes": (79, 425), "curves": {"min": 128, "max": 127}},
    "QE_100": {"series": "VORT QUADRO EVO", "title": "QE 100", "page": 101, "grid": 12, "axes": (129, 434), "curves": {"nominal": 37}},
    "QE_100_60": {"series": "VORT QUADRO EVO", "title": "QE 100/60", "page": 101, "grid": 131, "axes": (129, 434), "curves": {"min": 157, "max": 156}},
    "QE_100_60_35": {"series": "VORT QUADRO EVO", "title": "QE 100/60/35", "page": 101, "grid": 40, "axes": (129, 434), "curves": {"min": 67, "med": 66, "max": 65}},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cubic(start, control_a, control_b, end, fraction):
    inverse = 1.0 - fraction
    return (
        inverse**3 * start.x
        + 3 * inverse**2 * fraction * control_a.x
        + 3 * inverse * fraction**2 * control_b.x
        + fraction**3 * end.x,
        inverse**3 * start.y
        + 3 * inverse**2 * fraction * control_a.y
        + 3 * inverse * fraction**2 * control_b.y
        + fraction**3 * end.y,
    )


def path_points(items, dense=False):
    points = []
    for item in items:
        if item[0] == "l":
            start, end = item[1], item[2]
            segment = [
                (
                    start.x + (end.x - start.x) * index / 24,
                    start.y + (end.y - start.y) * index / 24,
                )
                for index in range(25)
            ] if dense else [(start.x, start.y), (end.x, end.y)]
        elif item[0] == "c":
            segment = [cubic(*item[1:5], index / 24) for index in range(25)] if dense else [
                (item[1].x, item[1].y),
                (item[4].x, item[4].y),
            ]
        else:
            raise ValueError(f"Unsupported PDF path command: {item[0]}")
        for point in segment:
            if not points or math.hypot(point[0] - points[-1][0], point[1] - points[-1][1]) > 1e-6:
                points.append(point)
    if points[0][0] > points[-1][0]:
        points.reverse()
    return points


def distance_to_segment(point, start, end):
    px, py = point
    ax, ay = start
    bx, by = end
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    fraction = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + fraction * dx), py - (ay + fraction * dy))


def extract_curve(drawing, grid, airflow_axis, pressure_axis):
    vector = path_points(drawing["items"])
    dense = path_points(drawing["items"], dense=True)

    def normalize(point):
        return (
            max(0.0, min(1.0, (point[0] - grid.x0) / grid.width)),
            max(0.0, min(1.0, (grid.y1 - point[1]) / grid.height)),
        )

    normalized_vector = [normalize(point) for point in vector]
    points = []
    for airflow_fraction, pressure_fraction in normalized_vector:
        point = {
            "q_m3h": round(airflow_axis * airflow_fraction, 1),
            "p_pa": round(pressure_axis * pressure_fraction, 1),
        }
        if not points or point != points[-1]:
            points.append(point)
    if points[-1]["q_m3h"] <= points[0]["q_m3h"]:
        raise ValueError("Extracted residential vector curve has invalid overall direction")

    normalized_rounded = [
        (point["q_m3h"] / airflow_axis, point["p_pa"] / pressure_axis) for point in points
    ]
    maximum_error = max(
        min(
            distance_to_segment(normalize(point), normalized_rounded[index], normalized_rounded[index + 1])
            for index in range(len(normalized_rounded) - 1)
        )
        for point in dense
    )
    return points, round(maximum_error * 100, 4)


def model_size(model):
    match = re.search(r"\b(90|100|120|150|230|300)/", model)
    if not match:
        raise ValueError(f"Residential model size not found: {model}")
    return match.group(1)


def graph_for(product):
    series = product["series"]
    model = product["model"]
    if series == "PUNTO":
        return f"PUNTO_{model_size(model)}"
    if series == "PUNTO FILO":
        return f"FILO_{model_size(model)}"
    if series == "PUNTO FOUR":
        return f"FOUR_{model_size(model)}"
    if series == "PUNTO GHOST":
        return f"GHOST_{model_size(model)}"
    if series == "PUNTO EVO FLEXO":
        return f"FLEXO_{model_size(model)}"
    if series == "PUNTO EVO":
        return f"EVO_{model_size(model)}"
    if series == "PUNTO EVO ES":
        return f"EVO_ES_{model_size(model)}"
    if series == "PUNTO EVO GOLD":
        return "EVO_GOLD_100"
    if series in {"VORTICE VARIO", "VORTICE VARIO I"}:
        prefix = "VARIO_I" if series.endswith(" I") else "VARIO"
        suffix = "_LL" if "LL S" in model else ""
        return f"{prefix}_{model_size(model)}{suffix}"
    if series == "VORT QUADRO":
        for label, key in (
            ("MICRO 80", "QUADRO_MICRO_80"),
            ("MICRO 100", "QUADRO_MICRO_100"),
            ("MEDIO", "QUADRO_MEDIO"),
            ("SUPER", "QUADRO_SUPER"),
        ):
            if label in model:
                return key
    if series == "VORT QUADRO I":
        for label, key in (
            ("MICRO 100", "QUADRO_I_MICRO_100"),
            ("MEDIO", "QUADRO_I_MEDIO"),
            ("SUPER", "QUADRO_I_SUPER"),
        ):
            if label in model:
                return key
    if series == "VORT QUADRO EVO":
        match = re.search(r"\bQE\s+(100/60/35|100/60|60/35|100|60)\b", model)
        if match:
            return "QE_" + match.group(1).replace("/", "_")
    raise ValueError(f"No verified residential graph mapping for {series}: {model}")


def main():
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: extract-residential-vector-curves.py ORIGINAL.pdf residential_selected_products.json OUTPUT.json"
        )
    pdf_path = Path(sys.argv[1]).resolve()
    package_path = Path(sys.argv[2]).resolve()
    output_path = Path(sys.argv[3]).resolve()
    actual_hash = sha256(pdf_path)
    if actual_hash != EXPECTED_PDF_SHA256:
        raise ValueError(f"Unexpected residential catalogue SHA-256: {actual_hash}")

    package = json.loads(package_path.read_text(encoding="utf-8"))
    products = package.get("products", [])
    if len(products) != 172:
        raise ValueError(f"Expected 172 selected residential products, found {len(products)}")
    assignments = {}
    for product in products:
        configuration_id = product["configuration_id"]
        if configuration_id in assignments:
            raise ValueError(f"Duplicate residential configuration_id: {configuration_id}")
        assignments[configuration_id] = graph_for(product)

    document = fitz.open(pdf_path)
    extracted_graphs = {}
    for graph_id, specification in GRAPHS.items():
        page = document[specification["page"] - 1]
        drawings = page.get_drawings()
        grid = drawings[specification["grid"]]["rect"]
        airflow_axis, pressure_axis = specification["axes"]
        curves = {}
        for control, drawing_index in specification["curves"].items():
            try:
                points, maximum_path_error = extract_curve(
                    drawings[drawing_index], grid, airflow_axis, pressure_axis
                )
            except ValueError as error:
                raise ValueError(f"{graph_id} {control}: {error}") from error
            curves[control] = {
                "source_drawing_index": drawing_index,
                "source_method": "axis-calibrated from original catalogue vector performance path",
                "point_count": len(points),
                "max_normalized_path_error_percent": maximum_path_error,
                "points": points,
            }
        extracted_graphs[graph_id] = {
            "series": specification["series"],
            "graph_title": specification["title"],
            "source_page": specification["page"],
            "grid_drawing_index": specification["grid"],
            "airflow_axis_max_m3h": airflow_axis,
            "pressure_axis_max_pa": pressure_axis,
            "curves": curves,
        }

    curve_count = sum(len(extracted_graphs[graph_id]["curves"]) for graph_id in assignments.values())
    point_count = sum(
        sum(curve["point_count"] for curve in extracted_graphs[graph_id]["curves"].values())
        for graph_id in assignments.values()
    )
    if curve_count != 243:
        raise ValueError(f"Expected 243 catalogue residential curves, found {curve_count}")

    output = {
        "schema_version": "1.0",
        "status": "verified_against_original_catalogue_vector_graphs",
        "source_catalogue": pdf_path.name,
        "source_sha256": actual_hash,
        "source_pages": sorted({specification["page"] for specification in GRAPHS.values()}),
        "curve_interpolation": "linear",
        "extrapolation": False,
        "catalogue_notes": [
            "The transfer package's endpoint-normalized approximations are replaced with axis-calibrated original vector paths.",
            "VORTICE VARIO package endpoints conflict materially with the plotted catalogue curves; the graph axes and paths are authoritative.",
            "VORT QUADRO and VORT QUADRO I intermediate speed curves omitted by the transfer package are retained, increasing the selected residential curve count from 228 to 243.",
        ],
        "summary": {
            "products": len(products),
            "series": len({product["series"] for product in products}),
            "graphs": len(extracted_graphs),
            "curves": curve_count,
            "points": point_count,
            "maximum_normalized_path_error_percent": max(
                curve["max_normalized_path_error_percent"]
                for graph in extracted_graphs.values()
                for curve in graph["curves"].values()
            ),
        },
        "assignments": assignments,
        "graphs": extracted_graphs,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(output["summary"] | {"output": str(output_path)}, indent=2))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Extract VORT QBK SAL-KC EVO curves from the original vector PDF."""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import fitz


EXPECTED_PDF_SHA256 = "892f4e1efad05a5179120f4f2099518649198c64ee6641c0623dc3f5e198e766"
Q_AXIS = {
    43151: 3000, 43152: 6000, 43153: 3000, 43154: 4000, 43155: 4000,
    43156: 6000, 43157: 6000, 43158: 8000, 43159: 20000, 43160: 7000,
    43161: 20000, 43162: 10000, 43163: 30000, 43164: 20000, 43165: 3000,
    43166: 4000, 43167: 6000, 43168: 8000, 43169: 20000, 43170: 20000,
    43171: 30000,
}
P_AXIS = {
    43151: 400, 43152: 2000, 43153: 400, 43154: 500, 43155: 500,
    43156: 600, 43157: 600, 43158: 800, 43159: 900, 43160: 400,
    43161: 2000, 43162: 500, 43163: 2000, 43164: 700, 43165: 400,
    43166: 500, 43167: 600, 43168: 800, 43169: 900, 43170: 2000,
    43171: 2000,
}
CURVE_MAP = {
    43151: {"page": 10, "curves": {"nominal": 53}},
    43152: {"page": 10, "curves": {"nominal": 105}},
    43153: {"page": 10, "curves": {"nominal": 157}},
    43154: {"page": 10, "curves": {"nominal": 209}},
    43155: {"page": 10, "curves": {"nominal": 261}},
    43156: {"page": 10, "curves": {"nominal": 313}},
    43157: {"page": 11, "curves": {"nominal": 54}},
    43158: {"page": 11, "curves": {"nominal": 106}},
    43159: {"page": 11, "curves": {"nominal": 158}},
    43160: {"page": 11, "curves": {"nominal": 210}},
    43161: {"page": 11, "curves": {"nominal": 262}},
    43162: {"page": 11, "curves": {"nominal": 314}},
    43163: {"page": 12, "curves": {"nominal": 55}},
    43164: {"page": 12, "curves": {"nominal": 107}},
    43165: {"page": 12, "curves": {"4_poles": 159, "8_poles": 160}},
    43166: {"page": 12, "curves": {"4_poles": 211, "8_poles": 212}},
    43167: {"page": 12, "curves": {"4_poles": 263, "8_poles": 264}},
    43168: {"page": 12, "curves": {"4_poles": 315, "8_poles": 316}},
    43169: {"page": 13, "curves": {"4_poles": 54, "8_poles": 55}},
    43170: {"page": 13, "curves": {"4_poles": 106, "8_poles": 107}},
    43171: {"page": 13, "curves": {"4_poles": 158, "8_poles": 159}},
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


def graph_grid(drawings, curve):
    center = curve["rect"].tl + (curve["rect"].br - curve["rect"].tl) / 2
    gray = lambda drawing: drawing.get("color") and all(abs(value - 0.878) < 0.01 for value in drawing["color"])
    verticals = sorted([
        drawing["rect"] for drawing in drawings
        if gray(drawing)
        and drawing["rect"].width < 0.2
        and drawing["rect"].height > 50
        and drawing["rect"].y0 <= center.y <= drawing["rect"].y1
    ], key=lambda rect: rect.x0)
    groups = []
    for vertical in verticals:
        if not groups or vertical.x0 - groups[-1][-1].x0 > 40:
            groups.append([])
        groups[-1].append(vertical)
    group = next(
        (candidate for candidate in groups if candidate[0].x0 <= center.x <= candidate[-1].x0),
        [],
    )
    if len(group) < 6:
        raise ValueError("QBK graph grid could not be resolved")
    return fitz.Rect(
        group[0].x0,
        min(rect.y0 for rect in group),
        group[-1].x0,
        max(rect.y1 for rect in group),
    )


def extract_curve(drawing, grid, airflow_axis, pressure_axis):
    vector = path_points(drawing["items"])
    dense = path_points(drawing["items"], dense=True)

    def normalize(point):
        return (
            max(0.0, min(1.0, (point[0] - grid.x0) / grid.width)),
            max(0.0, min(1.0, (grid.y1 - point[1]) / grid.height)),
        )

    points = []
    for airflow_fraction, pressure_fraction in map(normalize, vector):
        point = {
            "q_m3h": round(airflow_axis * airflow_fraction, 1),
            "p_pa": round(pressure_axis * pressure_fraction, 1),
        }
        if not points or point != points[-1]:
            points.append(point)
    if points[-1]["q_m3h"] <= points[0]["q_m3h"]:
        raise ValueError("Extracted QBK vector curve has invalid overall direction")

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


def main():
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: extract-qbk-vector-curves.py ORIGINAL.pdf qbk_sal_kc_evo_products.json OUTPUT.json"
        )
    pdf_path = Path(sys.argv[1]).resolve()
    package_path = Path(sys.argv[2]).resolve()
    output_path = Path(sys.argv[3]).resolve()
    actual_hash = sha256(pdf_path)
    if actual_hash != EXPECTED_PDF_SHA256:
        raise ValueError(f"Unexpected QBK catalogue SHA-256: {actual_hash}")

    package = json.loads(package_path.read_text(encoding="utf-8"))
    products = {int(product["code"]): product for product in package.get("products", [])}
    if set(products) != set(CURVE_MAP):
        raise ValueError("QBK package codes do not match catalogue codes 43151-43171")

    document = fitz.open(pdf_path)
    output_curves = {}
    for code, specification in CURVE_MAP.items():
        page = document[specification["page"] - 1]
        drawings = page.get_drawings()
        curves = {}
        for control, drawing_index in specification["curves"].items():
            drawing = drawings[drawing_index]
            grid = graph_grid(drawings, drawing)
            points, maximum_error = extract_curve(drawing, grid, Q_AXIS[code], P_AXIS[code])
            curves[control] = {
                "source_drawing_index": drawing_index,
                "source_method": "axis-calibrated from original catalogue vector performance path",
                "point_count": len(points),
                "max_normalized_path_error_percent": maximum_error,
                "points": points,
            }
        output_curves[str(code)] = {
            "model": products[code]["model"],
            "source_page": specification["page"],
            "airflow_axis_max_m3h": Q_AXIS[code],
            "pressure_axis_max_pa": P_AXIS[code],
            "curves": curves,
        }

    curve_count = sum(len(product["curves"]) for product in output_curves.values())
    point_count = sum(
        curve["point_count"]
        for product in output_curves.values()
        for curve in product["curves"].values()
    )
    if curve_count != 28:
        raise ValueError(f"Expected 28 QBK curves, found {curve_count}")

    output = {
        "schema_version": "1.0",
        "status": "verified_against_original_catalogue_vector_graphs",
        "source_catalogue": pdf_path.name,
        "source_sha256": actual_hash,
        "source_pages": [10, 11, 12, 13],
        "curve_interpolation": "linear",
        "extrapolation": False,
        "catalogue_notes": [
            "The transfer package used incorrect graph-axis origins, shifting airflow and pressure coordinates.",
            "All 28 curves are re-extracted from the original vector paths and calibrated to the printed graph grids and axes.",
        ],
        "summary": {
            "products": len(output_curves),
            "series": 1,
            "curves": curve_count,
            "points": point_count,
            "maximum_normalized_path_error_percent": max(
                curve["max_normalized_path_error_percent"]
                for product in output_curves.values()
                for curve in product["curves"].values()
            ),
        },
        "curves": output_curves,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(output["summary"] | {"output": str(output_path)}, indent=2))


if __name__ == "__main__":
    main()

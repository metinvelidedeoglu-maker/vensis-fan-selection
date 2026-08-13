#!/usr/bin/env python3
"""Extract verified E-ATEX performance curves from the original vector PDF."""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import fitz


EXPECTED_PDF_SHA256 = "7edd786a6a51b40c0a1114bbba1bd04aa67cfa154a9fd1852bb17ce23f37f6ee"
CURVE_MAP = {
    "40320": {"model": "E 254 M ATEX", "page": 10, "anchor": (118.23, 214.27)},
    "40321": {"model": "E 304 M ATEX", "page": 10, "anchor": (337.70, 196.12)},
    "40322": {"model": "E 354 M ATEX", "page": 10, "anchor": (121.95, 399.85)},
    "40323": {"model": "E 404 M ATEX", "page": 10, "anchor": (337.68, 419.07)},
    "40324": {"model": "E 454 M ATEX", "page": 10, "anchor": (118.23, 585.35)},
    "40325": {"model": "E 254 T ATEX", "page": 10, "anchor": (337.92, 617.77)},
    "40326": {"model": "E 304 T ATEX", "page": 11, "anchor": (118.36, 196.34)},
    "40327": {"model": "E 354 T ATEX", "page": 11, "anchor": (338.45, 189.35)},
    "40328": {"model": "E 404 T ATEX", "page": 11, "anchor": (118.22, 399.88)},
    "40329": {"model": "E 454 T ATEX", "page": 11, "anchor": (338.46, 403.00)},
    "40330": {"model": "E 504 T ATEX", "page": 11, "anchor": (113.80, 592.79)},
    # The printed E 506 / E 606 graph headings are transposed. The technical
    # table endpoints and power traces identify the correct vector paths.
    "40333": {"model": "E 506 T ATEX", "page": 12, "anchor": (336.99, 192.56)},
    "40331": {"model": "E 604 T ATEX", "page": 12, "anchor": (118.70, 193.94)},
    "40332": {"model": "E 606 T ATEX", "page": 11, "anchor": (337.90, 623.83)},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def point_xy(point: fitz.Point) -> tuple[float, float]:
    return float(point.x), float(point.y)


def cubic(start, control_a, control_b, end, fraction):
    inverse = 1.0 - fraction
    x = (
        inverse**3 * start.x
        + 3 * inverse**2 * fraction * control_a.x
        + 3 * inverse * fraction**2 * control_b.x
        + fraction**3 * end.x
    )
    y = (
        inverse**3 * start.y
        + 3 * inverse**2 * fraction * control_a.y
        + 3 * inverse * fraction**2 * control_b.y
        + fraction**3 * end.y
    )
    return x, y


def ordered_dense_path(items, samples_per_segment=24):
    dense = []
    for item in items:
        if item[0] == "l":
            start, end = item[1], item[2]
            for index in range(samples_per_segment + 1):
                fraction = index / samples_per_segment
                dense.append(
                    (
                        start.x + (end.x - start.x) * fraction,
                        start.y + (end.y - start.y) * fraction,
                    )
                )
        elif item[0] == "c":
            for index in range(samples_per_segment + 1):
                dense.append(cubic(*item[1:5], index / samples_per_segment))
        else:
            raise ValueError(f"Unsupported PDF path command: {item[0]}")
    return list(reversed(dense))


def drawing_for(page, anchor):
    candidates = []
    for index, drawing in enumerate(page.get_drawings()):
        color = drawing.get("color")
        rect = drawing.get("rect")
        if (
            color is None
            or max(color) > 0.01
            or not math.isclose(float(drawing.get("width", 0)), 85.0, abs_tol=0.1)
            or rect.width < 50
            or rect.height < 20
        ):
            continue
        distance = math.hypot(rect.x0 - anchor[0], rect.y0 - anchor[1])
        candidates.append((distance, index, drawing))
    candidates.sort(key=lambda row: row[0])
    if not candidates or candidates[0][0] > 2.0:
        raise ValueError(f"Verified vector curve not found near page anchor {anchor}")
    return candidates[0][1], candidates[0][2]


def distance_to_segment(point, start, end):
    px, py = point
    ax, ay = start
    bx, by = end
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    fraction = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + fraction * dx), py - (ay + fraction * dy))


def extract_curve(drawing, max_airflow, max_pressure):
    dense = ordered_dense_path(drawing["items"])
    left_x, top_y = dense[0]
    right_x, bottom_y = dense[-1]
    if right_x <= left_x or bottom_y <= top_y:
        raise ValueError("Unexpected E-ATEX vector-curve direction or geometry")

    vector_vertices = [drawing["items"][-1][-1]]
    vector_vertices.extend(item[1] for item in reversed(drawing["items"]))
    points = []
    for vertex in vector_vertices:
        airflow = max_airflow * (vertex.x - left_x) / (right_x - left_x)
        pressure = max_pressure * (bottom_y - vertex.y) / (bottom_y - top_y)
        point = {
            "q_m3h": round(max(0, min(max_airflow, airflow)), 1),
            "p_pa": round(max(0, min(max_pressure, pressure)), 1),
        }
        if not points or point != points[-1]:
            points.append(point)
    points[0] = {"q_m3h": 0, "p_pa": round(max_pressure, 1)}
    points[-1] = {"q_m3h": round(max_airflow, 1), "p_pa": 0}

    normalized_dense = [
        ((page_x - left_x) / (right_x - left_x), (bottom_y - page_y) / (bottom_y - top_y))
        for page_x, page_y in dense
    ]
    normalized_vertices = sorted(
        ((point["q_m3h"] / max_airflow, point["p_pa"] / max_pressure) for point in points),
        key=lambda point: point[1],
    )
    maximum_error = max(
        min(
            distance_to_segment(point, normalized_vertices[index], normalized_vertices[index + 1])
            for index in range(len(normalized_vertices) - 1)
        )
        for point in normalized_dense
    )
    return points, round(maximum_error * 100, 4)


def main():
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: extract-eatex-vector-curves.py ORIGINAL.pdf eatex_tiracamino_products.json OUTPUT.json"
        )
    pdf_path = Path(sys.argv[1]).resolve()
    package_path = Path(sys.argv[2]).resolve()
    output_path = Path(sys.argv[3]).resolve()
    actual_hash = sha256(pdf_path)
    if actual_hash != EXPECTED_PDF_SHA256:
        raise ValueError(f"Unexpected E-ATEX catalogue SHA-256: {actual_hash}")

    package = json.loads(package_path.read_text(encoding="utf-8"))
    products = {str(row["code"]): row for row in package["products"] if row["series"] == "E-ATEX"}
    if set(products) != set(CURVE_MAP):
        raise ValueError("E-ATEX package codes do not match the verified catalogue mapping")

    document = fitz.open(pdf_path)
    curves = {}
    for code, mapping in CURVE_MAP.items():
        product = products[code]
        if product["model"] != mapping["model"]:
            raise ValueError(f"Model mismatch for code {code}: {product['model']}")
        page = document[mapping["page"] - 1]
        drawing_index, drawing = drawing_for(page, mapping["anchor"])
        points, maximum_path_error = extract_curve(
            drawing,
            float(product["max_airflow_m3h"]),
            float(product["max_pressure_pa"]),
        )
        curves[code] = {
            "model": product["model"],
            "source_page": mapping["page"],
            "source_drawing_index": drawing_index,
            "source_method": "digitized from original catalogue vector performance path",
            "point_count": len(points),
            "max_normalized_path_error_percent": maximum_path_error,
            "points": points,
        }

    output = {
        "schema_version": "1.0",
        "status": "verified_against_original_catalogue_vector_graphs",
        "source_catalogue": pdf_path.name,
        "source_sha256": actual_hash,
        "source_pages": [10, 11, 12],
        "catalogue_notes": [
            "Printed graph codes 40331-40333 conflict with the technical table.",
            "The printed E 506 T and E 606 T graph headings are transposed; vector paths are mapped using model airflow, pressure and power data from the technical table.",
        ],
        "curve_interpolation": "linear",
        "extrapolation": False,
        "curves": curves,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "curves": len(curves),
                "points": sum(len(row["points"]) for row in curves.values()),
                "maximum_normalized_path_error_percent": max(
                    row["max_normalized_path_error_percent"] for row in curves.values()
                ),
                "output": str(output_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Re-import verified Vitlo catalogue rows and performance curves.

The catalogue contains multiple performance tables on some pages. Their pressure
headers are not interchangeable, so this importer reads PDF cell coordinates and
maps every airflow value to the pressure heading directly above that column.

Existing internal keys and prices are deliberately preserved. Rows accidentally
created from dimension tables are removed only when they match a strict artifact
signature. ROOF-AXF is audited but is not added because the application has no
verified price records for that series.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import pdfplumber
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("pdfplumber is required: python -m pip install pdfplumber") from exc


DATA_FILE_RE = re.compile(r"fans-\d+\.js$")
DATA_WRAPPER_RE = re.compile(
    r"^\s*window\.models\.push\(\.\.\.(\[.*\])\);?\s*$", re.DOTALL
)
VOLTAGE_RE = re.compile(r"V-?50Hz", re.IGNORECASE)

SERIES_CODES = (
    "MOB-AXD/ATEX",
    "TUNEL-AXF",
    "BOX-AXF",
    "ROOF-AXF",
    "AXD/ATEX",
    "AXW/ATEX",
    "AXR/ATEX",
    "CRH/ATEX",
    "CRD/ATEX",
    "CRS/ATEX",
    "AXD/MOB",
    "CRU-EC",
    "CRB-EC",
    "CRC-EC",
    "CR-EC",
    "AXF",
    "AXJ",
    "RXJ",
    "AXD",
    "AXS",
    "AXW",
    "AXB",
    "AXH",
    "AXR",
    "AXV",
    "CRB",
    "CRD",
    "CRK",
    "CRC",
    "CRS",
    "CRH",
    "CRV",
    "CRU",
    "CRR",
    "VHR",
    "CD",
    "CR",
)

EXPECTED_PDF_BACKED_ROWS = 619
EXPECTED_CURRENT_CURVES = 580
EXPECTED_ROOF_ROWS = 48
PRESERVED_WITHOUT_COORDINATE_ROWS = {"AXJ"}
PRESERVED_USER_MODELS = {
    "AXW/ATEX 35-2T-0.37",
    "AXW/ATEX 35-2T-0.55",
    "AXW/ATEX 35-2T-0.75",
    "AXW/ATEX 40-2T-1",
    "AXW/ATEX 40-2T-1.5",
    "AXW/ATEX 45-2T-2",
    "AXW/ATEX 50-2T-3",
    "AXW/ATEX 56-2T-4",
}
AUDITED_NOT_IMPORTED = {"ROOF-AXF"}


@dataclass(frozen=True)
class Header:
    top: float
    power_x: float
    speed_x: float
    current_x: float
    sound_x: float
    pressures: tuple[tuple[int, float], ...]


@dataclass(frozen=True)
class CatalogRow:
    series: str
    model: str
    nominal: float
    voltage: str
    power: float | None
    speed: float | None
    current: float | None
    sound: float | None
    page: int
    source_points: tuple[tuple[float, float], ...]


def number(value: Any) -> float | None:
    text = ("" if value is None else str(value)).strip().replace("O", "0")
    if not text:
        return None
    try:
        return float(text.replace(",", "."))
    except ValueError:
        return None


def tidy_number(value: float | None) -> int | float | None:
    if value is None:
        return None
    if math.isclose(value, round(value), abs_tol=1e-9):
        return int(round(value))
    return round(value, 6)


def canonical(value: str) -> str:
    return re.sub(r"[^A-Z0-9./-]+", "", value.upper().replace(",", "."))


def series_for_model(model: str) -> str | None:
    normalized = canonical(model)
    for base in ("CRU", "CRB", "CRC", "CR"):
        if normalized.startswith(base) and "EC" in normalized:
            return f"{base}-EC"
    if normalized.startswith("VHR"):
        return "VHR"
    for series in sorted(SERIES_CODES, key=len, reverse=True):
        if series.endswith("-EC"):
            continue
        if normalized.startswith(canonical(series)):
            return series
    return None


def cluster_rows(words: list[dict[str, Any]], tolerance: float = 0.35):
    groups: list[list[Any]] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not groups or abs(word["top"] - groups[-1][0]) > tolerance:
            groups.append([word["top"], [word]])
        else:
            groups[-1][1].append(word)
    return [
        (top, sorted(group, key=lambda item: item["x0"]))
        for top, group in groups
    ]


def center(word: dict[str, Any]) -> float:
    return (word["x0"] + word["x1"]) / 2


def closest_number(
    words: list[dict[str, Any]], target_x: float, tolerance: float
) -> float | None:
    candidates = []
    for word in words:
        value = number(word["text"])
        distance = abs(center(word) - target_x)
        if value is not None and distance <= tolerance:
            candidates.append((distance, value))
    return min(candidates)[1] if candidates else None


def parse_header(
    top: float,
    row_words: list[dict[str, Any]],
    all_words: list[dict[str, Any]],
    page_width: float,
) -> Header | None:
    texts = [word["text"] for word in row_words]
    if not all(unit in texts for unit in ("(kW)", "(rpm)", "(A)")):
        return None

    nearby = [word for word in all_words if abs(word["top"] - top) < 1.5]
    power = next(word for word in nearby if word["text"] == "(kW)")
    speed = next(word for word in nearby if word["text"] == "(rpm)")
    current = next(word for word in nearby if word["text"] == "(A)")
    sound_candidates = [
        word
        for word in all_words
        if "dB" in word["text"]
        and abs(word["top"] - top) < 12
        and word["x0"] > current["x1"]
    ]
    sound_x = center(min(sound_candidates, key=lambda word: abs(word["top"] - top))) \
        if sound_candidates else page_width - 15

    pressures = []
    for word in nearby:
        value = number(word["text"])
        if (
            value is not None
            and value.is_integer()
            and word["x0"] > current["x1"]
            and word["x1"] < sound_x
        ):
            pressures.append((int(value), center(word)))
    pressures.sort(key=lambda item: item[1])
    if not pressures:
        return None

    return Header(
        top=top,
        power_x=center(power),
        speed_x=center(speed),
        current_x=center(current),
        sound_x=sound_x,
        pressures=tuple(pressures),
    )


def parse_catalog(catalog_path: Path) -> dict[str, list[CatalogRow]]:
    rows_by_series: dict[str, list[CatalogRow]] = defaultdict(list)

    with pdfplumber.open(catalog_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            words = page.extract_words(
                x_tolerance=1, y_tolerance=2, keep_blank_chars=False
            )
            rows = cluster_rows(words)
            headers = [
                header
                for top, row_words in rows
                if (header := parse_header(top, row_words, words, page.width))
            ]

            for top, row_words in rows:
                texts = [word["text"] for word in row_words]
                voltage_index = next(
                    (
                        index
                        for index, text in enumerate(texts)
                        if VOLTAGE_RE.search(text)
                    ),
                    None,
                )
                if voltage_index is None or voltage_index < 2:
                    continue

                nominal = number(texts[voltage_index - 1])
                model = " ".join(texts[: voltage_index - 1]).strip()
                if nominal is None or model == "MODEL" or not re.search(r"[A-Z]", model):
                    continue
                series = series_for_model(model)
                if not series:
                    continue

                header = max(
                    (candidate for candidate in headers if candidate.top < top),
                    key=lambda candidate: candidate.top,
                    default=None,
                )
                source_points: list[tuple[float, float]] = []
                power = speed = current = sound = None

                if header:
                    pressure_xs = [x for _, x in header.pressures]
                    gaps = [b - a for a, b in zip(pressure_xs, pressure_xs[1:])]
                    point_tolerance = (min(gaps) / 2 if gaps else 12) * 0.9
                    curve_words = [
                        word
                        for word in row_words
                        if header.current_x + 5 < center(word) < header.sound_x - 5
                    ]
                    for pressure, x_position in header.pressures:
                        airflow = closest_number(
                            curve_words, x_position, point_tolerance
                        )
                        if airflow is not None:
                            source_points.append((pressure, airflow))

                    power = closest_number(row_words, header.power_x, 12)
                    speed = closest_number(row_words, header.speed_x, 12)
                    current = closest_number(row_words, header.current_x, 12)
                    sound = closest_number(row_words, header.sound_x, 14)

                rows_by_series[series].append(
                    CatalogRow(
                        series=series,
                        model=model,
                        nominal=nominal,
                        voltage=texts[voltage_index],
                        power=power,
                        speed=speed,
                        current=current,
                        sound=sound,
                        page=page_index + 1,
                        source_points=tuple(source_points),
                    )
                )

    return dict(rows_by_series)


def load_data(repo_root: Path):
    files: dict[Path, list[dict[str, Any]]] = {}
    ordered_models: list[dict[str, Any]] = []
    for path in sorted((repo_root / "data").iterdir()):
        if not DATA_FILE_RE.fullmatch(path.name):
            continue
        match = DATA_WRAPPER_RE.match(path.read_text(encoding="utf-8"))
        if not match:
            raise RuntimeError(f"Unsupported data format: {path}")
        models = json.loads(match.group(1))
        files[path] = models
        ordered_models.extend(models)
    return files, ordered_models


def model_shape(model: str) -> tuple[int | None, int | None]:
    stripped = canonical(model)
    values = re.findall(r"\d+", stripped)
    size = int(values[0]) if values else None
    pole_match = re.search(r"-(\d)(?:T|M)(?:-|$)", stripped)
    pole = int(pole_match.group(1)) if pole_match else None
    return size, pole


def app_model_name(catalog_model: str, current_model: str) -> str:
    if canonical(catalog_model) == canonical(current_model):
        return current_model
    if "." in current_model and "," not in current_model:
        return catalog_model.replace(",", ".")
    return catalog_model


def dimension_artifact(model: dict[str, Any]) -> bool:
    source_points = model.get("sourcePoints") or []
    power = number(model.get("kw")) or 0
    nominal = number(model.get("nominal")) or 0
    series = str(model.get("series") or "")
    if power == 0 and nominal <= 2_000 and len(source_points) <= 2:
        return True
    if series.endswith("-EC") and not source_points and (power >= 100 or nominal < 1_000):
        return True
    return False


def validate_catalog_rows(rows_by_series: dict[str, list[CatalogRow]]):
    roof_rows = rows_by_series.get("ROOF-AXF", [])
    if len(roof_rows) != EXPECTED_ROOF_ROWS:
        raise RuntimeError(
            f"Expected {EXPECTED_ROOF_ROWS} ROOF-AXF rows, found {len(roof_rows)}"
        )

    target_rows = [
        row
        for series, rows in rows_by_series.items()
        if series not in AUDITED_NOT_IMPORTED and series not in PRESERVED_WITHOUT_COORDINATE_ROWS
        for row in rows
    ]
    if len(target_rows) != EXPECTED_PDF_BACKED_ROWS:
        raise RuntimeError(
            f"Expected {EXPECTED_PDF_BACKED_ROWS} importable rows, found {len(target_rows)}"
        )

    curve_rows = [row for row in target_rows if row.source_points]
    if len(curve_rows) != EXPECTED_CURRENT_CURVES:
        raise RuntimeError(
            f"Expected {EXPECTED_CURRENT_CURVES} curves, found {len(curve_rows)}"
        )

    for row in curve_rows:
        if len(row.source_points) < 2:
            raise RuntimeError(f"Curve has fewer than two points: {row.model}")
        pressures = [point[0] for point in row.source_points]
        airflows = [point[1] for point in row.source_points]
        if any(b <= a for a, b in zip(pressures, pressures[1:])):
            raise RuntimeError(f"Pressure values are not increasing: {row.model}")
        if any(b > a for a, b in zip(airflows, airflows[1:])):
            raise RuntimeError(f"Airflow values are not decreasing: {row.model}")
        if any(value is None for value in (row.power, row.speed, row.current)):
            raise RuntimeError(f"Motor columns could not be read: {row.model}")


def apply_catalog(
    rows_by_series: dict[str, list[CatalogRow]],
    ordered_models: list[dict[str, Any]],
):
    current_by_series: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for model in ordered_models:
        if not model.get("catalogOnly"):
            current_by_series[str(model.get("series") or "")].append(model)

    removed_ids: set[int] = set()
    summary = {
        "inputModels": len(ordered_models),
        "outputModels": 0,
        "removedDimensionRows": 0,
        "changedCurves": 0,
        "changedPressureHeaders": 0,
        "changedAirflowValues": 0,
        "extendedPressureRanges": 0,
        "correctedModelNames": 0,
        "correctedNominalAirflows": 0,
        "correctedMotorFields": 0,
        "correctedSoundLevels": 0,
        "correctedVoltages": 0,
        "correctedSourcePages": 0,
        "preservedPrices": 0,
        "auditedNotImported": {"ROOF-AXF": EXPECTED_ROOF_ROWS},
        "examples": [],
    }

    for series, current_rows in current_by_series.items():
        if series in PRESERVED_WITHOUT_COORDINATE_ROWS:
            continue
        catalog_rows = rows_by_series.get(series, [])
        if not catalog_rows:
            raise RuntimeError(f"No catalogue rows found for existing series {series}")
        if len(current_rows) < len(catalog_rows):
            raise RuntimeError(
                f"{series}: {len(current_rows)} current rows but {len(catalog_rows)} catalogue rows"
            )

        aligned_rows = current_rows[: len(catalog_rows)]
        extra_rows = current_rows[len(catalog_rows) :]
        for extra in extra_rows:
            if str(extra.get("model") or "") in PRESERVED_USER_MODELS:
                continue
            if not dimension_artifact(extra):
                raise RuntimeError(
                    f"Refusing to remove unrecognized extra row: {series} / {extra.get('model')}"
                )
            removed_ids.add(id(extra))

        for current, catalog in zip(aligned_rows, catalog_rows):
            if model_shape(str(current.get("model") or "")) != model_shape(catalog.model):
                raise RuntimeError(
                    f"Row order mismatch in {series}: {current.get('model')} vs {catalog.model}"
                )

            old_points = [
                [tidy_number(number(point[0])), tidy_number(number(point[1]))]
                for point in (current.get("sourcePoints") or [])
            ]
            new_points = [
                [tidy_number(pressure), tidy_number(airflow)]
                for pressure, airflow in catalog.source_points
            ]
            old_pressures = [point[0] for point in old_points]
            new_pressures = [point[0] for point in new_points]
            old_airflows = [point[1] for point in old_points]
            new_airflows = [point[1] for point in new_points]

            if old_points != new_points:
                summary["changedCurves"] += 1
            if old_pressures != new_pressures:
                summary["changedPressureHeaders"] += 1
            if old_airflows != new_airflows:
                summary["changedAirflowValues"] += 1
            if old_pressures and new_pressures and max(new_pressures) > max(old_pressures):
                summary["extendedPressureRanges"] += 1

            new_model = app_model_name(catalog.model, str(current.get("model") or ""))
            new_nominal = tidy_number(catalog.nominal)
            if new_model != current.get("model"):
                summary["correctedModelNames"] += 1
            if new_nominal != current.get("nominal"):
                summary["correctedNominalAirflows"] += 1

            motor_values = {
                "kw": tidy_number(catalog.power),
                "rpm": tidy_number(catalog.speed),
                "amps": tidy_number(catalog.current),
            }
            for field, value in motor_values.items():
                if value is not None and current.get(field) != value:
                    summary["correctedMotorFields"] += 1
                    current[field] = value

            if current.get("sourcePage") != catalog.page:
                summary["correctedSourcePages"] += 1
            if len(summary["examples"]) < 12 and (
                old_points != new_points
                or new_model != current.get("model")
                or new_nominal != current.get("nominal")
            ):
                summary["examples"].append(
                    {
                        "before": str(current.get("model") or ""),
                        "after": new_model,
                        "oldNominal": current.get("nominal"),
                        "newNominal": new_nominal,
                        "oldPressureRange": [min(old_pressures), max(old_pressures)]
                        if old_pressures
                        else [],
                        "newPressureRange": [min(new_pressures), max(new_pressures)]
                        if new_pressures
                        else [],
                    }
                )

            current["model"] = new_model
            current["display"] = f"{new_model} ({new_nominal} m³/h)"
            current["nominal"] = new_nominal
            if current.get("voltage") != catalog.voltage:
                summary["correctedVoltages"] += 1
            current["voltage"] = catalog.voltage
            if catalog.sound is not None and 0 < catalog.sound <= 200:
                sound = tidy_number(catalog.sound)
                if current.get("spl") != sound:
                    summary["correctedSoundLevels"] += 1
                current["spl"] = sound
            pole_match = re.search(r"-(\d)(?:T|M)(?:-|$)", canonical(new_model))
            if pole_match:
                current["pole"] = int(pole_match.group(1))
            current["sourcePage"] = catalog.page
            current["sourcePoints"] = new_points
    summary["removedDimensionRows"] = len(removed_ids)
    summary["outputModels"] = len(ordered_models) - len(removed_ids)
    summary["preservedPrices"] = summary["outputModels"]
    return removed_ids, summary


def write_data(
    files: dict[Path, list[dict[str, Any]]], removed_ids: set[int]
) -> None:
    for path, models in files.items():
        kept = [model for model in models if id(model) not in removed_ids]
        payload = json.dumps(kept, ensure_ascii=False, separators=(",", ":"))
        path.write_text(f"window.models.push(...{payload});\n", encoding="utf-8")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--catalog",
        type=Path,
        help="Path to the Vitlo 2022 PDF catalogue",
    )
    parser.add_argument("--write", action="store_true", help="Rewrite fan data files")
    parser.add_argument("--report", type=Path, help="Write the JSON audit summary")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    default_catalog = (
        repo_root.parent / "tmp" / "vitlo-catalog" / "Vitlo 2022 Tr-Eng  Catalog FZ.pdf"
    )
    catalog_path = (args.catalog or default_catalog).resolve()
    if not catalog_path.is_file():
        raise SystemExit(f"Catalogue PDF not found: {catalog_path}")

    rows_by_series = parse_catalog(catalog_path)
    validate_catalog_rows(rows_by_series)
    files, ordered_models = load_data(repo_root)
    prices_before = {
        str(model.get("key")): model.get("price")
        for model in ordered_models
        if not dimension_artifact(model)
    }
    keys_before = {
        str(model.get("key"))
        for model in ordered_models
        if not dimension_artifact(model)
    }

    removed_ids, summary = apply_catalog(rows_by_series, ordered_models)
    surviving_models = [model for model in ordered_models if id(model) not in removed_ids]
    keys_after = {str(model.get("key")) for model in surviving_models}
    prices_after = {str(model.get("key")): model.get("price") for model in surviving_models}
    if keys_before != keys_after:
        raise RuntimeError("Internal product identities changed during re-import")
    if prices_before != prices_after:
        raise RuntimeError("Prices changed during re-import")

    if args.write:
        write_data(files, removed_ids)
        subprocess.run(
            ["node", "scripts/prepare-fan-data.mjs"],
            cwd=repo_root,
            check=True,
        )

    rendered = json.dumps(summary, ensure_ascii=False, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    sys.exit(main())

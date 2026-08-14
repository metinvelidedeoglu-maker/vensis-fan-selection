#!/usr/bin/env python3
"""Extract the audited Vortice 2026.1 prices used by the application.

The catalogue reuses some five-digit codes in unrelated product families. Price
matching is therefore constrained by both the application series and the exact
source page. Products that do not have an exact code on their series page stay
unpriced; this script never infers a price from a similar model name.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
DATA_FILES = [ROOT / "data" / f"fans-{index:02d}.js" for index in range(9, 15)]
DEFAULT_OUTPUT = ROOT / "data" / "vortice-prices-2026-1.js"

# These are the price-table pages for the product series currently present in
# the application. Page scoping prevents collisions such as code 43151, which
# appears for both QBK (page 28) and TORRETTE TR-A ATEX (page 31).
SERIES_PAGES = {
    "PUNTO EVO": {2},
    "PUNTO EVO GOLD": {3},
    "PUNTO EVO FLEXO": {4},
    "PUNTO FILO": {5},
    "PUNTO FOUR": {5},
    "PUNTO GHOST": {6},
    "PUNTO": {7, 8},
    "VORTICE VARIO": {10},
    "VORTICE VARIO I": {11},
    "VORT QUADRO": {12},
    "VORT QUADRO I": {13},
    "VORT QUADRO EVO": {14},
    "LINEO QUIET ES": {16},
    "LINEO QUIET": {17},
    "LINEO": {18},
    "CA MD EXTRA EU": {19},
    "TIRACAMINO": {21},
    "CA MD E RF": {24},
    "SLIMROOF ES": {25},
    "HEATMASTER F400": {26},
    "VORT QBK SAL-KC EVO": {28},
    "E-ATEX": {29},
}

EXPECTED_SOURCE_SHA256 = "e914684a173ff6aa174f31b342b69c123c6985781fbe1d4fd492b887b4b716e2"
EXPECTED_TOTAL_PRODUCTS = 310
EXPECTED_MATCHED_PRODUCTS = 153


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path, help="Vensis Fiyat Listesi 2026.pdf")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def load_models(path: Path) -> list[dict]:
    source = path.read_text(encoding="utf-8")
    match = re.fullmatch(r"\s*window\.models\.push\(\.\.\.(\[.*\])\);?\s*", source, re.S)
    if not match:
        raise ValueError(f"Unsupported fan data wrapper: {path}")
    models = json.loads(match.group(1))
    if not isinstance(models, list):
        raise ValueError(f"Fan data is not a list: {path}")
    return models


def numeric_price(value: str) -> int | float | None:
    if not re.fullmatch(r"\d+(?:[.,]\d+)?", value):
        return None
    number = float(value.replace(",", "."))
    return int(number) if number.is_integer() else number


def extract_rows(catalog: Path) -> tuple[dict[int, dict[str, dict]], int]:
    required_pages = sorted(set().union(*SERIES_PAGES.values()))
    page_rows: dict[int, dict[str, dict]] = defaultdict(dict)

    with pdfplumber.open(catalog) as document:
        page_count = len(document.pages)
        for page_number in required_pages:
            words = document.pages[page_number - 1].extract_words(
                x_tolerance=1,
                y_tolerance=2,
                keep_blank_chars=False,
            )
            candidates: dict[str, list[dict]] = defaultdict(list)
            for word in words:
                code = word["text"]
                # Product codes are in the left/model area. This excludes a
                # hidden off-page object on page 12 and airflow/technical values.
                if not re.fullmatch(r"\d{5}", code) or not 40 <= word["x0"] <= 230:
                    continue
                row_words = sorted(
                    (item for item in words if abs(item["top"] - word["top"]) <= 1.8),
                    key=lambda item: item["x0"],
                )
                price_words = [
                    item
                    for item in row_words
                    if item["x0"] > 480 and numeric_price(item["text"]) is not None
                ]
                if not price_words:
                    continue
                price = numeric_price(price_words[-1]["text"])
                candidates[code].append(
                    {
                        "price": price,
                        "codeX": round(float(word["x0"]), 3),
                        "top": round(float(word["top"]), 3),
                        "row": " ".join(item["text"] for item in row_words),
                    }
                )

            for code, options in candidates.items():
                # Some codes recur in a lower technical table on the same page.
                # The actual product-price table has the leftmost code column.
                selected = min(options, key=lambda item: (item["codeX"], item["top"]))
                page_rows[page_number][code] = selected

    return page_rows, page_count


def build_price_list(catalog: Path) -> dict:
    source_sha256 = hashlib.sha256(catalog.read_bytes()).hexdigest()
    if source_sha256 != EXPECTED_SOURCE_SHA256:
        raise ValueError(
            "Source PDF hash does not match the audited Vensis 2026.1 catalogue: "
            f"{source_sha256}"
        )

    models = [model for path in DATA_FILES for model in load_models(path)]
    if len(models) != EXPECTED_TOTAL_PRODUCTS:
        raise ValueError(f"Expected {EXPECTED_TOTAL_PRODUCTS} Vortice products, found {len(models)}")
    if any(model.get("brand") != "Vortice" for model in models):
        raise ValueError("Vortice data chunks contain a non-Vortice product")
    keys = [str(model.get("key", "")) for model in models]
    if len(keys) != len(set(keys)):
        raise ValueError("Vortice product keys are not unique")

    page_rows, page_count = extract_rows(catalog)
    entries = []
    for model in models:
        series = str(model.get("series", ""))
        product_code = str(model.get("productCode", ""))
        matches = [
            (page, page_rows[page][product_code])
            for page in SERIES_PAGES.get(series, set())
            if product_code in page_rows[page]
        ]
        if len(matches) > 1:
            raise ValueError(f"Ambiguous price for {series} / {product_code}")
        if not matches:
            continue
        page, source = matches[0]
        entries.append(
            {
                "productKey": model["key"],
                "series": series,
                "productCode": product_code,
                "model": model.get("model", ""),
                "listPrice": source["price"],
                "sourcePage": page,
            }
        )

    if len(entries) != EXPECTED_MATCHED_PRODUCTS:
        raise ValueError(
            f"Expected {EXPECTED_MATCHED_PRODUCTS} exact price matches, found {len(entries)}"
        )

    return {
        "catalog": "Vensis Urun Fiyat Katalogu 2026.1",
        "currency": "EUR",
        "source": {
            "file": catalog.name,
            "sha256": source_sha256,
            "pages": page_count,
        },
        "totalVorticeProducts": len(models),
        "matchedProducts": len(entries),
        "unpricedProducts": len(models) - len(entries),
        "entries": entries,
    }


def main() -> None:
    arguments = parse_arguments()
    payload = build_price_list(arguments.catalog.resolve())
    output = arguments.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, ensure_ascii=False, indent=2, separators=(",", ": "))
    output.write_text(f"window.VensisVorticePriceList2026_1={serialized};\n", encoding="utf-8")
    print(
        f"Wrote {payload['matchedProducts']} exact prices; "
        f"left {payload['unpricedProducts']} products unpriced: {output}"
    )


if __name__ == "__main__":
    main()

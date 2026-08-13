# VENSIS Fan Selection

Industrial fan selection application.

## Structure

- `index.html` — application shell
- `css/app.css` — interface styles
- `js/` — selection, catalogue, project and secure Edit Mode logic
- `data/fans-*.js` — fan catalogue chunks
- `assets/vensis-logo.png` — VENSIS logo
- `project.html` — separate selection project page
- `detail.html` — detail fallback page
- `api/edit/` — server-side authenticated Edit Mode and GitHub commit API

## Deployment

Hostinger deploys the `main` branch to `public_html/select`.

## Secure Edit Mode

Edit Mode never stores the password or GitHub token in browser code. Copy
`api/edit/config.example.php` to `api/edit/config.local.php` on Hostinger and set:

1. A PHP `password_hash` value.
2. A fine-grained GitHub token limited to this repository with `Contents: Read and write`.
3. The repository and deployment branch, if they differ from the defaults.

`config.local.php` is ignored by Git and blocked by `.htaccess`. On first load, its
resolved values are automatically written with `0600` permissions to
`.vensis-edit/config.php` outside `public_html`; that persistent copy survives
Hostinger Git deployments. `VENSIS_EDIT_CONFIG` can still select another external
path. Login attempts, sessions, CSRF tokens and edits are enforced server-side. Each
accepted edit creates a GitHub commit. Edit Mode is
available in Product Catalog. Series Edit covers the visible series code and name,
brand, categories, General Information, Motor Information, Applications and a new
JPEG, PNG or WebP series image (maximum 3 MB). Model Edit covers every value
displayed on a model card: model
name, power, speed, current, voltage, frequency, nominal airflow, noise, fire rating,
fan type, mount type, IP class and price. The internal model key and fan performance
curves, as well as the internal series key, are not editable through this API.
Add Product creates a new model manually inside an existing series with the same
catalog-card fields. The server generates its internal key, commits it to the
series data file and marks it as catalog-only. It remains available in Product
Catalog and Projects but is excluded from Fan Selection until a verified
performance curve is added through a separate data-import workflow.

## Project Cloud

Projects keep a fast browser copy and synchronize through the same authenticated
server session used by Edit Mode. The canonical server records are stored with
`0600` permissions in `.vensis-edit/projects-v1.json` outside `public_html`, so Git
deployments and browser-data cleanup do not remove them. Existing browser projects
are merged into the cloud on the first authenticated sync. Per-project timestamps
and deletion tombstones prevent an older device from overwriting newer edits or
restoring a deleted project. Project API writes require the authenticated session,
same-origin validation and a CSRF token.

## Vitlo Catalogue Data

Vitlo performance curves are stored as verified catalogue points in
`sourcePoints`; browser interpolation is limited to the first and last verified
pressure values. To audit or rebuild the data from the 2022 catalogue:

```bash
python scripts/reimport-vitlo-catalog.py --catalog /path/to/vitlo-catalog.pdf
python scripts/reimport-vitlo-catalog.py --catalog /path/to/vitlo-catalog.pdf --write
node --test tests/vitlo-catalog-data.test.mjs
```

The importer reads each PDF column by position, preserves internal product keys
and prices, and removes only recognized dimension-table artifacts. Only verified
catalogue points are stored; PCHIP interpolation runs on demand in the browser
without extrapolating beyond catalogue limits. Selection models are interpolated
only after they pass the active product filters and are cached for that page
session. Catalog datasheets interpolate and cache only the opened model.

## Vortice LINEO Catalogue Data

The LINEO catalogue is stored in `data/fans-09.js` as 45 products across LINEO,
LINEO ES, LINEO QUIET and LINEO QUIET ES. Their 136 vector-derived curves contain
2,855 ready-to-use points. EC controls remain separate as 4V, 6V, 8V and 10V;
AC speeds remain separate as min, mid and max. These points use linear
interpolation and are never regenerated or extrapolated at runtime. The 21
catalogue product images are stored in `assets/products/lineo/`.

To rebuild this data from an extracted transfer package:

```bash
node scripts/import-lineo-package.mjs /path/to/extracted/lineo-package
node --test tests/lineo-catalog-data.test.mjs
```

## Vortice CA MD Catalogue Data

The CA MD catalogue is stored in `data/fans-10.js` as 26 products across CA MD,
CA MD EXTRA EU and CA MD E RF. Their 66 vector-derived curves contain 1,386
ready-to-use points. Min, med and max controls remain separate, use linear
interpolation and are never regenerated or extrapolated at runtime. Extra EU
products retain their availability region instead of being merged with current
models. Product and dimension images are stored in `assets/products/ca-md/`,
together with the package manifest and validation report.

To rebuild this data from an extracted transfer package:

```bash
node scripts/import-ca-md-package.mjs /path/to/extracted/ca-md-package
node --test tests/ca-md-catalog-data.test.mjs
```

## Vortice Roof Fan Catalogue Data

The roof-fan catalogue is stored in `data/fans-11.js` as 31 products across
SLIMROOF ES and HEATMASTER F400. Their 64 vector-derived curves contain 1,334
ready-to-use points. SLIMROOF voltage controls and HEATMASTER high/low-speed
curves remain separate, use linear interpolation and are never extrapolated.
HEATMASTER records retain the 80 °C continuous-air limit separately from the
F400 (400 °C / 120 min) emergency smoke duty. Product and dimension images are
stored in `assets/products/roof-fans/` with the package validation files.

To rebuild this data from an extracted transfer package:

```bash
node scripts/import-roof-fans-package.mjs /path/to/extracted/roof-fans-package
node --test tests/roof-fans-catalog-data.test.mjs
```

## Vortice E-ATEX and Tiracamino Catalogue Data

The E-ATEX and Tiracamino catalogue is stored in `data/fans-12.js` as 15
products: 14 E-ATEX axial plate fans and one Tiracamino chimney-top extractor.
The 15 linear curves contain 1,194 ready-to-use points. The 14 E-ATEX curves
contain 1,183 points extracted from the original catalogue's vector performance
paths on pages 10–12; they replace the transfer package's endpoint-normalized
approximations. The catalogue's transposed E 506 T / E 606 T graph headings and
conflicting 40331–40333 graph codes are resolved using the technical-table
airflow, pressure and power data. E-ATEX records retain the gas and dust
markings, Zone 1/21 classification, IIB/IIIC groups, T3/T125 °C, EPL Gb/Db and X
special-condition warning. Tiracamino retains the explicit warning that it is
not suitable for gas fires. Product, dimension and validation assets are stored
in `assets/products/eatex-tiracamino/`.

To rebuild this data from an extracted transfer package:

```bash
python3 scripts/extract-eatex-vector-curves.py /path/to/original-eatex.pdf \
  /path/to/extracted/eatex-tiracamino-package/eatex_tiracamino_products.json \
  assets/products/eatex-tiracamino/verified-vector-curves.json
node scripts/import-eatex-tiracamino-package.mjs /path/to/extracted/eatex-tiracamino-package
node --test tests/eatex-tiracamino-catalog-data.test.mjs
```

## Vortice Selected Residential Catalogue Data

The selected residential catalogue is stored in `data/fans-13.js` as 172 unique
configurations across 13 explicitly requested PUNTO, VORTICE VARIO and VORT
QUADRO series. The 243 linear curves contain 23,643 ready-to-use vector points.
They replace the transfer package's 228 endpoint-normalized approximations. The
original catalogue graphs also restore 15 omitted intermediate-speed selections
for VORT QUADRO and VORT QUADRO I. Stall regions and vector tips keep their
original polyline order; curves are neither regenerated nor extrapolated at
runtime. Shared PUNTO codes 11203 and 11223 remain separate controller
configurations. Product, dimension and verification assets are stored in
`assets/products/vortice-residential/`.

To rebuild the verified vectors and application data:

```bash
python3 scripts/extract-residential-vector-curves.py /path/to/original-residential.pdf \
  /path/to/extracted/residential-package/residential_selected_products.json \
  assets/products/vortice-residential/verified-vector-curves.json
node scripts/import-residential-package.mjs /path/to/extracted/residential-package
node --test tests/residential-catalog-data.test.mjs
```

## Vortice QBK SAL-KC EVO Catalogue Data

The VORT QBK SAL-KC EVO catalogue is stored in `data/fans-14.js` as 21 products,
codes 43151–43171. Its 28 single- and dual-pole curves contain 2,216 verified
vector points. The transfer package reported 866 points as valid, but used
incorrect graph-axis origins; every curve was therefore re-extracted from the
original catalogue grids on pages 10–13. Dual-pole products retain separate
8-pole and 4-pole selections, use linear interpolation and are never
extrapolated. Product, dimension and verification assets are stored in
`assets/products/qbk-sal-kc-evo/`.

To rebuild the verified vectors and application data:

```bash
python3 scripts/extract-qbk-vector-curves.py /path/to/original-qbk.pdf \
  /path/to/extracted/qbk-package/qbk_sal_kc_evo_products.json \
  assets/products/qbk-sal-kc-evo/verified-vector-curves.json
node scripts/import-qbk-package.mjs /path/to/extracted/qbk-package
node --test tests/qbk-catalog-data.test.mjs
```

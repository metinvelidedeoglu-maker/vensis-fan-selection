# Vensis Engineering Suite Database

The product hierarchy is:

`Manufacturer -> Series -> Model -> Performance Points`

Categories are connected to series through the many-to-many `series_categories` table. Every model belongs to exactly one series. Every series must be connected to at least one category by the application/admin validation layer.

## Main tables

- `manufacturers`: Initial manufacturers are Vensis and Vitlo.
- `categories`: Product categories such as Axial Fan and Exproof Fan.
- `series`: Shared catalogue information, images and descriptions.
- `series_categories`: Allows one series to belong to multiple categories.
- `models`: Technical and commercial values specific to each model.
- `performance_points`: Up to 200 ordered operating points for every model.

## Example hierarchy

- Manufacturer: Vensis
- Categories: Axial Fan, Exproof Fan
- Series: AXW/ATEX — Duvar Tipi Aksiyal Exproof Fan
- Model: AXW/ATEX 35-4T-0.18
- Performance points: 1 through 200

## Important decisions

The database does not contain separate `diameter`, `pole`, `fire_class` or `atex` fields. These values may remain part of model and series naming when needed.

`point_no` is limited to 1–200. The unique key `(model_id, point_no)` preserves curve order and prevents duplicate point numbers.

The current fan-selection application still reads the existing JavaScript data files. The next migration step is to import those model records and curves into these tables, then connect the selection engine to an API backed by this database.

# Vensis Engineering Suite Database

The product hierarchy is:

`Manufacturer -> Series -> Model -> Performance Points`

Categories are connected to series through the many-to-many `series_categories` table. Every model belongs to exactly one series. Every series must be connected to at least one category by the application/admin validation layer.

## Main tables

- `manufacturers`: Initial manufacturers are Vitlo and Vensis.
- `categories`: Product categories such as Axial Fan and Exproof Fan.
- `series`: Shared catalogue information, images and descriptions.
- `series_categories`: Allows one series to belong to multiple categories.
- `models`: Technical and commercial values specific to each model.
- `performance_points`: Up to 200 ordered operating points for every model.

## Current product ownership

All products currently present in the fan-selection application belong to **Vitlo**. No current product belongs to Vensis. Vensis remains available as a manufacturer for future products.

Models inherit their manufacturer through their series. The migration `migrations/002_assign_all_existing_products_to_vitlo.sql` assigns every existing series, and therefore every model below those series, to Vitlo.

## Example hierarchy

- Manufacturer: Vitlo
- Categories: Axial Fan, Exproof Fan
- Series: AXW/ATEX — Duvar Tipi Aksiyal Exproof Fan
- Model: AXW/ATEX 35-4T-0.18
- Performance points: 1 through 200

## Important decisions

The database does not contain separate `diameter`, `pole`, `fire_class` or `atex` fields. These values may remain part of model and series naming when needed.

`point_no` is limited to 1–200. The unique key `(model_id, point_no)` preserves curve order and prevents duplicate point numbers.

The current fan-selection application still reads the existing JavaScript data files. During import, all existing JavaScript product records and curves must be created under Vitlo series. After the import, Product Filter will resolve manufacturer through `models -> series -> manufacturers`.
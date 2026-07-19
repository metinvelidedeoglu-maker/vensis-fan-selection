-- Assign every currently imported series/model to Vitlo.
-- Models inherit their manufacturer through series.manufacturer_id.

START TRANSACTION;

INSERT INTO manufacturers (name, slug, is_active)
VALUES ('Vitlo', 'vitlo', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  is_active = 1;

SET @vitlo_manufacturer_id = (
  SELECT id
  FROM manufacturers
  WHERE slug = 'vitlo'
  LIMIT 1
);

UPDATE series
SET manufacturer_id = @vitlo_manufacturer_id
WHERE manufacturer_id <> @vitlo_manufacturer_id;

COMMIT;

-- Vensis Engineering Suite database schema
-- MySQL 8 / MariaDB compatible

CREATE TABLE manufacturers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  logo_url VARCHAR(500) NULL,
  website_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  name_tr VARCHAR(180) NOT NULL,
  name_en VARCHAR(180) NOT NULL,
  icon VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE series (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manufacturer_id INT UNSIGNED NOT NULL,
  code VARCHAR(120) NOT NULL,
  name_tr VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) NULL,
  catalog_pdf_url VARCHAR(500) NULL,
  catalog_page INT NULL,
  general_features JSON NULL,
  motor_features JSON NULL,
  applications JSON NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_manufacturer_series (manufacturer_id, code),
  KEY idx_series_manufacturer (manufacturer_id),
  CONSTRAINT fk_series_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE series_categories (
  series_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (series_id, category_id),
  KEY idx_series_categories_category (category_id),
  CONSTRAINT fk_series_categories_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  CONSTRAINT fk_series_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE models (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  series_id INT UNSIGNED NOT NULL,
  model_code VARCHAR(180) NOT NULL,
  description TEXT NULL,
  motor_power_kw DECIMAL(10,3) NULL,
  rpm INT NULL,
  current_a DECIMAL(10,3) NULL,
  voltage VARCHAR(80) NULL,
  frequency_hz DECIMAL(8,2) NULL,
  noise_dba DECIMAL(10,2) NULL,
  price_eur DECIMAL(12,2) NULL,
  weight_kg DECIMAL(10,2) NULL,
  ip_class VARCHAR(40) NULL,
  insulation_class VARCHAR(40) NULL,
  efficiency_class VARCHAR(40) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_series_model (series_id, model_code),
  KEY idx_models_series (series_id),
  KEY idx_models_code (model_code),
  CONSTRAINT fk_models_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_points (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  model_id BIGINT UNSIGNED NOT NULL,
  point_no SMALLINT UNSIGNED NOT NULL,
  airflow_m3h DECIMAL(14,3) NOT NULL,
  pressure_pa DECIMAL(14,3) NOT NULL,
  power_kw DECIMAL(10,3) NULL,
  efficiency_percent DECIMAL(7,3) NULL,
  noise_dba DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_model_point (model_id, point_no),
  KEY idx_points_model_order (model_id, point_no),
  KEY idx_points_operating (airflow_m3h, pressure_pa),
  CONSTRAINT chk_point_no CHECK (point_no BETWEEN 1 AND 200),
  CONSTRAINT chk_airflow_nonnegative CHECK (airflow_m3h >= 0),
  CONSTRAINT chk_pressure_nonnegative CHECK (pressure_pa >= 0),
  CONSTRAINT fk_points_model FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO manufacturers (name, slug) VALUES
('Vensis', 'vensis'),
('Vitlo', 'vitlo')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (code, name_tr, name_en, sort_order) VALUES
('axial-fan', 'Aksiyal Fan', 'Axial Fan', 10),
('exproof-fan', 'Exproof Fan', 'Exproof Fan', 20)
ON DUPLICATE KEY UPDATE name_tr=VALUES(name_tr), name_en=VALUES(name_en), sort_order=VALUES(sort_order);

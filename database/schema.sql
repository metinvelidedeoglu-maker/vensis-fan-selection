CREATE TABLE brands (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_series (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id INT UNSIGNED NOT NULL,
  code VARCHAR(120) NOT NULL,
  name VARCHAR(255) NULL,
  product_type VARCHAR(160) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_brand_series (brand_id, code),
  CONSTRAINT fk_series_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  brand_id INT UNSIGNED NOT NULL,
  series_id INT UNSIGNED NULL,
  model VARCHAR(180) NOT NULL,
  product_type VARCHAR(160) NULL,
  mounting_type VARCHAR(160) NULL,
  motor_power_kw DECIMAL(10,3) NULL,
  rpm INT NULL,
  poles TINYINT NULL,
  voltage VARCHAR(80) NULL,
  current_a DECIMAL(10,3) NULL,
  noise_dba DECIMAL(10,2) NULL,
  price_eur DECIMAL(12,2) NULL,
  is_atex TINYINT(1) NOT NULL DEFAULT 0,
  fire_class VARCHAR(80) NULL,
  source_catalog VARCHAR(255) NULL,
  source_page VARCHAR(40) NULL,
  general_info JSON NULL,
  motor_info JSON NULL,
  application_info JSON NULL,
  tags JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_brand_model (brand_id, model),
  KEY idx_products_type (product_type),
  KEY idx_products_series (series_id),
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
  CONSTRAINT fk_products_series FOREIGN KEY (series_id) REFERENCES product_series(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_points (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  pressure_pa DECIMAL(12,3) NOT NULL,
  flow_m3h DECIMAL(12,3) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_points_product (product_id, sort_order),
  CONSTRAINT fk_points_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO brands (name, slug) VALUES
('VITLO', 'vitlo')
ON DUPLICATE KEY UPDATE name=VALUES(name);

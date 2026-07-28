import pool from "../config/database.js";

export async function ensureMediaTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(80) NOT NULL,
      file_size INT UNSIGNED NOT NULL,
      file_data LONGBLOB NOT NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_media_assets_created_by (created_by),
      CONSTRAINT fk_media_assets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

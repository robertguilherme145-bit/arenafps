import pool from "../config/database.js";

// Configuracoes da plataforma (ex.: forma de recebimento) e campos do PIX proprio nos pagamentos.
export async function ensurePaymentTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key VARCHAR(60) NOT NULL,
      setting_value LONGTEXT NOT NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`ALTER TABLE payments MODIFY provider ENUM('mercadopago','paypal','pix_manual') NOT NULL DEFAULT 'mercadopago'`);
  await ensureColumn("payments", "declared_at", "DATETIME NULL");
  await ensureColumn("payments", "receipt_url", "VARCHAR(500) NULL");

  await pool.query(`ALTER TABLE mix_payments MODIFY provider ENUM('mercadopago','pix_manual') NOT NULL DEFAULT 'mercadopago'`);
  await ensureColumn("mix_payments", "declared_at", "DATETIME NULL");
  await ensureColumn("mix_payments", "receipt_url", "VARCHAR(500) NULL");
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [table, column]
  );
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

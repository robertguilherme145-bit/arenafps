import pool from "../config/database.js";

export async function ensurePublicTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public_content (
      id INT NOT NULL AUTO_INCREMENT,
      type ENUM('noticia','parceiro','depoimento','faq') NOT NULL,
      title VARCHAR(180) NOT NULL,
      subtitle VARCHAR(255) NULL,
      body TEXT NULL,
      image_url VARCHAR(500) NULL,
      link_url VARCHAR(500) NULL,
      author_name VARCHAR(120) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      published TINYINT(1) NOT NULL DEFAULT 1,
      published_at DATETIME NULL,
      created_by INT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_public_content_type (type, published, sort_order, published_at),
      CONSTRAINT fk_public_content_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public_contact_messages (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('novo','em_atendimento','respondido','arquivado') NOT NULL DEFAULT 'novo',
      assigned_to INT NULL,
      admin_notes TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_contact_status (status, created_at),
      CONSTRAINT fk_contact_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  const defaults = [
    ["faq", "Como participo de um campeonato?", null, "Crie sua conta, entre em uma equipe e acompanhe as inscricoes abertas.", 10],
    ["faq", "Como funcionam as estatisticas?", null, "Os dados oficiais sao registrados por mapa e consolidados por jogo, torneio e temporada.", 20],
    ["faq", "O pagamento por PIX e confirmado automaticamente?", null, "Sim. O gateway confirma o pagamento e atualiza a inscricao; o admin mantem o controle manual para excecoes.", 30]
  ];
  for (const [type, title, subtitle, body, sortOrder] of defaults) {
    await pool.query(`INSERT INTO public_content (type,title,subtitle,body,sort_order,published,published_at) SELECT ?,?,?,?,?,1,NOW() WHERE NOT EXISTS (SELECT 1 FROM public_content WHERE type=? AND title=?)`, [type, title, subtitle, body, sortOrder, type, title]);
  }
}

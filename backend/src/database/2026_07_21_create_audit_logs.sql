CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor_user_id` int(11) NOT NULL,
  `action` varchar(120) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_actor` (`actor_user_id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CertificaFacil - MySQL Schema
-- Execute: mysql -u root < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS certificafacil
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE certificafacil;

-- ── Planos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  slug       VARCHAR(50)    NOT NULL UNIQUE,
  name       VARCHAR(100)   NOT NULL,
  price      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  max_certs  INT            NOT NULL DEFAULT 0 COMMENT '0 = ilimitado',
  max_templates INT         NOT NULL DEFAULT 1,
  features   JSON           NULL,
  mp_plan_id VARCHAR(100)   NULL,
  is_active  TINYINT(1)     NOT NULL DEFAULT 1,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO plans (slug, name, price, max_certs, max_templates, features) VALUES
  ('trial',     'Trial (7 dias)',   0.00,    5,  2,  '{"batch": false, "custom_fonts": false}'),
  ('basic',     'Básico',          29.90,   25,  5,  '{"batch": true,  "custom_fonts": false}'),
  ('pro',       'Profissional',    59.90,   50, 20,  '{"batch": true,  "custom_fonts": true}'),
  ('unlimited', 'Ilimitado',       99.90,    0,  0,  '{"batch": true,  "custom_fonts": true}');

-- ── Usuários ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  uid           CHAR(36)       NOT NULL UNIQUE DEFAULT (UUID()),
  name          VARCHAR(150)   NOT NULL,
  email         VARCHAR(255)   NOT NULL UNIQUE,
  password_hash VARCHAR(255)   NOT NULL,
  role          ENUM('user','editor','admin','superadmin') NOT NULL DEFAULT 'user',
  plan_id       INT            NOT NULL DEFAULT 1,
  trial_ends_at DATETIME       NULL,
  avatar_url    VARCHAR(500)   NULL,
  is_active     TINYINT(1)     NOT NULL DEFAULT 1,
  last_login_at DATETIME       NULL,
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB;

-- Admin padrão: admin@certificafacil.com / admin123
INSERT IGNORE INTO users (uid, name, email, password_hash, role, plan_id) VALUES
  (UUID(), 'Administrador', 'admin@certificafacil.com',
   '$2y$12$uFrymMU4AqgsfuBhPw/3d.10dpE/q.3ugwXTa2y7k6zhZ592BIMMm',
   'superadmin', 4);

-- ── Sessões ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  token      CHAR(64)     NOT NULL UNIQUE,
  ip_address VARCHAR(45)  NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_token (token),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB;

-- ── Certificados gerados ────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  file_path    VARCHAR(500) NULL,
  config_json  JSON         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_certs_user (user_id)
) ENGINE=InnoDB;

-- ── Log de atividades ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NULL,
  action     VARCHAR(100) NOT NULL,
  details    JSON         NULL,
  ip_address VARCHAR(45)  NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_action (action)
) ENGINE=InnoDB;

-- ── Configurações do sistema ────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT         NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Assinaturas (Mercado Pago) ───────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  user_id               INT          NOT NULL,
  mp_subscription_id    VARCHAR(100) NOT NULL UNIQUE COMMENT 'preapproval ID no Mercado Pago',
  mp_plan_id            VARCHAR(100) NULL COMMENT 'preapproval_plan ID no Mercado Pago',
  status                VARCHAR(30)  NOT NULL DEFAULT 'pending' COMMENT 'pending|authorized|paused|cancelled',
  payer_email           VARCHAR(255) NULL,
  last_payment_at       DATETIME     NULL,
  last_payment_status   VARCHAR(30)  NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sub_user (user_id),
  INDEX idx_sub_status (status)
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('site_name', 'CertificaFacil'),
  ('allow_registration', '1'),
  ('default_plan', 'trial'),
  ('trial_days', '7'),
  ('maintenance_mode', '0');

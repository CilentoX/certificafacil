<?php
/**
 * CertificaFacil - Database Configuration
 */

return [
  'driver' => 'mysql',
  'host' => getenv('DB_HOST') ?: 'localhost',
  'port' => getenv('DB_PORT') ?: '3306',
  'database' => getenv('DB_NAME') ?: 'certificafacil',
  'username' => getenv('DB_USER') ?: 'root',
  'password' => getenv('DB_PASS') ?: '',
  'charset' => 'utf8mb4',
  'options' => [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ],

  // Session
  'session_lifetime' => 60 * 60 * 24 * 7,  // 7 days

  // Trial
  'trial_days' => 7,

  // App
  'app_name' => 'CertificaFacil',
  'app_url' => getenv('APP_URL') ?: 'http://localhost:8666',
];

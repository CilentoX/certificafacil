<?php
/**
 * CertificaFacil - Database Connection (PDO / MySQL)
 */

class Database
{
  private static ?PDO $instance = null;
  private static array $config = [];

  public static function getConfig(): array
  {
    if (empty(self::$config)) {
      self::$config = require dirname(__DIR__) . '/config/database.php';
    }
    return self::$config;
  }

  public static function connect(): PDO
  {
    if (self::$instance !== null) {
      return self::$instance;
    }

    $cfg = self::getConfig();
    $dsn = sprintf(
      '%s:host=%s;port=%s;dbname=%s;charset=%s',
      $cfg['driver'],
      $cfg['host'],
      $cfg['port'],
      $cfg['database'],
      $cfg['charset'] ?? 'utf8mb4'
    );

    try {
      self::$instance = new PDO($dsn, $cfg['username'], $cfg['password'], $cfg['options']);
      return self::$instance;
    } catch (PDOException $e) {
      error_log('[Database] Connection failed: ' . $e->getMessage());
      throw new RuntimeException('Database connection failed');
    }
  }

  public static function isAvailable(): bool
  {
    try {
      self::connect();
      return true;
    } catch (\Throwable $e) {
      return false;
    }
  }

  /* ── Query helpers ────────────────────────────────────────── */

  public static function query(string $sql, array $params = []): \PDOStatement
  {
    $stmt = self::connect()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
  }

  public static function fetchOne(string $sql, array $params = []): ?array
  {
    $row = self::query($sql, $params)->fetch();
    return $row ?: null;
  }

  public static function fetchAll(string $sql, array $params = []): array
  {
    return self::query($sql, $params)->fetchAll();
  }

  public static function insert(string $table, array $data): int
  {
    $cols = implode(', ', array_keys($data));
    $placeholders = implode(', ', array_map(fn($k) => ':' . $k, array_keys($data)));
    $sql = "INSERT INTO {$table} ({$cols}) VALUES ({$placeholders})";
    self::query($sql, $data);
    return (int) self::connect()->lastInsertId();
  }

  public static function update(string $table, array $data, string $where, array $whereParams = []): int
  {
    $sets = implode(', ', array_map(fn($k) => "$k = :$k", array_keys($data)));
    $sql = "UPDATE {$table} SET {$sets} WHERE {$where}";
    return self::query($sql, array_merge($data, $whereParams))->rowCount();
  }

  public static function delete(string $table, string $where, array $params = []): int
  {
    return self::query("DELETE FROM {$table} WHERE {$where}", $params)->rowCount();
  }

  public static function count(string $table, string $where = '1=1', array $params = []): int
  {
    return (int) self::query("SELECT COUNT(*) FROM {$table} WHERE {$where}", $params)->fetchColumn();
  }

  public static function lastInsertId(): string
  {
    return self::connect()->lastInsertId();
  }

  /* ── Transaction helpers ──────────────────────────────────── */

  public static function beginTransaction(): void
  {
    self::connect()->beginTransaction();
  }

  public static function commit(): void
  {
    self::connect()->commit();
  }

  public static function rollback(): void
  {
    self::connect()->rollBack();
  }
}

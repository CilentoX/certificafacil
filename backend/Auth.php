<?php
/**
 * CertificaFacil - Authentication System
 */

require_once __DIR__ . '/Database.php';

class Auth
{
  /* ── Registration ─────────────────────────────────────────── */

  public static function register(string $name, string $email, string $password): array
  {
    $email = strtolower(trim($email));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      return ['ok' => false, 'error' => 'E-mail inválido.'];
    }
    if (strlen($password) < 6) {
      return ['ok' => false, 'error' => 'Senha deve ter no mínimo 6 caracteres.'];
    }
    if (strlen(trim($name)) < 2) {
      return ['ok' => false, 'error' => 'Nome deve ter no mínimo 2 caracteres.'];
    }

    // Check registration allowed
    $allowReg = Database::fetchOne("SELECT setting_value FROM settings WHERE setting_key = 'allow_registration'");
    if ($allowReg && $allowReg['setting_value'] === '0') {
      return ['ok' => false, 'error' => 'Registro desabilitado no momento.'];
    }

    // Check duplicate
    $exists = Database::fetchOne("SELECT id FROM users WHERE email = :email", ['email' => $email]);
    if ($exists) {
      return ['ok' => false, 'error' => 'Este e-mail já está cadastrado.'];
    }

    $cfg = Database::getConfig();
    $trialDays = $cfg['trial_days'] ?? 7;

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $userId = Database::insert('users', [
      'name' => trim($name),
      'email' => $email,
      'password_hash' => $hash,
      'role' => 'user',
      'plan_id' => 1, // trial
      'trial_ends_at' => date('Y-m-d H:i:s', strtotime("+{$trialDays} days")),
    ]);

    Database::insert('activity_log', [
      'user_id' => $userId,
      'action' => 'register',
      'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
    ]);

    $session = self::createSession($userId);

    return [
      'ok' => true,
      'user' => self::getUserPublic($userId),
      'token' => $session['token'],
    ];
  }

  /* ── Login ────────────────────────────────────────────────── */

  public static function login(string $email, string $password): array
  {
    $email = strtolower(trim($email));

    $user = Database::fetchOne("SELECT * FROM users WHERE email = :email", ['email' => $email]);

    if (!$user || !password_verify($password, $user['password_hash'])) {
      return ['ok' => false, 'error' => 'E-mail ou senha incorretos.'];
    }

    if (!$user['is_active']) {
      return ['ok' => false, 'error' => 'Conta desativada. Contate o suporte.'];
    }

    Database::update('users', ['last_login_at' => date('Y-m-d H:i:s')], 'id = :id', ['id' => $user['id']]);

    Database::insert('activity_log', [
      'user_id' => $user['id'],
      'action' => 'login',
      'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
    ]);

    $session = self::createSession($user['id']);

    return [
      'ok' => true,
      'user' => self::getUserPublic($user['id']),
      'token' => $session['token'],
    ];
  }

  /* ── Logout ───────────────────────────────────────────────── */

  public static function logout(string $token): array
  {
    Database::delete('sessions', 'token = :token', ['token' => $token]);
    return ['ok' => true];
  }

  /* ── Session Validation ───────────────────────────────────── */

  public static function getSessionUser(string $token): ?array
  {
    $session = Database::fetchOne(
      "SELECT s.*, u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = :token AND s.expires_at > NOW() AND u.is_active = 1",
      ['token' => $token]
    );

    if (!$session) {
      return null;
    }

    return self::getUserPublic($session['user_id']);
  }

  public static function requireAuth(): array
  {
    $token = self::extractToken();
    if (!$token) {
      http_response_code(401);
      echo json_encode(['ok' => false, 'error' => 'Token não fornecido.']);
      exit;
    }

    $user = self::getSessionUser($token);
    if (!$user) {
      http_response_code(401);
      echo json_encode(['ok' => false, 'error' => 'Sessão inválida ou expirada.']);
      exit;
    }

    return $user;
  }

  public static function requireRole(string ...$roles): array
  {
    $user = self::requireAuth();
    if (!in_array($user['role'], $roles)) {
      http_response_code(403);
      echo json_encode(['ok' => false, 'error' => 'Sem permissão.']);
      exit;
    }
    return $user;
  }

  /* ── Helpers ──────────────────────────────────────────────── */

  private static function createSession(int $userId): array
  {
    $token = bin2hex(random_bytes(32));
    $cfg = Database::getConfig();
    $lifetime = $cfg['session_lifetime'] ?? 604800;

    Database::insert('sessions', [
      'user_id' => $userId,
      'token' => $token,
      'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
      'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
      'expires_at' => date('Y-m-d H:i:s', time() + $lifetime),
    ]);

    return ['token' => $token];
  }

  public static function extractToken(): ?string
  {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
      return $m[1];
    }
    return $_GET['token'] ?? null;
  }

  private static function getUserPublic(int $id): ?array
  {
    $user = Database::fetchOne(
      "SELECT u.id, u.uid, u.name, u.email, u.role, u.plan_id, u.trial_ends_at,
              u.avatar_url, u.is_active, u.last_login_at, u.created_at,
              p.slug as plan_slug, p.name as plan_name
       FROM users u
       LEFT JOIN plans p ON p.id = u.plan_id
       WHERE u.id = :id",
      ['id' => $id]
    );

    if (!$user)
      return null;

    // Check trial status
    $user['trial_active'] = false;
    if ($user['plan_slug'] === 'trial' && $user['trial_ends_at']) {
      $user['trial_active'] = strtotime($user['trial_ends_at']) > time();
      $user['trial_days_left'] = max(0, (int) ceil((strtotime($user['trial_ends_at']) - time()) / 86400));
    }

    unset($user['password_hash']);
    return $user;
  }

  /* ── Password Change ──────────────────────────────────────── */

  public static function changePassword(int $userId, string $currentPassword, string $newPassword): array
  {
    if (strlen($newPassword) < 6) {
      return ['ok' => false, 'error' => 'Nova senha deve ter no mínimo 6 caracteres.'];
    }

    $user = Database::fetchOne("SELECT password_hash FROM users WHERE id = :id", ['id' => $userId]);
    if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
      return ['ok' => false, 'error' => 'Senha atual incorreta.'];
    }

    Database::update('users', [
      'password_hash' => password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]),
    ], 'id = :id', ['id' => $userId]);

    return ['ok' => true];
  }

  /* ── Admin: User Management ───────────────────────────────── */

  public static function listUsers(int $page = 1, int $perPage = 20, ?string $search = null): array
  {
    $offset = ($page - 1) * $perPage;
    $where = '1=1';
    $params = [];

    if ($search) {
      $where = "(u.name LIKE :search OR u.email LIKE :search2)";
      $params['search'] = "%{$search}%";
      $params['search2'] = "%{$search}%";
    }

    $total = (int) Database::query(
      "SELECT COUNT(*) FROM users u WHERE {$where}",
      $params
    )->fetchColumn();

    $users = Database::fetchAll(
      "SELECT u.id, u.uid, u.name, u.email, u.role, u.is_active,
              u.last_login_at, u.created_at, p.name as plan_name
       FROM users u LEFT JOIN plans p ON p.id = u.plan_id
       WHERE {$where}
       ORDER BY u.created_at DESC
       LIMIT {$perPage} OFFSET {$offset}",
      $params
    );

    return [
      'users' => $users,
      'total' => $total,
      'page' => $page,
      'pages' => (int) ceil($total / $perPage),
    ];
  }

  public static function toggleUser(int $userId, bool $active): bool
  {
    return Database::update('users', ['is_active' => $active ? 1 : 0], 'id = :id', ['id' => $userId]) > 0;
  }

  public static function setRole(int $userId, string $role): bool
  {
    $valid = ['user', 'editor', 'admin', 'superadmin'];
    if (!in_array($role, $valid))
      return false;
    return Database::update('users', ['role' => $role], 'id = :id', ['id' => $userId]) > 0;
  }

  public static function deleteUser(int $userId): bool
  {
    return Database::delete('users', 'id = :id', ['id' => $userId]) > 0;
  }

  /* ── Admin: Stats ─────────────────────────────────────────── */

  public static function getStats(): array
  {
    $totalUsers = Database::count('users');
    $activeUsers = Database::count('users', 'is_active = 1');
    $totalCerts = Database::count('certificates');
    $todayLogins = Database::count('activity_log', "action = 'login' AND created_at >= CURDATE()");

    $recentActivity = Database::fetchAll(
      "SELECT a.action, a.created_at, a.ip_address, u.name, u.email
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 50"
    );

    $usersByPlan = Database::fetchAll(
      "SELECT p.name as plan_name, COUNT(u.id) as count
       FROM plans p LEFT JOIN users u ON u.plan_id = p.id
       GROUP BY p.id, p.name"
    );

    return [
      'total_users' => $totalUsers,
      'active_users' => $activeUsers,
      'total_certificates' => $totalCerts,
      'today_logins' => $todayLogins,
      'recent_activity' => $recentActivity,
      'users_by_plan' => $usersByPlan,
    ];
  }

  /* ── Admin: Settings ──────────────────────────────────────── */

  public static function getSettings(): array
  {
    return Database::fetchAll("SELECT setting_key, setting_value FROM settings");
  }

  public static function updateSetting(string $key, string $value): bool
  {
    $existing = Database::fetchOne("SELECT setting_key FROM settings WHERE setting_key = :k", ['k' => $key]);
    if ($existing) {
      return Database::update('settings', ['setting_value' => $value], "setting_key = :k", ['k' => $key]) >= 0;
    }
    Database::insert('settings', ['setting_key' => $key, 'setting_value' => $value]);
    return true;
  }

  /* ── Cleanup ──────────────────────────────────────────────── */

  public static function cleanExpiredSessions(): int
  {
    return Database::delete('sessions', 'expires_at < NOW()', []);
  }
}

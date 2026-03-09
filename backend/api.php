<?php
/**
 * CertificaFacil - API Handler (PHP)
 *
 * Handles all /api/* routes. Called from router.php.
 * Replaces the Python FastAPI backend (main.py).
 */

require_once __DIR__ . '/CertificateEngine.php';

// Conditionally load auth (only if DB available)
$authAvailable = false;
if (file_exists(__DIR__ . '/Auth.php') && file_exists(__DIR__ . '/Database.php')) {
  require_once __DIR__ . '/Database.php';
  require_once __DIR__ . '/Auth.php';
  $authAvailable = Database::isAvailable();
}

// Load Mercado Pago integration
if (file_exists(__DIR__ . '/MercadoPago.php')) {
  require_once __DIR__ . '/MercadoPago.php';
}

// ── CORS Headers ───────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

// ── Path Setup ─────────────────────────────────────────────────
$ROOT_PATH = dirname(__DIR__);
$UPLOAD_DIR = $ROOT_PATH . '/uploads';
$TEMPLATES_DIR = $ROOT_PATH . '/assets/templates';
$FONTS_DIR = $ROOT_PATH . '/assets/fonts';
$IMAGES_DIR = $ROOT_PATH . '/assets/images';
$CONFIGS_DIR = $ROOT_PATH . '/assets/configs';

// Ensure directories exist
foreach ([$UPLOAD_DIR, $TEMPLATES_DIR, $FONTS_DIR, $IMAGES_DIR, $CONFIGS_DIR] as $dir) {
  if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
  }
}

// ── Helpers ────────────────────────────────────────────────────
function jsonResponse(array $data, int $code = 200): never
{
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function getJsonBody(): ?array
{
  $raw = file_get_contents('php://input');
  if (!$raw)
    return null;
  return json_decode($raw, true);
}

function generateId(int $length = 8): string
{
  return substr(bin2hex(random_bytes($length)), 0, $length);
}

function sanitizeFilename(string $name): string
{
  // Separate name and extension
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  $base = pathinfo($name, PATHINFO_FILENAME);

  // Transliterate accented characters to ASCII
  if (function_exists('transliterator_transliterate')) {
    $base = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $base);
  } else {
    $base = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $base);
    $base = strtolower($base);
  }

  // Replace spaces and special chars with hyphens
  $base = preg_replace('/[^a-z0-9._-]/', '-', $base);
  // Collapse multiple hyphens
  $base = preg_replace('/-{2,}/', '-', $base);
  // Trim hyphens from edges
  $base = trim($base, '-.');

  // Fallback if name is empty
  if ($base === '') {
    $base = 'file-' . generateId(6);
  }

  return $ext ? "$base.$ext" : $base;
}

// ── Routing ────────────────────────────────────────────────────
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Match routes
switch (true) {
  // ── Templates ──
  case $uri === '/api/templates' && $method === 'GET':
    handleListTemplates();
    break;

  case $uri === '/api/upload-template' && $method === 'POST':
    handleUploadTemplate();
    break;

  // ── Fonts ──
  case $uri === '/api/fonts' && $method === 'GET':
    handleListFonts();
    break;

  case $uri === '/api/upload-font' && $method === 'POST':
    handleUploadFont();
    break;

  // ── Images ──
  case $uri === '/api/images' && $method === 'GET':
    handleListImages();
    break;

  case $uri === '/api/upload-image' && $method === 'POST':
    handleUploadImage();
    break;

  case preg_match('#^/api/delete-image/(.+)$#', $uri, $matches) === 1 && $method === 'DELETE':
    handleDeleteImage(urldecode($matches[1]));
    break;

  // ── Config ──
  case $uri === '/api/save-config' && $method === 'POST':
    handleSaveConfig();
    break;

  case $uri === '/api/load-config' && $method === 'GET':
    handleLoadConfig();
    break;

  // ── Generate ──
  case $uri === '/api/generate' && $method === 'POST':
    handleGenerate();
    break;

  case $uri === '/api/generate-batch' && $method === 'POST':
    handleGenerateBatch();
    break;

  // ── Download ──
  case preg_match('#^/api/download/(.+)$#', $uri, $matches) === 1 && $method === 'GET':
    handleDownload($matches[1]);
    break;

  // ── Auth ──
  case $uri === '/api/auth/login' && $method === 'POST':
    handleAuthLogin();
    break;

  case $uri === '/api/auth/register' && $method === 'POST':
    handleAuthRegister();
    break;

  case $uri === '/api/auth/logout' && $method === 'POST':
    handleAuthLogout();
    break;

  case $uri === '/api/auth/me' && $method === 'GET':
    handleAuthMe();
    break;

  case $uri === '/api/auth/profile' && $method === 'PUT':
    handleUpdateProfile();
    break;

  case $uri === '/api/auth/password' && $method === 'PUT':
    handleChangePassword();
    break;

  case $uri === '/api/auth/sessions' && $method === 'GET':
    handleListSessions();
    break;

  case $uri === '/api/auth/sessions' && $method === 'DELETE':
    handleRevokeOtherSessions();
    break;

  // ── Admin ──
  case $uri === '/api/admin/stats' && $method === 'GET':
    handleAdminStats();
    break;

  case $uri === '/api/admin/users' && $method === 'GET':
    handleAdminUsers();
    break;

  case preg_match('#^/api/admin/users/(\d+)/toggle$#', $uri, $matches) === 1 && $method === 'POST':
    handleAdminToggleUser((int) $matches[1]);
    break;

  case preg_match('#^/api/admin/users/(\d+)/role$#', $uri, $matches) === 1 && $method === 'POST':
    handleAdminSetRole((int) $matches[1]);
    break;

  case preg_match('#^/api/admin/users/(\d+)$#', $uri, $matches) === 1 && $method === 'DELETE':
    handleAdminDeleteUser((int) $matches[1]);
    break;

  case $uri === '/api/admin/settings' && $method === 'GET':
    handleAdminGetSettings();
    break;

  case $uri === '/api/admin/settings' && $method === 'POST':
    handleAdminSaveSettings();
    break;

  // ── Mercado Pago ──
  case $uri === '/api/mp/public-key' && $method === 'GET':
    handleMPPublicKey();
    break;

  case $uri === '/api/mp/plans' && $method === 'GET':
    handleMPGetPlans();
    break;

  case $uri === '/api/mp/subscribe' && $method === 'POST':
    handleMPSubscribe();
    break;

  case $uri === '/api/mp/subscription' && $method === 'GET':
    handleMPGetSubscription();
    break;

  case $uri === '/api/mp/subscription/cancel' && $method === 'POST':
    handleMPCancelSubscription();
    break;

  case $uri === '/api/mp/subscription/pause' && $method === 'POST':
    handleMPPauseSubscription();
    break;

  case $uri === '/api/mp/subscription/reactivate' && $method === 'POST':
    handleMPReactivateSubscription();
    break;

  case $uri === '/api/mp/sync-plans' && $method === 'POST':
    handleMPSyncPlans();
    break;

  // ── Webhooks ──
  case $uri === '/api/webhooks/mercadopago' && $method === 'POST':
    handleMPWebhook();
    break;

  default:
    jsonResponse(['error' => 'Route not found'], 404);
}

/* ================================================================
   ROUTE HANDLERS
   ================================================================ */

// ── Templates ──────────────────────────────────────────────────

function handleListTemplates(): void
{
  global $TEMPLATES_DIR;
  $files = [];
  foreach (glob($TEMPLATES_DIR . '/*.pdf') as $f) {
    $files[] = basename($f);
  }
  sort($files);
  jsonResponse(['templates' => $files]);
}

function handleUploadTemplate(): void
{
  global $TEMPLATES_DIR;

  if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['error' => 'No file provided'], 400);
  }

  $file = $_FILES['file'];
  $filename = sanitizeFilename(basename($file['name']));

  // Avoid overwriting: append id if file exists
  $dest = $TEMPLATES_DIR . '/' . $filename;
  if (file_exists($dest)) {
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    $base = pathinfo($filename, PATHINFO_FILENAME);
    $filename = $base . '-' . generateId(4) . '.' . $ext;
    $dest = $TEMPLATES_DIR . '/' . $filename;
  }

  if (!move_uploaded_file($file['tmp_name'], $dest)) {
    jsonResponse(['error' => 'Failed to save template'], 500);
  }

  jsonResponse(['filename' => $filename]);
}

// ── Fonts ──────────────────────────────────────────────────────

function handleListFonts(): void
{
  global $FONTS_DIR;
  $fonts = [];

  if (is_dir($FONTS_DIR)) {
    foreach (new DirectoryIterator($FONTS_DIR) as $f) {
      if ($f->isDot() || !$f->isFile())
        continue;
      $ext = strtolower($f->getExtension());
      if (in_array($ext, ['ttf', 'otf'])) {
        $fonts[] = [
          'name' => $f->getFilename(),
          'path' => 'assets/fonts/' . $f->getFilename(),
        ];
      }
    }
  }

  usort($fonts, fn($a, $b) => strcmp($a['name'], $b['name']));
  jsonResponse(['fonts' => $fonts]);
}

function handleUploadFont(): void
{
  global $FONTS_DIR;

  if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['error' => 'No file provided'], 400);
  }

  $file = $_FILES['file'];
  $filename = sanitizeFilename(basename($file['name']));

  $dest = $FONTS_DIR . '/' . $filename;
  if (file_exists($dest)) {
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    $base = pathinfo($filename, PATHINFO_FILENAME);
    $filename = $base . '-' . generateId(4) . '.' . $ext;
    $dest = $FONTS_DIR . '/' . $filename;
  }

  if (!move_uploaded_file($file['tmp_name'], $dest)) {
    jsonResponse(['error' => 'Failed to save font'], 500);
  }

  jsonResponse([
    'filename' => $filename,
    'path' => 'assets/fonts/' . $filename,
  ]);
}

// ── Images ─────────────────────────────────────────────────────

function handleListImages(): void
{
  global $IMAGES_DIR;
  $images = [];

  if (is_dir($IMAGES_DIR)) {
    foreach (new DirectoryIterator($IMAGES_DIR) as $f) {
      if ($f->isDot() || !$f->isFile())
        continue;
      $ext = strtolower($f->getExtension());
      if (in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'])) {
        $images[] = [
          'name' => $f->getFilename(),
          'path' => 'assets/images/' . $f->getFilename(),
        ];
      }
    }
  }

  usort($images, fn($a, $b) => strcmp($a['name'], $b['name']));
  jsonResponse(['images' => $images]);
}

function handleUploadImage(): void
{
  global $IMAGES_DIR;

  if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['error' => 'No file provided'], 400);
  }

  $file = $_FILES['file'];
  $filename = sanitizeFilename(basename($file['name']));

  $dest = $IMAGES_DIR . '/' . $filename;
  if (file_exists($dest)) {
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    $base = pathinfo($filename, PATHINFO_FILENAME);
    $filename = $base . '-' . generateId(4) . '.' . $ext;
    $dest = $IMAGES_DIR . '/' . $filename;
  }

  if (!move_uploaded_file($file['tmp_name'], $dest)) {
    jsonResponse(['error' => 'Failed to save image'], 500);
  }

  jsonResponse([
    'filename' => $filename,
    'path' => 'assets/images/' . $filename,
  ]);
}

function handleDeleteImage(string $filename): void
{
  global $IMAGES_DIR;

  $filename = basename($filename);
  $filepath = $IMAGES_DIR . '/' . $filename;

  if (!file_exists($filepath)) {
    jsonResponse(['error' => 'Image not found'], 404);
  }

  if (!unlink($filepath)) {
    jsonResponse(['error' => 'Failed to delete image'], 500);
  }

  jsonResponse(['success' => true, 'deleted' => $filename]);
}

// ── Config ─────────────────────────────────────────────────────

function handleSaveConfig(): void
{
  global $CONFIGS_DIR;

  $body = getJsonBody();
  $templateName = $body['template_name'] ?? null;
  $config = $body['config'] ?? null;

  if (!$templateName || $config === null) {
    jsonResponse(['error' => 'template_name and config required'], 400);
  }

  $dest = $CONFIGS_DIR . '/' . $templateName . '.json';

  try {
    file_put_contents($dest, json_encode($config, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    jsonResponse(['ok' => true]);
  } catch (\Throwable $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
  }
}

function handleLoadConfig(): void
{
  global $CONFIGS_DIR;

  $templateName = $_GET['template_name'] ?? '';
  if (!$templateName) {
    jsonResponse(['found' => false]);
  }

  $path = $CONFIGS_DIR . '/' . $templateName . '.json';
  if (!file_exists($path)) {
    jsonResponse(['found' => false]);
  }

  try {
    $config = json_decode(file_get_contents($path), true);
    jsonResponse(['found' => true, 'config' => $config]);
  } catch (\Throwable $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
  }
}

// ── Generate Preview ───────────────────────────────────────────

function handleGenerate(): void
{
  global $TEMPLATES_DIR;

  $body = getJsonBody();
  if (!$body) {
    jsonResponse(['error' => 'Invalid JSON body'], 400);
  }

  $templateName = $body['template_name'] ?? '';
  $name = $body['name'] ?? 'Nome';
  $course = $body['course'] ?? '';
  $variables = $body['variables'] ?? [];
  $config = $body['config'] ?? [];

  /* Normalize variable aliases: map common keys to builtin ones */
  $aliases = [
    'aluno' => 'nome',
    'name' => 'nome',
    'student' => 'nome',
    'estudante' => 'nome',
    'participante' => 'nome',
    'nome_completo' => 'nome',
    'nome_aluno' => 'nome',
    'course' => 'curso',
    'materia' => 'curso',
    'disciplina' => 'curso',
  ];
  foreach ($aliases as $from => $to) {
    if (isset($variables[$from]) && !isset($variables[$to])) {
      $variables[$to] = $variables[$from];
    }
  }

  /* Ensure backwards compat: if variables not sent, build from name/course */
  if (empty($variables)) {
    $variables = ['nome' => $name, 'curso' => $course];
  }
  /* Also ensure nome/curso are set from name/course params if missing */
  if (empty($variables['nome']) && $name !== 'Nome') {
    $variables['nome'] = $name;
  }
  if (empty($variables['curso']) && $course) {
    $variables['curso'] = $course;
  }

  if (!$templateName) {
    jsonResponse(['error' => 'Selecione um template'], 400);
  }

  $templatePath = $TEMPLATES_DIR . '/' . $templateName;
  if (!file_exists($templatePath)) {
    jsonResponse(['error' => 'Template not found'], 404);
  }

  // Process text fields: replace {variable} placeholders dynamically
  $textFields = $config['text_fields'] ?? [];
  $processedFields = [];

  foreach ($textFields as $field) {
    $content = $field['content'] ?? '';
    if (is_string($content)) {
      // Replace all {variable} patterns with their values
      foreach ($variables as $key => $val) {
        $content = preg_replace('/\{' . preg_quote($key, '/') . '\}/i', (string) $val, $content);
      }
      // Backwards compat: also replace {nome}, {curso}, {course} from $name/$course
      $content = preg_replace('/\{nome\}/i', $name, $content);
      $content = preg_replace('/\{curso\}/i', $course, $content);
      $content = preg_replace('/\{course\}/i', $course, $content);
    }
    $field['content'] = $content;
    $processedFields[] = $field;
  }
  $config['text_fields'] = $processedFields;

  try {
    $engine = new CertificateEngine();

    // Get page dimensions
    $dims = $engine->getPageDimensions($templatePath);

    // Generate certificate to temp file
    $tmpPdf = tempnam(sys_get_temp_dir(), 'cert_preview_') . '.pdf';
    $engine->createCertificate($templatePath, $tmpPdf, $name, $config);

    // Read PDF content
    $pdfContent = file_get_contents($tmpPdf);
    @unlink($tmpPdf);

    jsonResponse([
      'pdf' => base64_encode($pdfContent),
      'width' => $dims['width'],
      'height' => $dims['height'],
    ]);
  } catch (\Throwable $e) {
    error_log("Generate error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    jsonResponse(['error' => $e->getMessage()], 500);
  }
}

// ── Generate Batch ─────────────────────────────────────────────

function handleGenerateBatch(): void
{
  global $TEMPLATES_DIR, $UPLOAD_DIR;

  $body = getJsonBody();
  if (!$body) {
    jsonResponse(['error' => 'Invalid JSON body'], 400);
  }

  $items = $body['items'] ?? [];
  $templateName = $body['template_name'] ?? '';
  $config = $body['config'] ?? [];

  if (!$templateName) {
    jsonResponse(['error' => 'Selecione um template'], 400);
  }

  if (empty($items)) {
    jsonResponse(['error' => 'Nenhum aluno informado'], 400);
  }

  $templatePath = $TEMPLATES_DIR . '/' . $templateName;
  if (!file_exists($templatePath)) {
    jsonResponse(['error' => 'Template not found'], 404);
  }

  $engine = new CertificateEngine();
  $sessionId = generateId();

  // Build items array with processed configs for each student
  $batchItems = [];
  foreach ($items as $item) {
    /* Normalize variable aliases for this student */
    $itemAliases = [
      'aluno' => 'nome',
      'name' => 'nome',
      'student' => 'nome',
      'estudante' => 'nome',
      'participante' => 'nome',
      'nome_completo' => 'nome',
      'nome_aluno' => 'nome',
      'course' => 'curso',
      'materia' => 'curso',
      'disciplina' => 'curso',
    ];
    foreach ($itemAliases as $from => $to) {
      if (isset($item[$from]) && !isset($item[$to])) {
        $item[$to] = $item[$from];
      }
    }

    $name = $item['nome'] ?? $item['name'] ?? 'Sem Nome';
    $course = $item['curso'] ?? $item['course'] ?? '';

    // Clone config and process text fields for this student
    $studentConfig = $config;
    $studentFields = [];

    foreach ($config['text_fields'] ?? [] as $field) {
      $fCopy = $field;
      $content = $field['content'] ?? '';
      if (is_string($content)) {
        // Replace all dynamic {variable} patterns from the item data
        foreach ($item as $key => $val) {
          $content = preg_replace('/\{' . preg_quote($key, '/') . '\}/i', (string) $val, $content);
        }
        // Backwards compat: also replace {nome}, {curso}, {course}
        $content = preg_replace('/\{nome\}/i', $name, $content);
        $content = preg_replace('/\{curso\}/i', $course, $content);
        $content = preg_replace('/\{course\}/i', $course, $content);
      }
      $fCopy['content'] = $content;
      $studentFields[] = $fCopy;
    }
    $studentConfig['text_fields'] = $studentFields;

    $batchItems[] = [
      'name' => $name,
      'config' => $studentConfig,
    ];
  }

  // Generate all pages in a single PDF document (no re-import needed)
  $finalPdfName = "lote_{$sessionId}.pdf";
  $finalPdfPath = $UPLOAD_DIR . '/' . $finalPdfName;

  try {
    $engine->createBatchCertificate($templatePath, $finalPdfPath, $batchItems);
  } catch (\Throwable $e) {
    error_log("Batch generation error: " . $e->getMessage());
    jsonResponse(['error' => 'Erro ao gerar lote: ' . $e->getMessage()], 500);
  }

  if (file_exists($finalPdfPath) && filesize($finalPdfPath) > 0) {
    jsonResponse(['url' => '/api/download/' . $finalPdfName]);
  }

  jsonResponse(['error' => 'Erro ao gerar lote'], 500);
}

// ── Download ───────────────────────────────────────────────────

function handleDownload(string $filename): void
{
  global $UPLOAD_DIR;

  // Sanitize filename to prevent directory traversal
  $filename = basename($filename);
  $path = $UPLOAD_DIR . '/' . $filename;

  if (!file_exists($path)) {
    jsonResponse(['error' => 'File not found'], 404);
  }

  header('Content-Type: application/pdf');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . filesize($path));
  readfile($path);
  exit;
}

// ── Utility ────────────────────────────────────────────────────

function removeDir(string $dir): void
{
  if (!is_dir($dir))
    return;

  $items = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST
  );

  foreach ($items as $item) {
    if ($item->isDir()) {
      rmdir($item->getPathname());
    } else {
      unlink($item->getPathname());
    }
  }

  rmdir($dir);
}

/* ================================================================
   AUTH HANDLERS
   ================================================================ */

function requireAuthAvailable(): void
{
  global $authAvailable;
  if (!$authAvailable) {
    jsonResponse(['ok' => false, 'error' => 'Banco de dados não disponível. O sistema funciona sem auth.'], 503);
  }
}

function handleAuthLogin(): void
{
  requireAuthAvailable();
  $body = getJsonBody();
  if (!$body || empty($body['email']) || empty($body['password'])) {
    jsonResponse(['ok' => false, 'error' => 'E-mail e senha são obrigatórios.'], 400);
  }
  $result = Auth::login($body['email'], $body['password']);
  jsonResponse($result, $result['ok'] ? 200 : 401);
}

function handleAuthRegister(): void
{
  requireAuthAvailable();
  $body = getJsonBody();
  if (!$body || empty($body['name']) || empty($body['email']) || empty($body['password'])) {
    jsonResponse(['ok' => false, 'error' => 'Nome, e-mail e senha são obrigatórios.'], 400);
  }
  $result = Auth::register($body['name'], $body['email'], $body['password']);
  jsonResponse($result, $result['ok'] ? 201 : 400);
}

function handleAuthLogout(): void
{
  requireAuthAvailable();
  $token = Auth::extractToken();
  if ($token) {
    Auth::logout($token);
  }
  jsonResponse(['ok' => true]);
}

function handleAuthMe(): void
{
  requireAuthAvailable();
  $user = Auth::requireAuth();
  jsonResponse(['ok' => true, 'user' => $user]);
}

function handleUpdateProfile(): void
{
  requireAuthAvailable();
  $user = Auth::requireAuth();
  $body = getJsonBody();
  if (!$body) {
    jsonResponse(['ok' => false, 'error' => 'Dados inválidos.'], 400);
  }

  $updates = [];
  if (isset($body['name']) && strlen(trim($body['name'])) >= 2) {
    $updates['name'] = trim($body['name']);
  }
  if (isset($body['email'])) {
    $email = strtolower(trim($body['email']));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      jsonResponse(['ok' => false, 'error' => 'E-mail inválido.'], 400);
    }
    // Check if email is taken by another user
    $existing = Database::fetchOne("SELECT id FROM users WHERE email = :email AND id != :uid", ['email' => $email, 'uid' => $user['id']]);
    if ($existing) {
      jsonResponse(['ok' => false, 'error' => 'Este e-mail já está em uso.'], 400);
    }
    $updates['email'] = $email;
  }

  if (empty($updates)) {
    jsonResponse(['ok' => false, 'error' => 'Nenhum dado para atualizar.'], 400);
  }

  Database::update('users', $updates, 'id = :id', ['id' => $user['id']]);
  Database::insert('activity_log', [
    'user_id' => $user['id'],
    'action' => 'profile_update',
    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
  ]);

  // Return fresh user data
  $freshUser = Auth::getSessionUser(Auth::extractToken());
  jsonResponse(['ok' => true, 'user' => $freshUser]);
}

function handleChangePassword(): void
{
  requireAuthAvailable();
  $user = Auth::requireAuth();
  $body = getJsonBody();
  if (!$body || empty($body['current_password']) || empty($body['new_password'])) {
    jsonResponse(['ok' => false, 'error' => 'Senha atual e nova senha são obrigatórios.'], 400);
  }

  $result = Auth::changePassword($user['id'], $body['current_password'], $body['new_password']);
  jsonResponse($result, $result['ok'] ? 200 : 400);
}

function handleListSessions(): void
{
  requireAuthAvailable();
  $user = Auth::requireAuth();
  $currentToken = Auth::extractToken();

  $sessions = Database::fetchAll(
    "SELECT id, ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = :uid AND expires_at > NOW() ORDER BY created_at DESC",
    ['uid' => $user['id']]
  );

  // Mark current session
  foreach ($sessions as &$s) {
    $s['is_current'] = false;
  }

  jsonResponse(['ok' => true, 'sessions' => $sessions]);
}

function handleRevokeOtherSessions(): void
{
  requireAuthAvailable();
  $user = Auth::requireAuth();
  $currentToken = Auth::extractToken();

  Database::query(
    "DELETE FROM sessions WHERE user_id = :uid AND token != :token",
    ['uid' => $user['id'], 'token' => $currentToken]
  );

  jsonResponse(['ok' => true]);
}

/* ================================================================
   ADMIN HANDLERS
   ================================================================ */

function requireAdmin(): array
{
  requireAuthAvailable();
  return Auth::requireRole('admin', 'superadmin');
}

function handleAdminStats(): void
{
  requireAdmin();
  $stats = Auth::getStats();
  jsonResponse($stats);
}

function handleAdminUsers(): void
{
  requireAdmin();
  $page = (int) ($_GET['page'] ?? 1);
  $search = $_GET['search'] ?? null;
  $result = Auth::listUsers($page, 20, $search);
  jsonResponse($result);
}

function handleAdminToggleUser(int $userId): void
{
  requireAdmin();
  $body = getJsonBody();
  $active = (bool) ($body['is_active'] ?? false);
  Auth::toggleUser($userId, $active);
  jsonResponse(['ok' => true]);
}

function handleAdminSetRole(int $userId): void
{
  requireAdmin();
  $body = getJsonBody();
  $role = $body['role'] ?? '';
  if (!Auth::setRole($userId, $role)) {
    jsonResponse(['ok' => false, 'error' => 'Papel inválido.'], 400);
  }
  jsonResponse(['ok' => true]);
}

function handleAdminDeleteUser(int $userId): void
{
  $admin = requireAdmin();
  if ($userId === $admin['id']) {
    jsonResponse(['ok' => false, 'error' => 'Não é possível excluir a si mesmo.'], 400);
  }
  Auth::deleteUser($userId);
  jsonResponse(['ok' => true]);
}

function handleAdminGetSettings(): void
{
  requireAdmin();
  $settings = Auth::getSettings();
  jsonResponse(['ok' => true, 'settings' => $settings]);
}

function handleAdminSaveSettings(): void
{
  requireAdmin();
  $body = getJsonBody();
  if (!$body) {
    jsonResponse(['ok' => false, 'error' => 'Dados inválidos.'], 400);
  }
  foreach ($body as $key => $value) {
    Auth::updateSetting($key, (string) $value);
  }
  jsonResponse(['ok' => true]);
}

// ── Mercado Pago ───────────────────────────────────────────────

function handleMPPublicKey(): void
{
  $config = MercadoPago::getConfig();
  jsonResponse([
    'ok' => true,
    'public_key' => $config['public_key'],
    'is_sandbox' => $config['is_sandbox'],
  ]);
}

function handleMPGetPlans(): void
{
  $plans = MercadoPago::getPlansWithMP();
  jsonResponse(['ok' => true, 'plans' => $plans]);
}

function handleMPSubscribe(): void
{
  if (!$GLOBALS['authAvailable']) {
    jsonResponse(['ok' => false, 'error' => 'Auth indisponível.'], 503);
  }
  $user = Auth::requireAuth();
  $body = getJsonBody();

  $planSlug = $body['plan'] ?? '';
  if (!$planSlug) {
    jsonResponse(['ok' => false, 'error' => 'Plano não informado.'], 400);
  }

  // Get local plan
  $plan = Database::fetchOne(
    "SELECT * FROM plans WHERE slug = :slug AND is_active = 1",
    ['slug' => $planSlug]
  );

  if (!$plan) {
    jsonResponse(['ok' => false, 'error' => 'Plano não encontrado.'], 404);
  }

  if (!$plan['mp_plan_id']) {
    jsonResponse(['ok' => false, 'error' => 'Plano ainda não configurado no Mercado Pago. Execute sync-plans primeiro.'], 400);
  }

  // Check if user already has active subscription
  $existing = MercadoPago::getUserSubscription($user['id']);
  if ($existing && in_array($existing['status'], ['authorized', 'pending'])) {
    jsonResponse(['ok' => false, 'error' => 'Você já possui uma assinatura ativa. Cancele primeiro para trocar de plano.'], 400);
  }

  // Create subscription (pass plan data for the redirect checkout approach)
  $result = MercadoPago::createSubscription($plan['mp_plan_id'], $user['email'], $user['uid'], $plan);

  if ($result['ok'] && isset($result['init_point'])) {
    jsonResponse([
      'ok' => true,
      'init_point' => $result['init_point'],
      'sandbox_init_point' => $result['sandbox_init_point'] ?? $result['init_point'],
      'subscription_id' => $result['id'],
    ]);
  } else {
    jsonResponse([
      'ok' => false,
      'error' => $result['message'] ?? 'Erro ao criar assinatura no Mercado Pago.',
    ], 500);
  }
}

function handleMPGetSubscription(): void
{
  if (!$GLOBALS['authAvailable']) {
    jsonResponse(['ok' => false, 'error' => 'Auth indisponível.'], 503);
  }
  $user = Auth::requireAuth();

  $sub = MercadoPago::getUserSubscription($user['id']);

  if (!$sub) {
    jsonResponse(['ok' => true, 'subscription' => null]);
  }

  // Fetch fresh status from MP
  if ($sub['mp_subscription_id']) {
    $mpSub = MercadoPago::getSubscription($sub['mp_subscription_id']);
    if ($mpSub['ok']) {
      $sub['status'] = $mpSub['status'] ?? $sub['status'];
      $sub['next_payment_date'] = $mpSub['next_payment_date'] ?? null;
      // Update local record
      Database::update('subscriptions', [
        'status' => $sub['status'],
      ], 'id = :id', ['id' => $sub['id']]);
    }
  }

  jsonResponse(['ok' => true, 'subscription' => $sub]);
}

function handleMPCancelSubscription(): void
{
  if (!$GLOBALS['authAvailable']) {
    jsonResponse(['ok' => false, 'error' => 'Auth indisponível.'], 503);
  }
  $user = Auth::requireAuth();

  $sub = MercadoPago::getUserSubscription($user['id']);
  if (!$sub || !$sub['mp_subscription_id']) {
    jsonResponse(['ok' => false, 'error' => 'Nenhuma assinatura encontrada.'], 404);
  }

  $result = MercadoPago::cancelSubscription($sub['mp_subscription_id']);

  if ($result['ok']) {
    Database::update('subscriptions', ['status' => 'cancelled'], 'id = :id', ['id' => $sub['id']]);
    // Downgrade to trial
    $trialPlan = Database::fetchOne("SELECT id FROM plans WHERE slug = 'trial'");
    if ($trialPlan) {
      Database::update('users', ['plan_id' => $trialPlan['id']], 'id = :id', ['id' => $user['id']]);
    }
    jsonResponse(['ok' => true, 'message' => 'Assinatura cancelada.']);
  } else {
    jsonResponse(['ok' => false, 'error' => 'Erro ao cancelar no Mercado Pago.'], 500);
  }
}

function handleMPPauseSubscription(): void
{
  if (!$GLOBALS['authAvailable']) {
    jsonResponse(['ok' => false, 'error' => 'Auth indisponível.'], 503);
  }
  $user = Auth::requireAuth();

  $sub = MercadoPago::getUserSubscription($user['id']);
  if (!$sub || !$sub['mp_subscription_id']) {
    jsonResponse(['ok' => false, 'error' => 'Nenhuma assinatura encontrada.'], 404);
  }

  $result = MercadoPago::pauseSubscription($sub['mp_subscription_id']);

  if ($result['ok']) {
    Database::update('subscriptions', ['status' => 'paused'], 'id = :id', ['id' => $sub['id']]);
    jsonResponse(['ok' => true, 'message' => 'Assinatura pausada.']);
  } else {
    jsonResponse(['ok' => false, 'error' => 'Erro ao pausar no Mercado Pago.'], 500);
  }
}

function handleMPReactivateSubscription(): void
{
  if (!$GLOBALS['authAvailable']) {
    jsonResponse(['ok' => false, 'error' => 'Auth indisponível.'], 503);
  }
  $user = Auth::requireAuth();

  $sub = MercadoPago::getUserSubscription($user['id']);
  if (!$sub || !$sub['mp_subscription_id']) {
    jsonResponse(['ok' => false, 'error' => 'Nenhuma assinatura encontrada.'], 404);
  }

  $result = MercadoPago::reactivateSubscription($sub['mp_subscription_id']);

  if ($result['ok']) {
    Database::update('subscriptions', ['status' => 'authorized'], 'id = :id', ['id' => $sub['id']]);
    jsonResponse(['ok' => true, 'message' => 'Assinatura reativada.']);
  } else {
    jsonResponse(['ok' => false, 'error' => 'Erro ao reativar no Mercado Pago.'], 500);
  }
}

function handleMPSyncPlans(): void
{
  if (!$GLOBALS['authAvailable']) {
    jsonResponse(['ok' => false, 'error' => 'Auth indisponível.'], 503);
  }
  $admin = Auth::requireRole('admin', 'superadmin');

  $results = MercadoPago::syncPlans();
  jsonResponse(['ok' => true, 'results' => $results]);
}

// ── Webhooks ───────────────────────────────────────────────────

function handleMPWebhook(): void
{
  // Validate signature
  if (!MercadoPago::validateWebhookSignature()) {
    error_log('[MercadoPago Webhook] Invalid signature');
    jsonResponse(['ok' => false, 'error' => 'Invalid signature'], 401);
  }

  $result = MercadoPago::handleWebhook();
  jsonResponse($result, $result['ok'] ? 200 : 400);
}

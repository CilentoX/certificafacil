<?php
/**
 * CertificaFacil - Router
 *
 * Root router for PHP built-in development server.
 * Usage: php -S localhost:8666 router.php
 *
 * Routes:
 *   /api/*           → backend/api.php
 *   /login           → frontend/login.html
 *   /register        → frontend/register.html
 *   /admin           → frontend/admin.html
 *   /app             → frontend/app.html
 *   /assets/*        → static files from assets/
 *   /js/*, /style.css → static files from frontend/
 *   /                → frontend/index.html (landing)
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// ── API Routes ─────────────────────────────────────────────────
if (str_starts_with($uri, '/api/')) {
  require __DIR__ . '/backend/api.php';
  return true;
}

// ── Page Routes ────────────────────────────────────────────────
$pageRoutes = [
  '/login' => '/frontend/login.html',
  '/register' => '/frontend/register.html',
  '/admin' => '/frontend/admin.html',
  '/app' => '/frontend/app.html',
  '/settings' => '/frontend/settings.html',
];

if (isset($pageRoutes[$uri])) {
  $file = __DIR__ . $pageRoutes[$uri];
  if (file_exists($file)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($file);
    return true;
  }
}

// ── Static File Serving ────────────────────────────────────────

// MIME type map
$mimeTypes = [
  'html' => 'text/html; charset=utf-8',
  'htm' => 'text/html; charset=utf-8',
  'css' => 'text/css; charset=utf-8',
  'js' => 'application/javascript; charset=utf-8',
  'json' => 'application/json; charset=utf-8',
  'png' => 'image/png',
  'jpg' => 'image/jpeg',
  'jpeg' => 'image/jpeg',
  'gif' => 'image/gif',
  'svg' => 'image/svg+xml',
  'webp' => 'image/webp',
  'ico' => 'image/x-icon',
  'pdf' => 'application/pdf',
  'ttf' => 'font/ttf',
  'otf' => 'font/otf',
  'woff' => 'font/woff',
  'woff2' => 'font/woff2',
  'csv' => 'text/csv',
  'xml' => 'application/xml',
  'txt' => 'text/plain',
  'map' => 'application/json',
];

/**
 * Try to serve a static file. Returns true if served, false otherwise.
 */
function serveStaticFile(string $filePath, array $mimeTypes): bool
{
  if (!file_exists($filePath) || !is_file($filePath)) {
    return false;
  }

  $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
  $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

  header('Content-Type: ' . $contentType);
  header('Content-Length: ' . filesize($filePath));

  // Cache static assets for 1 hour
  if (in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ttf', 'otf', 'woff', 'woff2', 'ico'])) {
    header('Cache-Control: public, max-age=3600');
  }

  readfile($filePath);
  return true;
}

// Try assets/ directory (for /assets/* paths)
if (str_starts_with($uri, '/assets/')) {
  $assetsPath = __DIR__ . $uri;
  if (serveStaticFile($assetsPath, $mimeTypes)) {
    return true;
  }
}

// Try frontend/ directory for all other static files
$frontendPath = __DIR__ . '/frontend' . $uri;
if ($uri !== '/' && serveStaticFile($frontendPath, $mimeTypes)) {
  return true;
}

// Root path or fallback → serve index.html
$indexPath = __DIR__ . '/frontend/index.html';
if (file_exists($indexPath)) {
  header('Content-Type: text/html; charset=utf-8');
  readfile($indexPath);
  return true;
}

// Nothing found
http_response_code(404);
echo '404 Not Found';
return true;

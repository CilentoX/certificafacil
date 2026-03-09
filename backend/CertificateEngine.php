<?php
/**
 * CertificaFacil - Certificate Engine (PHP)
 *
 * Generates PDF certificates from templates using FPDI (PDF import) + TCPDF (PDF creation) + GD (text rendering).
 * Replicates the Python PyMuPDF + Pillow engine functionality.
 */

require_once __DIR__ . '/vendor/autoload.php';

use setasign\Fpdi\Tcpdf\Fpdi;

class CertificateEngine
{
  private string $rootPath;

  public function __construct()
  {
    $this->rootPath = dirname(__DIR__);
  }

  /* ============================================================
     Font Resolution
     ============================================================ */

  /**
   * Resolve a font file path from a font_file path or a font key name.
   */
  public function resolveFont(?string $fontFile = null, ?string $fontKey = null): string
  {
    // 1. Try fontFile directly
    if ($fontFile) {
      $resolved = $this->findFontPath($fontFile);
      if ($resolved)
        return $resolved;
    }

    // 2. Try fontKey
    if ($fontKey) {
      $resolved = $this->findFontPath($fontKey);
      if ($resolved)
        return $resolved;

      // Windows system font mapping
      $mapping = [
        'arial' => 'C:\\Windows\\Fonts\\arial.ttf',
        'arialbd' => 'C:\\Windows\\Fonts\\arialbd.ttf',
        'times' => 'C:\\Windows\\Fonts\\times.ttf',
        'timesbd' => 'C:\\Windows\\Fonts\\timesbd.ttf',
        'segoeui' => 'C:\\Windows\\Fonts\\segoeui.ttf',
        'segoeuib' => 'C:\\Windows\\Fonts\\segoeuib.ttf',
        'segoesc' => 'C:\\Windows\\Fonts\\segoesc.ttf',
        'gabriola' => 'C:\\Windows\\Fonts\\Gabriola.ttf',
        'calibri' => 'C:\\Windows\\Fonts\\calibri.ttf',
        'verdana' => 'C:\\Windows\\Fonts\\verdana.ttf',
        'tahoma' => 'C:\\Windows\\Fonts\\tahoma.ttf',
        'consolas' => 'C:\\Windows\\Fonts\\consola.ttf',
      ];
      $key = strtolower($fontKey);
      if (isset($mapping[$key]) && file_exists($mapping[$key])) {
        return $mapping[$key];
      }
    }

    // 3. Fallback chain
    $fallbacks = [
      'C:\\Windows\\Fonts\\arial.ttf',
      'C:\\Windows\\Fonts\\segoeui.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    ];
    foreach ($fallbacks as $fb) {
      if (file_exists($fb))
        return $fb;
    }

    // Last resort: return first available fallback path (Linux > Windows)
    return PHP_OS_FAMILY === 'Windows'
      ? 'C:\\Windows\\Fonts\\arial.ttf'
      : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  }

  private function findFontPath(string $name): ?string
  {
    if (!$name)
      return null;

    // Absolute path
    if (is_file($name))
      return realpath($name);

    // Relative to project root
    $rootRel = $this->rootPath . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $name);
    if (is_file($rootRel))
      return realpath($rootRel);

    // In assets/fonts
    $assetsRel = $this->rootPath . '/assets/fonts/' . basename($name);
    if (is_file($assetsRel))
      return realpath($assetsRel);

    // Try adding .ttf extension
    $lower = strtolower($name);
    if (!str_ends_with($lower, '.ttf') && !str_ends_with($lower, '.otf')) {
      $withTtf = $this->rootPath . '/assets/fonts/' . $name . '.ttf';
      if (is_file($withTtf))
        return realpath($withTtf);
      $withOtf = $this->rootPath . '/assets/fonts/' . $name . '.otf';
      if (is_file($withOtf))
        return realpath($withOtf);
    }

    return null;
  }

  /* ============================================================
     Markup Parsing
     ============================================================ */

  /**
   * Parse [B] and [I] toggle tags in text.
   * Returns array of [text, isBold, isItalic] tuples.
   */
  public function parseMarkup(string $text): array
  {
    $parts = [];
    $i = 0;
    $bold = false;
    $italic = false;
    $cur = '';
    $len = mb_strlen($text);

    while ($i < $len) {
      if (mb_substr($text, $i, 3) === '[B]') {
        if ($cur !== '') {
          $parts[] = [$cur, $bold, $italic];
          $cur = '';
        }
        $bold = !$bold;
        $i += 3;
        continue;
      }
      if (mb_substr($text, $i, 3) === '[I]') {
        if ($cur !== '') {
          $parts[] = [$cur, $bold, $italic];
          $cur = '';
        }
        $italic = !$italic;
        $i += 3;
        continue;
      }
      $cur .= mb_substr($text, $i, 1);
      $i++;
    }
    if ($cur !== '') {
      $parts[] = [$cur, $bold, $italic];
    }
    return $parts;
  }

  /* ============================================================
     Color Normalization
     ============================================================ */

  /**
   * Normalize color to [R, G, B] with values 0-255.
   */
  public function normalizeColor(mixed $color): array
  {
    if (empty($color))
      return [0, 0, 0];

    if (is_string($color) && str_starts_with($color, '#')) {
      $hex = ltrim($color, '#');
      if (strlen($hex) === 6) {
        return [
          hexdec(substr($hex, 0, 2)),
          hexdec(substr($hex, 2, 2)),
          hexdec(substr($hex, 4, 2)),
        ];
      }
      if (strlen($hex) === 3) {
        return [
          hexdec($hex[0] . $hex[0]),
          hexdec($hex[1] . $hex[1]),
          hexdec($hex[2] . $hex[2]),
        ];
      }
    }

    if (is_array($color) && count($color) === 3) {
      $vals = array_values($color);
      if (max($vals) <= 1.0 && min($vals) >= 0.0) {
        return [
          (int) round($vals[0] * 255),
          (int) round($vals[1] * 255),
          (int) round($vals[2] * 255),
        ];
      }
      return [(int) $vals[0], (int) $vals[1], (int) $vals[2]];
    }

    return [0, 0, 0];
  }

  /* ============================================================
     Text Measurement & Drawing (GD)
     ============================================================ */

  /**
   * Measure text width with optional letter spacing using GD.
   */
  public function getTextWidth(string $fontFile, float $fontSize, string $text, float $letterSpacing = 0): float
  {
    if ($text === '' || mb_strlen($text) === 0)
      return 0;

    $bbox = @imagettfbbox($fontSize, 0, $fontFile, $text);
    if (!$bbox)
      return mb_strlen($text) * $fontSize * 0.6;

    $w = abs($bbox[2] - $bbox[0]);
    $len = mb_strlen($text);
    return $w + ($len > 1 ? ($len - 1) * $letterSpacing : 0);
  }

  /**
   * Draw text with letter spacing on a GD image.
   */
  public function drawTextWithLS(\GdImage $image, float $x, float $y, string $text, string $fontFile, float $fontSize, int $color, float $ls): void
  {
    $len = mb_strlen($text);
    for ($i = 0; $i < $len; $i++) {
      $char = mb_substr($text, $i, 1);
      @imagettftext($image, $fontSize, 0, (int) round($x), (int) round($y), $color, $fontFile, $char);
      $bbox = @imagettfbbox($fontSize, 0, $fontFile, $char);
      $charW = $bbox ? abs($bbox[2] - $bbox[0]) : $fontSize * 0.6;
      $x += $charW + $ls;
    }
  }

  /* ============================================================
     Word Wrapping
     ============================================================ */

  /**
   * Word-wrap parsed text parts to fit within maxWidth (in font-size units/points).
   * Returns array of lines, each line being an array of [text, bold, italic] parts.
   */
  public function wrapText(array $parts, float $maxWidth, string $fontFile, float $fontSize, float $letterSpacing = 0): array
  {
    $lines = [];
    $currentLine = [];
    $currentWidth = 0;
    $safeMaxWidth = $maxWidth * 0.98;

    $spaceWidth = $this->getTextWidth($fontFile, $fontSize, ' ', 0) + $letterSpacing;
    if ($spaceWidth <= 0)
      $spaceWidth = $fontSize * 0.3;

    // Pre-process parts: split on newlines
    $processed = [];
    foreach ($parts as $p) {
      $text = $p[0] ?? '';
      $isBold = $p[1] ?? false;
      $isItalic = $p[2] ?? false;

      $subParts = explode("\n", $text);
      foreach ($subParts as $idx => $sp) {
        $processed[] = [$sp, $isBold, $isItalic];
        if ($idx < count($subParts) - 1) {
          $processed[] = ["\n", false, false];
        }
      }
    }

    foreach ($processed as $part) {
      $text = $part[0];
      $isBold = $part[1];
      $isItalic = $part[2];

      if ($text === "\n") {
        $lines[] = $currentLine;
        $currentLine = [];
        $currentWidth = 0;
        continue;
      }

      $words = explode(' ', $text);
      foreach ($words as $i => $word) {
        if ($word === '' && $i > 0)
          continue;

        $wordWidth = $this->getTextWidth($fontFile, $fontSize, $word, $letterSpacing);
        $needed = $wordWidth + (!empty($currentLine) ? $spaceWidth : 0);

        if ($currentWidth + $needed <= $safeMaxWidth) {
          if (!empty($currentLine)) {
            $currentLine[] = [' ', false, false];
            $currentWidth += $spaceWidth;
          }
          $currentLine[] = [$word, $isBold, $isItalic];
          $currentWidth += $wordWidth;
        } else {
          if (!empty($currentLine)) {
            $lines[] = $currentLine;
          }
          $currentLine = [[$word, $isBold, $isItalic]];
          $currentWidth = $wordWidth;
        }
      }
    }

    if (!empty($currentLine)) {
      $lines[] = $currentLine;
    }

    return $lines;
  }

  /* ============================================================
     PDF Template Dimensions
     ============================================================ */

  /**
   * Get page dimensions from a PDF template (in points).
   */
  public function getPageDimensions(string $templatePath): array
  {
    $pdf = new Fpdi('P', 'pt');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);

    $pdf->setSourceFile($templatePath);
    $tplId = $pdf->importPage(1);
    $size = $pdf->getTemplateSize($tplId);

    return [
      'width' => $size['width'],
      'height' => $size['height'],
    ];
  }

  /* ============================================================
     TCPDF Native Font Registration
     ============================================================ */

  private static array $fontCache = [];

  /**
   * Register a TTF/OTF font with TCPDF and return the internal font name.
   * Caches results to avoid re-processing the same font file.
   */
  private function registerTcpdfFont(string $fontFile): string
  {
    $realPath = realpath($fontFile);
    if (!$realPath)
      $realPath = $fontFile;

    if (isset(self::$fontCache[$realPath])) {
      return self::$fontCache[$realPath];
    }

    try {
      // Let TCPDF write font definitions to its own fonts dir (K_PATH_FONTS)
      $fontName = \TCPDF_FONTS::addTTFfont($realPath, 'TrueTypeUnicode', '', 96);
      if ($fontName) {
        self::$fontCache[$realPath] = $fontName;
        return $fontName;
      }
    } catch (\Throwable $e) {
      error_log("CertificateEngine: font registration error for '{$fontFile}': " . $e->getMessage());
    }

    // Fallback to built-in helvetica
    self::$fontCache[$realPath] = 'helvetica';
    return 'helvetica';
  }

  /* ============================================================
     Native Text Rendering (TCPDF)
     ============================================================ */

  /**
   * Render a text field onto the PDF using TCPDF's native text engine.
   * No GD/PNG images — text is embedded as real vector text in the PDF.
   */
  private function renderTextField(Fpdi $pdf, array $field): void
  {
    $rect = $field['rect'] ?? [0, 0, 100, 50];
    $rectX = floatval($rect[0]);
    $rectY = floatval($rect[1]);
    $rectW = floatval($rect[2]) - $rectX;
    $rectH = floatval($rect[3]) - $rectY;
    if ($rectW <= 0 || $rectH <= 0)
      return;

    $color = $this->normalizeColor($field['color'] ?? '#000000');
    $fontSize = floatval($field['font_size'] ?? 14);
    $fontFile = $this->resolveFont($field['font_file'] ?? null, $field['font'] ?? 'arial');
    $align = $field['align'] ?? 'center';
    $ls = floatval($field['letter_spacing'] ?? 0);
    $lh = floatval($field['line_height'] ?? 1.3);
    $autoRes = $field['auto_resize'] ?? true;

    // Parse content — flatten markup parts to plain text
    $content = $field['content'] ?? '';
    if (is_string($content)) {
      $parts = $this->parseMarkup($content);
    } elseif (is_array($content)) {
      $parts = $content;
    } else {
      return;
    }
    if (empty($parts))
      return;

    $plainText = '';
    foreach ($parts as $part) {
      $plainText .= $part[0] ?? '';
    }
    if (trim($plainText) === '')
      return;

    // Register font with TCPDF
    $fontName = $this->registerTcpdfFont($fontFile);

    // Configure text state
    $pdf->SetTextColor($color[0], $color[1], $color[2]);
    $pdf->SetFont($fontName, '', $fontSize);
    $pdf->setCellPaddings(0, 0, 0, 0);
    $pdf->setCellHeightRatio($lh);

    if (abs($ls) > 0.001) {
      $pdf->setFontSpacing($ls);
    } else {
      $pdf->setFontSpacing(0);
    }

    // Auto-resize: reduce font until text fits rect height
    if ($autoRes) {
      for ($attempt = 0; $attempt < 30; $attempt++) {
        $pdf->SetFont($fontName, '', $fontSize);
        $strH = $pdf->getStringHeight($rectW, $plainText);
        if ($strH <= $rectH || $fontSize <= 6)
          break;
        $fontSize -= 0.5;
      }
      $pdf->SetFont($fontName, '', $fontSize);
    }

    // Map alignment to TCPDF codes
    $tcpdfAlign = match ($align) {
      'left' => 'L',
      'right' => 'R',
      default => 'C',
    };

    // Render text natively
    $pdf->MultiCell(
      $rectW,       // width
      0,            // auto height
      $plainText,   // text
      0,            // border
      $tcpdfAlign,  // align
      false,        // fill
      1,            // ln (next line)
      $rectX,       // x
      $rectY,       // y
      true,         // reseth
      0,            // stretch
      false,        // ishtml
      true,         // autopadding
      $rectH,       // maxh
      'T'           // valign (top)
    );

    // Reset state
    $pdf->setFontSpacing(0);
    $pdf->setCellHeightRatio(1.25);
  }

  /* ============================================================
     Image Overlay
     ============================================================ */

  /**
   * Render overlay images onto the PDF.
   * Returns array of temp file paths created (for cleanup after Output).
   */
  private function renderImages(Fpdi $pdf, array $images): array
  {
    $tmpFiles = [];

    foreach ($images as $im) {
      try {
        $ipath = $im['path'] ?? null;
        if (!$ipath)
          continue;

        $absPath = realpath($this->rootPath . '/' . $ipath);
        if (!$absPath || !file_exists($absPath))
          continue;

        $ix = floatval($im['x'] ?? 0);
        $iy = floatval($im['y'] ?? 0);
        $iw = floatval($im['w'] ?? 100);
        $ih = floatval($im['h'] ?? 100);
        $rot = floatval($im['rot'] ?? 0);
        $ext = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
        $imageFile = $absPath;

        // Handle rotation via GD
        if ($rot != 0) {
          $src = $this->loadGdImage($absPath);
          if ($src) {
            $bgAlpha = imagecolorallocatealpha($src, 0, 0, 0, 127);
            $rotated = imagerotate($src, $rot, $bgAlpha);
            imagesavealpha($rotated, true);
            $tmpImg = tempnam(sys_get_temp_dir(), 'cert_img_') . '.png';
            imagepng($rotated, $tmpImg);
            imagedestroy($src);
            imagedestroy($rotated);
            $imageFile = $tmpImg;
            $ext = 'png';
            $tmpFiles[] = $tmpImg;
          }
        }

        // Convert WebP to PNG (TCPDF doesn't support WebP natively)
        if ($ext === 'webp') {
          $src = @imagecreatefromwebp($absPath);
          if ($src) {
            $tmpImg = tempnam(sys_get_temp_dir(), 'cert_img_') . '.png';
            imagesavealpha($src, true);
            imagepng($src, $tmpImg);
            imagedestroy($src);
            $imageFile = $tmpImg;
            $ext = 'png';
            $tmpFiles[] = $tmpImg;
          }
        }

        $pdfType = in_array($ext, ['jpg', 'jpeg']) ? 'JPG' : 'PNG';
        $pdf->Image($imageFile, $ix, $iy, $iw, $ih, $pdfType);

      } catch (\Throwable $e) {
        error_log("CertificateEngine: image error: " . $e->getMessage());
      }
    }

    return $tmpFiles;
  }

  /* ============================================================
     Certificate Generation
     ============================================================ */

  /**
   * Create a single certificate PDF from template + config.
   * Uses TCPDF native text rendering (no GD/PNG for text).
   */
  public function createCertificate(string $templatePath, string $outputPath, string $name, array $config): string
  {
    $pdf = new Fpdi('P', 'pt');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(0, 0, 0);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->SetCreator('CertificaFacil');

    // Import template page
    $pdf->setSourceFile($templatePath);
    $tplId = $pdf->importPage(1);
    $size = $pdf->getTemplateSize($tplId);
    $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
    $pdf->useImportedPage($tplId, 0, 0, $size['width'], $size['height']);

    // ── 1. Render text fields (native TCPDF) ───────────────────
    foreach ($config['text_fields'] ?? [] as $field) {
      try {
        $this->renderTextField($pdf, $field);
      } catch (\Throwable $e) {
        error_log("CertificateEngine: text field error: " . $e->getMessage());
      }
    }

    // ── 2. Overlay images ──────────────────────────────────────
    $tmpFiles = $this->renderImages($pdf, $config['images'] ?? []);

    // ── 3. Output PDF ──────────────────────────────────────────
    $pdf->Output($outputPath, 'F');

    // Cleanup temporary image files
    foreach ($tmpFiles as $tmp) {
      @unlink($tmp);
    }

    return $outputPath;
  }

  /**
   * Load an image file into a GD resource (used for rotation/format conversion).
   */
  private function loadGdImage(string $path): \GdImage|false
  {
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    return match ($ext) {
      'png' => @imagecreatefrompng($path),
      'jpg', 'jpeg' => @imagecreatefromjpeg($path),
      'gif' => @imagecreatefromgif($path),
      'webp' => @imagecreatefromwebp($path),
      'bmp' => @imagecreatefrombmp($path),
      default => @imagecreatefromstring(file_get_contents($path)),
    };
  }

  /* ============================================================
     Batch Certificate Generation
     ============================================================ */

  /**
   * Create a batch certificate PDF with multiple pages in a single document.
   * Uses TCPDF native text — no GD/PNG for text, no FPDI re-import issues.
   */
  public function createBatchCertificate(string $templatePath, string $outputPath, array $items): string
  {
    $pdf = new Fpdi('P', 'pt');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(0, 0, 0);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->SetCreator('CertificaFacil');

    $tmpFilesAll = [];

    foreach ($items as $item) {
      $config = $item['config'] ?? [];

      // Import template page fresh for each certificate
      $pdf->setSourceFile($templatePath);
      $tplId = $pdf->importPage(1);
      $size = $pdf->getTemplateSize($tplId);
      $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
      $pdf->useImportedPage($tplId, 0, 0, $size['width'], $size['height']);

      // ── 1. Render text fields (native TCPDF) ──
      foreach ($config['text_fields'] ?? [] as $field) {
        try {
          $this->renderTextField($pdf, $field);
        } catch (\Throwable $e) {
          error_log("CertificateEngine batch: text field error: " . $e->getMessage());
        }
      }

      // ── 2. Overlay images ──
      $tmpFiles = $this->renderImages($pdf, $config['images'] ?? []);
      $tmpFilesAll = array_merge($tmpFilesAll, $tmpFiles);
    }

    // Output all pages as single PDF
    $pdf->Output($outputPath, 'F');

    // Cleanup temp image files after PDF is fully written
    foreach ($tmpFilesAll as $tmp) {
      @unlink($tmp);
    }

    return $outputPath;
  }
}

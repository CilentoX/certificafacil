<?php
/**
 * CertificaFacil - Mercado Pago Integration (Sandbox / Production)
 *
 * Handles:
 *  - Subscription plan creation on MP
 *  - Subscription (preapproval) creation via checkout redirect
 *  - Subscription status queries
 *  - Subscription management (pause, cancel, reactivate)
 *  - Webhook signature validation & processing
 */

require_once __DIR__ . '/Database.php';

class MercadoPago
{
  private static ?array $env = null;

  /* ================================================================
     CONFIGURATION
     ================================================================ */

  /**
   * Load .env file and cache values.
   */
  private static function loadEnv(): array
  {
    if (self::$env !== null)
      return self::$env;

    self::$env = [];

    // 1. Load from .env file if it exists
    $envFile = dirname(__DIR__) . '/.env';
    if (file_exists($envFile)) {
      $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
      foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#')
          continue;
        if (strpos($line, '=') === false)
          continue;
        [$key, $val] = explode('=', $line, 2);
        self::$env[trim($key)] = trim($val);
      }
    }

    // 2. System env vars override .env file (Coolify / Docker injects these)
    $overrideKeys = ['ACCESS_TOKEN', 'PUBLIC_KEY', 'MP_WEBHOOK_SECRET', 'APP_URL'];
    foreach ($overrideKeys as $key) {
      $val = getenv($key);
      if ($val !== false && $val !== '') {
        self::$env[$key] = $val;
      }
    }

    return self::$env;
  }

  /**
   * Get Mercado Pago configuration.
   */
  public static function getConfig(): array
  {
    $env = self::loadEnv();
    $accessToken = $env['ACCESS_TOKEN'] ?? '';

    return [
      'access_token' => $accessToken,
      'public_key' => $env['PUBLIC_KEY'] ?? '',
      'webhook_secret' => $env['MP_WEBHOOK_SECRET'] ?? '',
      'app_url' => $env['APP_URL'] ?? 'http://localhost:8666',
      'is_sandbox' => str_starts_with($accessToken, 'TEST-'),
    ];
  }

  /* ================================================================
     HTTP CLIENT
     ================================================================ */

  /**
   * Make an HTTP request to the Mercado Pago API.
   */
  private static function request(string $method, string $endpoint, ?array $body = null): array
  {
    $config = self::getConfig();
    $url = 'https://api.mercadopago.com' . $endpoint;

    $headers = [
      'Authorization: Bearer ' . $config['access_token'],
      'Content-Type: application/json',
      'X-Idempotency-Key: ' . bin2hex(random_bytes(16)),
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
      CURLOPT_URL => $url,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 30,
      CURLOPT_HTTPHEADER => $headers,
      CURLOPT_SSL_VERIFYPEER => true,
    ]);

    switch (strtoupper($method)) {
      case 'POST':
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body)
          curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        break;
      case 'PUT':
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        if ($body)
          curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        break;
      case 'GET':
        if ($body) {
          $url .= '?' . http_build_query($body);
          curl_setopt($ch, CURLOPT_URL, $url);
        }
        break;
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
      error_log("[MercadoPago] cURL error: {$error}");
      return ['ok' => false, 'error' => 'Erro de conexão com Mercado Pago', 'http_code' => 0];
    }

    $data = json_decode($response, true) ?? [];
    $data['http_code'] = $httpCode;
    $data['ok'] = $httpCode >= 200 && $httpCode < 300;

    if (!$data['ok']) {
      error_log("[MercadoPago] API error: HTTP {$httpCode} | " . substr($response, 0, 500));
    }

    return $data;
  }

  /* ================================================================
     SUBSCRIPTION PLANS (preapproval_plan)
     ================================================================ */

  /**
   * Create a subscription plan on Mercado Pago.
   * Should be called once per plan to get the MP plan ID.
   */
  public static function createPlan(string $reason, float $amount, int $frequency = 1, string $frequencyType = 'months'): array
  {
    $config = self::getConfig();

    return self::request('POST', '/preapproval_plan', [
      'reason' => $reason,
      'auto_recurring' => [
        'frequency' => $frequency,
        'frequency_type' => $frequencyType,
        'transaction_amount' => $amount,
        'currency_id' => 'BRL',
      ],
      'back_url' => $config['app_url'] . '/settings?section=plan',
    ]);
  }

  /* ================================================================
     SUBSCRIPTIONS (preapproval)
     ================================================================ */

  /**
   * Create a subscription via checkout redirect (no card_token needed).
   * Uses the "subscription without plan" approach to get an init_point URL.
   * Returns the init_point URL where the user should be redirected.
   */
  public static function createSubscription(string $mpPlanId, string $payerEmail, string $externalReference, array $planData = []): array
  {
    $config = self::getConfig();

    // When using test seller account credentials (APP_USR-), the payer_email
    // must also be a MP test user. Override with the buyer test account email.
    // In production (TEST- or real credentials), use the user's actual email.
    $effectivePayerEmail = $payerEmail;
    if (str_starts_with($config['access_token'], 'APP_USR-')) {
      // Buyer test account: TESTUSER6221850816073850640
      $effectivePayerEmail = 'test_user_6221850816073850640@testuser.com';
    }

    // Use the "no associated plan" approach to get init_point for redirect checkout
    $body = [
      'reason' => 'CertificaFacil - ' . ($planData['name'] ?? 'Assinatura'),
      'external_reference' => $externalReference,
      'payer_email' => $effectivePayerEmail,
      'auto_recurring' => [
        'frequency' => 1,
        'frequency_type' => 'months',
        'transaction_amount' => (float) ($planData['price'] ?? 29.90),
        'currency_id' => 'BRL',
      ],
      'back_url' => $config['app_url'] . '/settings?section=plan&subscription=success',
      'notification_url' => $config['app_url'] . '/api/webhooks/mercadopago?source_news=webhooks',
      'status' => 'pending',
    ];

    $result = self::request('POST', '/preapproval', $body);

    if ($result['ok'] && isset($result['id'])) {
      // Save to local DB
      self::saveSubscription($externalReference, $result, $mpPlanId);
    }

    return $result;
  }

  /**
   * Get subscription details from MP.
   */
  public static function getSubscription(string $subscriptionId): array
  {
    return self::request('GET', '/preapproval/' . $subscriptionId);
  }

  /**
   * Pause a subscription.
   */
  public static function pauseSubscription(string $subscriptionId): array
  {
    return self::request('PUT', '/preapproval/' . $subscriptionId, [
      'status' => 'paused',
    ]);
  }

  /**
   * Cancel a subscription.
   */
  public static function cancelSubscription(string $subscriptionId): array
  {
    return self::request('PUT', '/preapproval/' . $subscriptionId, [
      'status' => 'cancelled',
    ]);
  }

  /**
   * Reactivate a paused subscription.
   */
  public static function reactivateSubscription(string $subscriptionId): array
  {
    return self::request('PUT', '/preapproval/' . $subscriptionId, [
      'status' => 'authorized',
    ]);
  }

  /* ================================================================
     LOCAL DATABASE
     ================================================================ */

  /**
   * Save or update a subscription record in local DB.
   */
  private static function saveSubscription(string $userUid, array $mpData, ?string $planId = null): void
  {
    $user = Database::fetchOne("SELECT id, plan_id FROM users WHERE uid = :uid", ['uid' => $userUid]);
    if (!$user)
      return;

    $existing = Database::fetchOne(
      "SELECT id FROM subscriptions WHERE mp_subscription_id = :sid",
      ['sid' => $mpData['id']]
    );

    $record = [
      'user_id' => $user['id'],
      'mp_subscription_id' => $mpData['id'],
      'mp_plan_id' => $planId ?? ($mpData['preapproval_plan_id'] ?? null),
      'status' => $mpData['status'] ?? 'pending',
      'payer_email' => $mpData['payer_email'] ?? null,
    ];

    if ($existing) {
      Database::update('subscriptions', $record, 'id = :id', ['id' => $existing['id']]);
    } else {
      Database::insert('subscriptions', $record);
    }
  }

  /**
   * Get the user's active subscription.
   */
  public static function getUserSubscription(int $userId): ?array
  {
    return Database::fetchOne(
      "SELECT s.*, p.slug as plan_slug, p.name as plan_name
       FROM subscriptions s
       LEFT JOIN plans p ON p.mp_plan_id = s.mp_plan_id
       WHERE s.user_id = :uid
       ORDER BY s.created_at DESC
       LIMIT 1",
      ['uid' => $userId]
    );
  }

  /* ================================================================
     WEBHOOKS
     ================================================================ */

  /**
   * Validate the webhook signature from Mercado Pago.
   */
  public static function validateWebhookSignature(): bool
  {
    $config = self::getConfig();
    $secret = $config['webhook_secret'];

    if (empty($secret))
      return true; // Skip validation if no secret configured

    $xSignature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
    $xRequestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';

    if (empty($xSignature))
      return false;

    // Parse x-signature header: ts=xxx,v1=xxx
    $parts = [];
    foreach (explode(',', $xSignature) as $part) {
      [$k, $v] = explode('=', trim($part), 2);
      $parts[$k] = $v;
    }

    $ts = $parts['ts'] ?? '';
    $v1 = $parts['v1'] ?? '';

    if (empty($ts) || empty($v1))
      return false;

    // Get data.id from query string
    $dataId = $_GET['data.id'] ?? $_GET['data_id'] ?? '';

    // Build the template string
    $manifest = "id:{$dataId};request-id:{$xRequestId};ts:{$ts};";
    $computed = hash_hmac('sha256', $manifest, $secret);

    return hash_equals($computed, $v1);
  }

  /**
   * Process incoming webhook notification.
   */
  public static function handleWebhook(): array
  {
    $body = json_decode(file_get_contents('php://input'), true);

    if (!$body) {
      return ['ok' => false, 'error' => 'Empty body'];
    }

    $type = $body['type'] ?? '';
    $action = $body['action'] ?? '';
    $dataId = $body['data']['id'] ?? null;

    error_log("[MercadoPago Webhook] type={$type} action={$action} data.id={$dataId}");

    // Log the webhook
    Database::insert('activity_log', [
      'user_id' => null,
      'action' => 'mp_webhook',
      'details' => json_encode([
        'type' => $type,
        'action' => $action,
        'data_id' => $dataId,
        'body' => $body,
      ]),
      'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
    ]);

    if (!$dataId) {
      return ['ok' => true, 'message' => 'No data.id, skipped'];
    }

    switch ($type) {
      case 'subscription_preapproval':
        return self::handleSubscriptionWebhook($dataId);

      case 'subscription_authorized_payment':
        return self::handlePaymentWebhook($dataId);

      default:
        error_log("[MercadoPago Webhook] Unhandled type: {$type}");
        return ['ok' => true, 'message' => "Unhandled type: {$type}"];
    }
  }

  /**
   * Handle subscription status change webhook.
   */
  private static function handleSubscriptionWebhook(string $subscriptionId): array
  {
    // Fetch updated subscription from MP
    $sub = self::getSubscription($subscriptionId);

    if (!$sub['ok']) {
      error_log("[MercadoPago] Failed to fetch subscription {$subscriptionId}");
      return ['ok' => false, 'error' => 'Failed to fetch subscription'];
    }

    $status = $sub['status'] ?? 'unknown';
    $externalRef = $sub['external_reference'] ?? null;
    $mpPlanId = $sub['preapproval_plan_id'] ?? null;

    // Update local subscription record
    $existing = Database::fetchOne(
      "SELECT id FROM subscriptions WHERE mp_subscription_id = :sid",
      ['sid' => $subscriptionId]
    );

    if ($existing) {
      Database::update('subscriptions', [
        'status' => $status,
        'payer_email' => $sub['payer_email'] ?? null,
      ], 'id = :id', ['id' => $existing['id']]);
    } else if ($externalRef) {
      // Create new record
      self::saveSubscription($externalRef, $sub, $mpPlanId);
    }

    // Update user's plan based on subscription status
    if ($externalRef && in_array($status, ['authorized', 'active'])) {
      self::activateUserPlan($externalRef, $mpPlanId);
    } else if ($externalRef && in_array($status, ['cancelled', 'paused'])) {
      self::deactivateUserPlan($externalRef, $status);
    }

    return ['ok' => true, 'message' => "Subscription {$subscriptionId} status: {$status}"];
  }

  /**
   * Handle subscription payment webhook.
   */
  private static function handlePaymentWebhook(string $paymentId): array
  {
    // Fetch payment details
    $payment = self::request('GET', '/authorized_payments/' . $paymentId);

    if (!$payment['ok']) {
      error_log("[MercadoPago] Failed to fetch payment {$paymentId}");
      return ['ok' => false, 'error' => 'Failed to fetch payment'];
    }

    $status = $payment['status'] ?? 'unknown';
    $subscriptionId = $payment['preapproval_id'] ?? null;

    error_log("[MercadoPago] Payment {$paymentId} status: {$status} subscription: {$subscriptionId}");

    // Update subscription record with payment info
    if ($subscriptionId) {
      $existing = Database::fetchOne(
        "SELECT id FROM subscriptions WHERE mp_subscription_id = :sid",
        ['sid' => $subscriptionId]
      );
      if ($existing) {
        Database::update('subscriptions', [
          'last_payment_at' => date('Y-m-d H:i:s'),
          'last_payment_status' => $status,
        ], 'id = :id', ['id' => $existing['id']]);
      }
    }

    return ['ok' => true, 'message' => "Payment {$paymentId} status: {$status}"];
  }

  /**
   * Activate user's paid plan when subscription becomes authorized.
   */
  private static function activateUserPlan(string $userUid, ?string $mpPlanId): void
  {
    if (!$mpPlanId)
      return;

    $plan = Database::fetchOne(
      "SELECT id, slug FROM plans WHERE mp_plan_id = :mpid",
      ['mpid' => $mpPlanId]
    );

    if (!$plan) {
      error_log("[MercadoPago] No local plan found for MP plan: {$mpPlanId}");
      return;
    }

    $affected = Database::update(
      'users',
      ['plan_id' => $plan['id']],
      'uid = :uid',
      ['uid' => $userUid]
    );

    error_log("[MercadoPago] User {$userUid} activated plan {$plan['slug']} (affected: {$affected})");
  }

  /**
   * Deactivate user's plan (revert to trial) when subscription is cancelled/paused.
   */
  private static function deactivateUserPlan(string $userUid, string $reason): void
  {
    // Only downgrade to trial on cancellation; paused keeps current plan
    if ($reason === 'cancelled') {
      $trialPlan = Database::fetchOne("SELECT id FROM plans WHERE slug = 'trial'");
      if ($trialPlan) {
        Database::update('users', ['plan_id' => $trialPlan['id']], 'uid = :uid', ['uid' => $userUid]);
        error_log("[MercadoPago] User {$userUid} downgraded to trial (reason: {$reason})");
      }
    }
  }

  /* ================================================================
     PLAN INITIALIZATION
     ================================================================ */

  /**
   * Create MP plans for all paid local plans that don't have an mp_plan_id yet.
   * Should be called once during setup.
   */
  public static function syncPlans(): array
  {
    $plans = Database::fetchAll("SELECT * FROM plans WHERE price > 0 AND (mp_plan_id IS NULL OR mp_plan_id = '')");
    $results = [];

    foreach ($plans as $plan) {
      $result = self::createPlan(
        "CertificaFacil - {$plan['name']}",
        (float) $plan['price']
      );

      if ($result['ok'] && isset($result['id'])) {
        Database::update('plans', ['mp_plan_id' => $result['id']], 'id = :id', ['id' => $plan['id']]);
        $results[] = [
          'plan' => $plan['slug'],
          'mp_plan_id' => $result['id'],
          'status' => 'created',
        ];
        error_log("[MercadoPago] Plan '{$plan['slug']}' synced: MP ID = {$result['id']}");
      } else {
        $results[] = [
          'plan' => $plan['slug'],
          'error' => $result['message'] ?? $result['error'] ?? 'Unknown error',
          'status' => 'failed',
        ];
      }
    }

    return $results;
  }

  /**
   * Get all plans with their MP plan IDs.
   */
  public static function getPlansWithMP(): array
  {
    return Database::fetchAll(
      "SELECT id, slug, name, price, max_certs, max_templates, features, mp_plan_id
       FROM plans WHERE is_active = 1 ORDER BY price ASC"
    );
  }

  /**
   * Return the public key for frontend SDK initialization.
   */
  public static function getPublicKey(): string
  {
    $config = self::getConfig();
    return $config['public_key'];
  }
}

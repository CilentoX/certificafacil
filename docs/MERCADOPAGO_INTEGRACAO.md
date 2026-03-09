# Integração Mercado Pago — Assinaturas Recorrentes

> **Projeto:** CertificaFacil
> **Data:** 02/03/2026
> **Modelo:** Assinaturas com plano associado (cobranças recorrentes automáticas)
> **Docs oficiais:** https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Credenciais e Ambientes (Sandbox vs Produção)](#2-credenciais-e-ambientes-sandbox-vs-produção)
3. [Configuração do `.env`](#3-configuração-do-env)
4. [Fluxo Completo da Integração](#4-fluxo-completo-da-integração)
5. [Etapa 1 — Criar Planos no Mercado Pago](#5-etapa-1--criar-planos-no-mercado-pago)
6. [Etapa 2 — Criar Assinatura para o Usuário](#6-etapa-2--criar-assinatura-para-o-usuário)
7. [Etapa 3 — Webhooks (Notificações)](#7-etapa-3--webhooks-notificações)
8. [Etapa 4 — Gerenciamento de Assinaturas](#8-etapa-4--gerenciamento-de-assinaturas)
9. [Alternar entre Sandbox e Produção](#9-alternar-entre-sandbox-e-produção)
10. [Testes com Contas e Cartões de Teste](#10-testes-com-contas-e-cartões-de-teste)
11. [Implementação no Backend PHP](#11-implementação-no-backend-php)
12. [Tabela de Referência dos Planos CertificaFacil](#12-tabela-de-referência-dos-planos-certificafacil)
13. [Checklist de Go-Live](#13-checklist-de-go-live)

---

## 1. Visão Geral

O Mercado Pago oferece uma API de **Assinaturas** (Subscriptions) que permite criar cobranças recorrentes automáticas. Existem dois modelos:

| Modelo                  | Quando usar                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Com plano associado** | Quando o mesmo plano será usado por vários assinantes (ex: Básico R$29,90/mês). Você cria o plano UMA vez e associa múltiplas assinaturas a ele. |
| **Sem plano associado** | Para assinaturas únicas/personalizadas por cliente (ex: desconto especial para um cliente específico).                                           |

**Vamos usar o modelo COM PLANO ASSOCIADO** — é o ideal para o CertificaFacil pois temos planos fixos (Básico, Pro, Ilimitado).

### Como funciona

1. Você cria planos via API (`/preapproval_plan`) — uma vez só
2. O usuário escolhe um plano e é redirecionado para o checkout do MP
3. Após o pagamento, o MP cobra automaticamente todo mês
4. Webhooks notificam seu backend sobre mudanças de status
5. Seu backend atualiza o `plan_id` do usuário no banco

---

## 2. Credenciais e Ambientes (Sandbox vs Produção)

O Mercado Pago possui **dois ambientes** com credenciais separadas:

### Credenciais de TESTE (Sandbox)

Prefixo: `TEST-`

```
PUBLIC_KEY  = TEST-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ACCESS_TOKEN = TEST-0000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-0000000000
```

- Usadas durante desenvolvimento
- Pagamentos **não são reais**
- Obrigatório usar **contas de teste** e **cartões de teste**
- Obtidas em: [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) > Sua aplicação > **Credenciais de teste**

### Credenciais de PRODUÇÃO

Prefixo: `APP_USR-`

```
PUBLIC_KEY   = APP_USR-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ACCESS_TOKEN = APP_USR-0000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-0000000000
```

- Pagamentos **reais** com dinheiro de verdade
- Precisam ser **ativadas** no painel (informar indústria, website, etc.)
- Obtidas em: [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) > Sua aplicação > **Credenciais de produção**

### Como Obter

1. Acesse https://www.mercadopago.com.br/developers/panel/app
2. Crie uma aplicação (ou selecione a existente)
3. Menu lateral: **Credenciais de teste** (já disponíveis)
4. Menu lateral: **Credenciais de produção** (precisam ser ativadas — preencher indústria + URL do site)

---

## 3. Configuração do `.env`

O arquivo `.env` na raiz do projeto controla qual ambiente está ativo:

```env
# ══════════════════════════════════════════════════════════
# MERCADO PAGO - CONFIGURAÇÃO
# ══════════════════════════════════════════════════════════

# Ambiente: "sandbox" ou "production"
MP_ENV=sandbox

# ── Credenciais de SANDBOX (teste) ──
MP_SANDBOX_PUBLIC_KEY=TEST-acff81f3-8519-44b2-a812-4a07534c49e1
MP_SANDBOX_ACCESS_TOKEN=TEST-995760645258260-112321-dac175b73c8c6a206e1d055f25a956a7-1316234543

# ── Credenciais de PRODUÇÃO ──
MP_PROD_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_PROD_ACCESS_TOKEN=APP_USR-0000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-0000000000

# ── Webhook ──
MP_WEBHOOK_SECRET=sua_assinatura_secreta_aqui

# ── IDs dos Planos no Mercado Pago (preenchidos após criar os planos) ──
MP_PLAN_BASIC=
MP_PLAN_PRO=
MP_PLAN_UNLIMITED=

# URL pública do site (para back_url e webhooks)
APP_URL=https://seusite.com.br
```

### Leitura no PHP

```php
// backend/MercadoPago.php ou onde precisar
function getMPConfig(): array {
    // Ler .env manualmente (ou usar vlucas/phpdotenv)
    $env = parse_ini_file(__DIR__ . '/../.env');

    $isProduction = ($env['MP_ENV'] ?? 'sandbox') === 'production';

    return [
        'env'          => $isProduction ? 'production' : 'sandbox',
        'public_key'   => $isProduction ? $env['MP_PROD_PUBLIC_KEY'] : $env['MP_SANDBOX_PUBLIC_KEY'],
        'access_token' => $isProduction ? $env['MP_PROD_ACCESS_TOKEN'] : $env['MP_SANDBOX_ACCESS_TOKEN'],
        'webhook_secret' => $env['MP_WEBHOOK_SECRET'] ?? '',
        'plans' => [
            'basic'     => $env['MP_PLAN_BASIC'] ?? '',
            'pro'       => $env['MP_PLAN_PRO'] ?? '',
            'unlimited' => $env['MP_PLAN_UNLIMITED'] ?? '',
        ],
        'app_url' => $env['APP_URL'] ?? 'http://localhost:8666',
    ];
}
```

---

## 4. Fluxo Completo da Integração

```
┌──────────────────────────────────────────────────────────────────┐
│                     FLUXO DE ASSINATURA                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SETUP (uma vez)                                              │
│     └─ POST /preapproval_plan  →  Criar planos no MP            │
│        (Básico, Pro, Ilimitado)                                  │
│        Guardar os IDs retornados no .env                         │
│                                                                  │
│  2. CHECKOUT (cada assinatura)                                   │
│     └─ Usuário clica "Assinar" na settings page                 │
│     └─ Backend cria assinatura: POST /preapproval               │
│     └─ MP retorna init_point (URL de checkout)                  │
│     └─ Usuário é redirecionado para pagar no MP                 │
│     └─ Após pagar, volta para back_url                          │
│                                                                  │
│  3. WEBHOOK (automático)                                         │
│     └─ MP envia notificação para sua URL de webhook             │
│     └─ Seu backend recebe, valida e atualiza o plan_id          │
│                                                                  │
│  4. RECORRÊNCIA (automática)                                     │
│     └─ MP cobra automaticamente todo mês                         │
│     └─ Se falhar, tenta mais 3x em 10 dias                     │
│     └─ Se 3 parcelas seguidas falharem, cancela a assinatura   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Etapa 1 — Criar Planos no Mercado Pago

Você precisa criar cada plano **uma única vez** via API. O ID retornado (`preapproval_plan_id`) será usado para criar assinaturas.

### Criar o plano "Básico"

```bash
curl -X POST \
  'https://api.mercadopago.com/preapproval_plan' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "CertificaFacil - Plano Básico",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months",
      "transaction_amount": 29.90,
      "currency_id": "BRL"
    },
    "back_url": "https://seusite.com.br/settings?plan=basic&status=success",
    "payment_methods_allowed": {
      "payment_types": [
        {"id": "credit_card"}
      ]
    }
  }'
```

### Criar o plano "Pro"

```bash
curl -X POST \
  'https://api.mercadopago.com/preapproval_plan' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "CertificaFacil - Plano Profissional",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months",
      "transaction_amount": 59.90,
      "currency_id": "BRL"
    },
    "back_url": "https://seusite.com.br/settings?plan=pro&status=success"
  }'
```

### Criar o plano "Ilimitado"

```bash
curl -X POST \
  'https://api.mercadopago.com/preapproval_plan' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "CertificaFacil - Plano Ilimitado",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months",
      "transaction_amount": 99.90,
      "currency_id": "BRL"
    },
    "back_url": "https://seusite.com.br/settings?plan=unlimited&status=success"
  }'
```

### Resposta de sucesso (exemplo)

```json
{
  "id": "2c938084726fca480172750000000000", // ← Este é o preapproval_plan_id
  "status": "active",
  "reason": "CertificaFacil - Plano Básico",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 29.9,
    "currency_id": "BRL"
  },
  "date_created": "2026-03-02T10:00:00.000-03:00",
  "last_modified": "2026-03-02T10:00:00.000-03:00",
  "init_point": "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c938..."
}
```

**Salve os `id` retornados no `.env`:**

```env
MP_PLAN_BASIC=2c938084726fca480172750000000000
MP_PLAN_PRO=2c938084726fca480172760000000000
MP_PLAN_UNLIMITED=2c938084726fca480172770000000000
```

### Parâmetros opcionais importantes

| Parâmetro                                  | Descrição                                                     |
| ------------------------------------------ | ------------------------------------------------------------- |
| `auto_recurring.repetitions`               | Número máximo de cobranças (omitir = infinito)                |
| `auto_recurring.billing_day`               | Dia fixo do mês para cobrança (1-28)                          |
| `auto_recurring.billing_day_proportional`  | `true` = cobra proporcional na 1ª parcela                     |
| `auto_recurring.free_trial.frequency`      | Duração do trial grátis                                       |
| `auto_recurring.free_trial.frequency_type` | `"days"` ou `"months"`                                        |
| `payment_methods_allowed.payment_types`    | Tipos aceitos: `credit_card`, `debit_card`, `ticket` (boleto) |

### Exemplo com trial grátis de 7 dias

```json
{
  "reason": "CertificaFacil - Plano Básico",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 29.9,
    "currency_id": "BRL",
    "free_trial": {
      "frequency": 7,
      "frequency_type": "days"
    }
  },
  "back_url": "https://seusite.com.br/settings"
}
```

---

## 6. Etapa 2 — Criar Assinatura para o Usuário

Quando o usuário clicar "Assinar" na settings page, seu backend cria uma assinatura associada ao plano:

### Opção A: Redirecionar para checkout do MP (mais simples)

Basta redirecionar o usuário para o `init_point` do plano. O MP cuida de todo o checkout.

```php
// GET /api/subscription/checkout?plan=basic
function handleSubscriptionCheckout() {
    $user = Auth::requireAuth();
    $planSlug = $_GET['plan'] ?? '';

    $config = getMPConfig();
    $planId = $config['plans'][$planSlug] ?? null;

    if (!$planId) {
        json(['ok' => false, 'error' => 'Plano inválido'], 400);
        return;
    }

    // Criar assinatura via API
    $response = mpRequest('POST', '/preapproval', [
        'preapproval_plan_id' => $planId,
        'payer_email' => $user['email'],
        'external_reference' => $user['uid'],  // para identificar o user no webhook
        'back_url' => $config['app_url'] . '/settings?subscription=success',
        'status' => 'pending',  // pending = redireciona para checkout
    ]);

    if (isset($response['init_point'])) {
        json(['ok' => true, 'checkout_url' => $response['init_point']]);
    } else {
        json(['ok' => false, 'error' => 'Erro ao criar assinatura', 'details' => $response], 500);
    }
}
```

### Opção B: Com card_token (pagamento direto, sem redirecionamento)

Para cobrar diretamente sem redirecionar, você precisa primeiro gerar um `card_token_id` no frontend usando o SDK JS do MP:

```html
<!-- No frontend -->
<script src="https://sdk.mercadopago.com/js/v2"></script>
<script>
  const mp = new MercadoPago('PUBLIC_KEY');
  const cardForm = mp.cardForm({
    amount: '29.90',
    iframe: true,
    form: {
      /* ... configuração dos campos */
    },
    callbacks: {
      onFormMounted: (error) => {
        /* form montado */
      },
      onSubmit: (event) => {
        event.preventDefault();
        const { token } = cardForm.getCardFormData();
        // Enviar token para o backend
        fetch('/api/subscription/create', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + localStorage.getItem('cf_token') },
          body: JSON.stringify({ plan: 'basic', card_token_id: token }),
        });
      },
    },
  });
</script>
```

```php
// Backend com card_token
$response = mpRequest('POST', '/preapproval', [
    'preapproval_plan_id' => $planId,
    'payer_email' => $user['email'],
    'card_token_id' => $data['card_token_id'],
    'external_reference' => $user['uid'],
    'status' => 'authorized',  // authorized = cobra direto
]);
```

> **Importante:** Assinatura com plano associado SEMPRE deve ser criada com `card_token_id` e status `authorized` se quiser cobrar diretamente. Se usar status `pending`, o usuário é redirecionado para o checkout do MP.

---

## 7. Etapa 3 — Webhooks (Notificações)

O Mercado Pago envia notificações automáticas quando algo muda em uma assinatura. Seu backend precisa de um endpoint público para receber essas notificações.

### Configuração

**Para Assinaturas, configure o webhook DURANTE a criação da assinatura** (não pelo painel), usando o campo `notification_url`:

```php
$response = mpRequest('POST', '/preapproval', [
    'preapproval_plan_id' => $planId,
    'payer_email' => $user['email'],
    'external_reference' => $user['uid'],
    'back_url' => $config['app_url'] . '/settings',
    'notification_url' => $config['app_url'] . '/api/webhooks/mercadopago?source_news=webhooks',
    'status' => 'pending',
]);
```

### Tópicos relevantes para Assinaturas

| Tópico                            | Descrição                                    |
| --------------------------------- | -------------------------------------------- |
| `payment`                         | Criação/atualização de pagamento individual  |
| `subscription_preapproval`        | Criação/atualização de assinatura            |
| `subscription_preapproval_plan`   | Criação/atualização de plano                 |
| `subscription_authorized_payment` | Pagamento recorrente (parcela da assinatura) |

### Formato da notificação recebida

```json
{
  "id": 12345,
  "live_mode": true,
  "type": "subscription_preapproval",
  "date_created": "2026-03-02T10:04:58.396-03:00",
  "user_id": 44444,
  "api_version": "v1",
  "action": "updated",
  "data": {
    "id": "2c938084726fca480172750000000000"
  }
}
```

### Endpoint de Webhook no backend

```php
// POST /api/webhooks/mercadopago
function handleMercadoPagoWebhook() {
    $config = getMPConfig();

    // 1. Ler o body
    $body = json_decode(file_get_contents('php://input'), true);
    $type = $body['type'] ?? '';
    $dataId = $body['data']['id'] ?? '';

    // 2. Validar assinatura (x-signature header)
    if (!validateWebhookSignature($config['webhook_secret'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid signature']);
        return;
    }

    // 3. Processar por tipo
    switch ($type) {
        case 'subscription_preapproval':
            handleSubscriptionUpdate($dataId, $config);
            break;

        case 'subscription_authorized_payment':
            handlePaymentUpdate($dataId, $config);
            break;

        case 'payment':
            // Pagamento individual — pode ignorar ou logar
            break;
    }

    // 4. SEMPRE retornar 200 ou 201 (senão o MP reenvia)
    http_response_code(200);
    echo json_encode(['ok' => true]);
}

function handleSubscriptionUpdate(string $subscriptionId, array $config) {
    // Buscar dados completos da assinatura na API do MP
    $subscription = mpRequest('GET', "/preapproval/{$subscriptionId}");

    if (!$subscription) return;

    $externalRef = $subscription['external_reference'] ?? ''; // uid do usuário
    $status = $subscription['status'] ?? '';
    $planId = $subscription['preapproval_plan_id'] ?? '';

    // Mapear plano do MP para plano do CertificaFacil
    $planSlug = mapMPPlanToSlug($planId, $config);

    if (!$externalRef || !$planSlug) return;

    $db = Database::getInstance();

    switch ($status) {
        case 'authorized':  // Assinatura ativa
            $localPlan = $db->fetchOne("SELECT id FROM plans WHERE slug = ?", [$planSlug]);
            if ($localPlan) {
                $db->query(
                    "UPDATE users SET plan_id = ?, trial_ends_at = NULL WHERE uid = ?",
                    [$localPlan['id'], $externalRef]
                );
            }
            break;

        case 'paused':      // Assinatura pausada — manter plano atual
            break;

        case 'cancelled':   // Assinatura cancelada — voltar para trial
            $trialPlan = $db->fetchOne("SELECT id FROM plans WHERE slug = 'trial'");
            if ($trialPlan) {
                $db->query(
                    "UPDATE users SET plan_id = ? WHERE uid = ?",
                    [$trialPlan['id'], $externalRef]
                );
            }
            break;
    }
}

function mapMPPlanToSlug(string $mpPlanId, array $config): ?string {
    foreach ($config['plans'] as $slug => $id) {
        if ($id === $mpPlanId) return $slug;
    }
    return null;
}
```

### Validação da assinatura do Webhook (x-signature)

```php
function validateWebhookSignature(string $secret): bool {
    if (empty($secret)) return true; // skip se não configurado

    $xSignature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
    $xRequestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';
    $dataId = $_GET['data.id'] ?? $_GET['data_id'] ?? '';

    if (!$xSignature) return false;

    // Extrair ts e v1 do header
    $parts = explode(',', $xSignature);
    $ts = null;
    $hash = null;

    foreach ($parts as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) === 2) {
            if ($kv[0] === 'ts') $ts = $kv[1];
            if ($kv[0] === 'v1') $hash = $kv[1];
        }
    }

    if (!$ts || !$hash) return false;

    // Montar manifest e gerar HMAC
    $manifest = "id:{$dataId};request-id:{$xRequestId};ts:{$ts};";
    $computed = hash_hmac('sha256', $manifest, $secret);

    return hash_equals($computed, $hash);
}
```

### Ações após receber webhook

| Resposta              | Comportamento do MP                                        |
| --------------------- | ---------------------------------------------------------- |
| HTTP 200 ou 201       | OK, notificação confirmada                                 |
| Qualquer outro código | MP reenvia a cada 15 min (até 3 tentativas, depois espaça) |
| Timeout > 22s         | Considerado falha, reenvia                                 |

### Endpoints para consultar dados após webhook

| Tipo                              | Endpoint                                             |
| --------------------------------- | ---------------------------------------------------- |
| `subscription_preapproval`        | `GET /preapproval/search` ou `GET /preapproval/{id}` |
| `subscription_preapproval_plan`   | `GET /preapproval_plan/search`                       |
| `subscription_authorized_payment` | `GET /authorized_payments/{id}`                      |
| `payment`                         | `GET /v1/payments/{id}`                              |

---

## 8. Etapa 4 — Gerenciamento de Assinaturas

Após criadas, assinaturas podem ser gerenciadas via API:

### Buscar assinaturas

```bash
# Buscar todas as assinaturas (independente do status)
curl -G 'https://api.mercadopago.com/preapproval/search' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d 'status=authorized'
```

### Pausar assinatura

```bash
curl -X PUT \
  'https://api.mercadopago.com/preapproval/{SUBSCRIPTION_ID}' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"status": "paused"}'
```

### Reativar assinatura pausada

```bash
curl -X PUT \
  'https://api.mercadopago.com/preapproval/{SUBSCRIPTION_ID}' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"status": "authorized"}'
```

### Cancelar assinatura

```bash
curl -X PUT \
  'https://api.mercadopago.com/preapproval/{SUBSCRIPTION_ID}' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"status": "cancelled"}'
```

### Alterar valor da assinatura

```bash
curl -X PUT \
  'https://api.mercadopago.com/preapproval/{SUBSCRIPTION_ID}' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "auto_recurring": {
      "transaction_amount": 39.90,
      "currency_id": "BRL"
    }
  }'
```

### Alterar cartão de pagamento

```bash
curl -X PUT \
  'https://api.mercadopago.com/preapproval/{SUBSCRIPTION_ID}' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"card_token_id": "NOVO_CARD_TOKEN"}'
```

### Oferecer trial grátis (no plano)

```bash
curl -X PUT \
  'https://api.mercadopago.com/preapproval_plan/{PLAN_ID}' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "auto_recurring": {
      "free_trial": {
        "frequency": 7,
        "frequency_type": "days"
      }
    }
  }'
```

### Status possíveis de uma assinatura

| Status       | Descrição                          |
| ------------ | ---------------------------------- |
| `pending`    | Aguardando pagamento inicial       |
| `authorized` | Ativa, pagamentos sendo cobrados   |
| `paused`     | Pausada pelo vendedor ou comprador |
| `cancelled`  | Cancelada definitivamente          |

### Lógica de cobranças recusadas

- Quando uma parcela é recusada, o MP tenta novamente **até 4 vezes** em uma janela de **10 dias**
- Se 3 parcelas consecutivas forem recusadas, a assinatura é **cancelada automaticamente**
- O vendedor é notificado por e-mail

---

## 9. Alternar entre Sandbox e Produção

### Passo a passo

1. **No `.env`**, altere `MP_ENV`:

```env
# Para desenvolvimento/testes:
MP_ENV=sandbox

# Para produção (dinheiro real):
MP_ENV=production
```

2. **Importante:** Os IDs dos planos são **diferentes** entre sandbox e produção. Você precisa criar os planos nos dois ambientes:

```env
# Planos de SANDBOX (criados com credenciais TEST-)
MP_SANDBOX_PLAN_BASIC=2c938084xxxSANDBOXxxx
MP_SANDBOX_PLAN_PRO=2c938084xxxSANDBOXxxx
MP_SANDBOX_PLAN_UNLIMITED=2c938084xxxSANDBOXxxx

# Planos de PRODUÇÃO (criados com credenciais APP_USR-)
MP_PROD_PLAN_BASIC=2c938084xxxPRODxxx
MP_PROD_PLAN_PRO=2c938084xxxPRODxxx
MP_PROD_PLAN_UNLIMITED=2c938084xxxPRODxxx
```

3. **No código PHP**, adapte a função `getMPConfig()`:

```php
function getMPConfig(): array {
    $env = parse_ini_file(__DIR__ . '/../.env');
    $isProduction = ($env['MP_ENV'] ?? 'sandbox') === 'production';
    $prefix = $isProduction ? 'MP_PROD' : 'MP_SANDBOX';

    return [
        'env'          => $isProduction ? 'production' : 'sandbox',
        'public_key'   => $env["{$prefix}_PUBLIC_KEY"] ?? '',
        'access_token' => $env["{$prefix}_ACCESS_TOKEN"] ?? '',
        'webhook_secret' => $env['MP_WEBHOOK_SECRET'] ?? '',
        'plans' => [
            'basic'     => $env["{$prefix}_PLAN_BASIC"] ?? '',
            'pro'       => $env["{$prefix}_PLAN_PRO"] ?? '',
            'unlimited' => $env["{$prefix}_PLAN_UNLIMITED"] ?? '',
        ],
        'app_url' => $env['APP_URL'] ?? 'http://localhost:8666',
    ];
}
```

4. **Cuidados na troca:**
   - Nunca use credenciais `TEST-` em produção
   - Nunca use credenciais `APP_USR-` para testes (pagamentos reais!)
   - Os webhooks de teste e produção devem usar URLs diferentes
   - Recrie os planos no ambiente de produção antes de ir live

---

## 10. Testes com Contas e Cartões de Teste

### Criar contas de teste

1. Acesse https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em **Contas de teste**
4. Crie ao menos 2 contas:
   - **Vendedor** (usa credenciais de teste desta conta)
   - **Comprador** (simula quem paga)

### Cartões de teste (Brasil)

| Tipo    | Bandeira   | Número                | CVV    | Validade |
| ------- | ---------- | --------------------- | ------ | -------- |
| Crédito | Mastercard | `5031 4332 1540 6351` | `123`  | `11/30`  |
| Crédito | Visa       | `4235 6477 2802 5682` | `123`  | `11/30`  |
| Crédito | Amex       | `3753 6515 3556 885`  | `1234` | `11/30`  |
| Débito  | Elo        | `5067 7667 8388 8311` | `123`  | `11/30`  |

### Cenários de teste (nome do titular)

| Nome do titular | CPF           | Resultado                         |
| --------------- | ------------- | --------------------------------- |
| `APRO`          | `12345678909` | Pagamento **aprovado**            |
| `OTHE`          | `12345678909` | **Recusado** (erro geral)         |
| `CONT`          | —             | Pagamento **pendente**            |
| `FUND`          | —             | Recusado (saldo insuficiente)     |
| `SECU`          | —             | Recusado (CVV inválido)           |
| `EXPI`          | —             | Recusado (cartão vencido)         |
| `CALL`          | —             | Recusado (autorização necessária) |
| `FORM`          | —             | Recusado (erro no formulário)     |

### Como testar

1. Configure o `.env` com `MP_ENV=sandbox` e credenciais `TEST-`
2. Crie os planos usando as credenciais de teste
3. No checkout, use os cartões e nomes acima
4. Verifique se o webhook é chamado e o plano do usuário muda

---

## 11. Implementação no Backend PHP

### Função auxiliar para chamadas à API do MP

```php
/**
 * Faz uma requisição HTTP para a API do Mercado Pago.
 */
function mpRequest(string $method, string $endpoint, ?array $data = null): ?array {
    $config = getMPConfig();
    $url = 'https://api.mercadopago.com' . $endpoint;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $config['access_token'],
            'Content-Type: application/json',
            'X-Idempotency-Key: ' . uniqid('mp_', true),  // evita cobranças duplicadas
        ],
    ]);

    switch (strtoupper($method)) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            break;
        case 'PUT':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            break;
        case 'GET':
            if ($data) {
                $url .= '?' . http_build_query($data);
                curl_setopt($ch, CURLOPT_URL, $url);
            }
            break;
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log("MP API Error: {$error}");
        return null;
    }

    $decoded = json_decode($response, true);

    if ($httpCode >= 400) {
        error_log("MP API HTTP {$httpCode}: " . ($response ?: 'empty'));
    }

    return $decoded;
}
```

### Rotas sugeridas para o `api.php`

```php
// No switch de rotas do api.php, adicionar:

// ── Mercado Pago / Assinaturas ──
case $uri === '/api/subscription/checkout' && $method === 'GET':
    handleSubscriptionCheckout();
    break;

case $uri === '/api/subscription/status' && $method === 'GET':
    handleSubscriptionStatus();
    break;

case $uri === '/api/subscription/cancel' && $method === 'POST':
    handleSubscriptionCancel();
    break;

case $uri === '/api/webhooks/mercadopago' && $method === 'POST':
    handleMercadoPagoWebhook();
    break;
```

### Guardar dados de assinatura no banco

Considere adicionar uma tabela para histórico:

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT          NOT NULL,
  mp_subscription_id VARCHAR(100) NOT NULL,
  mp_plan_id        VARCHAR(100) NOT NULL,
  plan_slug         VARCHAR(50)  NOT NULL,
  status            VARCHAR(30)  NOT NULL DEFAULT 'pending',
  payer_email       VARCHAR(255) NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_mp_sub (mp_subscription_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;
```

---

## 12. Tabela de Referência dos Planos CertificaFacil

| Slug        | Nome           | Preço    | Certificados/mês | Templates | Lote | Fontes custom |
| ----------- | -------------- | -------- | ---------------- | --------- | ---- | ------------- |
| `trial`     | Trial (7 dias) | R$ 0,00  | 5                | 2         | ❌   | ❌            |
| `basic`     | Básico         | R$ 29,90 | 25               | 5         | ✅   | ❌            |
| `pro`       | Profissional   | R$ 59,90 | 50               | 20        | ✅   | ✅            |
| `unlimited` | Ilimitado      | R$ 99,90 | Ilimitado        | Ilimitado | ✅   | ✅            |

> O plano `trial` **não** é cobrado via Mercado Pago — é o plano padrão de todo usuário novo.

---

## 13. Checklist de Go-Live

### Antes de ir para produção

- [ ] Criar aplicação no painel do MP Developers
- [ ] Ativar credenciais de produção (informar indústria + URL)
- [ ] Criar os 3 planos (basic, pro, unlimited) com credenciais de **produção**
- [ ] Salvar os IDs dos planos de produção no `.env`
- [ ] Configurar `MP_ENV=production` no `.env`
- [ ] Colocar as credenciais `APP_USR-` no `.env`
- [ ] Configurar URL de webhook de produção
- [ ] Configurar a assinatura secreta (webhook signature) no `.env`
- [ ] Testar o fluxo completo em sandbox primeiro
- [ ] Garantir que o endpoint de webhook retorna HTTP 200
- [ ] Garantir que o servidor tem HTTPS (obrigatório para webhooks)
- [ ] Configurar `APP_URL` com a URL pública real (HTTPS)

### Após ir para produção

- [ ] Monitorar logs de webhook por erros
- [ ] Verificar no painel do MP se as notificações estão sendo entregues
- [ ] Fazer uma assinatura real de teste (pode cancelar imediatamente)
- [ ] Verificar se o plano do usuário muda corretamente no banco

---

## Links Úteis

| Recurso                         | URL                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Painel do Desenvolvedor         | https://www.mercadopago.com.br/developers/panel/app                                                                         |
| Documentação Assinaturas        | https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview                                                    |
| Assinaturas com plano           | https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-associated-plan      |
| Referência API preapproval_plan | https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval_plan/post                                 |
| Referência API preapproval      | https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post                                      |
| Webhooks                        | https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks |
| Cartões de teste                | https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/test/cards             |
| Contas de teste                 | https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/test/accounts          |
| Gerenciamento de assinaturas    | https://www.mercadopago.com.br/developers/pt/docs/subscriptions/subscription-management                                     |
| Taxas do Mercado Pago           | https://www.mercadopago.com.br/ajuda/33399                                                                                  |

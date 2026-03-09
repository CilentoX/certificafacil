# Cloudflared Tunnel — Guia de Configuração

> Expor o CertificaFacil local na internet via **Named Tunnel** com domínio fixo.
> Domínio: **`certificafacil.cilentox.space`**
> Necessário para testar webhooks do Mercado Pago em desenvolvimento.

---

## Índice

1. [Por que usar Cloudflared?](#1-por-que-usar-cloudflared)
2. [Instalação](#2-instalação)
3. [Configuração do Named Tunnel](#3-configuração-do-named-tunnel)
4. [Iniciar o Tunnel](#4-iniciar-o-tunnel)
5. [URLs do Projeto](#5-urls-do-projeto)
6. [Configurar Webhook no Mercado Pago](#6-configurar-webhook-no-mercado-pago)
7. [Arquivo .env](#7-arquivo-env)
8. [Testar Conectividade](#8-testar-conectividade)
9. [Script Automático (start_tunnel.bat)](#9-script-automático-start_tunnelbat)
10. [Troubleshooting](#10-troubleshooting)
11. [Observações Importantes](#11-observações-importantes)

---

## 1. Por que usar Cloudflared?

O Mercado Pago envia notificações (webhooks) via HTTP POST para uma URL **pública**. Como o ambiente de desenvolvimento roda em `localhost:8666`, é impossível receber webhooks diretamente.

O **Cloudflare Tunnel** cria um túnel seguro entre o seu computador e a rede da Cloudflare, gerando uma URL pública HTTPS que redireciona todo o tráfego para o seu localhost.

```
Mercado Pago ─── HTTPS POST ───▶ https://certificafacil.cilentox.space/api/webhooks/mercadopago
                                         │
                                         ▼
                              Cloudflare Network (proxy reverso)
                                         │
                                         ▼
                              localhost:8666/api/webhooks/mercadopago
                                         │
                                         ▼
                                 router.php → api.php
```

---

## 2. Instalação

### Windows (winget)

```powershell
winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
```

> Após instalação, o executável fica em `C:\Cloudflared\cloudflared.exe`.
> Se não estiver no PATH, use o caminho completo.

### Verificar instalação

```powershell
C:\Cloudflared\cloudflared.exe --version
# Esperado: cloudflared version 2025.x.x
```

### Alternativas de instalação

| Método              | Comando                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Chocolatey**      | `choco install cloudflared`                                                                      |
| **Scoop**           | `scoop install cloudflared`                                                                      |
| **Download direto** | [github.com/cloudflare/cloudflared/releases](https://github.com/cloudflare/cloudflared/releases) |

---

## 3. Configuração do Named Tunnel

O Named Tunnel já foi configurado. Abaixo estão os dados e os passos que foram executados (para referência).

### Dados do Tunnel

| Item            | Valor                                                      |
| --------------- | ---------------------------------------------------------- |
| **Nome**        | `certificafacil`                                           |
| **ID**          | `b0107ec0-2c75-4cdd-a68f-11d4e6e05118`                     |
| **Domínio**     | `certificafacil.cilentox.space`                            |
| **Protocolo**   | HTTP/2 (TCP)                                               |
| **Credentials** | `~/.cloudflared/b0107ec0-2c75-4cdd-a68f-11d4e6e05118.json` |
| **Config**      | `~/.cloudflared/config.yml`                                |

### Passos executados (já feitos)

```powershell
# 1. Login (abre o navegador para autorizar)
C:\Cloudflared\cloudflared.exe tunnel login

# 2. Criar o tunnel
C:\Cloudflared\cloudflared.exe tunnel create certificafacil

# 3. Criar rota DNS (CNAME automático no Cloudflare)
C:\Cloudflared\cloudflared.exe tunnel route dns certificafacil certificafacil.cilentox.space
```

### config.yml (`~/.cloudflared/config.yml`)

```yaml
tunnel: b0107ec0-2c75-4cdd-a68f-11d4e6e05118
credentials-file: C:\Users\Lucas.Cilento\.cloudflared\b0107ec0-2c75-4cdd-a68f-11d4e6e05118.json
protocol: http2

ingress:
  - hostname: certificafacil.cilentox.space
    service: http://localhost:8666
  - service: http_status:404
```

> ℹ️ O protocolo foi definido como `http2` (TCP) porque QUIC (UDP) é bloqueado em algumas redes corporativas.

---

## 4. Iniciar o Tunnel

### Pré-requisito: servidor PHP rodando

```powershell
cd C:\Users\Lucas.Cilento\Desktop\certificados
C:\xampp\php\php.exe -S localhost:8666 router.php
```

### Iniciar o Named Tunnel (em outro terminal)

```powershell
C:\Cloudflared\cloudflared.exe tunnel run certificafacil
```

### Saída esperada

```
INF Registered tunnel connection connIndex=0 ... location=gru13 protocol=http2
INF Registered tunnel connection connIndex=1 ... location=gru02 protocol=http2
INF Registered tunnel connection connIndex=2 ... location=gru20 protocol=http2
INF Registered tunnel connection connIndex=3 ... location=gru19 protocol=http2
```

> ✅ **A URL é fixa:** `https://certificafacil.cilentox.space` — não muda entre reinícios!

---

## 5. URLs do Projeto

Todas as URLs usam o domínio fixo `https://certificafacil.cilentox.space`.

### Páginas

| Rota Local                       | URL Pública                                      |
| -------------------------------- | ------------------------------------------------ |
| `http://localhost:8666/`         | `https://certificafacil.cilentox.space/`         |
| `http://localhost:8666/login`    | `https://certificafacil.cilentox.space/login`    |
| `http://localhost:8666/register` | `https://certificafacil.cilentox.space/register` |
| `http://localhost:8666/app`      | `https://certificafacil.cilentox.space/app`      |
| `http://localhost:8666/settings` | `https://certificafacil.cilentox.space/settings` |
| `http://localhost:8666/admin`    | `https://certificafacil.cilentox.space/admin`    |

### API Endpoints

| Endpoint       | Método   | URL Pública                                                          |
| -------------- | -------- | -------------------------------------------------------------------- |
| Login          | POST     | `https://certificafacil.cilentox.space/api/auth/login`               |
| Register       | POST     | `https://certificafacil.cilentox.space/api/auth/register`            |
| Profile        | PUT      | `https://certificafacil.cilentox.space/api/profile`                  |
| Password       | PUT      | `https://certificafacil.cilentox.space/api/password`                 |
| Sessions       | GET      | `https://certificafacil.cilentox.space/api/sessions`                 |
| Revoke Session | DELETE   | `https://certificafacil.cilentox.space/api/sessions/{id}`            |
| **Webhook MP** | **POST** | **`https://certificafacil.cilentox.space/api/webhooks/mercadopago`** |

---

## 6. Configurar Webhook no Mercado Pago

### Opção A — Via `notification_url` na criação da assinatura (Recomendado)

Ao criar uma assinatura via API, inclua o campo `notification_url`:

```php
$body = [
    'preapproval_plan_id' => $planId,
    'card_token_id'       => $cardToken,
    'payer_email'         => $email,
    'external_reference'  => $userUid,
    'notification_url'    => 'https://certificafacil.cilentox.space/api/webhooks/mercadopago?source_news=webhooks',
];
```

### Opção B — Via Painel do Mercado Pago

1. Acesse: [https://www.mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação
3. Vá em **Webhooks** → **Configuração de produção** ou **Modo Sandbox**
4. Defina a **URL de notificação**:
   ```
   https://certificafacil.cilentox.space/api/webhooks/mercadopago?source_news=webhooks
   ```
5. Selecione os eventos:
   - ✅ `subscription_preapproval` (assinaturas)
   - ✅ `subscription_authorized_payment` (pagamentos de assinatura)
6. Salve

### URL de webhook completa

```
https://certificafacil.cilentox.space/api/webhooks/mercadopago?source_news=webhooks
```

---

## 7. Arquivo .env

Como usamos Named Tunnel com domínio fixo, a `APP_URL` **não precisa ser alterada** entre reinícios:

```ini
# ── Aplicação ──
APP_URL=https://certificafacil.cilentox.space

# ── Mercado Pago (Sandbox) ──
PUBLIC_KEY=TEST-acff81f3-8519-44b2-a812-4a07534c49e1
ACCESS_TOKEN=TEST-995760645258260-112321-dac175b73c8c6a206e1d055f25a956a7-1316234543
MP_WEBHOOK_SECRET=sua_assinatura_secreta_aqui
```

No backend PHP, use `APP_URL` para montar a `notification_url`:

```php
$config = loadEnv();
$notificationUrl = $config['app_url'] . '/api/webhooks/mercadopago?source_news=webhooks';
// Resultado: https://certificafacil.cilentox.space/api/webhooks/mercadopago?source_news=webhooks
```

---

## 8. Testar Conectividade

### Teste 1 — Acessar pelo navegador

Abra no navegador:

```
https://certificafacil.cilentox.space
```

Deve carregar a landing page do CertificaFacil.

### Teste 2 — cURL no terminal

```powershell
Invoke-WebRequest -Uri "https://certificafacil.cilentox.space" -UseBasicParsing | Select-Object StatusCode
# Esperado: StatusCode 200
```

### Teste 3 — Simular webhook do Mercado Pago

```powershell
$body = @{
    action = "payment"
    api_version = "v1"
    data = @{ id = "123456789" }
    date_created = "2025-01-01T00:00:00Z"
    id = 987654321
    live_mode = $false
    type = "payment"
    user_id = "1316234543"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Method POST `
  -Uri "https://certificafacil.cilentox.space/api/webhooks/mercadopago?source_news=webhooks" `
  -ContentType "application/json" `
  -Body $body
```

### Teste 4 — Verificar logs do PHP

No terminal do servidor PHP, você verá as requisições recebidas:

```
[Sun Mar  2 13:34:50 2026] 127.0.0.1:12345 Accepted
[Sun Mar  2 13:34:50 2026] 127.0.0.1:12345 [200]: POST /api/webhooks/mercadopago
```

---

## 9. Script Automático (start_tunnel.bat)

Crie o arquivo `start_tunnel.bat` na raiz do projeto para iniciar tudo de uma vez:

```bat
@echo off
title CertificaFacil - Tunnel + Server
echo ============================================
echo   CertificaFacil - Iniciando ambiente
echo ============================================
echo.

:: Iniciar servidor PHP em background
echo [1/2] Iniciando servidor PHP na porta 8666...
start "PHP Server" /min cmd /c "cd /d %~dp0 && C:\xampp\php\php.exe -S localhost:8666 router.php"
timeout /t 2 /nobreak > nul

:: Iniciar Named Tunnel
echo [2/2] Iniciando Cloudflare Named Tunnel...
echo.
echo  Dominio: https://certificafacil.cilentox.space
echo.
echo ============================================
C:\Cloudflared\cloudflared.exe tunnel run certificafacil
```

### Uso:

```powershell
.\start_tunnel.bat
```

---

## 10. Troubleshooting

### Problema: "cloudflared não reconhecido"

O executável não está no PATH. Use o caminho completo:

```powershell
C:\Cloudflared\cloudflared.exe tunnel run certificafacil
```

Ou adicione ao PATH:

```powershell
$env:PATH += ";C:\Cloudflared"
```

### Problema: "failed to dial to edge with quic: timeout"

QUIC (UDP) está bloqueado pela rede/firewall. Adicione `protocol: http2` no `config.yml`:

```yaml
tunnel: b0107ec0-2c75-4cdd-a68f-11d4e6e05118
credentials-file: C:\Users\Lucas.Cilento\.cloudflared\b0107ec0-...json
protocol: http2 # <── forçar TCP

ingress:
  - hostname: certificafacil.cilentox.space
    service: http://localhost:8666
  - service: http_status:404
```

### Problema: "connection refused" ou "Bad Gateway"

O servidor PHP não está rodando. Verifique:

```powershell
Test-NetConnection -ComputerName localhost -Port 8666
# Deve retornar TcpTestSucceeded: True
```

### Problema: Avisos sobre "certificate pool"

Mensagem informativa, **não é erro**:

- `does not support loading the system root certificate pool on Windows` — Não afeta o funcionamento

### Problema: Webhook não chega

1. Verifique se o tunnel está ativo: `https://certificafacil.cilentox.space` acessível no navegador
2. Verifique se a rota `/api/webhooks/mercadopago` está implementada no `api.php`
3. Verifique se a `notification_url` na assinatura usa `https://certificafacil.cilentox.space`
4. Confira os logs do PHP no terminal do servidor

### Problema: Tunnel deletado acidentalmente

Recrie com:

```powershell
C:\Cloudflared\cloudflared.exe tunnel create certificafacil
C:\Cloudflared\cloudflared.exe tunnel route dns certificafacil certificafacil.cilentox.space
# Atualize o tunnel ID no config.yml
```

---

## 11. Observações Importantes

| Item                 | Detalhe                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Gratuito**         | Named Tunnels são gratuitos com conta Cloudflare                                                      |
| **URL fixa**         | `https://certificafacil.cilentox.space` — não muda entre reinícios                                    |
| **HTTPS automático** | Cloudflare fornece certificado SSL automaticamente                                                    |
| **Protocolo**        | HTTP/2 (TCP) — compatível com redes corporativas                                                      |
| **Datacenter**       | GRU (Guarulhos/SP) — latência mínima                                                                  |
| **4 conexões**       | O tunnel mantém 4 conexões simultâneas para redundância                                               |
| **Produção**         | Este mesmo tunnel pode ser usado em produção. Para alta disponibilidade, instale como serviço Windows |

### Instalar como serviço Windows (opcional)

```powershell
# Executar como Administrador
C:\Cloudflared\cloudflared.exe service install
```

Isso registra o cloudflared como serviço do Windows, iniciando automaticamente com o sistema.

---

## Resumo Rápido

```powershell
# 1. Terminal 1 — Servidor PHP
cd C:\Users\Lucas.Cilento\Desktop\certificados
C:\xampp\php\php.exe -S localhost:8666 router.php

# 2. Terminal 2 — Named Tunnel
C:\Cloudflared\cloudflared.exe tunnel run certificafacil

# 3. Acessar
# https://certificafacil.cilentox.space

# 4. Webhook URL (já configurada no .env):
# https://certificafacil.cilentox.space/api/webhooks/mercadopago?source_news=webhooks
```

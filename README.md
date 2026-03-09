# CertificaFacil

This workspace is a professional certificate generator with a modern Canva-inspired interface.

## New Features & Improvements

- **Canva-like UI:** Sidebar for tools, contextual property bar, and a centered canvas workspace.
- **Organized Frontend:** Separated logic into `api.js`, `state.js`, `canvas.js`, and `main.js`.
- **High Quality Rendering:** Improved PDF text insertion and high-quality raster overlays for custom fonts.
- **Smart Configs:** Configurations (positions, fonts, colors) are saved per template and synced with the server.
- **Improved Drag & Drop:** Smoother movement, resizing, and image rotation support.
- **Modern Aesthetics:** Using Inter font and Lucide icons for a clean, professional look.

## Quick Start (Docker)

1. **Configure o ambiente:**

   ```bash
   cp .env.example .env
   # Edite o .env com suas configurações
   ```

2. **Suba os containers:**

   ```bash
   docker compose up -d --build
   ```

3. **Acesse:**
   Abra `http://localhost:8666` no navegador.
   - **Admin padrão:** `admin@certificafacil.com` / `admin123`

4. **Parar:**

   ```bash
   docker compose down
   ```

5. **Logs:**

   ```bash
   docker compose logs -f app
   ```

## Quick Start (Local / Desenvolvimento)

1. **Backend:**

   ```powershell
   .\start_php.bat
   ```

   (Ou manualmente: `php -S localhost:8666 router.php`)

2. **Frontend:**
   Abra `http://localhost:8666` no navegador.

## Variáveis de Ambiente

| Variável       | Descrição                  | Padrão                      |
| -------------- | -------------------------- | --------------------------- |
| `APP_URL`      | URL pública da aplicação   | `http://localhost:8666`     |
| `APP_PORT`     | Porta do host (Docker)     | `8666`                      |
| `DB_HOST`      | Host do MySQL              | `db` (Docker) / `localhost` |
| `DB_PORT`      | Porta do MySQL             | `3306`                      |
| `DB_NAME`      | Nome do banco              | `certificafacil`            |
| `DB_USER`      | Usuário do banco           | `certificafacil`            |
| `DB_PASS`      | Senha do banco             | `certificafacil_secret`     |
| `PUBLIC_KEY`   | Chave pública Mercado Pago | -                           |
| `ACCESS_TOKEN` | Token Mercado Pago         | -                           |

## Project Structure

- `backend/api.php`: PHP API routes and handlers.
- `backend/CertificateEngine.php`: PDF generation engine using TCPDF + FPDI + GD.
- `backend/Auth.php`: Authentication system.
- `backend/Database.php`: PDO/MySQL connection.
- `backend/MercadoPago.php`: Mercado Pago subscription integration.
- `frontend/`: HTML, CSS, JS frontend.
  - `js/`: Modular JavaScript logic (`api.js`, `state.js`, `canvas.js`, `main.js`).
- `assets/`: Templates, fonts, images, and saved configurations.
- `config/`: Database configuration.
- `database/`: SQL schema.
- `docker/`: Docker configuration files (nginx, php, supervisor).

# PSOE CERA Monitor — Guía de despliegue completa

## Arquitectura

```
psoe-monitor/
├── backend/          → FastAPI en Railway  (scrapers + API + scheduler)
├── frontend/         → React en Netlify    (dashboard)
└── netlify.toml      → config Netlify
```

**Flujo de datos:**

```
Redes sociales → Backend (Railway) → JSON en volumen → API REST → Frontend (Netlify)
```

---

## PASO 1 — Requisitos previos

- Git instalado y cuenta en **GitHub**
- Cuenta en **Railway** (railway.app) — plan Hobby mínimo (~$5/mes)
- Cuenta en **Netlify** (netlify.com) — plan gratuito suficiente
- Python 3.11+ en local para pruebas
- Node.js 20+ en local

---

## PASO 2 — Preparar el repositorio

```bash
# 1. Crea repo en GitHub (privado recomendado)
# 2. Clona y añade el código
git init psoe-monitor
cd psoe-monitor
# Copia los ficheros de este proyecto aquí

git add .
git commit -m "feat: PSOE CERA Monitor v2.0"
git remote add origin https://github.com/TU_USUARIO/psoe-monitor.git
git push -u origin main
```

---

## PASO 3 — Desplegar el backend en Railway

### 3.1 Crear proyecto

1. Entra en [railway.app](https://railway.app) → **New Project**
2. Selecciona **Deploy from GitHub repo** → elige `psoe-monitor`
3. Railway detecta el `railway.toml` automáticamente

### 3.2 Configurar el Root Directory

En Railway → Settings → **Source** → Root Directory: `backend`

### 3.3 Añadir volumen persistente

1. En tu servicio Railway → **Add Volume**
2. Mount path: `/data`
3. Esto garantiza que el JSON de histórico no se borra al redeploy

### 3.4 Variables de entorno

En Railway → **Variables** → añade una a una:

| Variable | Valor |
|----------|-------|
| `KEYWORDS` | `Paco Salazar,PSOE Argentina CERA,voto CERA Andalucía,Pilar Cancela,Ley Memoria Democrática` |
| `TIKTOK_KEYWORDS` | `Paco Salazar,voto CERA,Pilar Cancela` |
| `INSTA_ACCOUNTS` | `psoe_argentina,elespanol` |
| `FB_PAGES` | `PSOE,elespanolcom,rtve` |
| `INSTA_USER` | *(cuenta burner de Instagram)* |
| `INSTA_PASS` | *(contraseña cuenta burner)* |
| `TIKTOK_MS_TOKEN` | *(ver instrucciones abajo)* |
| `ALLOWED_ORIGINS` | `https://tu-sitio.netlify.app` |
| `DATA_DIR` | `/data` |
| `MAX_HISTORY` | `90` |

### 3.5 Obtener el TIKTOK_MS_TOKEN

1. Abre Chrome → [tiktok.com](https://tiktok.com) → inicia sesión
2. F12 → Application → Cookies → `tiktok.com`
3. Busca la cookie llamada `msToken` → copia el valor

### 3.6 Verificar despliegue

Railway te dará una URL pública tipo:
`https://psoe-monitor-backend.up.railway.app`

Comprueba en el navegador:
- `https://tu-backend.up.railway.app/` → `{"status": "online"}`
- `https://tu-backend.up.railway.app/docs` → Swagger UI interactivo

---

## PASO 4 — Primer scrape manual

Desde la Swagger UI (`/docs`) o con curl:

```bash
curl -X POST https://tu-backend.up.railway.app/api/update
```

Respuesta inmediata: `{"status": "started", ...}`

El scrape corre en background (~60-90 segundos). Después:

```bash
curl https://tu-backend.up.railway.app/api/status
```

Deberías ver `last_update` con la fecha/hora actual.

---

## PASO 5 — Desplegar el frontend en Netlify

### 5.1 Conectar repositorio

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Selecciona tu repo `psoe-monitor`
3. Netlify detecta el `netlify.toml` automáticamente
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`

### 5.2 Variables de entorno en Netlify

**Site settings → Environment variables → Add variable:**

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://tu-backend.up.railway.app` |

### 5.3 Deploy

Haz clic en **Deploy site**. En ~2 minutos tendrás la URL:
`https://nombre-aleatorio.netlify.app`

Puedes cambiarla en **Domain settings**.

### 5.4 Actualizar ALLOWED_ORIGINS en Railway

Ahora que tienes la URL de Netlify, actualiza en Railway:
`ALLOWED_ORIGINS = https://tu-sitio.netlify.app`

---

## PASO 6 — Funcionamiento automático

El scheduler en el backend lanza un scrape automático cada día a las **08:00**.
Puedes forzar actualizaciones manuales desde el botón del dashboard
o llamando a `POST /api/update`.

---

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/status` | Estado general y última actualización |
| GET | `/api/history?days=30` | Histórico completo de entradas |
| GET | `/api/sentiment-series?days=30` | Serie temporal de sentimiento por día |
| GET | `/api/feed?platform=X&limit=30` | Posts más recientes (filtrables) |
| GET | `/api/wordfreq?days=7` | Frecuencia de palabras últimos N días |
| GET | `/api/scenarios` | Escenarios electorales Andalucía 2026 |
| POST | `/api/update` | Lanza scrape manual en background |
| GET | `/docs` | Swagger UI (solo en desarrollo) |

---

## Notas sobre los scrapers

### X (Twitter)
Usa **ntscraper** vía instancias públicas de Nitter. Sin API key.
Puede fallar si todas las instancias de Nitter están caídas.
Alternativa de pago: API oficial de X ($100/mes).

### Instagram
Instaloader accede a perfiles **públicos** sin login.
Con cuenta burner en `INSTA_USER/INSTA_PASS` accede a más contenido
y evita bloqueos por rate limiting.

### Facebook
facebook-scraper accede a páginas **públicas**.
Facebook bloquea con frecuencia — si falla, los errores
se registran en el campo `errors` de cada entry.

### TikTok
Requiere `msToken` activo. Caduca cada ~30 días.
Renovar entrando a tiktok.com y extrayendo la cookie de nuevo.

---

## Desarrollo local

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env              # Edita con tus credenciales
uvicorn main:app --reload --port 8000

# Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env              # VITE_API_URL=http://localhost:8000
npm run dev
# Abre http://localhost:5173
```

---

## Costes estimados

| Servicio | Plan | Coste |
|----------|------|-------|
| Railway (backend) | Hobby | ~$5-10/mes según uso |
| Railway (volumen 1GB) | Incluido en Hobby | $0 |
| Netlify (frontend) | Free | $0 |
| **Total** | | **~$5-10/mes** |

---

*TRC Campaigns · PSOE CERA Monitor v2.0 · Abril 2026*

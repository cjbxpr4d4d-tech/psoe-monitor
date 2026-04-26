# PSOE CERA Monitor - Instrucciones de despliegue

## Arquitectura

```
backend/   --> FastAPI en Railway  (scrapers + API + scheduler diario)
frontend/  --> React en Netlify    (dashboard)
```

---

## PASO 1 - Subir a GitHub

```bash
git init
git add .
git commit -m "PSOE CERA Monitor v2.0"
git remote add origin https://github.com/TU_USUARIO/psoe-monitor.git
git push -u origin main
```

---

## PASO 2 - Backend en Railway

1. railway.app --> New Project --> Deploy from GitHub
2. Selecciona el repo psoe-monitor
3. Settings --> Source --> Root Directory: backend
4. Add Volume --> Mount path: /data
5. Variables --> anadir:

| Variable         | Valor                                              |
|------------------|----------------------------------------------------|
| KEYWORDS         | Paco Salazar,PSOE Argentina CERA,voto CERA Andalucia,Pilar Cancela |
| INSTA_ACCOUNTS   | psoe_argentina,elespanol                           |
| FB_PAGES         | PSOE,elespanolcom,rtve                             |
| INSTA_USER       | (cuenta burner Instagram)                          |
| INSTA_PASS       | (password cuenta burner)                           |
| ALLOWED_ORIGINS  | https://tu-sitio.netlify.app                       |
| DATA_DIR         | /data                                              |
| MAX_HISTORY      | 90                                                 |

6. Railway te da URL tipo: https://psoe-monitor.up.railway.app
7. Verificar: https://tu-backend.up.railway.app/ debe responder {"status":"online"}

---

## PASO 3 - Primer scrape

```bash
curl -X POST https://tu-backend.up.railway.app/api/update
```

Espera ~60 segundos y verifica:
```bash
curl https://tu-backend.up.railway.app/api/status
```

---

## PASO 4 - Frontend en Netlify

1. netlify.com --> Add new site --> Import from Git
2. Selecciona el repo psoe-monitor
3. Netlify detecta netlify.toml automaticamente
4. Site settings --> Environment variables --> anadir:
   VITE_API_URL = https://tu-backend.up.railway.app
5. Trigger deploy

---

## Endpoints disponibles

GET  /                          Health check
GET  /api/status                Estado y ultima actualizacion
GET  /api/sentiment-series      Serie temporal de sentimiento
GET  /api/feed                  Posts recientes (param: platform, limit)
GET  /api/wordfreq              Frecuencia de terminos (param: days)
GET  /api/scenarios             Escenarios electorales Andalucia 2026
POST /api/update                Lanza scrape manual en background
GET  /docs                      Swagger UI

---

## Coste estimado

Railway Hobby:  ~$5-10/mes
Netlify Free:   $0/mes

---

TRC Campaigns - PSOE CERA Monitor v2.0

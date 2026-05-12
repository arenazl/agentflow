# AgentFlow — Coldwell Banker Beyker

Plataforma de gestión interna para vendedores inmobiliarios. Stack canónico React + Python siguiendo `d:\Code\APP_GUIDE\APP_GUIDE_MASTER.md`.

## Stack

- **Backend:** FastAPI 0.104 + SQLAlchemy async + aiomysql + Aiven MySQL + JWT (python-jose)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind + sonner + lucide-react
- **AI:** Gemini 2.5 Flash (REST via httpx)
- **Mail:** Brevo SMTP
- **Storage:** Cloudinary
- **Hosting:** Heroku (back) + Netlify (front)

## Estructura

```
agentflow/
├── backend/         FastAPI + SQLAlchemy
│   ├── api/         routers
│   ├── core/        config, db, security
│   ├── models/      SQLAlchemy models
│   ├── schemas/     Pydantic schemas
│   ├── services/    Gemini, email, Cloudinary
│   ├── screens/     manuales AI Coach por pantalla
│   ├── scripts/     create_database, init_db, seed_demo, seed_whatsapp_mock
│   ├── main.py
│   ├── run.py       entrypoint local (fix SelectorEventLoop Windows)
│   ├── Procfile     gunicorn + uvicorn workers
│   ├── runtime.txt  python-3.11.7
│   └── requirements.txt
│
├── frontend/        React + Vite
│   ├── src/
│   │   ├── components/  Layout, AICoachPanel, SideModal, ConfirmModal, ABMPage, etc.
│   │   ├── contexts/    AuthContext, ThemeContext
│   │   ├── hooks/       useVoiceInput
│   │   ├── pages/       Dashboard, DMO, Inbox WhatsApp, Clientes, etc.
│   │   ├── services/    api.ts (axios + interceptors)
│   │   └── types/       interfaces TS
│   ├── public/logos/    isotype + primary Coldwell Banker
│   ├── vite.config.ts   port 5200 strictPort
│   └── netlify.toml
│
├── .env.example     (en backend/ y frontend/)
└── .gitignore
```

## Setup local

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # completar con valores de d:\Code\APP_GUIDE\.env.master
python scripts/create_database.py
python scripts/init_db.py
python scripts/seed_demo.py
python scripts/seed_whatsapp_mock.py
python run.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abrir `http://localhost:5200`. Backend en `8200`.

## Cuentas demo (password todas: `admin123`)

| Email | Rol |
|---|---|
| admin@beyker.demo | admin |
| gerente@beyker.demo | gerente (Patricio Bagur) |
| lautaro@beyker.demo | vendedor (template Beyker AR) |
| romina@beyker.demo | vendedor (template Beyker AR) |
| federico@beyker.demo | vendedor (template Beyker AR) |
| camila@beyker.demo | vendedor (template Buffini) |
| martin@beyker.demo | vendedor (template Tom Ferry) |

## Deploy

- **Backend** → Heroku Eco (`agentflow-back` o lo que se elija al `heroku create`)
- **Frontend** → Netlify (`agentflow.netlify.app`)
- **Auto-deploy:** push a `main` dispara GitHub Action que pushea `backend/` a Heroku. Netlify se conecta directo al repo y rebuildea en cada push (base directory: `frontend`).

## Documentación

- Guía maestra de stack: `d:\Code\APP_GUIDE\APP_GUIDE_MASTER.md`
- Catálogo de componentes UI: sección 7 del MASTER
- Manuales AI Coach por pantalla: `backend/screens/*.md`
- Investigación de mercado + roadmap: `docs/INVESTIGACION_E_IMPLEMENTACION.md`

## Integraciones futuras (pendientes)

### Tokko Broker (CRM externo)

**Estado:** documentado, no implementado todavía.

Beyker tiene su catálogo de propiedades en **Tokko Broker** (~39 propiedades del branch 86005 "Coldwell Banker Beyker"). Tokko expone una API REST en `https://www.tokkobroker.com/api/v1/property/?key=<TOKEN>&limit=100`. La idea es:

- AgentFlow lee propiedades de Tokko (no las publica — Tokko ya difunde a ZonaProp / Argenprop / MercadoLibre).
- El vendedor las trabaja en el pipeline interno (visitas, deals, autorizaciones).
- Arquitectura preparada para ser **multi-source** (snapshot local / Tokko API / MercadoLibre API / custom) — cuando se venda AgentFlow a otra inmobiliaria, cambia el adapter sin tocar el resto.

**Lo que falta implementar (~1 día de laburo):**
1. Modelo `IntegrationConfig` (key/value) en backend.
2. Endpoints `/api/integrations/` (GET / PATCH) + `/api/integrations/tokko/test` + `/api/integrations/tokko/sync`.
3. `services/tokko_client.py` (cliente HTTPX con adapter pattern).
4. Columna `tokko_id` en tabla `propiedades` para conciliar upserts.
5. Pantalla `/integraciones` admin-only con card Tokko (API key, branch ID, source toggle, botón test, botón sync, last_sync_at).
6. Cron Heroku cada 30 min para auto-pull.

**Para la demo actual**, se usa el snapshot estático que ya existe en `D:\Code\beykercoldwell\src\data\tokko-snapshot.json` (38 props del branch Beyker) si se quisiera, o el seed propio de AgentFlow (20 props ficticias).

### WhatsApp Business API + IA agéntica (próximo)

Ver `docs/INVESTIGACION_E_IMPLEMENTACION.md` sección 3 — la jugada de mayor impacto para AR. Pipeline propuesto: Meta Cloud API → webhook AgentFlow → `services/whatsapp_agent.py` (Gemini con function calling) → tools (`buscar_propiedades`, `agendar_visita`, `crear_lead`, `notificar_vendedor`).

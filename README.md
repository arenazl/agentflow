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

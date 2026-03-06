# 🚀 Modern Task Manager

Полнофункциональное приложение для управления задачами с AI, голосовым вводом, real-time коллаборацией.

## Стек технологий

### Backend
- **FastAPI** — REST API + WebSocket
- **SQLAlchemy** + **Alembic** — ORM и миграции
- **PostgreSQL** — основная БД
- **Redis** — кэширование и очереди
- **Celery** — фоновые задачи
- **Supabase Auth** — аутентификация
- **OpenAI API** — AI-функции
- **Whisper** — распознавание речи

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** + **React Query** — стейт-менеджмент
- **Framer Motion** — анимации
- **Socket.IO** — real-time
- **Workbox** — PWA/оффлайн

## Структура проекта

```
modern-task-manager/
├── apps/
│   ├── api/                    # FastAPI Backend
│   │   ├── app/
│   │   │   ├── api/v1/         # API endpoints
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   ├── schemas/        # Pydantic schemas
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # CORS, Auth, Rate Limit
│   │   │   ├── websocket/      # WebSocket manager
│   │   │   ├── workers/        # Celery tasks
│   │   │   └── integrations/   # External APIs
│   │   ├── tests/
│   │   └── requirements.txt
│   └── web/                    # React Frontend
│       ├── src/
│       │   ├── components/     # UI компоненты
│       │   ├── lib/            # Утилиты, API, стор
│       │   └── pages/          # Страницы
│       ├── public/
│       └── package.json
└── packages/
    ├── types/                  # Shared TypeScript типы
    └── utils/                  # Shared утилиты
```

## Быстрый старт

### Backend
```bash
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

### Docker
```bash
docker-compose up -d
```

## Модули (28)

| Модуль | Тип | Технологии |
|--------|-----|------------|
| Auth Module | Backend | FastAPI, JWT, Supabase Auth, OAuth 2.0 |
| Tasks Service | Backend | FastAPI, SQLAlchemy, Pydantic |
| Projects Module | Backend | FastAPI, PostgreSQL |
| WebSocket Manager | Backend | Socket.IO, Redis, FastAPI |
| AI Service | Backend | OpenAI API, LangChain |
| Voice Service | Backend | Whisper, AssemblyAI |
| Notification Service | Backend | Celery, Redis, SMTP, FCM |
| UI Components | Frontend | React, TypeScript, Tailwind, shadcn/ui |
| Task Components | Frontend | React, Framer Motion |
| State Management | Frontend | Zustand, React Query, Jotai |
| PWA Service Worker | Frontend | Workbox, IndexedDB |

## Лицензия

MIT

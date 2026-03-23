# Quick Start — Modern Task Manager

> Запуск всего стека за 5 минут с помощью Docker Compose

## Предварительные требования

| Инструмент | Версия | Ссылка |
|---|---|---|
| Docker | >= 24.x | https://docs.docker.com/get-docker/ |
| Docker Compose | >= 2.x | встроен в Docker Desktop |
| Git | любая | https://git-scm.com/ |

> Node.js и Python **не нужны** для запуска через Docker.

---

## 1. Клонировать репозиторий

```bash
git clone https://github.com/Bagirov24/modern-task-manager.git
cd modern-task-manager
```

## 2. Настроить переменные окружения

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

Открой `apps/api/.env` и заполни:

```env
SECRET_KEY=your-super-secret-key-change-in-production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

> Остальные переменные уже настроены для локального запуска.

## 3. Запустить через Docker Compose

```bash
docker compose up --build
```

Первый запуск занимает 3-5 минут (скачивание образов + сборка).

## 4. Открыть приложение

| Сервис | URL |
|---|---|
| Frontend (React) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

---

## Makefile — быстрые команды

```bash
make up          # запустить все сервисы
make down        # остановить все сервисы
make logs        # посмотреть логи
make restart     # перезапустить
make migrate     # применить миграции БД
make test        # запустить тесты
make shell-api   # войти в контейнер API
make shell-db    # войти в PostgreSQL
make clean       # удалить контейнеры и volumes
```

---

## Ручной запуск (без Docker)

### Backend (FastAPI)

```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Запустить PostgreSQL и Redis локально или через Docker:
docker compose up db redis -d

# Применить миграции
alembic upgrade head

# Запустить API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)

```bash
cd apps/web
npm install
npm run dev
```

Открой http://localhost:5173

---

## Структура сервисов

```
modern-task-manager/
   apps/
      api/          # FastAPI backend
      web/          # React frontend (Vite + MUI)
   docs/            # Документация
   monitoring/      # Prometheus + Grafana
   nginx/           # Reverse proxy
   packages/        # Shared packages
   docker-compose.yml         # Dev окружение
   docker-compose.prod.yml    # Production окружение
   Makefile                   # Команды управления
```

---

## Типичные проблемы

### Порт уже занят

```bash
# Найти процесс на порту 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Изменить порт в docker-compose.yml
ports:
  - '8001:8000'  # local:container
```

### Ошибка подключения к БД

```bash
# Проверить статус контейнеров
docker compose ps

# Посмотреть логи postgres
docker compose logs db

# Пересоздать volumes
docker compose down -v
docker compose up --build
```

### Сброс всех данных

```bash
docker compose down -v  # -v удаляет volumes с данными
docker compose up --build
```

---

## Первый вход в систему

1. Открой http://localhost:3000
2. Нажми **"Зарегистрироваться"**
3. Введи email и пароль
4. Подтверди email (если настроен Supabase)
5. Создай первый проект и задачу

---

## Переменные окружения — полный список

### Backend (`apps/api/.env`)

```env
# Database
DATABASE_URL=postgresql://postgres:password@db:5432/taskmanager

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# JWT
SECRET_KEY=change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# App
ENVIRONMENT=development
DEBUG=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (`apps/web/.env`)

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

*Подробная документация: [docs/](./docs/)*

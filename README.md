# Modern Task Manager

[![CI](https://github.com/Bagirov24/modern-task-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Bagirov24/modern-task-manager/actions/workflows/ci.yml)
[![CD](https://github.com/Bagirov24/modern-task-manager/actions/workflows/cd.yml/badge.svg)](https://github.com/Bagirov24/modern-task-manager/actions/workflows/cd.yml)

Полнофункциональное приложение для управления задачами с real-time коллаборацией, уведомлениями и мониторингом. Построено на **FastAPI + React + PostgreSQL + Redis**.

---

## Возможности

- Управление задачами с подзадачами, приоритетами и статусами
- Проекты с группировкой задач, архивацией и статистикой
- Комментарии к задачам
- Система меток (labels) с цветами, привязанных к владельцу
- Уведомления (in-app, WebSocket) с bulk mark-as-read
- Real-time обновления через WebSocket (Socket.IO)
- JWT-аутентификация: access + **refresh token rotation**, logout
- Health check эндпоинты для мониторинга (liveness / readiness / db / redis)
- Rate limiting и структурированное логирование запросов
- CI/CD через GitHub Actions
- Мониторинг: Prometheus (с basic-auth) + Grafana
- Async-first: все ORM-запросы через `AsyncSession` + `asyncpg`
- Timezone-aware timestamps (`TIMESTAMPTZ`) во всех моделях

---

## Стек технологий

### Backend

| Технология | Версия | Назначение |
|---|---|---|
| FastAPI | 0.109 | REST API + WebSocket |
| SQLAlchemy | 2.0.25 | Async ORM (AsyncSession) |
| Alembic | 1.13.1 | Async миграции БД |
| PostgreSQL | 16 | Основная БД |
| asyncpg | 0.29 | Async драйвер PostgreSQL |
| Redis | 7 | Кэш, очереди, rate-limit |
| Celery | 5.3 | Фоновые задачи |
| Pydantic | v2.5 | Валидация данных |
| python-jose | 3.3 | JWT (access + refresh) |
| passlib[bcrypt] | 1.7 | Хэширование паролей |

### Frontend

| Технология | Назначение |
|---|---|
| React 18 | UI фреймворк |
| TypeScript | Типизация |
| Tailwind CSS | Стилизация |
| shadcn/ui | UI компоненты |
| Zustand | Стейт-менеджмент |
| React Query | Серверный стейт |
| Framer Motion | Анимации |
| Socket.IO | Real-time |

### Инфраструктура

| Технология | Назначение |
|---|---|
| Docker & Compose | Контейнеризация |
| Nginx | Reverse proxy, rate limiting |
| GitHub Actions | CI/CD |
| GHCR | Docker Registry |
| Prometheus | Метрики (basic-auth защита) |
| Grafana | Дашборды |

### Тестирование

| Инструмент | Назначение |
|---|---|
| pytest-asyncio | Async тесты (`asyncio_mode = auto`) |
| httpx + ASGITransport | In-process async HTTP клиент |
| SQLAlchemy SAVEPOINT | Изоляция тестов без drop/recreate |
| pytest-cov | Покрытие кода |

---

## Структура проекта

```
modern-task-manager/
├── .github/workflows/        # CI/CD пайплайны
├── apps/
│   ├── api/                  # FastAPI Backend
│   │   ├── alembic/          # Async миграции БД (env.py на asyncpg)
│   │   ├── app/
│   │   │   ├── api/          # Роутеры (v1, health)
│   │   │   │   └── v1/       # auth, tasks, projects, labels,
│   │   │   │                 #   subtasks, comments, notifications
│   │   │   ├── core/         # config, database (AsyncSession), security
│   │   │   ├── integrations/ # Внешние сервисы
│   │   │   ├── middleware/   # Logging, rate limit
│   │   │   ├── models/       # SQLAlchemy ORM (timezone-aware)
│   │   │   ├── schemas/      # Pydantic v2 схемы
│   │   │   ├── services/     # Бизнес-логика
│   │   │   ├── websocket/    # WS менеджер
│   │   │   ├── workers/      # Celery задачи
│   │   │   └── main.py       # Точка входа
│   │   ├── tests/
│   │   │   ├── conftest.py       # Async infra: engine, SAVEPOINT, client
│   │   │   ├── test_auth.py      # 13 тестов аутентификации
│   │   │   ├── test_tasks.py     # 11 тестов задач + изоляция
│   │   │   ├── test_projects.py  # 9 тестов проектов
│   │   │   ├── test_labels.py    # 7 тестов меток
│   │   │   └── test_notifications.py  # 9 тестов уведомлений
│   │   ├── pytest.ini
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── web/                  # React Frontend
│       ├── src/
│       │   ├── components/   # UI компоненты
│       │   ├── hooks/        # React хуки
│       │   ├── lib/          # Утилиты
│       │   ├── pages/        # Страницы
│       │   └── stores/       # Zustand сторы
│       ├── Dockerfile
│       └── package.json
├── docs/
│   ├── API.md                # API справочник
│   └── DEPLOYMENT.md         # Гайд по деплою
├── monitoring/
│   └── prometheus.yml        # Scrape config (basic-auth на /metrics)
├── nginx/                    # Nginx конфиг
├── packages/                 # Общие пакеты
├── docker-compose.yml        # Development
└── docker-compose.prod.yml   # Production
```

---

## Быстрый старт

### Требования

- Docker & Docker Compose v2+
- Git

### Запуск

```bash
# Клонировать репозиторий
git clone https://github.com/Bagirov24/modern-task-manager.git
cd modern-task-manager

# Скопировать переменные окружения
cp .env.example .env

# Запустить все сервисы
docker compose up -d

# Применить миграции (async Alembic)
docker compose exec api alembic upgrade head
```

После запуска:

| Сервис | URL |
|---|---|
| API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Frontend | http://localhost:3000 |
| Health Check | http://localhost:8000/health |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

---

## API

### Аутентификация

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Регистрация нового пользователя |
| `POST` | `/api/v1/auth/login` | Вход (возвращает access + refresh токен) |
| `POST` | `/api/v1/auth/refresh` | Обновление токенов по refresh token |
| `POST` | `/api/v1/auth/logout` | Выход (инвалидация токена) |
| `GET` | `/api/v1/auth/me` | Профиль текущего пользователя |

### Задачи

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/v1/tasks/` | Список задач (фильтр, поиск, пагинация) |
| `POST` | `/api/v1/tasks/` | Создать задачу |
| `GET` | `/api/v1/tasks/{id}` | Получить задачу |
| `PATCH` | `/api/v1/tasks/{id}` | Обновить задачу |
| `DELETE` | `/api/v1/tasks/{id}` | Удалить задачу |
| `GET` | `/api/v1/tasks/{id}/subtasks` | Подзадачи |
| `POST` | `/api/v1/tasks/{id}/subtasks` | Создать подзадачу |
| `PATCH` | `/api/v1/tasks/{id}/subtasks/{sid}` | Обновить подзадачу |
| `DELETE` | `/api/v1/tasks/{id}/subtasks/{sid}` | Удалить подзадачу |
| `GET` | `/api/v1/tasks/{id}/subtasks/progress` | Прогресс выполнения |

### Проекты

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/v1/projects/` | Список проектов |
| `POST` | `/api/v1/projects/` | Создать проект |
| `GET` | `/api/v1/projects/{id}` | Получить проект |
| `PATCH` | `/api/v1/projects/{id}` | Обновить проект |
| `DELETE` | `/api/v1/projects/{id}` | Удалить проект |
| `POST` | `/api/v1/projects/{id}/archive` | Архивировать проект |
| `GET` | `/api/v1/projects/{id}/stats` | Статистика проекта |

### Метки

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/v1/labels/` | Метки текущего пользователя |
| `POST` | `/api/v1/labels/` | Создать метку |
| `PATCH` | `/api/v1/labels/{id}` | Обновить метку |
| `DELETE` | `/api/v1/labels/{id}` | Удалить метку |
| `POST` | `/api/v1/labels/task/{task_id}/assign` | Назначить метки задаче |
| `GET` | `/api/v1/labels/task/{task_id}` | Метки задачи |

### Уведомления

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/v1/notifications/` | Список (`?limit=50`, `?unread_only=true`) |
| `POST` | `/api/v1/notifications/` | Создать уведомление |
| `GET` | `/api/v1/notifications/unread-count` | Счётчик непрочитанных |
| `PATCH` | `/api/v1/notifications/{id}/read` | Отметить прочитанным |
| `PATCH` | `/api/v1/notifications/read-all` | Отметить все прочитанными |
| `DELETE` | `/api/v1/notifications/{id}` | Удалить уведомление |

### Служебные

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/health/db` | Статус БД |
| `GET` | `/health/redis` | Статус Redis |
| `WS` | `/ws/{token}` | Real-time обновления |
| `GET` | `/metrics` | Prometheus метрики (basic-auth) |

Полная документация: [docs/API.md](docs/API.md)

---

## Тестирование

```bash
# Запустить все тесты
docker compose exec api pytest

# С покрытием
docker compose exec api pytest --cov=app --cov-report=term-missing

# Только определённый модуль
docker compose exec api pytest tests/test_auth.py -v

# Исключить медленные тесты
docker compose exec api pytest -m "not slow"
```

### Архитектура тестов

Тесты используют полноценный async стек, идентичный production:

- **`AsyncSession` + SAVEPOINT** — каждый тест получает изолированную транзакцию, которая откатывается после теста (без drop/recreate таблиц)
- **`httpx.AsyncClient` + `ASGITransport`** — HTTP запросы идут напрямую в ASGI app, без сетевых сокетов
- **`asyncio_mode = auto`** — все `async def test_*` запускаются автоматически без декораторов

| Файл | Тестов | Покрывает |
|---|---|---|
| `test_auth.py` | 13 | Регистрация, login, refresh, logout, /me |
| `test_tasks.py` | 11 | CRUD, фильтры, поиск, изоляция |
| `test_projects.py` | 9 | CRUD, архивация, статистика, изоляция |
| `test_labels.py` | 7 | CRUD, ownership, валидация цвета |
| `test_notifications.py` | 9 | CRUD, limit cap, mark-all-read, изоляция |

---

## Безопасность

- **JWT tokens**: короткоживущий access token (15 мин) + долгоживущий refresh token с ротацией
- **Timing-safe auth**: одинаковый ответ 401 для «email не найден» и «неверный пароль» (защита от user enumeration)
- **Ownership checks**: все ресурсы (задачи, проекты, метки, уведомления, подзадачи) проверяют принадлежность текущему пользователю — возвращают 404 вместо 403 (no-leak)
- **Rate limiting**: глобальный middleware (100 req/60s per IP)
- **Color validation**: `#RRGGBB` regex на метках и проектах
- **Input validation**: Pydantic v2 — blank title, search length, pagination bounds
- **Prometheus /metrics**: защищён HTTP basic-auth (credentials через env vars)

---

## CI/CD

### CI (каждый push / PR)

- Линтинг: `ruff`, `mypy`, `eslint`
- Тесты: `pytest` с async infra
- Сборка Docker образов
- Проверка типов

### CD (merge в main)

- Push Docker образов в GHCR
- SSH деплой на сервер
- Автоматические async миграции (`alembic upgrade head`)

---

## Production деплой

```bash
# Настроить переменные окружения
cp .env.example .env.production
# Обязательно задать:
# SECRET_KEY, DATABASE_URL, REDIS_URL
# PROMETHEUS_METRICS_USER, PROMETHEUS_METRICS_PASS

# Запустить production стек
docker compose -f docker-compose.prod.yml up -d
```

Production стек: API · Web · PostgreSQL · Redis · Nginx · Prometheus · Grafana.

Подробнее: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Мониторинг

| Сервис | URL | Описание |
|---|---|---|
| Prometheus | http://localhost:9090 | Метрики (basic-auth на scrape) |
| Grafana | http://localhost:3001 | Дашборды |
| `/health` | http://localhost:8000/health | Liveness |
| `/health/ready` | http://localhost:8000/health/ready | Readiness |
| `/health/db` | http://localhost:8000/health/db | Статус БД |
| `/health/redis` | http://localhost:8000/health/redis | Статус Redis |

---

## Лицензия

MIT

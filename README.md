# Modern Task Manager

[![CI](https://github.com/Bagirov24/modern-task-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Bagirov24/modern-task-manager/actions/workflows/ci.yml)
[![CD](https://github.com/Bagirov24/modern-task-manager/actions/workflows/cd.yml/badge.svg)](https://github.com/Bagirov24/modern-task-manager/actions/workflows/cd.yml)

Полнофункциональное приложение для управления задачами с real-time коллаборацией, уведомлениями и мониторингом. Построено на FastAPI + React + PostgreSQL + Redis.

## Возможности

- Управление задачами с подзадачами, приоритетами и статусами
- Проекты с группировкой задач
- Комментарии к задачам
- Система меток (labels) с цветами
- Уведомления (in-app, email, push, WebSocket)
- Real-time обновления через WebSocket
- Аутентификация через Supabase Auth (JWT)
- Health check эндпоинты для мониторинга
- Rate limiting и логирование запросов
- CI/CD через GitHub Actions
- Мониторинг: Prometheus + Grafana

## Стек технологий

### Backend

| Технология | Назначение |
|------------|------------|
| FastAPI | REST API + WebSocket |
| SQLAlchemy 2.0 | Async ORM |
| Alembic | Миграции БД |
| PostgreSQL 16 | Основная БД |
| Redis 7 | Кэширование и очереди |
| Celery | Фоновые задачи |
| Pydantic v2 | Валидация данных |
| Supabase Auth | Аутентификация |

### Frontend

| Технология | Назначение |
|------------|------------|
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
|------------|------------|
| Docker & Compose | Контейнеризация |
| Nginx | Reverse proxy, rate limiting |
| GitHub Actions | CI/CD |
| GHCR | Docker Registry |
| Prometheus | Метрики |
| Grafana | Дашборды |

## Структура проекта

```
modern-task-manager/
|-- .github/workflows/     # CI/CD пайплайны
|-- apps/
|   |-- api/               # FastAPI Backend
|   |   |-- alembic/       # Миграции БД
|   |   |-- app/
|   |   |   |-- api/       # Роутеры (v1, health)
|   |   |   |-- core/      # Конфиг, БД, безопасность
|   |   |   |-- integrations/  # Внешние сервисы
|   |   |   |-- middleware/    # Logging, rate limit
|   |   |   |-- models/    # SQLAlchemy модели
|   |   |   |-- schemas/   # Pydantic схемы
|   |   |   |-- services/  # Бизнес-логика
|   |   |   |-- websocket/ # WS менеджер
|   |   |   |-- workers/   # Celery задачи
|   |   |   '-- main.py    # Точка входа
|   |   |-- tests/         # Unit + E2E тесты
|   |   |-- Dockerfile
|   |   '-- requirements.txt
|   '-- web/               # React Frontend
|       |-- src/
|       |   |-- components/ # UI компоненты
|       |   |-- hooks/      # React хуки
|       |   |-- lib/        # Утилиты
|       |   |-- pages/      # Страницы
|       |   '-- stores/     # Zustand сторы
|       |-- Dockerfile
|       '-- package.json
|-- docs/                  # Документация
|   |-- API.md             # API справочник
|   '-- DEPLOYMENT.md      # Гайд по деплою
|-- monitoring/            # Prometheus конфиг
|-- nginx/                 # Nginx конфиг
|-- packages/              # Общие пакеты
|-- docker-compose.yml     # Development
'-- docker-compose.prod.yml # Production
```

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

# Применить миграции
docker compose exec api alembic upgrade head
```

После запуска:

| Сервис | URL |
|--------|-----|
| API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Frontend | http://localhost:3000 |
| Health Check | http://localhost:8000/health |

## API

Основные эндпоинты:

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/v1/auth/register | Регистрация |
| POST | /api/v1/auth/login | Авторизация |
| GET/POST | /api/v1/tasks | Список / создание задач |
| GET/PUT/DELETE | /api/v1/tasks/{id} | CRUD задачи |
| GET/POST | /api/v1/projects | Список / создание проектов |
| GET/POST | /api/v1/labels | Список / создание меток |
| GET | /api/v1/notifications | Уведомления |
| GET | /health | Проверка здоровья |
| GET | /health/ready | Readiness probe |
| WS | /ws/{token} | Real-time обновления |

Полная документация: [docs/API.md](docs/API.md)

## Тестирование

```bash
# Запустить все тесты
docker compose exec api pytest

# С покрытием
docker compose exec api pytest --cov=app

# Только E2E
docker compose exec api pytest tests/test_e2e.py -v
```

## CI/CD

### CI (каждый push/PR)

- Линтинг (ruff, mypy, eslint)
- Юнит-тесты (pytest)
- Сборка Docker образов
- Проверка типов

### CD (merge в main)

- Push Docker образов в GHCR
- SSH деплой на сервер
- Автоматические миграции

## Production деплой

```bash
# Настроить переменные окружения
cp .env.example .env.production

# Запустить production стек
docker compose -f docker-compose.prod.yml up -d
```

Production стек включает: API, Web, PostgreSQL, Redis, Nginx, Prometheus, Grafana.

Подробнее: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Мониторинг

| Сервис | URL | Описание |
|--------|-----|----------|
| Prometheus | http://localhost:9090 | Метрики |
| Grafana | http://localhost:3001 | Дашборды |
| /health | http://localhost:8000/health | Статус API |
| /health/ready | http://localhost:8000/health/ready | Readiness |
| /health/db | http://localhost:8000/health/db | Статус БД |
| /health/redis | http://localhost:8000/health/redis | Статус Redis |

## Лицензия

MIT

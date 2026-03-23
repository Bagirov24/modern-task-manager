.PHONY: help up down restart logs build clean migrate test shell-api shell-db shell-web setup

# Default target
.DEFAULT_GOAL := help

# Colors
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

help: ## Show this help
	@echo ''
	@echo '  ${YELLOW}Modern Task Manager${RESET} - Available commands:'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${GREEN}%-15s${RESET} %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''

# ============================================================
# Docker Compose Commands
# ============================================================

up: ## Start all services (dev mode)
	docker compose up -d
	@echo "${GREEN}Services started!${RESET}"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

up-build: ## Build and start all services
	docker compose up -d --build

down: ## Stop all services
	docker compose down
	@echo "${YELLOW}Services stopped${RESET}"

restart: ## Restart all services
	docker compose restart

logs: ## Show logs for all services
	docker compose logs -f

logs-api: ## Show API logs
	docker compose logs -f api

logs-web: ## Show Web logs
	docker compose logs -f web

build: ## Build Docker images
	docker compose build

ps: ## Show running containers
	docker compose ps

# ============================================================
# Database Commands
# ============================================================

migrate: ## Apply database migrations
	docker compose exec api alembic upgrade head
	@echo "${GREEN}Migrations applied!${RESET}"

migrate-create: ## Create new migration (usage: make migrate-create MSG="description")
	docker compose exec api alembic revision --autogenerate -m "$(MSG)"

migrate-down: ## Rollback last migration
	docker compose exec api alembic downgrade -1

migrate-history: ## Show migration history
	docker compose exec api alembic history

# ============================================================
# Testing
# ============================================================

test: ## Run all tests
	docker compose exec api pytest -v

test-cov: ## Run tests with coverage report
	docker compose exec api pytest --cov=app --cov-report=html -v

test-fast: ## Run tests without coverage (faster)
	docker compose exec api pytest -v -x

# ============================================================
# Shell Access
# ============================================================

shell-api: ## Open shell in API container
	docker compose exec api /bin/bash

shell-web: ## Open shell in Web container
	docker compose exec web /bin/sh

shell-db: ## Open PostgreSQL shell
	docker compose exec db psql -U postgres -d taskmanager

shell-redis: ## Open Redis CLI
	docker compose exec redis redis-cli

# ============================================================
# Setup & Configuration
# ============================================================

setup: ## Initial project setup (copy .env files)
	@cp -n apps/api/.env.example apps/api/.env 2>/dev/null && echo "${GREEN}Created apps/api/.env${RESET}" || echo "${YELLOW}apps/api/.env already exists${RESET}"
	@cp -n apps/web/.env.example apps/web/.env 2>/dev/null && echo "${GREEN}Created apps/web/.env${RESET}" || echo "${YELLOW}apps/web/.env already exists${RESET}"
	@echo ""
	@echo "${YELLOW}Don't forget to fill in real values in .env files!${RESET}"

# ============================================================
# Cleanup
# ============================================================

clean: ## Remove containers and volumes (WARNING: deletes data)
	docker compose down -v --remove-orphans
	docker system prune -f
	@echo "${GREEN}Cleaned up!${RESET}"

clean-images: ## Remove all project images
	docker compose down --rmi all

# ============================================================
# Production
# ============================================================

prod-up: ## Start production stack
	docker compose -f docker-compose.prod.yml up -d --build

prod-down: ## Stop production stack
	docker compose -f docker-compose.prod.yml down

prod-logs: ## Show production logs
	docker compose -f docker-compose.prod.yml logs -f

# ============================================================
# Monitoring
# ============================================================

monitoring-up: ## Start monitoring stack (Prometheus + Grafana)
	docker compose up -d prometheus grafana
	@echo "${GREEN}Monitoring started!${RESET}"
	@echo "  Prometheus: http://localhost:9090"
	@echo "  Grafana:    http://localhost:3001 (admin/admin)"

# ============================================================
# Code Quality
# ============================================================

lint: ## Run linters
	docker compose exec api ruff check app/
	docker compose exec api mypy app/

format: ## Format code
	docker compose exec api ruff format app/

check: lint test ## Run all checks (lint + tests)

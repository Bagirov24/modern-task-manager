# Deployment Guide

## Prerequisites

- Docker & Docker Compose v2+
- Git
- Domain name (for production)
- Server with 2+ GB RAM

## Local Development

```bash
# Clone repo
git clone https://github.com/Bagirov24/modern-task-manager.git
cd modern-task-manager

# Copy env file
cp .env.example .env

# Start services
docker compose up -d

# Run migrations
docker compose exec api alembic upgrade head
```

Services:
- API: http://localhost:8000
- Web: http://localhost:3000
- Swagger: http://localhost:8000/docs

## Production Deployment

### 1. Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Environment Configuration

```bash
cp .env.example .env.production
```

Required variables:

| Variable | Description |
|----------|-------------|
| POSTGRES_DB | Database name |
| POSTGRES_USER | Database user |
| POSTGRES_PASSWORD | Database password |
| SECRET_KEY | JWT secret key |
| REDIS_URL | Redis connection URL |
| SMTP_HOST | Email server host |
| SMTP_USER | Email username |
| SMTP_PASSWORD | Email password |
| GRAFANA_PASSWORD | Grafana admin password |

### 3. Deploy

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4. Run Migrations

```bash
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

### 5. SSL (Nginx)

Place SSL certificates in `./nginx/certs/` and update `nginx.conf`.

## CI/CD

GitHub Actions handles:
- **CI**: lint, test, build on every push/PR
- **CD**: Docker image push to GHCR + SSH deploy on merge to `main`

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| DEPLOY_HOST | Server IP/hostname |
| DEPLOY_USER | SSH username |
| DEPLOY_KEY | SSH private key |
| DEPLOY_PATH | App directory on server |

## Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin / $GRAFANA_PASSWORD)

Health endpoints:
- `GET /health` - basic check
- `GET /health/ready` - readiness probe
- `GET /health/db` - database check
- `GET /health/redis` - Redis check

## Backup

```bash
# Database backup
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB
```

## Rollback

```bash
# Roll back to previous image
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Roll back migration
docker compose exec api alembic downgrade -1
```

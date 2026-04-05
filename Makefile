.PHONY: up down build logs logs-backend logs-frontend logs-worker \
        shell-backend shell-frontend shell-db \
        migrate migrate-create migrate-rollback \
        seed test lint health setup clean

# ── Compose helpers ───────────────────────────────────────────────────────────

up:
	docker compose up -d

up-tools:
	docker compose --profile tools up -d

down:
	docker compose down

down-volumes:
	docker compose down -v

build:
	docker compose build

restart-backend:
	docker compose restart backend worker celery_beat

# ── Logs ─────────────────────────────────────────────────────────────────────

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-worker:
	docker compose logs -f worker celery_beat

logs-db:
	docker compose logs -f postgres pgbouncer

# ── Shells ────────────────────────────────────────────────────────────────────

shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec postgres psql -U adzy adzy

shell-redis:
	docker compose exec redis redis-cli

# ── Database / Alembic ────────────────────────────────────────────────────────

migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	@read -p "Migration name: " name; \
	docker compose exec backend alembic revision --autogenerate -m "$$name"

migrate-rollback:
	docker compose exec backend alembic downgrade -1

migrate-history:
	docker compose exec backend alembic history --verbose

# ── Seed data ─────────────────────────────────────────────────────────────────

seed:
	docker compose exec backend python scripts/seed_dev_data.py

# ── Tests ─────────────────────────────────────────────────────────────────────

test:
	docker compose exec backend pytest tests/ -v

test-fast:
	docker compose exec backend pytest tests/ -v -x --tb=short

# ── Linting ───────────────────────────────────────────────────────────────────

lint:
	docker compose exec backend ruff check app/ --fix
	docker compose exec backend ruff format app/

typecheck:
	docker compose exec backend mypy app/ --ignore-missing-imports

# ── Health ────────────────────────────────────────────────────────────────────

health:
	@echo "── Backend ──────────────────────────────────────────"
	@curl -s http://localhost:8000/health | python3 -m json.tool
	@echo "── Frontend ─────────────────────────────────────────"
	@curl -sI http://localhost:3000 | head -1
	@echo "── MinIO ────────────────────────────────────────────"
	@curl -s http://localhost:9000/minio/health/live && echo " OK" || echo " FAIL"

# ── First-time setup ──────────────────────────────────────────────────────────

setup:
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example — edit secrets before continuing")
	docker compose build
	docker compose up -d postgres redis
	@echo "Waiting for Postgres to be ready..."
	@sleep 5
	docker compose up -d
	@echo "Waiting for backend to be healthy..."
	@sleep 15
	$(MAKE) migrate
	$(MAKE) seed
	@echo ""
	@echo "✓ Adzy dev environment ready"
	@echo "  Frontend : http://localhost:3000"
	@echo "  Backend  : http://localhost:8000"
	@echo "  API docs : http://localhost:8000/docs"
	@echo "  MinIO    : http://localhost:9001  (minioadmin / minioadmin)"
	@echo "  Mailpit  : http://localhost:8025"
	@echo "  Flower   : http://localhost:5555  (admin / adzy_dev)"

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	docker compose down -v --remove-orphans
	docker image prune -f

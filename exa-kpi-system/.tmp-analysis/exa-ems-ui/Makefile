.PHONY: help dev dev-build dev-logs dev-stop prod prod-build prod-logs prod-stop clean network status start

# Detect platform-specific null device and network-create command
ifeq ($(OS),Windows_NT)
	DEV_NULL = NUL
	NETWORK_CREATE = docker network create exa-network 2>$(DEV_NULL) || echo Network may already exist
else
	DEV_NULL = /dev/null
	NETWORK_CREATE = docker network create exa-network 2>$(DEV_NULL) || true
endif

# Default target
help:
	@echo "EXA EMS UI - CoreUI PRO React Template"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development server"
	@echo "  make dev-build    - Rebuild and start development server"
	@echo "  make dev-logs     - View development logs"
	@echo "  make dev-stop     - Stop development server"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production server"
	@echo "  make prod-build   - Build and start production server"
	@echo "  make prod-logs    - View production logs"
	@echo "  make prod-stop    - Stop production server"
	@echo ""
	@echo "Utilities:"
	@echo "  make network      - Create Docker network"
	@echo "  make clean        - Stop all and clean volumes"
	@echo "  make status       - Show running containers"

# Development commands
dev:
	@echo "🚀 Starting development server..."
	@$(NETWORK_CREATE)
	docker compose -f docker-compose.dev.yml up -d
	@echo "✅ Development server started at http://localhost:3000"

dev-build:
	@echo "🔨 Building and starting development server..."
	@$(NETWORK_CREATE)
	docker compose -f docker-compose.dev.yml up -d --build
	@echo "✅ Development server started at http://localhost:3000"

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-stop:
	@echo "🛑 Stopping development server..."
	docker compose -f docker-compose.dev.yml down
	@echo "✅ Development server stopped"

# Production commands
prod:
	@echo "🚀 Starting production server..."
	@$(NETWORK_CREATE)
	docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production server started at http://localhost:3000"

prod-build:
	@echo "🔨 Building and starting production server..."
	@$(NETWORK_CREATE)
	docker compose -f docker-compose.prod.yml up -d --build
	@echo "✅ Production server started at http://localhost:3000"

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-stop:
	@echo "🛑 Stopping production server..."
	docker compose -f docker-compose.prod.yml down
	@echo "✅ Production server stopped"

# Utilities
network:
	@echo "🌐 Creating exa-network..."
	@docker network create exa-network 2>$(DEV_NULL) || echo "Network already exists"
	@echo "✅ Network ready"

clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v
	docker compose -f docker-compose.prod.yml down -v
	@echo "✅ Cleanup complete"

status:
	@echo "📊 Container Status:"
	@docker ps --filter "name=exa-ems-ui" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Quick start (includes network creation)
start: network dev
	@echo "✅ Development environment ready!"

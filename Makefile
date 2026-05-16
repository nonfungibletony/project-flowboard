# Makefile shortcuts for common tasks

.PHONY: dev install db-up db-down db-migrate db-studio build lint clean

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

db-up:
	docker-compose up -d

db-down:
	docker-compose down

db-migrate:
	pnpm db:migrate

db-studio:
	pnpm db:studio

db-reset: db-down db-up db-migrate

clean:
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/dist packages/*/dist

# AGENTS.md

## Architecture
Monorepo with Go backend (`server/`) and React frontend (`client/`). SQLite database with sqlc for type-safe queries.
- **server/**: Go + Chi router, handlers in `internal/handlers/`, DB layer in `db/`, scraper in `internal/scraper/`
- **client/**: React 19 + Vite + TanStack Router/Query, UI via shadcn/ui + Tailwind

## Commands
### Server (run from `server/`)
- Build: `go build -o scheduler`
- Test all: `go test ./...`
- Single test: `go test -run TestName ./path/to/package`
- Generate DB code: `sqlc generate`

### Client (run from `client/`)
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint/format: `pnpm check` (uses Biome)
- Test all: `pnpm test`
- Single test: `pnpm test -- -t "test name"`
- Add shadcn component: `pnpx shadcn@latest add <component>`

## Code Style
- **Go**: Standard Go conventions, Chi for routing, sqlc for DB queries
- **TypeScript**: Biome for linting/formatting, tabs, double quotes, organize imports on save
- **Components**: Follow existing shadcn patterns in `client/src/components/ui/`

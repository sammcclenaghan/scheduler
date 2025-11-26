# Stage 1: Build Go App & Goose
FROM golang:1.25-alpine as builder

WORKDIR /build

# Install git and build tools for CGO
RUN apk add --no-cache git gcc musl-dev

COPY server/go.mod server/go.sum ./
RUN go mod download

# Copy server source
COPY server/ .

# Build Go App
RUN CGO_ENABLED=1 go build -o /app main.go

# Install Goose
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

# Stage 2: Final Image (Caddy + Go)
FROM caddy:2.7-alpine

# Install bash for the entrypoint script
RUN apk add --no-cache bash

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Copy Frontend Build (React/Vite dist)
COPY client/dist /usr/share/caddy

# Copy Binaries from Builder
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY --from=builder /app /app

# Copy Migrations and Script
COPY server/db/migrations /migrations
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment Defaults
ENV PORT=4000
ENV DATABASE_URL=""

# Start the script
CMD ["/entrypoint.sh"]
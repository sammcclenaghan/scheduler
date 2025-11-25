FROM golang:1.25.2 as builder

COPY /server /src/server
WORKDIR /server/go/src/app

COPY . .

RUN go mod download

RUN CGO_ENABLED=0 go build -o server/go/bin/app

FROM caddy:2.5.2-alpine

RUN apk add bash

COPY Caddyfile /etc/caddy/Caddyfile

# Install goose CLI for migrations
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

COPY client/dist /usr/share/caddy


# Copy migrations and entrypoint script
COPY server/db/migrations /migrations
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000
ENV PORT 4000

ENTRYPOINT []
CMD ["/entrypoint.sh"]

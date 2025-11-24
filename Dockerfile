FROM golang:1.25.2

WORKDIR /go/src/app

COPY . .

RUN go mod download

RUN CGO_ENABLED=0 go build -o /go/bin/app

# Install goose CLI for migrations
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

# Copy migrations and entrypoint script
COPY db/migrations /migrations
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000
ENV PORT 4000

ENTRYPOINT []
CMD ["/entrypoint.sh"]

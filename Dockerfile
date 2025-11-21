
# Builder
FROM golang:1.25.2 AS builder

WORKDIR /go/src/app

COPY . .

RUN go mod download

RUN CGO_ENABLED=0 go build -o /go/bin/app


# Creating image

FROM golang:1.25.2-alpine

COPY --from=builder /go/bin/app /

EXPOSE 4000
ENV PORT 4000

# Runs the binary as the container's main process
CMD ["/app"]

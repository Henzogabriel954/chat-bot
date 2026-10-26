# Estágio 1: Build da aplicação Go
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Instalar certificados SSL e git se necessário
RUN apk add --no-cache ca-certificates git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bot-server .

# Estágio 2: Imagem final mínima
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/bot-server .

# Porta padrão do backend
EXPOSE 3001

CMD ["./bot-server"]

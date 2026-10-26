# Estágio 1: Build da aplicação React
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Argumento para URL da API em produção
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Estágio 2: Nginx para servir o front-end
FROM nginx:alpine

# Copiar arquivos estáticos gerados
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração customizada do Nginx com SPA fallback e Proxy se necessário
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

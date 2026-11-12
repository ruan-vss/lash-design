# Estágio 1: build do frontend (API no mesmo domínio, em /api/v1)
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api/v1
RUN npm run build

# Estágio 2: Caddy serve o site estático e faz proxy da API, com HTTPS automático
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# syntax=docker/dockerfile:1

# Tahap 1: build React dengan Vite
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variabel VITE_ ditanam ke JavaScript saat build, bukan dibaca saat
# container berjalan. Karena itu nilainya diberikan sebagai build arg
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Tahap 2: hanya hasil build + Nginx. Node dan node_modules tidak ikut.
# Varian "unprivileged" berjalan sebagai user non-root di port 8080
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# syntax=docker/dockerfile:1

# ---------- Estágio 1: build do Vite ----------
FROM node:24-alpine AS builder

WORKDIR /app

# Permite configurar a URL da API em tempo de build.
# O valor padrão "/api" faz o frontend usar o proxy do nginx.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# ---------- Estágio 2: nginx ----------
FROM nginx:stable-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]

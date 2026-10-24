# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Optional build-time settings (see src/lib/site.ts). Leave VITE_API_URL empty
# to call the API on the same origin through the nginx /api proxy.
ARG VITE_API_URL=""
ARG VITE_SITE_NAME=""
ARG VITE_CONTACT_EMAIL=""
ARG VITE_CONTACT_ADDRESS=""
ARG VITE_GITHUB_URL=""
RUN npm run build

FROM nginx:1.27-alpine
# Templates in /etc/nginx/templates are rendered with envsubst at startup.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_UPSTREAM=http://backend:3003
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

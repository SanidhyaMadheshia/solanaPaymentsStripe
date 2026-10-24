# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate --schema src/db/prisma/schema.prisma && npx tsc -b

FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
# prisma CLI is a runtime dependency so migrations can run on container start.
RUN npm ci --omit=dev --no-audit --no-fund
COPY src/db/prisma ./src/db/prisma
RUN npx prisma generate --schema src/db/prisma/schema.prisma

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production PORT=3003
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/src/db/prisma ./src/db/prisma
COPY --from=build /app/dist ./dist
COPY package.json docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 3003
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1
ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]

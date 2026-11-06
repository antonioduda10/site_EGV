# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

FROM dependencies AS builder
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY pages ./pages
COPY public ./public
COPY types ./types
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY tools/check-node.cjs ./tools/check-node.cjs
COPY next.config.mjs next-env.d.ts tsconfig.json tailwind.config.ts postcss.config.mjs .eslintrc.json ./
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:1/build \
    NEXTAUTH_URL=http://localhost:3000 \
    EGV_STANDALONE=1 EGV_BUILD_CPUS=1 NODE_OPTIONS=--max-old-space-size=1536
RUN npx prisma generate && npm run build

FROM dependencies AS migration
COPY prisma ./prisma
COPY deploy/migration-check.cjs ./deploy/migration-check.cjs
COPY deploy/migration-compatibility.json ./deploy/migration-compatibility.json
COPY deploy/verify-import.cjs ./deploy/verify-import.cjs
COPY deploy/production-smoke.cjs deploy/check-production-users.cjs ./deploy/
RUN npx prisma generate
CMD ["sh", "-c", "node deploy/migration-check.cjs && node node_modules/prisma/build/index.js migrate deploy"]

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads ERROR_LOG_DIR=/app/logs NODE_OPTIONS=--max-old-space-size=768
RUN groupadd --gid 1001 portal && useradd --uid 1001 --gid portal --no-create-home portal \
    && install -d -o portal -g portal /app/uploads /app/logs /app/.next-build/cache
COPY --from=builder --chown=portal:portal /app/.next-build/standalone ./
COPY --from=builder --chown=portal:portal /app/.next-build/static ./.next-build/static
COPY --from=builder --chown=portal:portal /app/public ./public
USER portal
EXPOSE 3000
CMD ["node", "server.js"]

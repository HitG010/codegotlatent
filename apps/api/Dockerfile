# syntax=docker/dockerfile:1
# The API and the judging worker: one image, run with different commands.
# Build from the repository root:
#   docker build -f apps/api/Dockerfile -t cgl-api .
# Problem packages are never part of the image; they're imported on the server.

FROM node:24-bookworm-slim AS base
# Prisma's migration engine needs OpenSSL
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=true
RUN corepack enable
WORKDIR /app

# Manifests and the Prisma schema first: dependency layers stay cached until these change
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY packages/shared/package.json packages/shared/
COPY packages/rating/package.json packages/rating/
COPY packages/problem-package/package.json packages/problem-package/

FROM manifests AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter @cgl/api...
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @cgl/api build

# Runtime dependencies only. The Prisma CLI is one of them, for `prisma migrate deploy`.
FROM manifests AS deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store --filter @cgl/api \
 # Fetch the migration engine now rather than on the server at deploy time
 && cd apps/api && node_modules/.bin/prisma version

FROM base
ENV NODE_ENV=production NODE_OPTIONS=--enable-source-maps PORT=4000 BLOB_DIR=/data/blobs
COPY --from=deps /app /app
COPY --from=build /app/apps/api/dist /app/apps/api/dist
# Test files for judging; mount a volume here. Created so the volume belongs to `node`.
RUN mkdir -p /data/blobs && chown node:node /data/blobs
USER node
WORKDIR /app/apps/api
EXPOSE 4000
# The API by default. The worker is `node dist/worker.js`; the CLIs are
# dist/import-problems.js and dist/create-contest.js; migrations are
# `node_modules/.bin/prisma migrate deploy`.
CMD ["node", "dist/api.js"]

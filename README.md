# CodeGotLatent

Competitive programming where the rating measures self-awareness. Before a
contest's problems are revealed, you lock in the range you think you'll finish
in — "top 15–30%". Use any AI you like; you still have to know yourself.

Every profile carries two ratings:

- **Latent** — how well you predict your own finish. Ranges are scored with an
  interval score, so an honest, tight range is the best strategy, and solving
  nothing can never raise it.
- **Form** — plain contest performance.

The rules live in [`packages/rating`](packages/rating/src/rate-contest.ts).

## Layout

| Path | What |
| --- | --- |
| `apps/api` | Express 5 API, Prisma 7 + Postgres |
| `packages/rating` | Contest standings, interval scoring, Latent and Form ratings (pure, tested) |
| `packages/problem-package` | Problem format: loading, statement rendering, output checking ([how to write a problem](packages/problem-package/README.md)) |
| `packages/shared` | Schemas and constants shared by client and server |
| `infra` | Local Postgres, Redis and Judge0 via Docker Compose |

The original app is preserved, unchanged, on the [`v1`](../../tree/v1) branch.

## Getting started

Requires Node 22+ and Docker. pnpm comes through corepack.

```sh
corepack enable
pnpm install
docker compose -f infra/docker-compose.yml up -d app-db
docker compose -f infra/docker-compose.yml exec app-db createdb -U cgl cgl_test
cp apps/api/.env.example apps/api/.env   # then set ACCESS_TOKEN_SECRET
pnpm --filter @cgl/api db:migrate
pnpm --filter @cgl/api problems:import --practice packages/problem-package/fixtures/self-aware
pnpm dev:api
```

`pnpm test` and `pnpm typecheck` run across every package.

# syntax=docker/dockerfile:1

# apps/whatsapp-worker roda via tsx (mesmo runtime do `pnpm dev`), não via
# `tsc` + `node dist/`: os pacotes do workspace (packages/queue, domain, etc.)
# são consumidos como TS fonte, e vários imports relativos do próprio worker
# não têm extensão `.js` — nenhum dos dois funciona sob o resolver ESM nativo
# do Node com JS já compilado, só sob tsx/bundler (descoberto ao tentar rodar
# `node dist/index.js` pela primeira vez, nunca exercitado antes deste build).
# Não há passo de "build" que reduza a imagem final: precisa do monorepo
# completo (fonte + node_modules com devDependencies, incl. tsx) em runtime.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune @scheduling-saas/whatsapp-worker --docker

FROM base AS runner
WORKDIR /app
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# turbo prune só copia arquivos referenciados pelos package.json do workspace —
# tsconfig.base.json (extendido por packages/*/tsconfig.json e pelo próprio
# tsconfig.json do worker) fica de fora e precisa ser copiado à parte, senão
# `prisma generate` (postinstall de packages/database) falha por não achar o
# arquivo.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json

ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm config set fetch-timeout 120000
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @scheduling-saas/database run db:generate

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@scheduling-saas/whatsapp-worker", "exec", "tsx", "src/index.ts"]

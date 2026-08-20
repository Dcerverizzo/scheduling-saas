# syntax=docker/dockerfile:1

# Build de produção do apps/web (Next.js) num monorepo pnpm + Turborepo.
# Usa `turbo prune --docker` pra isolar só os pacotes que o web realmente
# depende (packages/database, domain, config, validation, queue) antes de
# instalar/buildar — evita levar o monorepo inteiro pro contexto de build.
#
# Sem `output: "standalone"`: tentado, mas o output file tracing dele não
# acha @swc/helpers na estrutura de node_modules aninhada do pnpm num
# monorepo (MODULE_NOT_FOUND em runtime, mesmo com outputFileTracingIncludes
# em duas variantes de glob — ver next.config.ts). A imagem final copia o
# node_modules completo (builder = runtime, sem stage "runner" separado) —
# maior, mas confiável. Prioridade #4 simplicidade > #7 performance do PRD.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune @scheduling-saas/web --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# turbo prune só copia arquivos referenciados pelos package.json do workspace —
# tsconfig.base.json (extendido por packages/*/tsconfig.json) fica de fora e
# precisa ser copiado à parte, senão `prisma generate` (postinstall de
# packages/database) falha por não achar o arquivo.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json

# Schema-only — não precisa de banco/Redis reais pra gerar o client Prisma
# nem pra buildar o Next.js, mas prisma.config.ts exige DATABASE_URL pra
# carregar, e o Next importa @scheduling-saas/queue (rate limiting) durante
# "Collecting page data" — o módulo conecta no Redis assim que é importado
# (connection.ts:16), então precisa de REDIS_URL definida mesmo em build.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV REDIS_URL="redis://localhost:6379"

RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm config set fetch-timeout 120000
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @scheduling-saas/database run db:generate
# `pnpm --filter ... run build` direto, não `turbo run build`: Turborepo 2.x
# roda em env-mode "strict" por padrão e filtra DATABASE_URL/REDIS_URL do
# processo filho (não declaradas em turbo.json), quebrando o build do Next
# mesmo com as ENV acima definidas — descoberto rodando o build de verdade.
RUN pnpm --filter @scheduling-saas/web run build

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && chown -R nextjs:nodejs /app

ENV NODE_ENV=production
ENV PORT=3000

USER nextjs
EXPOSE 3000
CMD ["pnpm", "--filter", "@scheduling-saas/web", "run", "start"]

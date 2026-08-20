# Scheduling SaaS

Plataforma de agendamento multi-tenant (empresa → profissional → serviço → disponibilidade →
agendamento → confirmação → lembrete) para pequenos negócios de serviço agendado no Brasil, com
confirmações e lembretes via WhatsApp.

Escopo completo, modelo de domínio e decisões arquiteturais: PRD no Obsidian
(`Work/Scheduling SaaS/PRDs/PRD - Scheduling SaaS MVP.md`). Progresso por Step:
`Work/Scheduling SaaS/Dev Log.md`.

## Requisitos

- Node.js >= 22.12 (testado com 24.19.0 LTS — exigido pelo Prisma 7, que não roda em 20.18.x)
- pnpm (via `corepack enable` ou o instalador standalone — ver `packageManager` no `package.json`)
- Docker + Docker Compose (Postgres + Redis locais)

## Setup

```bash
git clone <repo>
cd scheduling-saas
pnpm install
docker compose up -d          # sobe Postgres e Redis
cp .env.example .env          # preencher AUTH_SECRET (npx auth secret)
pnpm --filter @scheduling-saas/database run db:migrate
pnpm dev
```

## Comandos úteis

```bash
pnpm dev          # roda apps/web e apps/whatsapp-worker em modo dev (via Turborepo)
pnpm lint         # lint em todos os packages/apps
pnpm typecheck    # checagem de tipos em todos os packages/apps
pnpm test         # testes (Vitest) em todos os packages/apps
pnpm build        # build de produção de todos os packages/apps
```

## Estrutura

```text
apps/
  web/                # Next.js — dashboard, booking flow público, APIs
  whatsapp-worker/    # processo Node long-running — conexão WhatsApp, fila, envio

packages/
  database/           # Prisma — schema, migrations, client, seed
  domain/             # regras de negócio puras (disponibilidade, booking, timezone)
  queue/              # setup do BullMQ
  notifications/      # abstração NotificationProvider (domínio nunca importa Baileys)
  config/             # validação de env (Zod)
  validation/         # schemas Zod compartilhados
```

## Deploy

VPS único com Docker Compose em produção (web + whatsapp-worker + Postgres + Redis no mesmo
host) — o `whatsapp-worker` é um processo long-running e não roda em plataformas serverless.

```bash
# .env de produção — NUNCA o mesmo .env do dev local: DATABASE_URL/REDIS_URL
# apontam pros nomes dos serviços (postgres/redis), não localhost (ver
# .env.example). AUTH_URL é a URL pública real.
cp .env.example .env
# preencher AUTH_SECRET, DATABASE_URL, REDIS_URL, AUTH_URL, POSTGRES_*

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres redis

# migration não-interativa (prisma migrate deploy, não migrate dev)
docker compose -f docker-compose.prod.yml run --rm web \
  pnpm --filter @scheduling-saas/database exec prisma migrate deploy

docker compose -f docker-compose.prod.yml up -d
```

`postgres`/`redis` não publicam porta pro host (só rede interna do Compose); só `web` publica
`3000`. A sessão do WhatsApp (`apps/whatsapp-worker/session/`) persiste num volume nomeado
(`scheduling_whatsapp_session`) — sobrevive a `docker compose down` (não a `down -v`).

## WhatsApp (desenvolvimento)

> A integração via Baileys (`apps/whatsapp-worker`) é **não-oficial** (protocolo WhatsApp Web
> via WebSocket), pode quebrar, sofrer mudanças incompatíveis ou levar a bloqueio de número
> pela WhatsApp. **Nunca use um número pessoal — use um número dedicado de testes.** A saída
> real de produção é a WhatsApp Cloud API oficial (Fase 2, por empresa).

No MVP a plataforma usa **uma sessão única compartilhada** (todas as empresas mandam mensagem
pelo mesmo número, com o nome da empresa no corpo do texto) — decisão consciente pra evitar a
complexidade operacional de múltiplas sessões Baileys antes de haver clientes reais.

### Ligar/desligar o provider

Controlado por `WHATSAPP_PROVIDER` no `.env`:

- `WHATSAPP_PROVIDER="console"` (padrão local) — não abre conexão nenhuma, só loga a mensagem
  formatada no terminal do worker. Use isso no dia a dia de desenvolvimento.
- `WHATSAPP_PROVIDER="baileys"` — conecta de verdade. Só mude isso quando for testar o envio
  real, com um número de testes em mãos.

### Primeira conexão (gerar o QR code)

```bash
# no .env, mude:
WHATSAPP_PROVIDER="baileys"

pnpm --filter @scheduling-saas/whatsapp-worker run dev
```

O worker imprime um QR code no terminal. No WhatsApp do número de testes: **Configurações →
Aparelhos conectados → Conectar um aparelho** e escaneie. Depois de conectado, o worker loga
`conectado ao WhatsApp` e passa a processar as filas `notifications`/`booking-reminders` de
verdade.

### Sessão

- Fica em `apps/whatsapp-worker/session/` (criada automaticamente, `.gitignore`d — **nunca
  versionar**, são credenciais de autenticação de verdade).
- Reiniciar o worker (`pnpm dev` de novo) reusa a sessão salva, sem pedir QR de novo.
- Pra desconectar e forçar um QR novo: apague a pasta `session/` e reinicie o worker.
- Se a sessão for deslogada pelo próprio WhatsApp (troca de aparelho, etc.), o worker loga
  isso explicitamente e não tenta reconectar sozinho — apague `session/` e escaneie de novo.

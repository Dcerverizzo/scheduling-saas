import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `output: "standalone"` foi tentado (imagem Docker mais enxuta) mas o
  // output file tracing dele não consegue achar @swc/helpers na estrutura de
  // node_modules aninhada do pnpm num monorepo (require-hook do Next quebra
  // em runtime com MODULE_NOT_FOUND) — testado com outputFileTracingIncludes
  // em duas variantes de glob, sem sucesso. Revertido: apps/web/Dockerfile
  // copia o node_modules completo do builder pro runner em vez de usar
  // .next/standalone — imagem maior, mas confiável (prioridade #4
  // simplicidade > #7 performance do PRD).
  // Os pacotes do workspace são consumidos como TS fonte (sem build próprio),
  // então o Next precisa transpilá-los em vez de tratá-los como código externo pronto.
  transpilePackages: [
    "@scheduling-saas/database",
    "@scheduling-saas/domain",
    "@scheduling-saas/config",
    "@scheduling-saas/validation",
    "@scheduling-saas/queue",
    "@scheduling-saas/notifications",
    "@scheduling-saas/calendar",
  ],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Os pacotes do workspace são consumidos como TS fonte (sem build próprio),
  // então o Next precisa transpilá-los em vez de tratá-los como código externo pronto.
  transpilePackages: [
    "@scheduling-saas/database",
    "@scheduling-saas/domain",
    "@scheduling-saas/config",
    "@scheduling-saas/validation",
    "@scheduling-saas/queue",
    "@scheduling-saas/notifications",
  ],
};

export default nextConfig;

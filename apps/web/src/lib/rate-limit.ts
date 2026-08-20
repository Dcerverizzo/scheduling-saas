import "server-only";
import { redisConnection } from "@scheduling-saas/queue";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

// Fixed-window INCR+EXPIRE — simples e suficiente pro volume do MVP (prioridade
// #4 do PRD é simplicidade). Reusa a conexão Redis já compartilhada com o BullMQ.
export async function checkRateLimit({ key, limit, windowSeconds }: RateLimitOptions): Promise<boolean> {
  const redisKey = `ratelimit:${key}`;
  const count = await redisConnection.incr(redisKey);
  if (count === 1) {
    await redisConnection.expire(redisKey, windowSeconds);
  }
  return count <= limit;
}

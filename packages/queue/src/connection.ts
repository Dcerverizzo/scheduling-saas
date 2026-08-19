import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisConnection: IORedis | undefined;
};

function createConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL não configurada.");
  }
  // BullMQ exige isso explicitamente — ver docs do BullMQ sobre conexões.
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export const redisConnection = globalForRedis.redisConnection ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisConnection = redisConnection;
}

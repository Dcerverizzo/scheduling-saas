// Prisma 7 (com driver adapter) não modela EXCLUDE constraints — a violação chega
// como PrismaClientKnownRequestError genérico (code "P2039"), com o SQLSTATE real
// do Postgres aninhado em meta.driverAdapterError.cause.code. 23P01 = exclusion_violation.
// Confirmado empiricamente dessa versão do @prisma/adapter-pg — se a lib mudar o
// formato do erro no futuro, esse helper para de detectar (não quebra silenciosamente
// pro lado errado: só deixa de converter pro DomainError amigável).
const POSTGRES_EXCLUSION_VIOLATION = "23P01";

export function isExclusionConstraintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const meta = (error as { meta?: unknown }).meta;
  if (typeof meta !== "object" || meta === null) return false;

  const driverAdapterError = (meta as { driverAdapterError?: unknown }).driverAdapterError;
  if (typeof driverAdapterError !== "object" || driverAdapterError === null) return false;

  const cause = (driverAdapterError as { cause?: unknown }).cause;
  if (typeof cause !== "object" || cause === null) return false;

  const code = (cause as { code?: unknown }).code;
  return code === POSTGRES_EXCLUSION_VIOLATION;
}

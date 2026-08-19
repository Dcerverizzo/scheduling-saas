-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('BLOCK', 'AVAILABLE');

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "validFrom" DATE,
    "validUntil" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exceptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "AvailabilityExceptionType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_rules_staffId_dayOfWeek_idx" ON "availability_rules"("staffId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "availability_exceptions_staffId_startsAt_idx" ON "availability_exceptions"("staffId", "startsAt");

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

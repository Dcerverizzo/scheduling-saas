-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "priceInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_staff" (
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_staff_pkey" PRIMARY KEY ("serviceId","staffId")
);

-- CreateIndex
CREATE INDEX "services_companyId_idx" ON "services"("companyId");

-- CreateIndex
CREATE INDEX "service_staff_staffId_idx" ON "service_staff"("staffId");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

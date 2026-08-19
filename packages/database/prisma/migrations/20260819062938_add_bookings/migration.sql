-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM ('BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED', 'BOOKING_NO_SHOW');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "customerNameSnapshot" TEXT NOT NULL,
    "customerPhoneSnapshot" TEXT,
    "serviceNameSnapshot" TEXT NOT NULL,
    "serviceDurationSnapshot" INTEGER NOT NULL,
    "servicePriceSnapshot" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "BookingEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON "bookings"("idempotencyKey");

-- CreateIndex
CREATE INDEX "bookings_companyId_idx" ON "bookings"("companyId");

-- CreateIndex
CREATE INDEX "bookings_staffId_startsAt_idx" ON "bookings"("staffId", "startsAt");

-- CreateIndex
CREATE INDEX "bookings_customerId_startsAt_idx" ON "bookings"("customerId", "startsAt");

-- CreateIndex
CREATE INDEX "booking_events_bookingId_idx" ON "booking_events"("bookingId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "AvailabilityExceptionSource" AS ENUM ('MANUAL', 'GOOGLE_CALENDAR');

-- CreateEnum
CREATE TYPE "GoogleCalendarConnectionStatus" AS ENUM ('CONNECTED', 'ERROR');

-- AlterTable
ALTER TABLE "availability_exceptions" ADD COLUMN     "externalEventId" TEXT,
ADD COLUMN     "source" "AvailabilityExceptionSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "google_calendar_connections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "googleAccountEmail" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "syncToken" TEXT,
    "watchChannelId" TEXT,
    "watchResourceId" TEXT,
    "watchExpiresAt" TIMESTAMP(3),
    "status" "GoogleCalendarConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastSyncedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_calendar_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_connections_staffId_key" ON "google_calendar_connections"("staffId");

-- CreateIndex
CREATE INDEX "google_calendar_connections_companyId_idx" ON "google_calendar_connections"("companyId");

-- CreateIndex
CREATE INDEX "google_calendar_connections_watchExpiresAt_idx" ON "google_calendar_connections"("watchExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "booking_calendar_events_bookingId_key" ON "booking_calendar_events"("bookingId");

-- CreateIndex
CREATE INDEX "booking_calendar_events_companyId_idx" ON "booking_calendar_events"("companyId");

-- CreateIndex
CREATE INDEX "booking_calendar_events_staffId_idx" ON "booking_calendar_events"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_exceptions_staffId_externalEventId_key" ON "availability_exceptions"("staffId", "externalEventId");

-- AddForeignKey
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_calendar_events" ADD CONSTRAINT "booking_calendar_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_calendar_events" ADD CONSTRAINT "booking_calendar_events_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_calendar_events" ADD CONSTRAINT "booking_calendar_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;


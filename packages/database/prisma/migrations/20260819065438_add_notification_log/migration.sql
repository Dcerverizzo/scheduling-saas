-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bookingId" TEXT,
    "recipientUserId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "destination" TEXT NOT NULL,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_bookingId_idx" ON "notification_logs"("bookingId");

-- CreateIndex
CREATE INDEX "notification_logs_status_scheduledFor_idx" ON "notification_logs"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

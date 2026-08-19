import { formatCentsAsDecimalString } from "@scheduling-saas/domain";

export interface BookingMessageData {
  companyName: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  priceInCents: number;
  /** Já formatado no fuso da empresa (ex: "24/08/2026 às 10:00"). */
  whenLocal: string;
}

export function bookingConfirmationMessage(data: BookingMessageData): string {
  return (
    `Olá, ${data.customerName}! Seu agendamento na ${data.companyName} foi confirmado:\n` +
    `${data.serviceName} com ${data.staffName}\n` +
    `${data.whenLocal}\n` +
    `Valor: R$ ${formatCentsAsDecimalString(data.priceInCents)}\n` +
    `Se precisar cancelar ou reagendar, é só entrar em contato.`
  );
}

export function bookingReminderMessage(data: BookingMessageData): string {
  return (
    `Lembrete: você tem ${data.serviceName} agendado na ${data.companyName} em ${data.whenLocal}, ` +
    `com ${data.staffName}. Te esperamos!`
  );
}

export function bookingCancelledMessage(data: BookingMessageData): string {
  return (
    `O agendamento de ${data.serviceName} na ${data.companyName} em ${data.whenLocal} foi cancelado.`
  );
}

export function bookingRescheduledMessage(
  data: BookingMessageData & { previousWhenLocal: string },
): string {
  return (
    `Seu agendamento de ${data.serviceName} na ${data.companyName} foi remarcado: ` +
    `de ${data.previousWhenLocal} para ${data.whenLocal}.`
  );
}

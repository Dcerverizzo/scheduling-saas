export type NotificationChannel = "WHATSAPP" | "EMAIL";
export type NotificationType =
  | "BOOKING_CONFIRMATION"
  | "BOOKING_REMINDER"
  | "BOOKING_CANCELLED"
  | "BOOKING_RESCHEDULED";

export interface NotificationInput {
  channel: NotificationChannel;
  type: NotificationType;
  /** Telefone E.164 (WhatsApp) ou e-mail, dependendo do canal. */
  destination: string;
  message: string;
}

export interface NotificationResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

// O domínio (e o worker) só conhecem essa interface — nunca importam Baileys,
// Twilio, Resend etc. diretamente. Troca de provider = troca de implementação,
// sem tocar em quem chama `send()`.
export interface NotificationProvider {
  send(input: NotificationInput): Promise<NotificationResult>;
}

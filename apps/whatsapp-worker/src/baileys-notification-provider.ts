import type {
  NotificationInput,
  NotificationProvider,
  NotificationResult,
} from "@scheduling-saas/notifications";
import type { WhatsAppConnection } from "./whatsapp-connection";

function phoneToJid(destination: string): string {
  // WhatsApp espera "<dígitos>@s.whatsapp.net", sem o "+" do E.164.
  return `${destination.replace(/\D/g, "")}@s.whatsapp.net`;
}

// Adapter isolado — o resto do sistema só conhece NotificationProvider. Troca de
// Baileys por WhatsApp Cloud API (Fase 2) é só trocar essa classe, sem tocar em
// booking, fila ou domínio.
export class BaileysNotificationProvider implements NotificationProvider {
  constructor(private readonly connection: WhatsAppConnection) {}

  async send(input: NotificationInput): Promise<NotificationResult> {
    if (input.channel !== "WHATSAPP") {
      return { success: false, errorCode: "UNSUPPORTED_CHANNEL", errorMessage: `Canal ${input.channel} não suportado por esse provider.` };
    }

    try {
      const socket = await this.connection.waitUntilReady();
      const jid = phoneToJid(input.destination);
      const result = await socket.sendMessage(jid, { text: input.message });

      return { success: true, providerMessageId: result?.key.id ?? undefined };
    } catch (error) {
      return {
        success: false,
        errorCode: "WHATSAPP_SEND_FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

import type { NotificationInput, NotificationProvider, NotificationResult } from "./types";

// Provider padrão do MVP (Step 7) — valida toda a arquitetura de fila/log sem
// depender do WhatsApp de verdade. Trocado por BaileysNotificationProvider no Step 8,
// sem alterar quem chama `send()`.
export class ConsoleNotificationProvider implements NotificationProvider {
  async send(input: NotificationInput): Promise<NotificationResult> {
    console.log(
      `[notification:${input.channel}:${input.type}] -> ${input.destination}\n${input.message}`,
    );
    return { success: true, providerMessageId: `console-${Date.now()}` };
  }
}

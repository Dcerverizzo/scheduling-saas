import { getGoogleCalendarInboundSyncQueue } from "@scheduling-saas/queue";

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 30_000 },
};

// Disparado assim que a conexão é criada/reconectada — sem isso, o staff só
// veria o próprio calendário pessoal refletido na agenda depois da próxima
// reconciliação periódica (até 30 min). A reconciliação continua sendo a rede
// de segurança (webhook perdido, canal expirando), não o caminho principal.
export async function enqueueGoogleCalendarInboundSync(connectionId: string): Promise<void> {
  await getGoogleCalendarInboundSyncQueue().add(
    "sync-inbound-availability",
    { connectionId },
    DEFAULT_JOB_OPTIONS,
  );
}

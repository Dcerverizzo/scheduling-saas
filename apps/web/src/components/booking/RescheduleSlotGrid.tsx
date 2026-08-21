export function RescheduleSlotGrid({
  slots,
  companyTimezone,
  action,
}: {
  slots: Date[];
  companyTimezone: string;
  action: (startsAtIso: string) => Promise<void>;
}) {
  if (slots.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">Nenhum horário disponível nesse dia.</p>;
  }

  return (
    <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const iso = slot.toISOString();
        const localTime = slot.toLocaleTimeString("pt-BR", {
          timeZone: companyTimezone,
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <li key={iso}>
            <form action={action.bind(null, iso)}>
              <button
                type="submit"
                className="font-mono-data block w-full rounded-md border border-border bg-card py-2.5 text-center text-sm font-semibold hover:border-primary hover:text-primary"
              >
                {localTime}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

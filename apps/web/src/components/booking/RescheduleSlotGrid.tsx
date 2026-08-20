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
    return <p className="mt-2 text-sm text-gray-600">Nenhum horário disponível nesse dia.</p>;
  }

  return (
    <ul className="mt-4 grid grid-cols-4 gap-2">
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
                className="block w-full rounded-md border border-gray-200 px-3 py-2 text-center text-sm hover:border-gray-400"
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

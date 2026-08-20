export interface GoogleCalendarEventBody {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  // bookingId aqui é o que marca "isso foi o app que criou" (decisão 2 do design de
  // Calendar no PRD) — o sync nunca toca em evento sem esse marcador.
  extendedProperties: { private: { bookingId: string; companyId: string } };
}

export interface BookingCalendarEventInput {
  bookingId: string;
  companyId: string;
  companyName: string;
  serviceName: string;
  customerName: string;
  customerPhone?: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}

// Pura — sem Prisma, sem fetch — testável sem infraestrutura, mesmo padrão de
// packages/notifications/src/templates.ts.
export function buildBookingEventBody(input: BookingCalendarEventInput): GoogleCalendarEventBody {
  const descriptionLines = [
    `Empresa: ${input.companyName}`,
    input.customerPhone ? `Telefone: ${input.customerPhone}` : null,
  ].filter((line): line is string => line !== null);

  return {
    summary: `${input.serviceName} — ${input.customerName}`,
    description: descriptionLines.join("\n"),
    start: { dateTime: input.startsAt.toISOString(), timeZone: input.timezone },
    end: { dateTime: input.endsAt.toISOString(), timeZone: input.timezone },
    extendedProperties: {
      private: { bookingId: input.bookingId, companyId: input.companyId },
    },
  };
}

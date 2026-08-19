export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

// Status que efetivamente ocupam a agenda do staff (usados também na EXCLUDE
// constraint do banco — ver migration 20260819063100_add_booking_exclusion_constraint).
export const BLOCKING_BOOKING_STATUSES: readonly BookingStatus[] = ["PENDING", "CONFIRMED"];

const VALID_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "COMPLETED", "NO_SHOW"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function canTransitionBookingStatus(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertValidBookingTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransitionBookingStatus(from, to)) {
    throw new Error(`Transição de status inválida: ${from} -> ${to}`);
  }
}

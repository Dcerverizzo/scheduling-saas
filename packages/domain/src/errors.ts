export type DomainErrorCode =
  | "BOOKING_SLOT_UNAVAILABLE"
  | "SERVICE_NOT_FOUND"
  | "STAFF_NOT_AVAILABLE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "COMPANY_NOT_FOUND"
  | "BOOKING_NOT_FOUND"
  | "INVALID_BOOKING_STATE"
  | "RATE_LIMITED"
  | "PAYMENT_SETUP_INVALID"
  | "PAYMENT_INIT_FAILED";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

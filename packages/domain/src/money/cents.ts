// Nunca usar float pra dinheiro. Entrada tipo "49,90" ou "49.90" -> 4990.
export function parseCentsFromDecimalString(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const cents = fractionPart.padEnd(2, "0").slice(0, 2);
  return Number(wholePart) * 100 + Number(cents);
}

export function formatCentsAsDecimalString(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

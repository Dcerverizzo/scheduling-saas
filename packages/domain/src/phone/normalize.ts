// Normalização heurística pra E.164, focada no mercado brasileiro (item 12 do PRD).
// Não é um parser completo de telefone internacional — pra isso, libphonenumber-js
// seria a escolha correta; deixamos essa evolução documentada como débito conhecido
// caso o produto expanda pra outros países.
export function normalizePhoneToE164(input: string, defaultCountryCode = "55"): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return null;

  // Já tem código de país explícito (mais de 11 dígitos, ou já começa com "+" no input original).
  if (input.trim().startsWith("+")) {
    return digits.length >= 10 ? `+${digits}` : null;
  }

  // DDD (2) + celular com 9 (9) = 11 dígitos é o padrão BR atual.
  if (digits.length === 10 || digits.length === 11) {
    return `+${defaultCountryCode}${digits}`;
  }

  if (digits.length > 11) {
    return `+${digits}`;
  }

  return null;
}

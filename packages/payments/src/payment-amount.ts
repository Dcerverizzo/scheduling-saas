// Confirma que o valor que o Mercado Pago diz ter cobrado bate com o que a gente esperava —
// nunca confiar no valor vindo do corpo do webhook nem assumir que a preference criada não foi
// adulterada; getPayment() é a fonte de verdade, e este é o ponto de checagem antes de
// confirmar qualquer booking.
export class PaymentAmountMismatchError extends Error {
  constructor(expectedCents: number, receivedCents: number) {
    super(`Valor do pagamento não confere: esperado ${expectedCents} centavos, recebido ${receivedCents}.`);
    this.name = "PaymentAmountMismatchError";
  }
}

// Sempre centavos, nunca float (convenção do projeto inteiro) — arredonda pra baixo, o cliente
// nunca paga um centavo a mais por causa de arredondamento.
export function calculateDepositAmountInCents(priceInCents: number, depositPercentage: number): number {
  return Math.floor((priceInCents * depositPercentage) / 100);
}

export function assertAuthoritativePaymentAmount(expectedCents: number, receivedCents: number): void {
  if (expectedCents !== receivedCents) {
    throw new PaymentAmountMismatchError(expectedCents, receivedCents);
  }
}

// Único ponto de conversão de centavos (nossa convenção interna) pro valor decimal que a API do
// Mercado Pago espera (ex: 1990 -> 19.9). toFixed(2) evita sujeira de ponto flutuante antes de
// virar Number de novo.
export function centsToMercadoPagoAmount(amountInCents: number): number {
  return Number((amountInCents / 100).toFixed(2));
}

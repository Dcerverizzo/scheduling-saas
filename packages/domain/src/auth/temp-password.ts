import { randomInt } from "node:crypto";

// Alfabeto sem caracteres visualmente ambíguos (0/O, 1/l/I) — pensado pra ser
// lido e digitado por telefone/WhatsApp pelo Owner ao repassar pro Staff.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

export function generateTempPassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}

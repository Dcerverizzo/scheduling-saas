import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // tamanho recomendado de IV pro GCM
const KEY_LENGTH_BYTES = 32; // AES-256

function parseKey(keyHex: string): Buffer {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `Chave de cifragem inválida: esperado ${KEY_LENGTH_BYTES} bytes em hex (${KEY_LENGTH_BYTES * 2} caracteres), recebido ${key.length} bytes.`,
    );
  }
  return key;
}

// Refresh token do Google nunca é gravado em texto plano no banco (vazamento do
// dump/backup do Postgres não deve expor acesso à agenda de ninguém). AES-256-GCM:
// autenticado, então um ciphertext adulterado falha no decrypt em vez de decodificar
// silenciosamente pra lixo.
export function encryptToken(plaintext: string, keyHex: string): string {
  const key = parseKey(keyHex);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buffer) => buffer.toString("base64url")).join(".");
}

export function decryptToken(encoded: string, keyHex: string): string {
  const key = parseKey(keyHex);
  const parts = encoded.split(".");
  if (parts.length !== 3) {
    throw new Error("Token cifrado em formato inválido.");
  }
  const [ivPart, authTagPart, ciphertextPart] = parts as [string, string, string];

  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(authTagPart, "base64url");
  const ciphertext = Buffer.from(ciphertextPart, "base64url");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

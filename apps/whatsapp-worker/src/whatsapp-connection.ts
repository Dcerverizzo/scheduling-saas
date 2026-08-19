import path from "node:path";
import qrcodeTerminal from "qrcode-terminal";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";

// Sessão única compartilhada por toda a plataforma no MVP (decisão da sessão de
// grilling — risco documentado no README). Persistida em disco, nunca versionada
// (ver .gitignore: apps/whatsapp-worker/session/).
const SESSION_DIR = path.resolve(import.meta.dirname, "../session");

export interface WhatsAppConnection {
  getSocket(): WASocket | null;
  waitUntilReady(): Promise<WASocket>;
}

export async function startWhatsAppConnection(): Promise<WhatsAppConnection> {
  let socket: WASocket | null = null;
  let readyResolvers: ((sock: WASocket) => void)[] = [];

  async function connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
    });
    socket = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("[whatsapp-worker] escaneie o QR code abaixo com o WhatsApp (Aparelhos conectados):");
        qrcodeTerminal.generate(qr, { small: true });
      }

      if (connection === "open") {
        console.log("[whatsapp-worker] conectado ao WhatsApp");
        const resolvers = readyResolvers;
        readyResolvers = [];
        for (const resolve of resolvers) resolve(sock);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        console.error(
          `[whatsapp-worker] conexão fechada (status ${statusCode ?? "?"}), ` +
            (loggedOut ? "sessão deslogada — apague a pasta session/ e reinicie pra gerar um QR novo." : "reconectando..."),
        );
        if (!loggedOut) {
          connect().catch((error) => console.error("[whatsapp-worker] falha ao reconectar:", error));
        }
      }
    });
  }

  await connect();

  return {
    getSocket: () => socket,
    waitUntilReady: () =>
      new Promise((resolve) => {
        if (socket && socket.user) {
          resolve(socket);
          return;
        }
        readyResolvers.push(resolve);
      }),
  };
}

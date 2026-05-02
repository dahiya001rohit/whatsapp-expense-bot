/**
 * src/bot/index.js
 * Baileys WhatsApp connection — generates a QR code in the terminal,
 * maintains the session in memory, and delegates all message handling
 * to handler.js.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');


const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { handleMessage } = require('./handler');


// ─── Baileys connection ───────────────────────────────────────────────────────

async function startBot() {
  // Persist auth credentials across restarts
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  // Always use the latest Baileys protocol version
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧  Using Baileys WA version: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // we'll print it ourselves for nicer output
    logger: pino({ level: 'silent' }), // suppress noisy Baileys logs
    browser: ['Expense Tracker', 'Chrome', '1.0.0'],
  });


  // ── QR Code ──────────────────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱  Scan this QR code with WhatsApp to connect:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('\n✅  WhatsApp connected! Bot is running.\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `⚠️  Connection closed (code ${statusCode ?? 'unknown'}). ` +
        (shouldReconnect ? 'Reconnecting…' : 'Logged out — delete auth_info_baileys/ and restart.')
      );

      if (shouldReconnect) {
        // Brief pause before retry to avoid hammering the server
        setTimeout(startBot, 3000);
      }
    }
  });

  // ── Persist auth credentials whenever they update ─────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Route incoming messages to handler.js ─────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only process newly received messages (not historical/notify backfill)
    if (type !== 'notify') return;

    for (const message of messages) {
      try {
        await handleMessage(sock, message);
      } catch (err) {
        console.error('❌  Error handling message:', err);
      }
    }
  });

  return sock;
}

module.exports = { startBot };

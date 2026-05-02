/**
 * src/bot/index.js
 *
 * Baileys WhatsApp connection.
 * Auth state is persisted to MongoDB (survives Render restarts).
 * Delegates all message handling to handler.js.
 */

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const qrcode = require('qrcode-terminal');
const pino   = require('pino');

const { useMongoDBAuthState } = require('../utils/mongoAuthState');
const { handleMessage }       = require('./handler');

// ─── Baileys connection ───────────────────────────────────────────────────────

async function startBot() {
  // Load credentials from MongoDB (or create fresh ones on first run)
  const { state, saveCreds } = await useMongoDBAuthState();

  // Always use the latest Baileys protocol version
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧  Using Baileys WA version: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // we print it ourselves below for nicer output
    logger: pino({ level: 'silent' }),
    browser: ['SpendBot', 'Chrome', '1.0.0'],
  });

  // ── Persist credentials whenever they change ──────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── QR / connection events ─────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱  Scan this QR code with WhatsApp to connect:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('\n✅  WhatsApp connected! Bot is running.\n');
    }

    if (connection === 'close') {
      const statusCode    = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `⚠️  Connection closed (code ${statusCode ?? 'unknown'}). ` +
        (shouldReconnect
          ? 'Reconnecting…'
          : 'Logged out — clear the AuthSession collection in MongoDB and restart.')
      );

      if (shouldReconnect) {
        // Brief pause before retry to avoid hammering WhatsApp servers
        setTimeout(startBot, 3000);
      }
    }
  });

  // ── Route incoming messages to handler.js ─────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
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

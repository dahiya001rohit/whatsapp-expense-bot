/**
 * src/bot/index.js
 *
 * Baileys WhatsApp connection.
 * Auth state is persisted to MongoDB (survives Render restarts).
 * Exposes GET /qr — an HTML page with a scannable QR code image.
 * Delegates all message handling to handler.js.
 */

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const QRCode = require('qrcode');
const pino   = require('pino');

const { useMongoDBAuthState } = require('../utils/mongoAuthState');
const { handleMessage }       = require('./handler');

// ─── QR state (in-memory, refreshed on each new code) ────────────────────────
let currentQR = null;

// ─── Baileys connection ───────────────────────────────────────────────────────

async function startBot(app) {

  // ── /qr endpoint — serve QR as a scannable HTML image ──────────────────────
  if (app) {
    app.get('/qr', async (req, res) => {
      if (!currentQR) {
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>SpendBot — QR</title>
              <meta http-equiv="refresh" content="5">
              <style>
                body { font-family: sans-serif; text-align: center;
                       padding: 60px; background: #111; color: #eee; }
              </style>
            </head>
            <body>
              <h2>✅ Bot already connected — no QR needed.</h2>
              <p style="color:#aaa">If the bot disconnected, restart the service
              and refresh this page.</p>
            </body>
          </html>
        `);
      }

      try {
        const dataUrl = await QRCode.toDataURL(currentQR, { width: 400 });
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>SpendBot — Scan QR</title>
              <meta http-equiv="refresh" content="20">
              <style>
                body { font-family: sans-serif; text-align: center;
                       padding: 60px; background: #111; color: #eee; }
                img  { border: 8px solid white; border-radius: 12px; }
              </style>
            </head>
            <body>
              <h2>📱 Scan with WhatsApp</h2>
              <p>Open WhatsApp → Linked Devices → Link a Device</p>
              <img src="${dataUrl}" alt="QR Code" />
              <p style="color:#aaa; font-size:0.85rem">
                Page auto-refreshes every 20 s. QR expires ~60 s after generation.
              </p>
            </body>
          </html>
        `);
      } catch (err) {
        res.status(500).send('Failed to generate QR image.');
      }
    });
  }

  // ── Load credentials from MongoDB ──────────────────────────────────────────
  const { state, saveCreds } = await useMongoDBAuthState();

  // ── Always use the latest Baileys protocol version ─────────────────────────
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧  Using Baileys WA version: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['SpendBot', 'Chrome', '1.0.0'],
  });

  // ── Persist credentials whenever they change ───────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── QR / connection events ─────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR = qr; // store for /qr endpoint
      const renderUrl = process.env.RENDER_URL || `http://localhost:${process.env.PORT || 3000}`;
      console.log(`\n📱  QR ready — open this URL to scan:\n    ${renderUrl}/qr\n`);
    }

    if (connection === 'open') {
      currentQR = null; // clear QR once connected
      console.log('\n✅  WhatsApp connected! Bot is running.\n');
    }

    if (connection === 'close') {
      const statusCode      = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `⚠️  Connection closed (code ${statusCode ?? 'unknown'}). ` +
        (shouldReconnect
          ? 'Reconnecting…'
          : 'Logged out — clear the AuthSession collection in MongoDB and restart.')
      );

      if (shouldReconnect) {
        setTimeout(() => startBot(app), 3000);
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

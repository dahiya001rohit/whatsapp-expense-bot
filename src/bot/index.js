/**
 * src/bot/index.js
 *
 * Baileys WhatsApp connection.
 * Auth state is persisted to MongoDB (survives Render restarts).
 * Exposes GET /qr — an HTML page with a scannable QR code image.
 * Exports getSocket() so handler.js always uses the live connection.
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
const { initScheduler }       = require('../scheduler/notifications');

// ─── Shared live socket reference ────────────────────────────────────────────
let _currentSock  = null;
let _reconnecting = false; // guard — only one pending reconnect at a time
let _deploymentMessageSent = false; // ensures we only announce once per server start

// ─── Message deduplication (60s TTL) ─────────────────────────────────────────
const _seenIds = new Map();

function isDuplicate(id) {
  const now = Date.now();
  for (const [k, ts] of _seenIds) {
    if (now - ts > 60_000) _seenIds.delete(k);
  }
  if (_seenIds.has(id)) return true;
  _seenIds.set(id, now);
  return false;
}

function getSocket() {
  return _currentSock;
}

// ─── QR state ─────────────────────────────────────────────────────────────────
let currentQR = null;

// ─── Baileys connection ───────────────────────────────────────────────────────

async function startBot(app) {

  // ── /qr endpoint (registered once only) ────────────────────────────────────
  if (app && !app._qrRouteRegistered) {
    app._qrRouteRegistered = true;

    app.get('/qr', async (req, res) => {
      if (!currentQR) {
        return res.status(200).send(`
          <!DOCTYPE html><html>
            <head><title>SpendBot — QR</title>
              <meta http-equiv="refresh" content="5">
              <style>body{font-family:sans-serif;text-align:center;padding:60px;
                background:#111;color:#eee}</style></head>
            <body>
              <h2>✅ Bot already connected — no QR needed.</h2>
              <p style="color:#aaa">If the bot disconnected, restart the service
              and refresh this page.</p>
            </body></html>`);
      }

      try {
        const dataUrl = await QRCode.toDataURL(currentQR, { width: 400 });
        res.status(200).send(`
          <!DOCTYPE html><html>
            <head><title>SpendBot — Scan QR</title>
              <meta http-equiv="refresh" content="20">
              <style>body{font-family:sans-serif;text-align:center;padding:60px;
                background:#111;color:#eee}
                img{border:8px solid white;border-radius:12px}</style></head>
            <body>
              <h2>📱 Scan with WhatsApp</h2>
              <p>Open WhatsApp → Linked Devices → Link a Device</p>
              <img src="${dataUrl}" alt="QR Code" />
              <p style="color:#aaa;font-size:0.85rem">
                Page auto-refreshes every 20 s. QR expires ~60 s after generation.</p>
            </body></html>`);
      } catch (err) {
        res.status(500).send('Failed to generate QR image.');
      }
    });
  }

  // ── Load credentials from MongoDB ──────────────────────────────────────────
  const { state, saveCreds } = await useMongoDBAuthState();

  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧  Using Baileys WA version: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['SpendBot', 'Chrome', '1.0.0'],
  });

  _currentSock = sock;

  sock.ev.on('creds.update', saveCreds);

  // ── QR / connection events ─────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR = qr;
      const base = process.env.RENDER_URL || `http://localhost:${process.env.PORT || 3000}`;
      console.log(`\n📱  QR ready — open to scan:\n    ${base}/qr\n`);
    }

    if (connection === 'open') {
      currentQR    = null;
      _currentSock = sock;
      _reconnecting = false;
      console.log('\n✅  WhatsApp connected! Bot is running.\n');
      initScheduler(sock);

      if (!_deploymentMessageSent) {
        _deploymentMessageSent = true;
        const User = require('../models/User');
        const { deploymentMessage } = require('../utils/messages');
        User.find({ name: { $ne: null }, currentStep: { $ne: 'awaiting_name' } })
          .then(async (users) => {
            console.log(`🚀 Announcing update to ${users.length} onboarded users...`);
            for (const u of users) {
              const targetJid = u.jid || `${u.phone}@s.whatsapp.net`;
              await sock.sendMessage(targetJid, deploymentMessage()).catch(() => {});
              await new Promise(r => setTimeout(r, 1000));
            }
          })
          .catch(err => console.error('Failed to send deployment messages:', err));
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut  = statusCode === DisconnectReason.loggedOut;
      // 440 = connectionReplaced — a newer session/deploy took over this account.
      // Reconnecting would just kick the new session back, creating an infinite loop.
      // Accept the handoff gracefully and stop.
      const conflict   = statusCode === 440;

      if (loggedOut || conflict) {
        const reason = loggedOut
          ? 'Logged out — clear AuthSession in MongoDB and restart.'
          : 'Session replaced by a newer connection — this instance will stop reconnecting.';
        console.log(`⚠️  Connection closed (code ${statusCode}). ${reason}`);
        return; // do NOT reconnect
      }

      // Real network failure — reconnect once, guarded
      console.log(`⚠️  Connection closed (code ${statusCode ?? 'unknown'}). Reconnecting in 5s…`);

      if (_reconnecting) {
        console.log('Reconnect already pending — skipping.');
        return;
      }

      _reconnecting = true;
      setTimeout(async () => {
        _reconnecting = false;
        await startBot(app);
      }, 5000);
    }
  });

  // ── Route incoming messages to handler.js ─────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const nowSec = Math.floor(Date.now() / 1000);

    for (const message of messages) {
      if (!message.key.id || isDuplicate(message.key.id)) continue;

      // Drop messages older than 30 s — replayed on reconnect/restart
      const ts = message.messageTimestamp;
      if (ts && nowSec - ts > 30) {
        console.log(`⏭️  Skipping stale message (${nowSec - ts}s old) id=${message.key.id}`);
        continue;
      }

      try {
        await handleMessage(sock, message);
      } catch (err) {
        console.error('❌  Error handling message:', err);
      }
    }
  });

  return sock;
}

module.exports = { startBot, getSocket };

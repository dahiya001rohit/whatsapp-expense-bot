'use strict';

/**
 * src/bot/index.js — Baileys WhatsApp connection
 *
 * Auth state persisted to MongoDB (survives Render restarts).
 * QR string written to MongoDB 'appstate' collection — served by FastAPI /qr.
 * Exports getSocket() so handler.js always uses the live connection.
 */

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const pino = require('pino');

const { useMongoDBAuthState } = require('../utils/mongoAuthState');
const { handleMessage }       = require('./handler');
const { initScheduler }       = require('../scheduler/notifications');

// ── Shared live socket reference ──────────────────────────────────────────────
let _currentSock    = null;
let _reconnectTimer = null;

// FIXED: exponential backoff state — resets to 1s on successful connect
let _reconnectDelay        = 1_000;
const MAX_RECONNECT_DELAY  = 30_000;

// ── Message deduplication (60s TTL) ───────────────────────────────────────────
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

// ── QR → MongoDB bridge ───────────────────────────────────────────────────────

// FIXED: write QR to MongoDB so FastAPI can serve it without needing a shared
// in-memory reference. Null value = bot is connected, no QR needed.
async function writeQrToMongo(value) {
  const mongoose = require('mongoose');
  try {
    await mongoose.connection.db.collection('appstate').updateOne(
      { key: 'qr' },
      { $set: { key: 'qr', value, updatedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    console.error('⚠️ Failed to write QR to MongoDB:', err.message);
  }
}

// ── Baileys connection ─────────────────────────────────────────────────────────

let _deploymentMessageSent = false;

async function startBot() {
  const { state, saveCreds } = await useMongoDBAuthState();
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧  Using Baileys WA version: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['FynxAI', 'Chrome', '1.0.0'],
  });

  _currentSock = sock;

  sock.ev.on('creds.update', saveCreds);

  // ── QR / connection events ──────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      await writeQrToMongo(qr); // FIXED: persist QR for FastAPI to serve
      const base = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
      console.log(`\n📱  QR ready — open to scan:\n    ${base}/qr\n`);
    }

    if (connection === 'open') {
      await writeQrToMongo(null); // FIXED: clear QR once connected
      _currentSock    = sock;
      // FIXED: reset backoff on successful connect
      _reconnectDelay = 1_000;
      if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
      console.log('\n✅  WhatsApp connected! Bot is running.\n');
      initScheduler(sock);

      if (!_deploymentMessageSent) {
        _deploymentMessageSent = true;
        _sendDeploymentMessages(sock).catch(console.error);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut  = statusCode === DisconnectReason.loggedOut;
      // 440 = connectionReplaced — a newer session took over. Stop reconnecting.
      const conflict   = statusCode === 440;

      if (loggedOut || conflict) {
        const reason = loggedOut
          ? 'Logged out — clear AuthSession in MongoDB and restart.'
          : 'Session replaced by a newer connection — stopping.';
        console.log(`⚠️  Connection closed (${statusCode}). ${reason}`);
        return;
      }

      if (_reconnectTimer) return; // already scheduled

      // FIXED: exponential backoff — 1s → 2s → 4s → … → 30s (max)
      const delay = _reconnectDelay;
      _reconnectDelay = Math.min(_reconnectDelay * 2, MAX_RECONNECT_DELAY);
      console.log(`⚠️  Connection closed (${statusCode ?? 'unknown'}). Reconnecting in ${delay / 1_000}s…`);

      _reconnectTimer = setTimeout(async () => {
        _reconnectTimer = null;
        await startBot();
      }, delay);
    }
  });

  // ── Route incoming messages ─────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const nowSec = Math.floor(Date.now() / 1000);

    for (const message of messages) {
      if (!message.key.id || isDuplicate(message.key.id)) continue;

      // FIXED: drop messages older than 30s — replayed on reconnect/restart
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

async function _sendDeploymentMessages(sock) {
  const User = require('../models/User');
  const { deploymentMessage } = require('../utils/messages');
  const users = await User.find({ name: { $ne: null }, currentStep: { $ne: 'awaiting_name' } });
  console.log(`🚀 Announcing update to ${users.length} onboarded users…`);
  for (const u of users) {
    const targetJid = u.jid || `${u.phone}@s.whatsapp.net`;
    await sock.sendMessage(targetJid, deploymentMessage()).catch(() => {});
    await new Promise((r) => setTimeout(r, 1_000));
  }
}

module.exports = { startBot, getSocket };

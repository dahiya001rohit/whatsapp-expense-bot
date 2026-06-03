/**
 * index.js — Legacy / local-dev entry point
 *
 * Production uses bot.js (spawned by FastAPI) + Dockerfile.
 * This file keeps local `npm start` working with Express for the /qr endpoint.
 */
'use strict';

require('dotenv').config();

// ── Suppress libsignal / Baileys Signal-protocol noise ────────────────────────
const SIGNAL_NOISE = [
  'Failed to decrypt', 'Bad MAC', 'Closing open session',
  'Closing session:', 'Session error:', 'SessionEntry',
];
const _isSignalNoise = (...args) => SIGNAL_NOISE.some((p) => String(args[0] ?? '').includes(p));
const _origError = console.error.bind(console);
console.error = (...args) => { if (!_isSignalNoise(...args)) _origError(...args); };
const _origLog = console.log.bind(console);
console.log = (...args) => { if (!_isSignalNoise(...args)) _origLog(...args); };

// FIXED: global unhandled rejection handler
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message, err.stack);
});

const express  = require('express');
const https    = require('https');
const http     = require('http');
const mongoose = require('mongoose');
const { startBot, getCurrentQR } = require('./src/bot/index');
const qrTerminal = require('qrcode-terminal');

// FIXED: validate all required env vars on startup
function validateEnv() {
  const required = ['MONGO_URI'];
  const missing  = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const app  = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (_req, res) => {
  res.status(200).json({
    status:    'alive',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/qr', (_req, res) => {
  const qr = getCurrentQR();
  if (!qr) {
    // Bot is either connected or hasn't generated a QR yet
    const connected = require('./src/bot/index').getSocket()?.user != null;
    return res.json({ status: connected ? 'connected' : 'waiting_for_qr' });
  }
  // Return terminal-format QR as plain text (visible in Render logs + browser)
  qrTerminal.generate(qr, { small: true }, (qrText) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`📱 Scan to connect WhatsApp:\n\n${qrText}`);
  });
});

app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

// ── Self-ping — prevents Render free tier from sleeping ───────────────────────
function keepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL;
  if (!url) {
    console.log('⚠️  RENDER_EXTERNAL_URL not set — skipping keep-alive ping');
    return;
  }
  const protocol = url.startsWith('https') ? https : http;
  protocol.get(`${url}/health`, (res) => {
    console.log(`✅ Keep-alive ping — ${res.statusCode}`);
  }).on('error', (err) => {
    console.log(`❌ Ping failed — ${err.message}`);
  });
}

setInterval(keepAlive, 10 * 60 * 1_000);
setTimeout(keepAlive,  60 * 1_000);

// FIXED: exponential backoff MongoDB retry
async function connectWithRetry(maxRetries = 6) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅  MongoDB connected');
      return;
    } catch (err) {
      console.error(`❌  MongoDB attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt === maxRetries) { console.error('❌  All attempts failed.'); process.exit(1); }
      const delay = Math.min(Math.pow(2, attempt) * 1_000, 30_000);
      console.log(`⏳ Retrying in ${delay / 1_000}s…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

mongoose.connection.on('disconnected', () => console.log('⚠️  MongoDB disconnected — auto-reconnecting…'));
mongoose.connection.on('reconnected',  () => console.log('✅  MongoDB reconnected'));
mongoose.connection.on('error',        (err) => console.error('❌  MongoDB error:', err.message));

async function main() {
  validateEnv();
  await connectWithRetry();
  await startBot(app);
}

main();

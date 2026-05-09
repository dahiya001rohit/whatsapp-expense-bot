require('dotenv').config();

// ─── Suppress libsignal / Baileys Signal-protocol noise ──────────────────────
// These are internal session-renegotiation messages, not real errors.
// libsignal uses BOTH console.error and console.log for these.
const SIGNAL_NOISE = [
  'Failed to decrypt',
  'Bad MAC',
  'Closing open session',
  'Closing session:',
  'Session error:',
  'SessionEntry',
];
const _isSignalNoise = (...args) =>
  SIGNAL_NOISE.some((pat) => String(args[0] ?? '').includes(pat));

const _origError = console.error.bind(console);
console.error = (...args) => { if (!_isSignalNoise(...args)) _origError(...args); };

const _origLog = console.log.bind(console);
console.log = (...args) => { if (!_isSignalNoise(...args)) _origLog(...args); };

// ─── Dependencies ─────────────────────────────────────────────────────────────
const express  = require('express');
const https    = require('https');
const http     = require('http');
const mongoose = require('mongoose');
const { startBot } = require('./src/bot/index');

// ─── Health check + self-ping server ─────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'alive',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ─── Self-ping — prevents Render free tier from sleeping ─────────────────────
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

// Ping every 10 minutes (600 000 ms)
setInterval(keepAlive, 10 * 60 * 1000);

// First ping 1 minute after startup (bot needs time to fully initialise)
setTimeout(keepAlive, 60 * 1000);

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.MONGO_URI) {
    console.error('❌  MONGO_URI is not set in .env — please add it and restart.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  MongoDB connected');
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  }

  await startBot(app);
}

main();

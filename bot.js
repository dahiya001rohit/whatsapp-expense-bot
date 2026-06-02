/**
 * bot.js — FynxAI Node.js entry point
 *
 * Starts Baileys WhatsApp bot + MongoDB (Mongoose).
 * HTTP is handled by the FastAPI service (fastapi_app/main.py).
 * This process focuses purely on the WhatsApp bot logic.
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

// FIXED: global unhandled rejection handler — prevent silent crashes
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  // Do NOT exit — re-establishing a Baileys session is expensive
});

// FIXED: catch uncaught exceptions so process stays alive for bot reconnects
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message, err.stack);
});

const mongoose = require('mongoose');
const { startBot } = require('./src/bot/index');

// FIXED: validate all required env vars on startup instead of crashing mid-run
function validateEnv() {
  const required = ['MONGO_URI'];
  const missing  = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// FIXED: exponential backoff MongoDB retry — 2s, 4s, 8s … cap 30s
async function connectWithRetry(maxRetries = 6) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅  MongoDB connected');
      return;
    } catch (err) {
      console.error(`❌  MongoDB attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt === maxRetries) {
        console.error('❌  All MongoDB connection attempts failed. Exiting.');
        process.exit(1);
      }
      const delay = Math.min(Math.pow(2, attempt) * 1_000, 30_000);
      console.log(`⏳ Retrying in ${delay / 1_000}s…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// FIXED: handle MongoDB disconnects after startup — log and let mongoose auto-reconnect
mongoose.connection.on('disconnected', () => console.log('⚠️  MongoDB disconnected — auto-reconnecting…'));
mongoose.connection.on('reconnected',  () => console.log('✅  MongoDB reconnected'));
mongoose.connection.on('error',        (err) => console.error('❌  MongoDB error:', err.message));

async function main() {
  validateEnv();
  await connectWithRetry();
  await startBot();
}

main();

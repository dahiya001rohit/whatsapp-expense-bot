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
const mongoose = require('mongoose');
const { startBot } = require('./src/bot/index');

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

  await startBot();
}

main();

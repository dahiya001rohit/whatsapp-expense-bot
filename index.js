require('dotenv').config();
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

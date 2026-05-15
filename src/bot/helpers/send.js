'use strict';

const MAX_RETRIES = 3;

async function send(_sock, jid, payload) {
  const { getSocket } = require('../index');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const live = getSocket() || _sock;
      console.log(`📤 [attempt ${attempt}] Sending to ${jid}`);
      const result = await live.sendMessage(jid, { text: payload.text });
      console.log(`✅ Sent to ${jid} | msgId: ${result?.key?.id}`);
      return result;
    } catch (err) {
      console.error(`❌ Send attempt ${attempt} failed:`, err.message);
      if (attempt === MAX_RETRIES) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

module.exports = { send };

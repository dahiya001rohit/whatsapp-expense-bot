'use strict';

const humanDelay = () =>
  new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

async function send(_sock, jid, payload) {
  await humanDelay();

  // Always use the most recently connected socket, not the one captured at
  // message-receipt time (which may have closed mid-reconnect cycle).
  const { getSocket } = require('../index');
  const live = getSocket() || _sock;

  try {
    await live.sendMessage(jid, { text: payload.text });
  } catch (err) {
    if (err?.message?.includes('Connection Closed') || err?.message?.includes('Timed Out')) {
      await new Promise((r) => setTimeout(r, 5000));
      const retrySocket = getSocket() || _sock;
      await retrySocket.sendMessage(jid, { text: payload.text });
    } else {
      throw err;
    }
  }
}

module.exports = { send, humanDelay };

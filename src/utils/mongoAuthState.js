/**
 * mongoAuthState.js
 *
 * Drop-in replacement for Baileys' useMultiFileAuthState that persists
 * session keys to MongoDB instead of the local filesystem.
 *
 * This means the WhatsApp session survives Render (or any other
 * stateless host) restarts without needing a persistent disk.
 */

const { proto, initAuthCreds, BufferJSON } =
  require('@whiskeysockets/baileys');
const AuthSession = require('../models/AuthSession');

async function useMongoDBAuthState() {

  // ── Low-level helpers ─────────────────────────────────────────────────────

  const writeData = async (data, key) => {
    await AuthSession.findOneAndUpdate(
      { _id: key },
      { value: JSON.stringify(data, BufferJSON.replacer) },
      { upsert: true, new: true }
    );
  };

  const readData = async (key) => {
    const doc = await AuthSession.findOne({ _id: key });
    if (!doc) return null;
    return JSON.parse(doc.value, BufferJSON.reviver);
  };

  const removeData = async (key) => {
    await AuthSession.deleteOne({ _id: key });
  };

  // ── Initialise credentials ────────────────────────────────────────────────

  const creds = (await readData('creds')) || initAuthCreds();

  // ── Return state + saveCreds (same shape as useMultiFileAuthState) ─────────

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },

        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key   = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },

    saveCreds: async () => {
      await writeData(creds, 'creds');
    },
  };
}

module.exports = { useMongoDBAuthState };

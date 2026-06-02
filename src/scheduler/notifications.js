'use strict';

const cron        = require('node-cron');
const User        = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget      = require('../models/Budget');

const fmt = (n) => {
  const num  = Number(n);
  const abs  = Math.abs(num);
  const str  = Number.isInteger(abs) ? String(Math.round(abs)) : abs.toFixed(2);
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + parts.join('.');
};

const EMOJIS = {
  food: '🍕', transport: '🚗', bills: '💡', entertainment: '🎬',
  shopping: '🛍️', health: '🏥', education: '📚', misc: '📦',
};
const emojiForCategory = (name) => EMOJIS[name?.toLowerCase()] || '📁';

// ── Timezone helpers ──────────────────────────────────────────────────────────

function getTzOffsetMs(timezone) {
  const now = new Date();
  const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tz  = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return utc - tz;
}

function getStartOfDay(timezone) {
  const dateStr     = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  const midnightUtc = new Date(`${dateStr}T00:00:00Z`);
  return new Date(midnightUtc.getTime() + getTzOffsetMs(timezone));
}

function getStartOfMonth(timezone) {
  const dateStr       = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  const [year, month] = dateStr.split('-');
  const midnightUtc   = new Date(`${year}-${month}-01T00:00:00Z`);
  return new Date(midnightUtc.getTime() + getTzOffsetMs(timezone));
}

// FIXED: guard against invalid timezone strings — crashes Intl.DateTimeFormat
function getCurrentHour(timezone) {
  try {
    const h = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
        .format(new Date()),
      10,
    );
    return h === 24 ? 0 : h;
  } catch {
    return -1; // FIXED: invalid tz → -1 so no notification fires for this user
  }
}

// ── Budget watch helper ───────────────────────────────────────────────────────

async function getBudgetWatch(phone, timezone) {
  const budgets = await Budget.find({ phone });
  if (!budgets.length) return [];

  const startOfMonth = getStartOfMonth(timezone);
  const results = [];

  for (const budget of budgets) {
    const [agg] = await Transaction.aggregate([
      { $match: { phone, type: 'debit', category: budget.category, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalSpent = agg?.total ?? 0;
    const percentage = Math.round((totalSpent / budget.limit) * 100);
    if (percentage >= 65) {
      results.push({ category: budget.category, spent: totalSpent, limit: budget.limit, percentage });
    }
  }

  return results.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
}

// FIXED: process users in batches to avoid memory/DB overload on large user sets
const BATCH_SIZE = 50;

async function runForEachUser(users, fn) {
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    // FIXED: allSettled so one failing user doesn't block the rest of the batch
    await Promise.allSettled(batch.map(fn));
    if (i + BATCH_SIZE < users.length) {
      await new Promise((r) => setTimeout(r, 300)); // brief pause between batches
    }
  }
}

// ── Notification 1 — Morning Briefing (9 AM per user timezone) ───────────────

async function sendMorningBriefing(sock) {
  const users = await User.find({ name: { $ne: null }, currentStep: { $ne: 'awaiting_name' } });

  await runForEachUser(users, async (user) => {
    // FIXED: timezone validation inside runForEachUser so one bad tz doesn't crash all
    if (getCurrentHour(user.timezone) !== 9) return;

    const startOfMonth      = getStartOfMonth(user.timezone);
    const [monthlyAgg]      = await Transaction.aggregate([
      { $match: { phone: user.phone, type: 'debit', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalMonthlySpent = monthlyAgg?.total ?? 0;
    const budgetWatch       = await getBudgetWatch(user.phone, user.timezone);

    let budgetSection = budgetWatch.length > 0
      ? '\n⚠️ *Budget Watch:*\n' + budgetWatch.map((b) => {
          const bar = b.percentage >= 100 ? '🔴' : '🟡';
          return `${bar} ${emojiForCategory(b.category)} *${b.category}* — ${b.percentage}% (₹${fmt(b.spent)}/₹${fmt(b.limit)})`;
        }).join('\n')
      : '\n✅ All budgets healthy!';

    const message =
      `☀️ Good morning, *${user.name}*!\n\n` +
      `💼 Balance: *₹${fmt(user.balance)}*\n` +
      `📅 Spent this month: *₹${fmt(totalMonthlySpent)}*` +
      budgetSection +
      `\n\n_Type *hi* to log a transaction._`;

    const targetJid = user.jid || `${user.phone}@s.whatsapp.net`;
    await sock.sendMessage(targetJid, { text: message });
    await new Promise((r) => setTimeout(r, 1_500));
  });
}

// ── Notification 2 — Night Summary (10 PM per user timezone) ─────────────────

async function sendNightSummary(sock) {
  const users = await User.find({ name: { $ne: null }, currentStep: { $ne: 'awaiting_name' } });

  await runForEachUser(users, async (user) => {
    if (getCurrentHour(user.timezone) !== 22) return;

    const startOfDay   = getStartOfDay(user.timezone);
    const startOfMonth = getStartOfMonth(user.timezone);

    const todayByCategory = await Transaction.aggregate([
      { $match: { phone: user.phone, type: 'debit', createdAt: { $gte: startOfDay } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    const [monthlyAgg] = await Transaction.aggregate([
      { $match: { phone: user.phone, type: 'debit', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalMonthlySpent = monthlyAgg?.total ?? 0;
    const budgetWatch       = await getBudgetWatch(user.phone, user.timezone);

    let todayTotal = 0;
    let todayLines = '';
    if (todayByCategory.length > 0) {
      todayLines = todayByCategory.map((c) => {
        todayTotal += c.total;
        return `${emojiForCategory(c._id)} ${c._id} — *₹${fmt(c.total)}*`;
      }).join('\n');
      todayLines += `\n\n💸 Today total: *₹${fmt(todayTotal)}*`;
    } else {
      todayLines = '💸 No spending logged today.';
    }

    const budgetSection = budgetWatch.length > 0
      ? '\n\n⚠️ *Budget Watch:*\n' + budgetWatch.map((b) => {
          const bar = b.percentage >= 100 ? '🔴' : '🟡';
          return `${bar} ${emojiForCategory(b.category)} *${b.category}* — ${b.percentage}%`;
        }).join('\n')
      : '';

    const message =
      `🌙 Good night, *${user.name}*!\n\n` +
      todayLines +
      `\n\n💼 Balance: *₹${fmt(user.balance)}*\n` +
      `📅 Monthly: *₹${fmt(totalMonthlySpent)}*` +
      budgetSection +
      `\n\n_Rest well! 😴_`;

    const targetJid = user.jid || `${user.phone}@s.whatsapp.net`;
    await sock.sendMessage(targetJid, { text: message });
    await new Promise((r) => setTimeout(r, 1_500));
  });
}

// ── Notification 3 — Inactivity Nudge ────────────────────────────────────────

async function sendInactivityNudge(sock) {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1_000);

  const users = await User.find({
    name: { $ne: null },
    currentStep: { $ne: 'awaiting_name' },
    notifStatus: { $ne: 'nudge_sent' },
    lastTransactionAt: { $exists: true, $lt: fourHoursAgo },
  });

  await runForEachUser(users, async (user) => {
    const hour = getCurrentHour(user.timezone);
    if (![9, 13, 17, 21].includes(hour)) return;

    const targetJid = user.jid || `${user.phone}@s.whatsapp.net`;
    await sock.sendMessage(targetJid, {
      text: `Hey *${user.name}*! 👋\n\nAny transactions to log?\n\n*YES* → open menu\n*NO* → all good`,
    });

    user.notifStatus     = 'nudge_sent';
    user.lastNudgeSentAt = new Date();
    await user.save();
    await new Promise((r) => setTimeout(r, 1_500));
  });
}

// ── Notification 4 — Nudge Timeout ───────────────────────────────────────────

async function sendNudgeTimeout(sock) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000);

  const users = await User.find({
    notifStatus: 'nudge_sent',
    lastNudgeSentAt: { $lt: oneHourAgo },
  });

  await runForEachUser(users, async (user) => {
    const targetJid = user.jid || `${user.phone}@s.whatsapp.net`;
    await sock.sendMessage(targetJid, {
      text: `No worries, *${user.name}*! 🌟 Type *hi* whenever you're ready.`,
    });
    user.notifStatus = 'none';
    await user.save();
    await new Promise((r) => setTimeout(r, 1_500));
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

let _sock                = null;
let schedulerInitialized = false;

function initScheduler(sock) {
  _sock = sock;

  if (schedulerInitialized) {
    console.log('📅 Scheduler: socket reference updated');
    return;
  }
  schedulerInitialized = true;

  // FIXED: single hourly tick; per-user timezone hour check inside each fn
  cron.schedule('0 * * * *', async () => {
    if (!_sock) return;
    console.log('⏰ Hourly cron tick');
    // FIXED: run sequentially so we don't hit MongoDB too hard simultaneously
    await sendMorningBriefing(_sock).catch((e) => console.error('Morning briefing error:', e));
    await sendNightSummary(_sock).catch((e) => console.error('Night summary error:', e));
    await sendInactivityNudge(_sock).catch((e) => console.error('Nudge error:', e));
    await sendNudgeTimeout(_sock).catch((e) => console.error('Nudge timeout error:', e));
  }, { scheduled: true, timezone: 'Asia/Kolkata' });

  console.log('📅 Scheduler initialized');
}

module.exports = { initScheduler };

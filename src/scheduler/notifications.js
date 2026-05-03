const cron        = require('node-cron');
const User        = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget      = require('../models/Budget');

// ─── Formatters (mirrored from messages.js) ───────────────────────────────────

const fmt = (n) => {
  const num   = Number(n);
  const abs   = Math.abs(num);
  const str   = Number.isInteger(abs) ? String(Math.round(abs)) : abs.toFixed(2);
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + parts.join('.');
};

const EMOJIS = {
  food: '🍕', transport: '🚗', bills: '💡', entertainment: '🎬',
  shopping: '🛍️', health: '🏥', education: '📚', misc: '📦',
  uncategorised: '📦',
};
const emojiForCategory = (name) => EMOJIS[name?.toLowerCase()] || '📁';

// ─── Timezone helpers ─────────────────────────────────────────────────────────

function getStartOfDay(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year  = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day   = parts.find((p) => p.type === 'day').value;
  return new Date(`${year}-${month}-${day}T00:00:00`);
}

function getStartOfMonth(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year  = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  return new Date(`${year}-${month}-01T00:00:00`);
}

function getCurrentHour(timezone) {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10,
  );
}

// ─── Budget watch helper ──────────────────────────────────────────────────────

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

// ─── Notification 1 — Morning Briefing (9 AM per user timezone) ───────────────

async function sendMorningBriefing(sock) {
  const users = await User.find({ name: { $ne: null }, currentStep: { $ne: 'awaiting_name' } });

  for (const user of users) {
    try {
      if (getCurrentHour(user.timezone) !== 9) continue;

      const startOfMonth    = getStartOfMonth(user.timezone);
      const [monthlyAgg]    = await Transaction.aggregate([
        { $match: { phone: user.phone, type: 'debit', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalMonthlySpent = monthlyAgg?.total ?? 0;
      const budgetWatch       = await getBudgetWatch(user.phone, user.timezone);

      let budgetSection = '';
      if (budgetWatch.length > 0) {
        budgetSection = '\n⚠️ *Budget Watch:*\n';
        for (const b of budgetWatch) {
          const bar = b.percentage >= 100 ? '🔴' : '🟡';
          budgetSection +=
            `${bar} ${emojiForCategory(b.category)} *${b.category}*\n` +
            `   ₹${fmt(b.spent)} of ₹${fmt(b.limit)} — ${b.percentage}%\n`;
        }
      } else {
        budgetSection = '\n✅ *All budgets looking healthy!*';
      }

      const message =
        `Good morning, *${user.name}*! ☀️\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `💼 Balance:          *₹${fmt(user.balance)}*\n` +
        `📅 Spent this month: *₹${fmt(totalMonthlySpent)}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━` +
        budgetSection +
        `\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `Have a great day! 💪`;

      await sock.sendMessage(`${user.phone}@s.whatsapp.net`, { text: message });
      await new Promise((r) => setTimeout(r, 2000));

    } catch (err) {
      console.error(`Morning briefing failed for ${user.phone}:`, err.message);
    }
  }
}

// ─── Notification 2 — Night Summary (10 PM per user timezone) ────────────────

async function sendNightSummary(sock) {
  const users = await User.find({ name: { $ne: null }, currentStep: { $ne: 'awaiting_name' } });

  for (const user of users) {
    try {
      if (getCurrentHour(user.timezone) !== 22) continue;

      const startOfDay      = getStartOfDay(user.timezone);
      const startOfMonth    = getStartOfMonth(user.timezone);

      const todayByCategory = await Transaction.aggregate([
        { $match: { phone: user.phone, type: 'debit', createdAt: { $gte: startOfDay } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]);

      const [monthlyAgg]    = await Transaction.aggregate([
        { $match: { phone: user.phone, type: 'debit', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalMonthlySpent = monthlyAgg?.total ?? 0;
      const budgetWatch       = await getBudgetWatch(user.phone, user.timezone);

      let todayTotal   = 0;
      let todaySection = '';
      if (todayByCategory.length > 0) {
        todaySection = `💸 *Today's Spending:*\n`;
        for (const cat of todayByCategory) {
          todaySection += `${emojiForCategory(cat._id)} ${cat._id}   *₹${fmt(cat.total)}*\n`;
          todayTotal   += cat.total;
        }
        todaySection += `\n💸 Total today: *₹${fmt(todayTotal)}*`;
      } else {
        todaySection = `💸 No spending logged today.`;
      }

      let budgetSection = '';
      if (budgetWatch.length > 0) {
        budgetSection = '\n━━━━━━━━━━━━━━━━━━━━━\n⚠️ *Budget Watch:*\n';
        for (const b of budgetWatch) {
          const bar = b.percentage >= 100 ? '🔴' : '🟡';
          budgetSection +=
            `${bar} ${emojiForCategory(b.category)} *${b.category}*\n` +
            `   ₹${fmt(b.spent)} of ₹${fmt(b.limit)} — ${b.percentage}%\n`;
        }
      }

      const message =
        `Good night, *${user.name}*! 🌙\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        todaySection + '\n' +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `💼 Closing balance:  *₹${fmt(user.balance)}*\n` +
        `📅 Monthly spent:    *₹${fmt(totalMonthlySpent)}*` +
        budgetSection +
        `\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `Rest well! 😴`;

      await sock.sendMessage(`${user.phone}@s.whatsapp.net`, { text: message });
      await new Promise((r) => setTimeout(r, 2000));

    } catch (err) {
      console.error(`Night summary failed for ${user.phone}:`, err.message);
    }
  }
}

// ─── Notification 3 — Inactivity Nudge ───────────────────────────────────────

async function sendInactivityNudge(sock) {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const users = await User.find({
    name: { $ne: null },
    currentStep: { $ne: 'awaiting_name' },
    notifStatus: { $ne: 'nudge_sent' },
    lastTransactionAt: { $exists: true, $lt: fourHoursAgo },
  });

  for (const user of users) {
    try {
      const hour = getCurrentHour(user.timezone);
      if (![9, 13, 17, 21].includes(hour)) continue;

      const message =
        `Hey *${user.name}*! 👋\n\n` +
        `Any transactions since we last spoke?\n\n` +
        `Reply *YES* to log them\n` +
        `Reply *NO* for a quick check`;

      await sock.sendMessage(`${user.phone}@s.whatsapp.net`, { text: message });

      user.notifStatus    = 'nudge_sent';
      user.lastNudgeSentAt = new Date();
      await user.save();

      await new Promise((r) => setTimeout(r, 2000));

    } catch (err) {
      console.error(`Nudge failed for ${user.phone}:`, err.message);
    }
  }
}

// ─── Notification 4 — Nudge Timeout ──────────────────────────────────────────

async function sendNudgeTimeout(sock) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const users = await User.find({
    notifStatus: 'nudge_sent',
    lastNudgeSentAt: { $lt: oneHourAgo },
  });

  for (const user of users) {
    try {
      const message =
        `Hope you're having a great time, *${user.name}*! 🌟\n\n` +
        `Type *hi* whenever you're ready.`;

      await sock.sendMessage(`${user.phone}@s.whatsapp.net`, { text: message });

      user.notifStatus = 'none';
      await user.save();

      await new Promise((r) => setTimeout(r, 2000));

    } catch (err) {
      console.error(`Nudge timeout failed for ${user.phone}:`, err.message);
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _sock               = null;
let schedulerInitialized = false;

function initScheduler(sock) {
  _sock = sock; // always update to latest socket

  if (schedulerInitialized) {
    console.log('📅 Scheduler: socket reference updated');
    return;
  }
  schedulerInitialized = true;

  cron.schedule('0 * * * *', async () => {
    if (!_sock) return;
    console.log('⏰ Hourly cron tick');
    await sendMorningBriefing(_sock);
    await sendNightSummary(_sock);
    await sendInactivityNudge(_sock);
    await sendNudgeTimeout(_sock);
  });

  console.log('📅 Scheduler initialized');
}

module.exports = { initScheduler };

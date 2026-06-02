'use strict';

const { fmt } = require('./formatters');

const lendBorrowMenuMessage = (totalOwedToYou, totalYouOwe) => {
  const summary = (totalOwedToYou > 0 || totalYouOwe > 0)
    ? `🟢 Owed to you: *₹${fmt(totalOwedToYou)}*\n🔴 You owe: *₹${fmt(totalYouOwe)}*\n\n`
    : `✅ No outstanding balances.\n\n`;
  return {
    text:
      `💸 *Lending & Borrowing*\n\n` +
      summary +
      `*1* → I gave money\n` +
      `*2* → I took money\n` +
      `*3* → View all balances\n` +
      `*4* → Settle up\n\n` +
      `*0* → back`,
  };
};

const lendPersonSelectMessage = (lendType, people) => {
  const verb    = lendType === 'gave' ? 'give to' : 'take from';
  const recent  = people.length > 0
    ? `Recent:\n${people.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nOr type a new name:`
    : `Who did you ${verb}? Type their name:`;
  return {
    text: `💸 Who did you ${verb}?\n\n${recent}\n\n_Type *0* to cancel_`,
  };
};

const lendAskAmountMessage = (lendType, personName) => {
  const verb = lendType === 'gave' ? 'give to' : 'take from';
  return {
    text: `💰 How much did you ${verb} *${personName}*?\n\n_Amount in ₹_\n_Type *0* to cancel_`,
  };
};

const lendGaveConfirmedMessage = (personName, amount, totalOwed, date) => ({
  text:
    `✅ *+₹${fmt(amount)}* given to *${personName}*\n` +
    `📅 ${date}\n\n` +
    `${personName} owes you: *₹${fmt(totalOwed)}*`,
});

const lendTookConfirmedMessage = (personName, amount, totalOwed, date) => ({
  text:
    `✅ *₹${fmt(amount)}* taken from *${personName}*\n` +
    `📅 ${date}\n\n` +
    `You owe ${personName}: *₹${fmt(totalOwed)}*`,
});

const lendBalancesMessage = (gavePeople, tookPeople, totalOwedToYou, totalYouOwe) => {
  const net    = totalOwedToYou - totalYouOwe;
  const netStr = net >= 0 ? `+₹${fmt(net)}` : `-₹${fmt(Math.abs(net))}`;

  const gaveLines = gavePeople.length > 0
    ? gavePeople.map((p) =>
        `👤 *${p.name}* owes you *₹${fmt(p.total)}*\n` +
        p.records.map((r) => `   ₹${fmt(r.amount)} · ${r.date}`).join('\n')
      ).join('\n\n')
    : `None`;

  const tookLines = tookPeople.length > 0
    ? tookPeople.map((p) =>
        `👤 You owe *${p.name}* *₹${fmt(p.total)}*\n` +
        p.records.map((r) => `   ₹${fmt(r.amount)} · ${r.date}`).join('\n')
      ).join('\n\n')
    : `None`;

  return {
    text:
      `📊 *Balances*\n\n` +
      `🟢 *They owe you*\n${gaveLines}\n\n` +
      `🔴 *You owe them*\n${tookLines}\n\n` +
      `Net: *${netStr}*`,
  };
};

const lendNoRecordsMessage = () => ({
  text: `📊 No lending records yet.\n\n_Type *MORE* → *4* to add one._`,
});

const lendSettleSelectMessage = (people) => {
  const lines = people.map((p, i) => {
    const dir = p.direction === 'owes_you'
      ? `owes you ₹${fmt(p.net)}`
      : `you owe ₹${fmt(p.net)}`;
    return `${i + 1}. *${p.name}* — ${dir}`;
  }).join('\n');
  return {
    text: `✅ *Settle up*\n\n${lines}\n\n_Reply with number_\n_Type *0* to cancel_`,
  };
};

const lendAllClearMessage = () => ({
  text: `✅ *All clear!* No outstanding balances. 🎉`,
});

const lendSettleAmountMessage = (personName, totalAmount) => ({
  text:
    `💰 *${personName}* — ₹${fmt(totalAmount)} outstanding\n\n` +
    `*FULL* → settle completely\n` +
    `Or type a partial amount in ₹\n\n` +
    `_Type *0* to cancel_`,
});

const lendFullSettledMessage = (personName, amount, date) => ({
  text:
    `✅ *Fully settled!*\n\n` +
    `*${personName}* — ₹${fmt(amount)}\n` +
    `📅 ${date} · All clear 🎉`,
});

const lendPartialSettledMessage = (personName, partial, remaining, date) => ({
  text:
    `✅ *₹${fmt(partial)}* settled with *${personName}*\n` +
    `📅 ${date}\n\n` +
    `Remaining: *₹${fmt(remaining)}*`,
});

const cancelledMessage = (balance) => ({
  text: `❌ Cancelled. Balance: *₹${fmt(balance)}*\n\n_Type *hi* anytime._`,
});

module.exports = {
  lendBorrowMenuMessage,
  lendPersonSelectMessage,
  lendAskAmountMessage,
  lendGaveConfirmedMessage,
  lendTookConfirmedMessage,
  lendBalancesMessage,
  lendNoRecordsMessage,
  lendSettleSelectMessage,
  lendAllClearMessage,
  lendSettleAmountMessage,
  lendFullSettledMessage,
  lendPartialSettledMessage,
  cancelledMessage,
};

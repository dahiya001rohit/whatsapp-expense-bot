'use strict';

const { fmt } = require('./formatters');

const lendBorrowMenuMessage = (totalOwedToYou, totalYouOwe) => {
  const summaryLine = (totalOwedToYou > 0 || totalYouOwe > 0)
    ? `🟢 Owed to you:  ₹${fmt(totalOwedToYou)}\n🔴 You owe:      ₹${fmt(totalYouOwe)}\n`
    : `No outstanding balances.\n`;
  return {
    text:
      `💸 *Lending & Borrowing*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${summaryLine}` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `What would you like to do?\n\n` +
      `1️⃣  *I Gave Money* — they owe me\n` +
      `2️⃣  *I Took Money* — I owe them\n` +
      `3️⃣  *View All Balances*\n` +
      `4️⃣  *Settle Up*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Reply with 1, 2, 3, or 4_\n` +
      `_Type *0* to go back_`,
  };
};

const lendPersonSelectMessage = (lendType, people) => {
  const verb = lendType === 'gave' ? 'give to' : 'take from';
  const title = lendType === 'gave' ? 'I Gave Money' : 'I Took Money';
  const recentSection = people.length > 0
    ? `Recent people:\n${people.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nOr type a *new name* directly`
    : `Type the person's *name*:`;
  return {
    text:
      `💸 *${title}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Who did you ${verb}?\n\n` +
      `${recentSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *0* to cancel_`,
  };
};

const lendAskAmountMessage = (lendType, personName) => {
  const verb = lendType === 'gave' ? 'give to' : 'take from';
  return {
    text:
      `💰 *Amount*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `How much did you ${verb}\n` +
      `*${personName}*?\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type amount in ₹_\n` +
      `_Type *0* to cancel_`,
  };
};

const lendGaveConfirmedMessage = (personName, amount, totalOwed, date) => ({
  text:
    `✅ *Recorded*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💸 You gave *${personName}*\n` +
    `Amount:  *₹${fmt(amount)}*\n` +
    `📅 Date: *${date}*\n\n` +
    `Total *${personName}* owes you:\n` +
    `*₹${fmt(totalOwed)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
});

const lendTookConfirmedMessage = (personName, amount, totalOwed, date) => ({
  text:
    `✅ *Recorded*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💸 You took from *${personName}*\n` +
    `Amount:  *₹${fmt(amount)}*\n` +
    `📅 Date: *${date}*\n\n` +
    `Total you owe *${personName}*:\n` +
    `*₹${fmt(totalOwed)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
});

const lendBalancesMessage = (gavePeople, tookPeople, totalOwedToYou, totalYouOwe) => {
  const net = totalOwedToYou - totalYouOwe;
  const netStr = net >= 0 ? `+₹${fmt(net)}` : `-₹${fmt(Math.abs(net))}`;

  const gaveSection = gavePeople.length > 0
    ? gavePeople.map((p) =>
        `👤 *${p.name}*\n` +
        p.records.map((r) => `   ₹${fmt(r.amount)} on ${r.date}`).join('\n') +
        `\n   *Total: ₹${fmt(p.total)}*`
      ).join('\n\n')
    : `None`;

  const tookSection = tookPeople.length > 0
    ? tookPeople.map((p) =>
        `👤 *${p.name}*\n` +
        p.records.map((r) => `   ₹${fmt(r.amount)} on ${r.date}`).join('\n') +
        `\n   *Total: ₹${fmt(p.total)}*`
      ).join('\n\n')
    : `None`;

  return {
    text:
      `📊 *Lending & Borrowing*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🟢 *They Owe You*\n\n` +
      `${gaveSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔴 *You Owe Them*\n\n` +
      `${tookSection}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🟢 Total Owed to You:  *₹${fmt(totalOwedToYou)}*\n` +
      `🔴 Total You Owe:      *₹${fmt(totalYouOwe)}*\n` +
      `💰 Net:                *${netStr}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type *MORE* → *4* to continue or *hi* for main menu._`,
  };
};

const lendNoRecordsMessage = () => ({
  text:
    `📊 *Lending & Borrowing*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No records yet.\n\n` +
    `Type *MORE* then *4* to add one.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to add one or *hi* for main menu._`,
});

const lendSettleSelectMessage = (people) => {
  const lines = people.map((p, i) => {
    const dir = p.direction === 'owes_you'
      ? `owes you ₹${fmt(p.net)}`
      : `you owe ₹${fmt(p.net)}`;
    return `${i + 1}. ${p.name}  — ${dir}`;
  }).join('\n');
  return {
    text:
      `✅ *Settle Up*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Who are you settling with?\n\n` +
      `${lines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Type number to select_\n` +
      `_Type *0* to cancel_`,
  };
};

const lendAllClearMessage = () => ({
  text:
    `✅ *All Clear!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `No outstanding balances.\n` +
    `Everyone is settled up! 🎉\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *hi* for main menu or *MORE* for more options._`,
});

const lendSettleAmountMessage = (personName, totalAmount) => ({
  text:
    `💰 *Settle — ${personName}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Outstanding: *₹${fmt(totalAmount)}*\n\n` +
    `Type *FULL* to settle completely\n` +
    `Or type partial amount in ₹\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel_`,
});

const lendFullSettledMessage = (personName, amount, date) => ({
  text:
    `✅ *Fully Settled!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${personName}* — ₹${fmt(amount)}\n` +
    `📅 Settled: ${date}\n\n` +
    `All dues cleared! 🎉\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
});

const lendPartialSettledMessage = (personName, partial, remaining, date) => ({
  text:
    `✅ *Partial Settlement*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${personName}* — ₹${fmt(partial)} settled\n` +
    `📅 Date: ${date}\n\n` +
    `Remaining: *₹${fmt(remaining)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *MORE* → *4* to continue or *hi* for main menu._`,
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
};

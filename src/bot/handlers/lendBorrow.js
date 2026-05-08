'use strict';

const LendBorrow            = require('../../models/LendBorrow');
const { send }              = require('../helpers/send');
const { getLendBorrowSummary } = require('../helpers/db');
const { formatDate }        = require('../helpers/constants');
const {
  lendBorrowMenuMessage, lendPersonSelectMessage, lendAskAmountMessage,
  lendGaveConfirmedMessage, lendTookConfirmedMessage, lendBalancesMessage,
  lendNoRecordsMessage, lendSettleSelectMessage, lendAllClearMessage,
  lendSettleAmountMessage, lendFullSettledMessage, lendPartialSettledMessage,
  cancelledMessage,
} = require('../../utils/messages');

async function handleLendBorrowMenu(sock, jid, user, phone, userInput) {
  if (userInput === '1' || userInput === '2') {
    const lendType     = userInput === '1' ? 'gave' : 'took';
    const allRecords   = await LendBorrow.find({ phone });
    const uniquePeople = [...new Set(allRecords.map((r) => r.personName))];
    user.tempData = { pendingLendType: lendType };
    user.markModified('tempData');
    user.currentStep = 'lend_person_select';
    await user.save();
    await send(sock, jid, lendPersonSelectMessage(lendType, uniquePeople));

  } else if (userInput === '3') {
    const allRecords = await LendBorrow.find({ phone, settled: false });
    if (allRecords.length === 0) {
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, lendNoRecordsMessage());
      return;
    }
    const gavePeopleMap = {};
    const tookPeopleMap = {};
    for (const r of allRecords) {
      const key = r.personName;
      if (r.type === 'gave') {
        if (!gavePeopleMap[key]) gavePeopleMap[key] = { name: key, records: [], total: 0 };
        gavePeopleMap[key].records.push({ amount: r.amount, date: formatDate(r.date) });
        gavePeopleMap[key].total += r.amount;
      } else {
        if (!tookPeopleMap[key]) tookPeopleMap[key] = { name: key, records: [], total: 0 };
        tookPeopleMap[key].records.push({ amount: r.amount, date: formatDate(r.date) });
        tookPeopleMap[key].total += r.amount;
      }
    }
    const gavePeople = [];
    const tookPeople = [];
    const allPeople  = new Set([...Object.keys(gavePeopleMap), ...Object.keys(tookPeopleMap)]);
    let totalOwedToYou = 0;
    let totalYouOwe    = 0;
    for (const name of allPeople) {
      const gave = gavePeopleMap[name]?.total ?? 0;
      const took = tookPeopleMap[name]?.total ?? 0;
      const net  = gave - took;
      if (net > 0)      { totalOwedToYou += net;           gavePeople.push({ name, records: gavePeopleMap[name]?.records ?? [], total: net }); }
      else if (net < 0) { totalYouOwe    += Math.abs(net); tookPeople.push({ name, records: tookPeopleMap[name]?.records ?? [], total: Math.abs(net) }); }
    }
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, lendBalancesMessage(gavePeople, tookPeople, totalOwedToYou, totalYouOwe));

  } else if (userInput === '4') {
    const { people } = await getLendBorrowSummary(phone);
    if (people.length === 0) {
      user.currentStep = 'main_menu';
      await user.save();
      await send(sock, jid, lendAllClearMessage());
      return;
    }
    user.tempData = { settlePeople: people };
    user.markModified('tempData');
    user.currentStep = 'lend_settle_select';
    await user.save();
    await send(sock, jid, lendSettleSelectMessage(people));

  } else if (userInput === '0') {
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, cancelledMessage(user.balance));

  } else {
    const { totalOwedToYou, totalYouOwe } = await getLendBorrowSummary(phone);
    await send(sock, jid, lendBorrowMenuMessage(totalOwedToYou, totalYouOwe));
  }
}

async function handleLendPersonSelect(sock, jid, user, phone, userInput) {
  const lendType     = user.tempData?.pendingLendType ?? 'gave';
  const allRecords   = await LendBorrow.find({ phone });
  const uniquePeople = [...new Set(allRecords.map((r) => r.personName))];
  const index        = parseInt(userInput, 10);
  let personName;
  if (!isNaN(index) && index >= 1 && index <= uniquePeople.length) {
    personName = uniquePeople[index - 1];
  } else {
    personName = userInput.trim().charAt(0).toUpperCase() + userInput.trim().slice(1);
  }
  if (!personName) {
    await send(sock, jid, { text: '⚠️ Please enter a valid name.\n_Type *0* to cancel_' });
    return;
  }
  user.tempData = { pendingLendType: lendType, lendPerson: personName };
  user.markModified('tempData');
  user.currentStep = 'lend_amount_entry';
  await user.save();
  await send(sock, jid, lendAskAmountMessage(lendType, personName));
}

async function handleLendAmountEntry(sock, jid, user, phone, userInput) {
  const amount     = parseFloat(userInput);
  const lendType   = user.tempData?.pendingLendType ?? 'gave';
  const personName = user.tempData?.lendPerson ?? '';
  if (isNaN(amount) || amount <= 0) {
    await send(sock, jid, { text: '⚠️ Enter a valid amount in ₹\n_Type *0* to cancel_' });
    return;
  }
  await LendBorrow.create({ phone, personName, type: lendType, amount, date: new Date() });
  const records = await LendBorrow.find({ phone, personName, settled: false });
  const gave    = records.filter((r) => r.type === 'gave').reduce((s, r) => s + r.amount, 0);
  const took    = records.filter((r) => r.type === 'took').reduce((s, r) => s + r.amount, 0);
  const net     = Math.abs(gave - took);
  user.currentStep = 'main_menu';
  user.tempData    = {};
  user.markModified('tempData');
  await user.save();
  const dateStr = formatDate(new Date());
  if (lendType === 'gave') {
    await send(sock, jid, lendGaveConfirmedMessage(personName, amount, net, dateStr));
  } else {
    await send(sock, jid, lendTookConfirmedMessage(personName, amount, net, dateStr));
  }
}

async function handleLendSettleSelect(sock, jid, user, phone, userInput) {
  const { people } = await getLendBorrowSummary(phone);
  const index      = parseInt(userInput, 10);
  if (isNaN(index) || index < 1 || index > people.length) {
    await send(sock, jid, { text: `⚠️ Please enter a number between 1 and ${people.length}.\n_Type *0* to cancel_` });
    return;
  }
  const selected = people[index - 1];
  user.tempData = { settlePerson: selected.name, settleNet: selected.net, settleDirection: selected.direction };
  user.markModified('tempData');
  user.currentStep = 'lend_settle_amount';
  await user.save();
  await send(sock, jid, lendSettleAmountMessage(selected.name, selected.net));
}

async function handleLendSettleAmount(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  const { settlePerson, settleNet, settleDirection } = user.tempData ?? {};
  const dateStr = formatDate(new Date());
  if (inputUpper === 'FULL') {
    await LendBorrow.updateMany(
      { phone, personName: settlePerson, settled: false },
      { settled: true, settledAt: new Date() },
    );
    user.currentStep = 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, lendFullSettledMessage(settlePerson, settleNet, dateStr));
    return;
  }
  const partial = parseFloat(userInput);
  if (isNaN(partial) || partial <= 0 || partial >= settleNet) {
    await send(sock, jid, { text: `⚠️ Enter an amount less than ₹${settleNet}.\nType *FULL* to settle completely.\n_Type *0* to cancel_` });
    return;
  }
  const oppositeType = settleDirection === 'owes_you' ? 'took' : 'gave';
  await LendBorrow.create({ phone, personName: settlePerson, type: oppositeType, amount: partial, date: new Date() });
  const remaining = settleNet - partial;
  user.currentStep = 'main_menu';
  user.tempData    = {};
  user.markModified('tempData');
  await user.save();
  await send(sock, jid, lendPartialSettledMessage(settlePerson, partial, remaining, dateStr));
}

module.exports = {
  handleLendBorrowMenu, handleLendPersonSelect, handleLendAmountEntry,
  handleLendSettleSelect, handleLendSettleAmount,
};

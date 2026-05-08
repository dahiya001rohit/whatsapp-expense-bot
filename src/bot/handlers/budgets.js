'use strict';

const Budget          = require('../../models/Budget');
const { send }        = require('../helpers/send');
const { getCategories } = require('../helpers/db');
const {
  manageBudgetsMessage, askBudgetAmountMessage, budgetSetMessage,
  budgetRemovedMessage, invalidBudgetAmountMessage,
} = require('../../utils/messages');

async function handleManageBudgets(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  const cats    = await getCategories(phone);
  const budgets = await Budget.find({ phone });
  const budgetMap = {};
  budgets.forEach((b) => { budgetMap[b.category] = b.limit; });

  if (inputUpper.startsWith('CLEAR ')) {
    const idx = parseInt(inputUpper.replace('CLEAR ', '').trim(), 10);
    if (isNaN(idx) || idx < 1 || idx > cats.length) {
      await send(sock, jid, { text: `⚠️ Invalid number. Please enter 1–${cats.length}.` });
      return;
    }
    const catName = cats[idx - 1].name;
    await Budget.deleteOne({ phone, category: catName });
    user.currentStep = 'main_menu';
    user.tempData    = {};
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, budgetRemovedMessage(catName));
    return;
  }

  const idx = parseInt(userInput, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= cats.length) {
    const catName      = cats[idx - 1].name;
    const currentLimit = budgetMap[catName] ?? null;
    user.currentStep = 'awaiting_budget_amount';
    user.tempData    = { budgetCategory: catName };
    user.markModified('tempData');
    await user.save();
    await send(sock, jid, askBudgetAmountMessage(catName, currentLimit));
  } else {
    await send(sock, jid, manageBudgetsMessage(cats, budgetMap));
  }
}

async function handleBudgetAmount(sock, jid, user, phone, userInput) {
  const limit = parseFloat(userInput);
  if (isNaN(limit) || limit <= 0) {
    await send(sock, jid, invalidBudgetAmountMessage());
    return;
  }
  const catName = user.tempData?.budgetCategory;
  await Budget.findOneAndUpdate(
    { phone, category: catName },
    { phone, category: catName, limit },
    { upsert: true, new: true },
  );
  user.currentStep = 'main_menu';
  user.tempData    = {};
  user.markModified('tempData');
  await user.save();
  await send(sock, jid, budgetSetMessage(catName, limit));
}

module.exports = { handleManageBudgets, handleBudgetAmount };

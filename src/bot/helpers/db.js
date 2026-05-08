'use strict';

const Category       = require('../../models/Category');
const IncomeCategory = require('../../models/IncomeCategory');
const LendBorrow     = require('../../models/LendBorrow');
const { DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = require('./constants');

async function getCategories(phone) {
  return Category.find({ phone }).sort({ createdAt: 1 });
}

async function getIncomeCategories(phone) {
  return IncomeCategory.find({ phone }).sort({ createdAt: 1 });
}

async function seedCategories(phone) {
  await Category.insertMany(DEFAULT_CATEGORIES.map((name) => ({ phone, name })));
}

async function seedIncomeCategories(phone) {
  await IncomeCategory.insertMany(DEFAULT_INCOME_CATEGORIES.map((name) => ({ phone, name })));
}

async function getLendBorrowSummary(phone) {
  const records = await LendBorrow.find({ phone, settled: false });
  const byPerson = {};
  for (const r of records) {
    if (!byPerson[r.personName]) byPerson[r.personName] = { gave: 0, took: 0 };
    if (r.type === 'gave') byPerson[r.personName].gave += r.amount;
    else                   byPerson[r.personName].took += r.amount;
  }
  let totalOwedToYou = 0;
  let totalYouOwe    = 0;
  const people = [];
  for (const [name, { gave, took }] of Object.entries(byPerson)) {
    const net = gave - took;
    if (net > 0)      { totalOwedToYou += net;           people.push({ name, net, direction: 'owes_you' }); }
    else if (net < 0) { totalYouOwe    += Math.abs(net); people.push({ name, net: Math.abs(net), direction: 'you_owe' }); }
  }
  return { totalOwedToYou, totalYouOwe, people };
}

module.exports = { getCategories, getIncomeCategories, seedCategories, seedIncomeCategories, getLendBorrowSummary };

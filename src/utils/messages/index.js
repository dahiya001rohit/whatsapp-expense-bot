'use strict';

const formatters = require('./formatters');
const onboarding = require('./onboarding');
const mainMenu = require('./mainMenu');
const globalMsg = require('./global');
const moreMenu = require('./moreMenu');
const smartInsights = require('./smartInsights');
const txnHistory = require('./txnHistory');
const categories = require('./categories');
const budgets = require('./budgets');
const credit = require('./credit');
const debit = require('./debit');
const reset = require('./reset');
const lendBorrow = require('./lendBorrow');

module.exports = {
  ...formatters,
  ...onboarding,
  ...mainMenu,
  ...globalMsg,
  ...moreMenu,
  ...smartInsights,
  ...txnHistory,
  ...categories,
  ...budgets,
  ...credit,
  ...debit,
  ...reset,
  ...lendBorrow,
};

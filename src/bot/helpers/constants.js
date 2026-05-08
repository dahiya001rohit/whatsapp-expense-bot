'use strict';

const GREETINGS = new Set(['hi', 'hey', 'hello']);

const DEFAULT_CATEGORIES = [
  'Food', 'Transport', 'Bills', 'Entertainment',
  'Shopping', 'Health', 'Education', 'Misc',
];

const DEFAULT_INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Family', 'Stipend', 'Cashback', 'Other Income',
];

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

module.exports = { GREETINGS, DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES, startOfMonth, formatDate };

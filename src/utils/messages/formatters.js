'use strict';

/** Amount with comma separators, no decimals unless fractional. */
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
  uncategorised: '📦',
};
const emojiFor = (name) => EMOJIS[name.toLowerCase()] || '📁';

const INCOME_EMOJIS = {
  salary: '💼', freelance: '💻', family: '👨‍👩‍👧', stipend: '🎓',
  cashback: '🎁', 'other income': '💵',
};
const incomeEmojiFor = (name) => INCOME_EMOJIS[name.toLowerCase()] || '💰';

/** Numbered list from category docs. */
const categoryList = (cats) => cats.map((c, i) => `${i + 1}. ${c.name}`).join('\n');

module.exports = {
  fmt,
  emojiFor,
  incomeEmojiFor,
  categoryList,
};

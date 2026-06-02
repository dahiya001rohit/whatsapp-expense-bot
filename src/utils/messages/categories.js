'use strict';

const { categoryList, emojiFor } = require('./formatters');

// ── Shared ────────────────────────────────────────────────────────────────────

const categoriesBudgetsMenuMessage = () => ({
  text:
    `🗂️ *Categories & Budgets*\n\n` +
    `*1* → Spending categories\n` +
    `*2* → Income categories\n` +
    `*3* → Budgets\n\n` +
    `*0* → back`,
});

const manageCategoriesMenuMessage = () => ({
  text:
    `🗂️ *Manage Categories*\n\n` +
    `*1* → Spending categories\n` +
    `*2* → Income categories\n\n` +
    `*0* → back`,
});

// ── Spending categories ───────────────────────────────────────────────────────

const manageCategoriesMessage = (cats) => ({
  text:
    `🗂️ *Spending Categories*\n\n` +
    `${categoryList(cats)}\n\n` +
    `*ADD* · *DEL* · *0* to back`,
});

const askNewCategoryNameMessage = () => ({
  text: `✏️ Name your new category:\n\n_Type *0* to cancel._`,
});

const categoryCreatedMessage = (name, cats) => ({
  text:
    `✅ *${name}* added!\n\n` +
    `${categoryList(cats)}\n\n` +
    `*ADD* · *DEL* · *0* to back`,
});

const askDeleteCategoryMessage = (cats) => ({
  text:
    `🗑️ *Delete a category*\n\n` +
    `${categoryList(cats)}\n\n` +
    `_Reply with the number to delete._\n` +
    `_Type *0* to cancel._`,
});

const categoryDeletedMessage = (name, cats) => ({
  text:
    `✅ *${name}* deleted.\n\n` +
    `${categoryList(cats)}\n\n` +
    `*ADD* · *DEL* · *0* to back`,
});

const lastCategoryWarningMessage = () => ({
  text: `⚠️ You need at least one category.\n_Type *0* to go back._`,
});

const selectCategoryMessage = (cats) => ({
  text:
    `🗂️ *Pick a category:*\n\n` +
    `${categoryList(cats)}\n\n` +
    `_Reply with number_\n` +
    `_Type *0* to cancel_`,
});

const invalidCategoryMessage = (total) => ({
  text: `⚠️ Enter a number between 1 and ${total}.\n_Type *0* to cancel._`,
});

const selectCategoryPagedMessage = (cats, page, totalPages, pageOffset) => {
  const lines = cats.map((c, i) => `${pageOffset + i + 1}. ${emojiFor(c.name)} ${c.name}`).join('\n');
  const nav   = [];
  if (page < totalPages) nav.push('*NEXT*');
  if (page > 1)          nav.push('*PREV*');
  nav.push('*0* cancel');
  return {
    text:
      `💸 *Category (${page}/${totalPages})*\n\n` +
      `${lines}\n\n` +
      nav.join(' · '),
  };
};

// ── Income categories ─────────────────────────────────────────────────────────

const selectIncomeCategoryMessage = (cats) => ({
  text:
    `💰 *Income type?*\n\n` +
    `${categoryList(cats)}\n\n` +
    `_Reply with number_\n` +
    `_Type *0* to cancel_`,
});

const manageIncomeCategoriesMessage = (cats) => ({
  text:
    `💰 *Income Categories*\n\n` +
    `${categoryList(cats)}\n\n` +
    `*ADD* · *DEL* · *0* to back`,
});

const askNewIncomeCategoryNameMessage = () => ({
  text: `✏️ Name your new income category:\n\n_Type *0* to cancel._`,
});

const incomeCategoryCreatedMessage = (name, cats) => ({
  text:
    `✅ *${name}* added!\n\n` +
    `${categoryList(cats)}\n\n` +
    `*ADD* · *DEL* · *0* to back`,
});

const askDeleteIncomeCategoryMessage = (cats) => ({
  text:
    `🗑️ *Delete an income category*\n\n` +
    `${categoryList(cats)}\n\n` +
    `_Reply with the number to delete._\n` +
    `_Type *0* to cancel._`,
});

const incomeCategoryDeletedMessage = (name, cats) => ({
  text:
    `✅ *${name}* deleted.\n\n` +
    `${categoryList(cats)}\n\n` +
    `*ADD* · *DEL* · *0* to back`,
});

module.exports = {
  categoriesBudgetsMenuMessage,
  manageCategoriesMenuMessage,
  manageCategoriesMessage,
  askNewCategoryNameMessage,
  categoryCreatedMessage,
  askDeleteCategoryMessage,
  categoryDeletedMessage,
  lastCategoryWarningMessage,
  selectCategoryMessage,
  invalidCategoryMessage,
  selectCategoryPagedMessage,
  selectIncomeCategoryMessage,
  manageIncomeCategoriesMessage,
  askNewIncomeCategoryNameMessage,
  incomeCategoryCreatedMessage,
  askDeleteIncomeCategoryMessage,
  incomeCategoryDeletedMessage,
};

'use strict';

const { categoryList, emojiFor } = require('./formatters');

// ─── Shared ───────────────────────────────────────────────────────────────────

const categoriesBudgetsMenuMessage = () => ({
  text:
    `🗂️ *Categories & Budgets*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `What would you like to manage?\n\n` +
    `1️⃣  *Spending Categories*\n` +
    `2️⃣  *Income Categories*\n` +
    `3️⃣  *Manage Budgets*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to go back_`,
});

const manageCategoriesMenuMessage = () => ({
  text:
    `🗂️ *Manage Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `What would you like to manage?\n\n` +
    `1️⃣  *Spending Categories*\n` +
    `2️⃣  *Income Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to go back_`,
});

// ─── Spending Categories ──────────────────────────────────────────────────────

const manageCategoriesMessage = (cats) => ({
  text:
    `🗂️ *Your Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to create a new category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

const askNewCategoryNameMessage = () => ({
  text:
    `✏️ *New Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `What would you like to name\n` +
    `your new category?\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel._`,
});

const categoryCreatedMessage = (name, cats) => ({
  text:
    `✅ *Category Created*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been added\n` +
    `to your categories.\n\n` +
    `📁 *Your Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add another category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

const askDeleteCategoryMessage = (cats) => ({
  text:
    `🗑️ *Delete Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type the *number* of the category\n` +
    `you want to delete.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel._`,
});

const categoryDeletedMessage = (name, cats) => ({
  text:
    `✅ *Category Deleted*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been removed.\n\n` +
    `📁 *Your Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add a category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

const lastCategoryWarningMessage = () => ({
  text:
    `⚠️ *Cannot Delete*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `You must keep at least\n` +
    `one category.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to go back._`,
});

const selectCategoryMessage = (cats) => ({
  text:
    `🗂️ *Select Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Which category does this belong to?\n\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with the category number_\n` +
    `_Type *0* to cancel_`,
});

const invalidCategoryMessage = (total) => ({
  text:
    `⚠️ *Invalid Selection*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please reply with a number\n` +
    `between 1 and ${total}.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel._`,
});

/**
 * Paginated 5-at-a-time category selection for debit flow.
 * @param {Array}  cats        [{name}] — the slice for this page
 * @param {number} page        1-indexed
 * @param {number} totalPages
 * @param {number} pageOffset  index offset so numbering is correct
 */
const selectCategoryPagedMessage = (cats, page, totalPages, pageOffset) => {
  const lines = cats.map((c, i) => `${pageOffset + i + 1}. ${emojiFor(c.name)} ${c.name}`).join('\n');
  const nav   = [];
  if (page < totalPages) nav.push('*NEXT* → more');
  if (page > 1)          nav.push('*PREV* → back');
  nav.push('*0* → cancel');
  return {
    text:
      `💸 *Select Category (page ${page}/${totalPages})*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${lines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      nav.join(' | '),
  };
};

// ─── Income Categories ────────────────────────────────────────────────────────

const selectIncomeCategoryMessage = (cats) => ({
  text:
    `💰 *Select Income Type*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `What is this money from?\n\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Reply with category number_\n` +
    `_Type *0* to cancel_`,
});

const manageIncomeCategoriesMessage = (cats) => ({
  text:
    `💰 *Income Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to create a new category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
});

const askNewIncomeCategoryNameMessage = () => ({
  text:
    `✏️ *New Income Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `What would you like to name\n` +
    `this income category?\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel._`,
});

const incomeCategoryCreatedMessage = (name, cats) => ({
  text:
    `✅ *Income Category Created*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been added.\n\n` +
    `💰 *Income Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add another\n` +
    `Type *DEL* to delete\n` +
    `Type *0* to go back`,
});

const askDeleteIncomeCategoryMessage = (cats) => ({
  text:
    `🗑️ *Delete Income Category*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type the *number* of the category\n` +
    `you want to delete.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Type *0* to cancel._`,
});

const incomeCategoryDeletedMessage = (name, cats) => ({
  text:
    `✅ *Income Category Deleted*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${name}* has been removed.\n\n` +
    `💰 *Income Categories*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${categoryList(cats)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *ADD* to add a category\n` +
    `Type *DEL* to delete a category\n` +
    `Type *0* to go back`,
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

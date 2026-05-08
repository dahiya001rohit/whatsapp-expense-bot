'use strict';

const Category       = require('../../models/Category');
const IncomeCategory = require('../../models/IncomeCategory');
const { send }       = require('../helpers/send');
const { getCategories, getIncomeCategories } = require('../helpers/db');
const {
  manageCategoriesMessage, manageCategoriesMenuMessage, manageIncomeCategoriesMessage,
  askNewCategoryNameMessage, categoryCreatedMessage, askDeleteCategoryMessage,
  categoryDeletedMessage, lastCategoryWarningMessage, invalidCategoryMessage,
  askNewIncomeCategoryNameMessage, incomeCategoryCreatedMessage,
  askDeleteIncomeCategoryMessage, incomeCategoryDeletedMessage, cancelledMessage,
} = require('../../utils/messages');

async function handleManageCategories(sock, jid, user, phone, userInput) {
  if (userInput === '1') {
    const cats = await getCategories(phone);
    user.currentStep = 'manage_spending_categories';
    await user.save();
    await send(sock, jid, manageCategoriesMessage(cats));
  } else if (userInput === '2') {
    const cats = await getIncomeCategories(phone);
    user.currentStep = 'manage_income_categories';
    await user.save();
    await send(sock, jid, manageIncomeCategoriesMessage(cats));
  } else if (userInput === '0') {
    user.currentStep = 'main_menu';
    await user.save();
    await send(sock, jid, cancelledMessage(user.balance));
  } else {
    await send(sock, jid, manageCategoriesMenuMessage());
  }
}

async function handleManageSpendingCategories(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  if (inputUpper === 'ADD') {
    user.currentStep = 'awaiting_new_category_name';
    await user.save();
    await send(sock, jid, askNewCategoryNameMessage());
  } else if (inputUpper === 'DEL') {
    const cats = await getCategories(phone);
    user.currentStep = 'awaiting_delete_category';
    await user.save();
    await send(sock, jid, askDeleteCategoryMessage(cats));
  } else if (userInput === '0') {
    user.currentStep = 'manage_categories';
    await user.save();
    await send(sock, jid, manageCategoriesMenuMessage());
  } else {
    const cats = await getCategories(phone);
    await send(sock, jid, manageCategoriesMessage(cats));
  }
}

async function handleNewCategoryName(sock, jid, user, phone, userInput) {
  const catName = userInput.trim();
  if (catName.length === 0) {
    await send(sock, jid, { text: '⚠️ Category name cannot be empty.\n\nPlease enter a valid name:\n_Type *0* to cancel_' });
    return;
  }
  if (catName.length > 30) {
    await send(sock, jid, { text: '⚠️ Category name too long.\n\nPlease keep it under 30 characters:\n_Type *0* to cancel_' });
    return;
  }
  await Category.create({ phone, name: catName });
  const updatedCats = await getCategories(phone);
  user.currentStep  = 'manage_spending_categories';
  await user.save();
  await send(sock, jid, categoryCreatedMessage(catName, updatedCats));
}

async function handleDeleteCategory(sock, jid, user, phone, userInput) {
  const cats  = await getCategories(phone);
  const index = parseInt(userInput, 10);
  if (isNaN(index) || index < 1 || index > cats.length) {
    await send(sock, jid, invalidCategoryMessage(cats.length));
    return;
  }
  if (cats.length === 1) {
    await send(sock, jid, lastCategoryWarningMessage());
    return;
  }
  const target = cats[index - 1];
  await Category.deleteOne({ _id: target._id });
  const updatedCats = await getCategories(phone);
  user.currentStep  = 'manage_spending_categories';
  await user.save();
  await send(sock, jid, categoryDeletedMessage(target.name, updatedCats));
}

async function handleManageIncomeCategories(sock, jid, user, phone, userInput, inputLower, inputUpper) {
  if (inputUpper === 'ADD') {
    user.currentStep = 'awaiting_new_income_category';
    await user.save();
    await send(sock, jid, askNewIncomeCategoryNameMessage());
  } else if (inputUpper === 'DEL') {
    const cats = await getIncomeCategories(phone);
    user.currentStep = 'awaiting_delete_income_category';
    await user.save();
    await send(sock, jid, askDeleteIncomeCategoryMessage(cats));
  } else if (userInput === '0') {
    user.currentStep = 'manage_categories';
    await user.save();
    await send(sock, jid, manageCategoriesMenuMessage());
  } else {
    const cats = await getIncomeCategories(phone);
    await send(sock, jid, manageIncomeCategoriesMessage(cats));
  }
}

async function handleNewIncomeCategory(sock, jid, user, phone, userInput) {
  const catName = userInput.trim();
  if (catName.length === 0) {
    await send(sock, jid, { text: '⚠️ Category name cannot be empty.\n\nPlease enter a valid name:\n_Type *0* to cancel_' });
    return;
  }
  if (catName.length > 30) {
    await send(sock, jid, { text: '⚠️ Category name too long.\n\nPlease keep it under 30 characters:\n_Type *0* to cancel_' });
    return;
  }
  await IncomeCategory.create({ phone, name: catName });
  const updatedCats = await getIncomeCategories(phone);
  user.currentStep  = 'manage_income_categories';
  await user.save();
  await send(sock, jid, incomeCategoryCreatedMessage(catName, updatedCats));
}

async function handleDeleteIncomeCategory(sock, jid, user, phone, userInput) {
  const cats  = await getIncomeCategories(phone);
  const index = parseInt(userInput, 10);
  if (isNaN(index) || index < 1 || index > cats.length) {
    await send(sock, jid, invalidCategoryMessage(cats.length));
    return;
  }
  if (cats.length === 1) {
    await send(sock, jid, lastCategoryWarningMessage());
    return;
  }
  const target = cats[index - 1];
  await IncomeCategory.deleteOne({ _id: target._id });
  const updatedCats = await getIncomeCategories(phone);
  user.currentStep  = 'manage_income_categories';
  await user.save();
  await send(sock, jid, incomeCategoryDeletedMessage(target.name, updatedCats));
}

module.exports = {
  handleManageCategories, handleManageSpendingCategories, handleNewCategoryName,
  handleDeleteCategory, handleManageIncomeCategories, handleNewIncomeCategory,
  handleDeleteIncomeCategory,
};

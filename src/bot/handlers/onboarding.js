'use strict';

const { send }                              = require('../helpers/send');
const { seedCategories, seedIncomeCategories } = require('../helpers/db');
const { askNameMessage, nameRegisteredMessage } = require('../../utils/messages');

async function handleOnboarding(sock, jid, user, phone, userInput) {
  user.name        = userInput;
  user.currentStep = 'main_menu';
  await user.save();
  await seedCategories(phone);
  await seedIncomeCategories(phone);
  await send(sock, jid, nameRegisteredMessage(user.name));
}

module.exports = { handleOnboarding };

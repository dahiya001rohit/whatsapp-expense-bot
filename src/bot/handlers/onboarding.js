'use strict';

const { send }                              = require('../helpers/send');
const { seedCategories, seedIncomeCategories } = require('../helpers/db');
const { askNameMessage, nameRegisteredMessage, askActualPhoneMessage } = require('../../utils/messages');

async function handleOnboarding(sock, jid, user, phone, userInput) {
  user.name = userInput;

  // If phone looks like an LID (length > 13), ask for their real number
  if (phone.length > 13) {
    user.currentStep = 'awaiting_actual_phone';
    await user.save();
    await send(sock, jid, askActualPhoneMessage(user.name));
    return;
  }

  user.currentStep = 'main_menu';
  await user.save();
  await seedCategories(phone);
  await seedIncomeCategories(phone);
  await send(sock, jid, nameRegisteredMessage(user.name));
}

async function handleAwaitingActualPhone(sock, jid, user, phone, userInput) {
  // Strip non-numeric characters from the input
  const numericPhone = userInput.replace(/\\D/g, '');
  
  if (numericPhone.length < 10) {
    await send(sock, jid, { text: '⚠️ That doesn\'t look like a valid phone number. Please reply with your WhatsApp number including country code (e.g. 919876543210).' });
    return;
  }

  user.phone = numericPhone;
  user.currentStep = 'main_menu';
  await user.save();
  
  await seedCategories(user.phone);
  await seedIncomeCategories(user.phone);
  await send(sock, jid, nameRegisteredMessage(user.name));
}

module.exports = { handleOnboarding, handleAwaitingActualPhone };

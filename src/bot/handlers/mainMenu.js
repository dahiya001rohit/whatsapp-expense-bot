'use strict';

const { send } = require('../helpers/send');
const { askAmountMessage, askDebitAmountMessage, unrecognisedMessage } = require('../../utils/messages');

async function handleMainMenu(sock, jid, user, phone, userInput) {
  if (userInput === '1') {
    user.currentStep = 'awaiting_amount';
    await user.save();
    await send(sock, jid, askAmountMessage());
  } else if (userInput === '2') {
    user.currentStep = 'awaiting_debit_amount';
    await user.save();
    await send(sock, jid, askDebitAmountMessage(user.balance));
  } else {
    await send(sock, jid, unrecognisedMessage());
  }
}

module.exports = { handleMainMenu };

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:3000';

bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const payload = match && match[1] ? match[1] : '';
  // send a message with an inline keyboard opening the web app
  const opts = {
    reply_markup: {
      inline_keyboard: [[{
        text: 'Open web app',
        url: `${WEB_APP_URL}/?userId=${chatId}`
      }]]
    }
  };
  bot.sendMessage(chatId, 'Web app orqali buyurtma berish uchun bosing', opts);
});

// optional: handle simple text orders from users
bot.on('message', (msg) => {
  // ignore /start because handled above
  if (msg.text && msg.text.startsWith('/')) return;
});

console.log('Bot started');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const WEB_APP_URL = (process.env.WEB_APP_URL || '').replace(/\/$/, '');
const useWebhook = WEB_APP_URL.startsWith('https://');

const bot = new TelegramBot(token, useWebhook ? {} : { polling: true });

function buildKeyboard() {
  const url = WEB_APP_URL || 'https://example.com';
  return {
    inline_keyboard: [[
      { text: '🚖 Taksi buyurtma', web_app: { url } }
    ]]
  };
}

bot.onText(/\/start/, (msg) => {
  console.log('[bot] /start keldi, chatId:', msg.chat.id, 'type:', msg.chat.type);
  bot.sendMessage(msg.chat.id, '🚕 Taksi buyurtma berish uchun quyidagi tugmani bosing:', {
    reply_markup: buildKeyboard()
  }).then(() => {
    console.log('[bot] Xabar yuborildi:', msg.chat.id);
  }).catch(err => {
    console.error('[bot] sendMessage xatosi:', err.message);
  });
});

module.exports = { bot, useWebhook };

if (!useWebhook) {
  console.log('[bot] Polling rejimida ishlamoqda');
}

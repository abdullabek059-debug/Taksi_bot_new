require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const WEB_APP_URL = (process.env.WEB_APP_URL || '').replace(/\/$/, '');
const useWebhook = WEB_APP_URL.startsWith('https://');

// Webhook rejimida polling OLMAYDI — 409 Conflict bo'lmaydi
const bot = new TelegramBot(token, useWebhook ? {} : { polling: true });

function buildKeyboard() {
  const url = WEB_APP_URL || 'https://example.com';
  return {
    inline_keyboard: [[
      { text: '🚖 Taksi buyurtma', web_app: { url } }
    ]]
  };
}

bot.onText(/^\/start(@\w+)?(\s|$)/, (msg) => {
  bot.sendMessage(msg.chat.id, '🚕 Taksi buyurtma berish uchun quyidagi tugmani bosing:', {
    reply_markup: buildKeyboard()
  });
});

module.exports = { bot, useWebhook };

if (!useWebhook) {
  console.log('Bot polling rejimida ishlamoqda (local)');
}

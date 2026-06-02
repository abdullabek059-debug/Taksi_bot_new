require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:3000';

function buildKeyboard() {
  // web_app type - Telegram Mini App sifatida ochadi (HTTPS kerak)
  // fallback: agar http bo'lsa oddiy url button ishlatiladi
  const isHttps = WEB_APP_URL.startsWith('https://');
  return {
    inline_keyboard: [[
      isHttps
        ? { text: '🚖 Taksi buyurtma', web_app: { url: WEB_APP_URL } }
        : { text: '🚖 Taksi buyurtma', url: WEB_APP_URL }
    ]]
  };
}

// Shaxsiy chat va guruhda /start
bot.onText(/^\/start(@\w+)?(\s|$)/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🚕 Taksi buyurtma berish uchun quyidagi tugmani bosing:', {
    reply_markup: buildKeyboard()
  });
});

// Guruhda oddiy xabar yozilganda ham yordam ko'rsatish (ixtiyoriy)
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return; // komandalar yuqorida
  // guruhda bot mention qilinsa yoki shaxsiy chatda xabar bo'lsa
  const isPrivate = msg.chat.type === 'private';
  const isMentioned = msg.text && msg.entities &&
    msg.entities.some(e => e.type === 'mention' && msg.text.substring(e.offset, e.offset + e.length).toLowerCase().includes('bot'));

  if (isPrivate || isMentioned) {
    bot.sendMessage(msg.chat.id, '🚕 Taksi buyurtma berish uchun:', {
      reply_markup: buildKeyboard()
    });
  }
});

console.log('Bot started');

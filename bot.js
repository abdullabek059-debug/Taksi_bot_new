require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const WEB_APP_URL = (process.env.WEB_APP_URL || '').replace(/\/$/, '');
const PERSONAL_GROUP_ID = process.env.PERSONAL_GROUP_ID;
const useWebhook = WEB_APP_URL.startsWith('https://');

const bot = new TelegramBot(token, useWebhook ? {} : { polling: true });

// ---- Kalit so'zlar (katta/kichik harf farq qilmaydi) ----
const KEYWORD_RE = new RegExp(
  [
    'ta[kx]si.{0,40}?(kerak|lozim|zarur|bor|нужно|нужен)',
    '(srochna|срочно).{0,40}?ta[kx]si',
    'ta[kx]si.{0,40}?(srochna|срочно)',
    'pochta.{0,30}?(bor|kerak|yuborish|нужна)',
    'yuk.{0,30}?(bor|kerak|нужна)',
  ].join('|'),
  'i'
);

// ---- Web App tugmasi ----
function buildKeyboard() {
  const url = WEB_APP_URL || 'https://example.com';
  return { inline_keyboard: [[{ text: '🚖 Taksi buyurtma', web_app: { url } }]] };
}

// ---- /start komandasi ----
bot.onText(/\/start/, (msg) => {
  console.log('[bot] /start — chatId:', msg.chat.id, '| type:', msg.chat.type);
  bot.sendMessage(
    msg.chat.id,
    '🚕 Taksi buyurtma berish uchun quyidagi tugmani bosing:',
    { reply_markup: buildKeyboard() }
  ).catch(err => console.error('[bot] sendMessage xatosi:', err.message));
});

// ---- GURUH XABARLARI: kalit so'zlarni kuzatish ----
bot.on('message', async (msg) => {
  if (!msg.text) return;
  if (msg.text.startsWith('/')) return;

  // Faqat guruh yoki superguruhda
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  if (!isGroup) return;

  // Kalit so'z yo'q — o'tkazib yuborish
  if (!KEYWORD_RE.test(msg.text)) return;

  console.log('[bot] Kalit so\'z topildi:', msg.text.slice(0, 60), '| guruh:', msg.chat.id);

  // ---- Shaxsiy guruhga yuborish ----
  if (PERSONAL_GROUP_ID) {
    const user = msg.from;
    const displayName = user.username
      ? `@${user.username}`
      : `<a href="tg://user?id=${user.id}">${escHtml(user.first_name || 'Foydalanuvchi')}</a>`;

    const orderText =
      `⚡ <b>GURUH BUYURTMASI!</b>\n\n` +
      `💬 <b>Xabar:</b> "${escHtml(msg.text)}"\n` +
      `👤 <b>Foydalanuvchi:</b> ${displayName}\n` +
      `📍 <b>Guruh:</b> ${escHtml(msg.chat.title || 'Guruh')}\n` +
      `🆔 <b>User ID:</b> <code>${user.id}</code>\n\n` +
      `👆 Ushbu foydalanuvchi bilan bog'laning!`;

    try {
      await bot.sendMessage(PERSONAL_GROUP_ID, orderText, { parse_mode: 'HTML' });
      console.log('[bot] Zakaz shaxsiy guruhga yuborildi');
    } catch (err) {
      console.error('[bot] Shaxsiy guruhga yuborishda xato:', err.message);
    }
  }

  // ---- Guruhdan original xabarni o'chirish (bot admin bo'lsa ishlaydi) ----
  try {
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    console.log('[bot] Xabar o\'chirildi:', msg.message_id);
  } catch (err) {
    // Admin emas yoki ruxsat yo'q — jimgina o'tkazib yuboramiz
    console.warn('[bot] O\'chirib bo\'lmadi (admin emas?):', err.message);
  }
});

// ---- Yordamchi: HTML belgilarini tozalash ----
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { bot, useWebhook };

if (!useWebhook) {
  console.log('[bot] Polling rejimida ishlamoqda');
}

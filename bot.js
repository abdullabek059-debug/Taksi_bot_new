require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const WEB_APP_URL = (process.env.WEB_APP_URL || '').replace(/\/$/, '');
const PERSONAL_GROUP_ID = process.env.PERSONAL_GROUP_ID;
const useWebhook = WEB_APP_URL.startsWith('https://');

const bot = new TelegramBot(token, useWebhook ? {} : { polling: true });

// ---- Kalit so'zlar ----
const KEYWORD_RE = new RegExp(
  [
    'ta[kx]si.{0,40}?(kerak|lozim|zarur|бор|нужно|нужен)',
    '(srochna|срочно).{0,40}?ta[kx]si',
    'ta[kx]si.{0,40}?(srochna|срочно)',
    'pochta.{0,30}?(bor|kerak|yuborish|нужна)',
    'yuk.{0,30}?(bor|kerak|нужна)',
  ].join('|'),
  'i'
);

// ---- Admin holati keshi (60 soniya) ----
const adminCache = Object.create(null);

async function isBotAdmin(chatId) {
  const now = Date.now();
  const hit = adminCache[chatId];
  if (hit && now - hit.ts < 60000) return hit.ok;
  try {
    const me = await bot.getMe();
    const member = await bot.getChatMember(chatId, me.id);
    const ok = member.status === 'administrator' || member.status === 'creator';
    adminCache[chatId] = { ok, ts: now };
    console.log('[bot] Admin tekshiruvi —', chatId, ':', ok);
    return ok;
  } catch (err) {
    console.warn('[bot] getChatMember xatosi:', err.message);
    return false;
  }
}

// ---- Web App tugmasi ----
function buildKeyboard() {
  return { inline_keyboard: [[{ text: '🚖 Taksi buyurtma', web_app: { url: WEB_APP_URL } }]] };
}

// ---- /start ----
bot.onText(/\/start/, (msg) => {
  console.log('[bot] /start — chatId:', msg.chat.id, '| type:', msg.chat.type);
  bot.sendMessage(
    msg.chat.id,
    '🚕 Taksi buyurtma berish uchun quyidagi tugmani bosing:',
    { reply_markup: buildKeyboard() }
  ).catch(err => console.error('[bot] sendMessage xatosi:', err.message));
});

// ---- GURUH XABARLARI ----
bot.on('message', async (msg) => {
  if (!msg.text) return;
  if (msg.text.startsWith('/')) return;

  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  if (!isGroup) return;

  console.log('[bot] Guruh xabari:', msg.chat.id, '|', msg.text.slice(0, 60));

  // Bot admin emasligini tekshirish
  const admin = await isBotAdmin(msg.chat.id);
  if (!admin) {
    console.log('[bot] Bot admin emas — o\'tkazib yuborildi:', msg.chat.id);
    return;
  }

  // Kalit so'z yo'q — o'tkazib yuborish
  if (!KEYWORD_RE.test(msg.text)) {
    console.log('[bot] Kalit so\'z topilmadi');
    return;
  }

  console.log('[bot] Kalit so\'z topildi! Zakaz qilinmoqda...');

  // Shaxsiy guruhga yuborish
  if (PERSONAL_GROUP_ID) {
    const user = msg.from;
    const link = user.username
      ? `@${user.username}`
      : `<a href="tg://user?id=${user.id}">${escHtml((user.first_name || '') + ' ' + (user.last_name || '')).trim()}</a>`;

    const text =
      `⚡ <b>GURUH BUYURTMASI!</b>\n\n` +
      `💬 <b>Xabar:</b> "${escHtml(msg.text)}"\n` +
      `👤 <b>Foydalanuvchi:</b> ${link}\n` +
      `📍 <b>Guruh:</b> ${escHtml(msg.chat.title || '')}\n` +
      `🆔 <b>User ID:</b> <code>${user.id}</code>\n\n` +
      `👆 Ushbu foydalanuvchi bilan bog'laning!`;

    try {
      await bot.sendMessage(PERSONAL_GROUP_ID, text, { parse_mode: 'HTML' });
      console.log('[bot] Zakaz shaxsiy guruhga yuborildi');
    } catch (err) {
      console.error('[bot] Shaxsiy guruhga yuborishda xato:', err.message);
    }
  }

  // Original xabarni o'chirish
  try {
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    console.log('[bot] Xabar o\'chirildi');
  } catch (err) {
    console.warn('[bot] O\'chirib bo\'lmadi:', err.message);
  }
});

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = { bot, useWebhook };

if (!useWebhook) console.log('[bot] Polling rejimida ishlamoqda');

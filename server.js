require('dotenv').config();

const express = require('express');
const path = require('path');
const axios = require('axios');

const { bot, useWebhook } = require('./bot');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = (process.env.WEB_APP_URL || '').replace(/\/$/, '');
const PERSONAL_GROUP_ID = process.env.PERSONAL_GROUP_ID;

// Oddiy URL, tokendagi ':' Express route parametri sifatida xato tahlil qilmasligi uchun
const WEBHOOK_PATH = '/tgwebhook';

app.use('/', express.static(path.join(__dirname, 'web')));

// Sog'lik tekshiruvi
app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: useWebhook ? 'webhook' : 'polling', time: new Date().toISOString() });
});

if (useWebhook) {
  app.post(WEBHOOK_PATH, (req, res) => {
    console.log('[webhook] So\'rov keldi:', JSON.stringify(req.body).slice(0, 120));
    try {
      bot.processUpdate(req.body);
    } catch (err) {
      console.error('[webhook] processUpdate xatosi:', err.message);
    }
    res.sendStatus(200);
  });
}

async function sendToTelegram(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });
}

app.post('/request', async (req, res) => {
  const { name, serviceType, from, to, phone, passengers, userId, username } = req.body;
  if (!from || !to || !phone) {
    return res.status(400).json({ ok: false, error: 'Qayerdan, qayerga va telefon raqam kerak' });
  }

  const userLabel = username || (userId ? `ID: ${userId}` : "Noma'lum");
  const isTaksi = serviceType === 'taksi';

  const header  = isTaksi ? '🚕 <b>Yangi TAKSI buyurtma!</b>' : '📦 <b>Yangi YETKAZIB BERISH buyurtma!</b>';
  const pasLine = isTaksi && passengers ? `\n👥 <b>Yo'lovchi soni:</b> ${passengers} kishi` : '';

  const text =
    `${header}\n\n` +
    `👤 <b>Ism:</b> ${name || "Noma'lum"}\n` +
    `📍 <b>Qayerdan:</b> ${from}\n` +
    `📍 <b>Qayerga:</b> ${to}` +
    pasLine +
    `\n📞 <b>Telefon:</b> ${phone}\n` +
    `👤 <b>Foydalanuvchi:</b> ${userLabel}`;

  try {
    await sendToTelegram(PERSONAL_GROUP_ID, text);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[request] Xabar yuborishda xato:', err?.response?.data || err.message);
    return res.status(500).json({ ok: false, error: 'Xabar yuborishda xato' });
  }
});

app.listen(PORT, async () => {
  console.log(`[server] Web app ishlamoqda: http://localhost:${PORT}`);
  console.log(`[server] Rejim: ${useWebhook ? 'webhook' : 'polling'}`);

  if (useWebhook) {
    const webhookUrl = `${WEB_APP_URL}${WEBHOOK_PATH}`;
    try {
      await bot.setWebHook(webhookUrl, { allowed_updates: ['message', 'callback_query'] });
      console.log(`[server] Webhook o'rnatildi: ${webhookUrl}`);

      // Webhook holati tekshiruvi
      const info = await bot.getWebHookInfo();
      console.log(`[server] Webhook info: url=${info.url}, pending=${info.pending_update_count}, last_error=${info.last_error_message || 'yo\'q'}`);
    } catch (err) {
      console.error('[server] Webhook xatosi:', err.message);
    }
  }
});

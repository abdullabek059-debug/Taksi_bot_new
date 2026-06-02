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

app.use('/', express.static(path.join(__dirname, 'web')));

// Webhook endpoint (faqat production da ishlatiladi)
if (useWebhook) {
  const webhookPath = `/tgwebhook/${BOT_TOKEN}`;
  app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
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
  const { from, to, phone, userId, username } = req.body;
  if (!from || !to || !phone) {
    return res.status(400).json({ ok: false, error: 'Qayerdan, qayerga va telefon raqam kerak' });
  }

  const userLabel = username || (userId ? `ID: ${userId}` : "Noma'lum");
  const text =
    `🚕 <b>Yangi taksi buyurtma!</b>\n\n` +
    `📍 <b>Qayerdan:</b> ${from}\n` +
    `📍 <b>Qayerga:</b> ${to}\n` +
    `📞 <b>Telefon:</b> ${phone}\n` +
    `👤 <b>Foydalanuvchi:</b> ${userLabel}`;

  try {
    await sendToTelegram(PERSONAL_GROUP_ID, text);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    return res.status(500).json({ ok: false, error: 'Xabar yuborishda xato' });
  }
});

app.listen(PORT, async () => {
  console.log(`Web app ishlamoqda: http://localhost:${PORT}`);
  if (useWebhook) {
    const webhookUrl = `${WEB_APP_URL}/tgwebhook/${BOT_TOKEN}`;
    try {
      await bot.setWebHook(webhookUrl);
      console.log(`Webhook o'rnatildi: ${webhookUrl}`);
    } catch (err) {
      console.error('Webhook xatosi:', err.message);
    }
  }
});

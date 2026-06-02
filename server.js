require('dotenv').config();
// start bot when the server process launches
try {
  require('./bot');
} catch (err) {
  console.error('Failed to start bot:', err && err.message ? err.message : err);
}

const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID; // main group id
const PERSONAL_GROUP_ID = process.env.PERSONAL_GROUP_ID || process.env.GROUP_ID; // optional personal group

app.use('/', express.static(path.join(__dirname, 'web')));

// endpoint called by web app when user submits a ride request
app.post('/request', async (req, res) => {
  const { from, to, phone, userId } = req.body;
  if (!from || !to || !phone) return res.status(400).json({ ok: false, error: 'Missing fields' });

  const text = `Yangi buyurtma:\nFrom: ${from}\nTo: ${to}\nPhone: ${phone}\nUser: ${userId || 'web_user'}`;

  try {
    // send to main group
    if (BOT_TOKEN && GROUP_ID) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: GROUP_ID,
        text,
      });
    }
    // send to personal group
    if (BOT_TOKEN && PERSONAL_GROUP_ID) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: PERSONAL_GROUP_ID,
        text,
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    return res.status(500).json({ ok: false, error: 'Failed to send' });
  }
});

app.listen(PORT, () => console.log(`Web app running at http://localhost:${PORT}`));
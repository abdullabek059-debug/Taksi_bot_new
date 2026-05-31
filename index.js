require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const Order = require('./models/Order');

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taksibot';
const GROUP_ID = process.env.GROUP_ID || '-1001806559482';
const ADMIN_USERNAME = '@bekzod_721';

// Kalit sozlar — guruhda kuzatiladigan
const KEYWORDS = [
  'taksi kerak',
  'srochna taksi kerak',
  'pochta bor',
  'ketishim kerak'
];

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB ulandi'))
  .catch(err => console.error('❌ MongoDB xatolik:', err));

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const userState = {};
const CITIES = ['Buxoro', 'Xorazm', 'Nukus', 'Toshkent'];

// Allaqachon qayta ishlangan xabarlarni saqlash (takroriy trigger oldini olish)
const processedMessages = new Set();

// =====================
//   YORDAMCHI FUNKSIYALAR
// =====================
function getCityButtons(prefix) {
  return {
    inline_keyboard: CITIES.map(city => ([
      { text: '🏙 ' + city, callback_data: prefix + '_' + city }
    ]))
  };
}

function getPassengerButtons() {
  return {
    inline_keyboard: [
      [
        { text: '👤 1 kishi', callback_data: 'pass_1' },
        { text: '👥 2 kishi', callback_data: 'pass_2' },
      ],
      [
        { text: '👥 3 kishi', callback_data: 'pass_3' },
        { text: '👥 4 kishi', callback_data: 'pass_4' },
      ]
    ]
  };
}

function getMainMenu() {
  return {
    inline_keyboard: [
      [{ text: '🚖 Taksi zakaz qilish', callback_data: 'menu_taksi' }],
      [{ text: '📦 Pochta jonatish', callback_data: 'menu_pochta' }],
      [{ text: '📞 Operator', callback_data: 'menu_operator' }],
      [{ text: '🚗 Shafyor bolish', callback_data: 'menu_driver' }],
    ]
  };
}

function getPhoneButton() {
  return {
    keyboard: [[
      { text: '📱 Telefon raqamni ulashish', request_contact: true }
    ]],
    resize_keyboard: true,
    one_time_keyboard: true
  };
}

function resetState(chatId) {
  userState[chatId] = {};
}

// Bot admin ekanligini tekshirish
async function isBotAdmin(chatId) {
  try {
    const botInfo = await bot.getMe();
    const member = await bot.getChatMember(chatId, botInfo.id);
    return ['administrator', 'creator'].includes(member.status);
  } catch (e) {
    return false;
  }
}

// =====================
//   /START BUYRUG'I (faqat shaxsiy chat)
// =====================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  if (msg.chat.type !== 'private') return;
  resetState(chatId);
  await bot.sendMessage(chatId,
    '🚖 Xush kelibsiz!\n\nQuyidagi xizmatlardan birini tanlang:',
    { reply_markup: getMainMenu() }
  );
});

// =====================
//   GURUH XABARLARI — KALIT SOZ KUZATISH
// =====================
bot.on('message', async (msg) => {
  // Faqat guruh va superguruhda ishlaydi
  if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') return;
  if (!msg.text) return;

  // Takroriy trigger oldini olish
  const msgKey = msg.chat.id + '_' + msg.message_id;
  if (processedMessages.has(msgKey)) return;

  const text = msg.text.toLowerCase().trim();

  // Kalit so'z bormi tekshirish
  const foundKeyword = KEYWORDS.find(kw => text.includes(kw.toLowerCase()));
  if (!foundKeyword) return;

  processedMessages.add(msgKey);
  // 5 daqiqadan keyin xotiradan o'chirish
  setTimeout(() => processedMessages.delete(msgKey), 5 * 60 * 1000);

  // Bot admin ekanligini tekshirish
  const adminCheck = await isBotAdmin(msg.chat.id);
  if (!adminCheck) return;

  const sender = msg.from;
  const username = sender.username ? '@' + sender.username : sender.first_name;
  const userId = sender.id;
  const groupName = msg.chat.title || 'Noma\'lum guruh';
  const originalText = msg.text;

  // Zakaz turini aniqlash
  let orderType = 'taksi';
  if (foundKeyword.includes('pochta')) orderType = 'pochta';

  try {
    // MongoDB ga saqlash
    const order = new Order({
      userId,
      username,
      phone: 'Guruhdan — telefon yoq',
      type: orderType,
      from: 'Guruh: ' + groupName,
      to: 'Aniqlanmagan',
      passengers: null,
    });
    await order.save();

    // Shaxsiy gruppaga xabar yuborish
    let alertMsg = '🔔 GURUHDAN KALIT SOZ ANIQLANDI!\n\n';
    alertMsg += '👤 Mijoz: ' + username + '\n';
    alertMsg += '🆔 User ID: ' + userId + '\n';
    alertMsg += '💬 Guruh: ' + groupName + '\n';
    alertMsg += '🔑 Kalit soz: ' + foundKeyword + '\n';
    alertMsg += '📝 Xabar: ' + originalText + '\n';
    alertMsg += '\n🆔 Zakaz #' + order._id;

    await bot.sendMessage(GROUP_ID, alertMsg);

    console.log('✅ Guruhdan zakaz: ' + username + ' | ' + foundKeyword + ' | ' + groupName);

    // Foydalanuvchi xabarini guruhdan o'chirish
    try { await bot.deleteMessage(msg.chat.id, msg.message_id); } catch(e) {}

    // Bot javobini ham o'chirish (yuborib, keyin o'chirish)
    try {
      const botReply = await bot.sendMessage(msg.chat.id,
        username + ', xabaringiz qabul qilindi! Operator boglanadi.',
        { reply_markup: { inline_keyboard: [[{ text: '🚖 Zakaz qilish', url: 'https://t.me/' + (await bot.getMe()).username }]] } }
      );
      setTimeout(async () => {
        try { await bot.deleteMessage(msg.chat.id, botReply.message_id); } catch(e) {}
      }, 3000);
    } catch(e) {}

  } catch (err) {
    console.error('❌ Guruh zakaz xatolik:', err.message);
  }
});

// =====================
//   CALLBACK HANDLER
// =====================
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;
  const data = query.data;

  try { await bot.answerCallbackQuery(query.id); } catch(e) {}

  // Faqat shaxsiy chatda ishlaydi
  if (query.message.chat.type !== 'private') return;

  if (data === 'menu_taksi') {
    resetState(chatId);
    userState[chatId].type = 'taksi';
    userState[chatId].step = 'from';
    await bot.editMessageText(
      '🚖 Taksi zakaz qilish\n\n📍 Ketish joyini tanlang:',
      { chat_id: chatId, message_id: msgId, reply_markup: getCityButtons('from') }
    );
  }

  else if (data === 'menu_pochta') {
    resetState(chatId);
    userState[chatId].type = 'pochta';
    userState[chatId].step = 'from';
    await bot.editMessageText(
      '📦 Pochta jonatish\n\n📍 Ketish joyini tanlang:',
      { chat_id: chatId, message_id: msgId, reply_markup: getCityButtons('from') }
    );
  }

  else if (data === 'menu_operator') {
    await bot.editMessageText(
      '📞 Operator\n\nBizning operatorimiz bilan boglananing:\n👤 Admin: ' + ADMIN_USERNAME,
      {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: { inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'back_main' }]] }
      }
    );
  }

  else if (data === 'menu_driver') {
    await bot.editMessageText(
      '🚗 Shafyor bolish\n\nShafyor bolish uchun adminga yozing:\n👤 ' + ADMIN_USERNAME,
      {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: { inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'back_main' }]] }
      }
    );
  }

  else if (data === 'back_main') {
    resetState(chatId);
    await bot.editMessageText(
      '🚖 Xush kelibsiz!\n\nQuyidagi xizmatlardan birini tanlang:',
      { chat_id: chatId, message_id: msgId, reply_markup: getMainMenu() }
    );
  }

  // KETISH JOYI
  else if (data.startsWith('from_')) {
    const city = data.replace('from_', '');
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].from = city;
    userState[chatId].step = 'to';

    const type = userState[chatId].type;
    const emoji = type === 'taksi' ? '🚖' : '📦';
    const typeName = type === 'taksi' ? 'Taksi zakaz' : 'Pochta jonatish';

    const filteredCities = CITIES.filter(c => c !== city);
    const toButtons = {
      inline_keyboard: filteredCities.map(c => ([
        { text: '🏙 ' + c, callback_data: 'to_' + c }
      ]))
    };

    await bot.editMessageText(
      emoji + ' ' + typeName + '\n\n📍 Ketish joyi: ' + city + '\n\n🎯 Borish joyini tanlang:',
      { chat_id: chatId, message_id: msgId, reply_markup: toButtons }
    );
  }

  // BORISH JOYI
  else if (data.startsWith('to_')) {
    const city = data.replace('to_', '');
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].to = city;

    const type = userState[chatId].type;
    const fromCity = userState[chatId].from;
    const emoji = type === 'taksi' ? '🚖' : '📦';

    if (type === 'taksi') {
      userState[chatId].step = 'passengers';
      await bot.editMessageText(
        emoji + ' Taksi zakaz\n\n📍 Ketish: ' + fromCity + '\n🎯 Borish: ' + city + '\n\n👥 Nechta odam?',
        { chat_id: chatId, message_id: msgId, reply_markup: getPassengerButtons() }
      );
    } else {
      userState[chatId].step = 'phone';
      userState[chatId].passengers = null;
      await bot.editMessageText(
        emoji + ' Pochta jonatish\n\n📍 Ketish: ' + fromCity + '\n🎯 Borish: ' + city + '\n\n📱 Telefon raqamingizni yuboring:',
        { chat_id: chatId, message_id: msgId }
      );
      await bot.sendMessage(chatId, '👇 Quyidagi tugmani bosing:', {
        reply_markup: getPhoneButton()
      });
    }
  }

  // YOLOVCHILAR SONI
  else if (data.startsWith('pass_')) {
    const count = parseInt(data.replace('pass_', ''));
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].passengers = count;
    userState[chatId].step = 'phone';

    const fromCity = userState[chatId].from;
    const toCity = userState[chatId].to;

    await bot.editMessageText(
      '🚖 Taksi zakaz\n\n📍 Ketish: ' + fromCity + '\n🎯 Borish: ' + toCity + '\n👥 Yolovchilar: ' + count + ' kishi\n\n📱 Telefon raqamingizni yuboring:',
      { chat_id: chatId, message_id: msgId }
    );
    await bot.sendMessage(chatId, '👇 Quyidagi tugmani bosing:', {
      reply_markup: getPhoneButton()
    });
  }
});

// =====================
//   KONTAKT HANDLER
// =====================
bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;

  if (!userState[chatId] || userState[chatId].step !== 'phone') return;

  const phone = contact.phone_number;
  const username = msg.from.username ? '@' + msg.from.username : msg.from.first_name;
  const userId = msg.from.id;

  userState[chatId].phone = phone;
  userState[chatId].username = username;

  const state = userState[chatId];
  const type = state.type;
  const emoji = type === 'taksi' ? '🚖' : '📦';
  const typeName = type === 'taksi' ? 'Taksi zakaz' : 'Pochta jonatish';

  try {
    const order = new Order({
      userId,
      username,
      phone,
      type,
      from: state.from,
      to: state.to,
      passengers: state.passengers || null,
    });
    await order.save();
    console.log('✅ Zakaz saqlandi: #' + order._id);

    // Gruppaga xabar
    let groupMsg = emoji + ' Yangi ' + typeName + '!\n\n';
    groupMsg += '👤 Mijoz: ' + username + '\n';
    groupMsg += '📞 Telefon: ' + phone + '\n';
    groupMsg += '📍 Ketish: ' + state.from + '\n';
    groupMsg += '🎯 Borish: ' + state.to + '\n';
    if (type === 'taksi' && state.passengers) {
      groupMsg += '👥 Yolovchilar: ' + state.passengers + ' kishi\n';
    }
    groupMsg += '\n🆔 Zakaz #' + order._id;

    await bot.sendMessage(GROUP_ID, groupMsg);

    // Foydalanuvchiga tasdiqlash
    let confirmMsg = '✅ Zakaz qabul qilindi!\n\n';
    confirmMsg += emoji + ' ' + typeName + '\n';
    confirmMsg += '📍 ' + state.from + ' → 🎯 ' + state.to + '\n';
    if (type === 'taksi' && state.passengers) {
      confirmMsg += '👥 ' + state.passengers + ' kishi\n';
    }
    confirmMsg += '📞 ' + phone + '\n\n';
    confirmMsg += '🔔 Operator tez orada siz bilan boglanadi!';

    await bot.sendMessage(chatId, confirmMsg, {
      reply_markup: { remove_keyboard: true }
    });

    setTimeout(async () => {
      await bot.sendMessage(chatId, '🏠 Bosh menyu:', {
        reply_markup: getMainMenu()
      });
    }, 2000);

  } catch (err) {
    console.error('❌ Xatolik:', err);
    await bot.sendMessage(chatId, '❌ Xatolik yuz berdi. Qayta urinib koring.', {
      reply_markup: { remove_keyboard: true }
    });
  }

  resetState(chatId);
});

bot.on('polling_error', (err) => {
  console.error('Polling xatosi:', err.message);
});

console.log('🚀 Taksi Bot ishga tushdi...');
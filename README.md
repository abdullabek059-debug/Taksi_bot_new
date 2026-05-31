# 🚖 Taksi Bot

Telegram taksi va pochta xizmati boti.

## 📋 Xususiyatlari

- 🚖 Taksi zakaz qilish (ketish joyi → borish joyi → yo'lovchilar soni → telefon)
- 📦 Pochta jo'natish (ketish joyi → borish joyi → telefon)
- 📞 Operator ma'lumoti
- 🚗 Shafyor bo'lish ma'lumoti
- 💾 MongoDB da zakazlar saqlanadi
- 📨 Yangi zakaz avtomatik gruppaga yuboriladi

## 🚀 O'rnatish

### 1. Talablar
- Node.js (v16+)
- MongoDB

### 2. Paketlarni o'rnatish
```bash
npm install
```

### 3. .env fayl yaratish
```bash
cp .env.example .env
```

`.env` faylini oching va quyidagilarni to'ldiring:

```
BOT_TOKEN=7xxxxxxxxxx:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MONGO_URI=mongodb://localhost:27017/taksibot
GROUP_ID=-1001806559482
```

### 4. Bot tokenini olish
1. Telegramda @BotFather ga yozing
2. `/newbot` buyrug'ini yuboring
3. Bot nomini kiriting
4. Token oling va `.env` ga qo'ying

### 5. Guruh ID ni sozlash
Guruh ID `.env` da allaqachon sozlangan: `-1001806559482`

⚠️ Botni guruhga **admin** sifatida qo'shing!

### 6. Ishga tushirish
```bash
node index.js
```

## 📁 Loyiha tuzilmasi
```
taksi-bot/
├── index.js          # Asosiy bot kodi
├── models/
│   └── Order.js      # MongoDB zakaz modeli
├── .env.example      # Sozlamalar namunasi
├── .env              # Sizning sozlamalaringiz (gitga qo'shilmaydi)
└── package.json
```

## 🗃️ MongoDB da zakazlar

Har bir zakaz quyidagi ma'lumotlarni saqlaydi:
- `userId` — Telegram foydalanuvchi ID
- `username` — @username yoki ism
- `phone` — telefon raqami
- `type` — `taksi` yoki `pochta`
- `from` — ketish shahri
- `to` — borish shahri
- `passengers` — yo'lovchilar soni (faqat taksida)
- `status` — zakaz holati
- `createdAt` — yaratilgan vaqt

## 👤 Admin

Admin: @bekzod_721

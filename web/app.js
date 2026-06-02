(function () {
  const tg = window.Telegram && window.Telegram.WebApp;

  if (tg) {
    tg.ready();
    tg.expand();
  }

  // Foydalanuvchi ma'lumotlari — Telegram WebApp yoki URL dan
  let userId = '';
  let username = '';
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const u = tg.initDataUnsafe.user;
    userId = String(u.id);
    username = u.username ? '@' + u.username : (u.first_name || '');
  } else {
    const params = new URLSearchParams(window.location.search);
    userId = params.get('userId') || '';
  }
  document.getElementById('userId').value = userId;
  document.getElementById('username').value = username;

  const form = document.getElementById('rideForm');
  const errorMsg = document.getElementById('errorMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const from = form.from.value.trim();
    const to = form.to.value.trim();
    const phone = form.phone.value.trim();

    if (!from) { errorMsg.textContent = 'Qayerdan manzilingizni kiriting'; return; }
    if (!to)   { errorMsg.textContent = 'Qayerga manzilingizni kiriting'; return; }
    if (!phone) { errorMsg.textContent = 'Telefon raqamingizni kiriting'; return; }

    const btn = form.querySelector('.submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Yuborilmoqda...';

    try {
      const res = await fetch('/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, phone, userId, username }),
      });
      const j = await res.json();

      if (j.ok) {
        // Success ekraniga o'tamiz
        document.getElementById('s-from').textContent = from;
        document.getElementById('s-to').textContent = to;
        document.getElementById('s-phone').textContent = phone;
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('successSection').style.display = 'block';
        // 4 soniyadan keyin Telegram WebApp ni yopamiz
        setTimeout(() => { if (tg) tg.close(); }, 4000);
      } else {
        errorMsg.textContent = 'Xato: ' + (j.error || 'Noma\'lum xato');
        btn.disabled = false;
        btn.textContent = '🔍 Taksi qidirish';
      }
    } catch (err) {
      errorMsg.textContent = 'Tarmoq xatosi. Qayta urinib ko\'ring.';
      btn.disabled = false;
      btn.textContent = '🔍 Taksi qidirish';
    }
  });

  document.getElementById('closeBtn').addEventListener('click', () => {
    if (tg) tg.close();
    else window.close();
  });
})();

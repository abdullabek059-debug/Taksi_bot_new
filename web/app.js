(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg) { tg.ready(); tg.expand(); }

  // Foydalanuvchi ma'lumotlari
  let userId = '', username = '';
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const u = tg.initDataUnsafe.user;
    userId = String(u.id);
    username = u.username ? '@' + u.username : (u.first_name || '');
  } else {
    userId = new URLSearchParams(window.location.search).get('userId') || '';
  }

  // Holat
  let selectedService = '';
  let selectedPassengers = 0;

  // ---- QADAM NAVIGATSIYASI ----
  function showStep(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  // ---- QADAM 1 → 2 ----
  document.getElementById('btn1').onclick = function () {
    const name = document.getElementById('inpName').value.trim();
    if (!name) { document.getElementById('e1').textContent = 'Ismingizni kiriting'; return; }
    document.getElementById('e1').textContent = '';
    showStep('s2');
  };
  document.getElementById('inpName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('btn1').click();
  });

  // ---- XIZMAT TURI TANLASH ----
  document.getElementById('svcTaksi').onclick = function () {
    selectedService = 'taksi';
    this.classList.add('sel');
    document.getElementById('svcDelivery').classList.remove('sel');
    document.getElementById('btn2').disabled = false;
  };
  document.getElementById('svcDelivery').onclick = function () {
    selectedService = 'yetkazib';
    this.classList.add('sel');
    document.getElementById('svcTaksi').classList.remove('sel');
    document.getElementById('btn2').disabled = false;
  };

  // ---- QADAM 2 → 3 ----
  document.getElementById('btn2').onclick = function () {
    if (!selectedService) return;
    showStep(selectedService === 'taksi' ? 's3t' : 's3d');
  };
  document.getElementById('back2').onclick = function () { showStep('s1'); };

  // ---- YO'LOVCHI SONI ----
  document.querySelectorAll('.num-btn').forEach(function (btn) {
    btn.onclick = function () {
      selectedPassengers = Number(this.dataset.n);
      document.querySelectorAll('.num-btn').forEach(function (b) { b.classList.remove('sel'); });
      this.classList.add('sel');
    };
  });

  // ---- ORQAGA TUGMALARI ----
  document.getElementById('back3t').onclick = function () { showStep('s2'); };
  document.getElementById('back3d').onclick = function () { showStep('s2'); };

  // ---- YUBORISH: TAKSI ----
  document.getElementById('tSubmit').onclick = async function () {
    const err = document.getElementById('eT');
    const from = document.getElementById('tFrom').value;
    const to   = document.getElementById('tTo').value;
    const phone = document.getElementById('tPhone').value.trim();
    const name  = document.getElementById('inpName').value.trim();

    if (!from)  { err.textContent = 'Qayerdan shaharni tanlang'; return; }
    if (!to)    { err.textContent = 'Qayerga shaharni tanlang'; return; }
    if (from === to) { err.textContent = 'Qayerdan va qayerga bir xil bo\'lmasin'; return; }
    if (!selectedPassengers) { err.textContent = 'Yo\'lovchi sonini tanlang'; return; }
    if (!phone) { err.textContent = 'Telefon raqamingizni kiriting'; return; }
    err.textContent = '';

    await submit({
      name, serviceType: 'taksi', from, to,
      passengers: selectedPassengers, phone, userId, username
    }, this, err);
  };

  // ---- YUBORISH: YETKAZIB BERISH ----
  document.getElementById('dSubmit').onclick = async function () {
    const err = document.getElementById('eD');
    const from = document.getElementById('dFrom').value;
    const to   = document.getElementById('dTo').value;
    const phone = document.getElementById('dPhone').value.trim();
    const name  = document.getElementById('inpName').value.trim();

    if (!from)  { err.textContent = 'Qayerdan shaharni tanlang'; return; }
    if (!to)    { err.textContent = 'Qayerga shaharni tanlang'; return; }
    if (from === to) { err.textContent = 'Qayerdan va qayerga bir xil bo\'lmasin'; return; }
    if (!phone) { err.textContent = 'Telefon raqamingizni kiriting'; return; }
    err.textContent = '';

    await submit({
      name, serviceType: 'yetkazib', from, to,
      phone, userId, username
    }, this, err);
  };

  // ---- UMUMIY YUBORISH FUNKSIYASI ----
  async function submit(data, btn, err) {
    btn.disabled = true;
    btn.textContent = '⏳ Yuborilmoqda...';
    try {
      const res = await fetch('/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (j.ok) {
        showSuccess(data);
      } else {
        err.textContent = 'Xato: ' + (j.error || 'Noma\'lum');
        btn.disabled = false;
        btn.textContent = '📤 Yuborish';
      }
    } catch (e) {
      err.textContent = 'Tarmoq xatosi. Qayta urinib ko\'ring.';
      btn.disabled = false;
      btn.textContent = '📤 Yuborish';
    }
  }

  // ---- MUVAFFAQIYAT EKRANI ----
  function showSuccess(data) {
    const isTaksi = data.serviceType === 'taksi';
    const rows = [
      ['Xizmat turi', isTaksi ? '🚕 Taksi' : '📦 Yetkazib berish'],
      ['Ism', data.name],
      ['Qayerdan', data.from],
      ['Qayerga', data.to],
    ];
    if (isTaksi) rows.push(['Yo\'lovchi soni', data.passengers + ' kishi']);
    rows.push(['Telefon', data.phone]);

    document.getElementById('summaryBox').innerHTML = rows.map(function (r) {
      return '<div class="s-row"><span class="s-lbl">' + r[0] + '</span><span class="s-val">' + r[1] + '</span></div>';
    }).join('');

    showStep('sSuccess');
    setTimeout(function () { if (tg) tg.close(); }, 5000);
  }

  document.getElementById('closeBtn').onclick = function () {
    if (tg) tg.close(); else window.close();
  };
})();

// read userId from query string
(function(){
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('userId') || '';
  document.getElementById('userId').value = userId;

  const form = document.getElementById('rideForm');
  const status = document.getElementById('status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      from: form.from.value,
      to: form.to.value,
      phone: form.phone.value,
      userId: form.userId.value,
    };
    status.textContent = 'Sending...';
    try {
      const res = await fetch('/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (j.ok) status.textContent = 'Qabul qilindi — taksilar siz bilan bog\'lanadi';
      else status.textContent = 'Xato: ' + (j.error || 'unknown');
    } catch (err) {
      status.textContent = 'Network error';
    }
  });
})();

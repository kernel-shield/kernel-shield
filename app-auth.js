(() => {
  'use strict';

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await res.json(); } catch (_) { /* respuesta vacía */ }
    return { ok: res.ok, status: res.status, data };
  }

  function showAlert(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = 'auth-alert show ' + type;
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="auth-loader"></span>Procesando…' : label;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return iso; }
  }

  // ---------- Registro ----------
  const registerForm = document.getElementById('registerForm');
  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('registerAlert');
    const btn = document.getElementById('submitRegisterBtn');
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;

    if (password !== password2) return showAlert(alertEl, 'Las contraseñas no coinciden.', 'error');
    if (password.length < 8) return showAlert(alertEl, 'La contraseña debe tener al menos 8 caracteres.', 'error');

    setLoading(btn, true);
    const { ok, data } = await postJSON('/api/auth/register', { name, email, password });
    setLoading(btn, false, 'Crear cuenta');

    if (!ok) return showAlert(alertEl, data.error || 'No se pudo crear la cuenta.', 'error');
    registerForm.hidden = true;
    document.getElementById('registerSuccess').hidden = false;
  });

  // ---------- Login ----------
  const loginForm = document.getElementById('loginForm');
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('loginAlert');
    const btn = document.getElementById('submitLoginBtn');
    const email = document.getElementById('logEmail').value.trim();
    const password = document.getElementById('logPassword').value;

    setLoading(btn, true);
    const { ok, data } = await postJSON('/api/auth/login', { email, password });
    setLoading(btn, false, 'Iniciar sesión');

    if (!ok) {
      if (data.code === 'unverified') {
        showAlert(alertEl, data.error, 'error');
        const resend = document.getElementById('resendVerifyBtn');
        if (resend) { resend.hidden = false; resend.dataset.email = email; }
      } else {
        showAlert(alertEl, data.error || 'No se pudo iniciar sesión.', 'error');
      }
      return;
    }
    window.location.href = '/cuenta.html';
  });

  document.getElementById('resendVerifyBtn')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    const alertEl = document.getElementById('loginAlert');
    setLoading(btn, true, 'Reenviar verificación');
    const { data } = await postJSON('/api/auth/resend-verification', { email: btn.dataset.email });
    setLoading(btn, false, 'Reenviar verificación');
    showAlert(alertEl, data.message || 'Si el correo existe, te enviamos un nuevo enlace.', 'success');
  });

  // ---------- Recuperar contraseña ----------
  const forgotForm = document.getElementById('forgotForm');
  forgotForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('forgotAlert');
    const btn = document.getElementById('submitForgotBtn');
    const email = document.getElementById('fpEmail').value.trim();

    setLoading(btn, true);
    const { data } = await postJSON('/api/auth/forgot-password', { email });
    setLoading(btn, false, 'Enviar instrucciones');
    showAlert(alertEl, data.message || 'Si el correo está registrado, revisa tu bandeja de entrada.', 'success');
    forgotForm.reset();
  });

  // ---------- Restablecer contraseña ----------
  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    const token = new URLSearchParams(window.location.search).get('token');
    resetForm.addEventListener('submit', async e => {
      e.preventDefault();
      const alertEl = document.getElementById('resetAlert');
      const btn = document.getElementById('submitResetBtn');
      const password = document.getElementById('rpPassword').value;
      const password2 = document.getElementById('rpPassword2').value;

      if (!token) return showAlert(alertEl, 'El enlace no es válido. Solicita uno nuevo.', 'error');
      if (password !== password2) return showAlert(alertEl, 'Las contraseñas no coinciden.', 'error');
      if (password.length < 8) return showAlert(alertEl, 'La contraseña debe tener al menos 8 caracteres.', 'error');

      setLoading(btn, true);
      const { ok, data } = await postJSON('/api/auth/reset-password', { token, password });
      setLoading(btn, false, 'Guardar nueva contraseña');

      if (!ok) return showAlert(alertEl, data.error || 'No se pudo actualizar la contraseña.', 'error');
      resetForm.hidden = true;
      document.getElementById('resetSuccess').hidden = false;
    });
  }

  // ---------- Verificación de correo ----------
  const verifyStatus = document.getElementById('verifyStatus');
  if (verifyStatus) {
    (async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) {
        verifyStatus.innerHTML = '<div class="success-icon" style="background:rgba(255,90,90,.12);color:#ff9d9d">✕</div><h3>Enlace incompleto</h3><p>Falta el código de verificación en la URL.</p>';
        return;
      }
      const { ok, data } = await postJSON('/api/auth/verify-email', { token });
      if (ok) {
        verifyStatus.innerHTML = `<div class="success-icon">✓</div><h3>Correo confirmado</h3><p>${escapeHtml(data.message)}</p><a href="/login.html" class="btn btn-primary" style="margin-top:18px">Iniciar sesión</a>`;
      } else {
        verifyStatus.innerHTML = `<div class="success-icon" style="background:rgba(255,90,90,.12);color:#ff9d9d">✕</div><h3>No pudimos confirmar tu correo</h3><p>${escapeHtml(data.error)}</p><a href="/login.html" class="btn btn-ghost" style="margin-top:18px">Volver a iniciar sesión</a>`;
      }
    })();
  }

  // ---------- Panel de cuenta ----------
  const accRoot = document.getElementById('accRoot');
  if (accRoot) {
    (async () => {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) { window.location.href = '/login.html'; return; }
      const { user, quotes, services } = await res.json();

      document.getElementById('accName').textContent = user.name.split(' ')[0];
      document.getElementById('accProfileName').textContent = user.name;
      document.getElementById('accEmail').textContent = user.email;
      document.getElementById('accSince').textContent = formatDate(user.memberSince);

      if (!user.emailVerified) {
        document.getElementById('accVerifyPill').hidden = false;
      }

      const servicesEl = document.getElementById('accServices');
      if (!services.length) {
        servicesEl.innerHTML = '<p class="acc-empty">Todavía no tienes servicios activos. Cuando aprobemos tu cotización, tu VPS aparecerá aquí.</p>';
      } else {
        servicesEl.innerHTML = services.map(s => `
          <div class="acc-item">
            <div class="acc-item-top">
              <span class="acc-item-name">${escapeHtml(s.plan_name)}</span>
              <span class="acc-badge ${s.status}">${escapeHtml(s.status)}</span>
            </div>
            <div class="acc-item-meta">${escapeHtml(s.location || 'Ubicación por confirmar')}${s.ip_address ? ' · ' + escapeHtml(s.ip_address) : ''}${s.renews_at ? ' · Renueva: ' + escapeHtml(s.renews_at) : ''}</div>
          </div>`).join('');
      }

      const quotesEl = document.getElementById('accQuotes');
      if (!quotes.length) {
        quotesEl.innerHTML = '<p class="acc-empty">Aún no has enviado ninguna cotización.</p>';
      } else {
        quotesEl.innerHTML = quotes.map(q => `
          <div class="acc-item">
            <div class="acc-item-top">
              <span class="acc-item-name">${escapeHtml(q.requested || 'Cotización VPS')}</span>
              <span class="acc-badge ${q.status}">${escapeHtml(q.status)}</span>
            </div>
            <div class="acc-item-meta">${escapeHtml(q.location_pref || 'Sin ubicación preferida')} · ${formatDate(q.created_at)}</div>
          </div>`).join('');
      }
    })();

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await postJSON('/api/auth/logout', {});
      window.location.href = '/';
    });
  }
})();

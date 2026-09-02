(() => {
  'use strict';

  // Cambia esto si tu API vive en otro dominio (ej. api.kernelshield.xyz)
  const API_BASE = 'https://kernel-shield.onrender.com';

  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  const errorBox = document.getElementById('authError');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
      hideError();
    });
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function hideError() {
    errorBox.classList.remove('show');
    errorBox.textContent = '';
  }

  const ERROR_MESSAGES = {
    invalid_email: 'Correo inválido.',
    invalid_name: 'El nombre es muy corto.',
    weak_password: 'La contraseña necesita mínimo 8 caracteres, con letras y números.',
    email_in_use: 'Ese correo ya tiene una cuenta. Inicia sesión.',
    invalid_credentials: 'Correo o contraseña incorrectos.',
    too_many_attempts: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    server_error: 'Algo falló de nuestro lado. Intenta de nuevo en un momento.'
  };

  async function submitAuth(url, body, btn) {
    hideError();
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Un momento…';
    try {
      const res = await fetch(API_BASE + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // necesario para que la cookie de sesión se guarde
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.href = 'cuenta.html';
        return;
      }
      showError(ERROR_MESSAGES[data.error] || 'No se pudo completar la solicitud.');
    } catch (err) {
      showError('No se pudo conectar con el servidor. Intenta de nuevo.');
    }
    btn.disabled = false;
    btn.textContent = orig;
  }

  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    submitAuth(
      '/auth/login',
      {
        email: document.getElementById('liEmail').value,
        password: document.getElementById('liPassword').value
      },
      document.getElementById('loginBtn')
    );
  });

  document.getElementById('registerForm').addEventListener('submit', e => {
    e.preventDefault();
    submitAuth(
      '/auth/register',
      {
        name: document.getElementById('reName').value,
        email: document.getElementById('reEmail').value,
        password: document.getElementById('rePassword').value
      },
      document.getElementById('registerBtn')
    );
  });
})();

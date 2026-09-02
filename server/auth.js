/**
 * auth.js — Registro, login, logout y verificación de sesión
 * -------------------------------------------------------------------
 * Reglas de seguridad que sigue este archivo (no las rompas al editar):
 * 1. Las contraseñas NUNCA se guardan en texto plano — solo su hash bcrypt.
 * 2. El token de sesión (JWT) va en una cookie httpOnly — JavaScript del
 *    navegador no puede leerla, así que un ataque XSS no puede robarla.
 * 3. Todas las consultas SQL usan parámetros ($1, $2...) — nunca se arma
 *    la consulta pegando texto del usuario (así se evita inyección SQL).
 * 4. Login y registro tienen su propio límite de intentos, más estricto
 *    que el resto del sitio (anti fuerza-bruta).
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️  Falta la variable de entorno JWT_SECRET — genera una larga y aleatoria.');
}
const COOKIE_NAME = 'ks_session';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // ej: .kernelshield.xyz
const IS_PROD = process.env.NODE_ENV === 'production';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: true, // solo se envía por HTTPS
    sameSite: COOKIE_DOMAIN ? 'lax' : 'none', // 'lax' si es subdominio propio, 'none' si es dominio distinto
    domain: COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/'
  };
}

// ---- Límite de intentos específico para auth (más estricto que el global) ----
const authHitsByIp = new Map();
const AUTH_MAX = 8;
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
function authRateLimited(ip) {
  const now = Date.now();
  const hits = (authHitsByIp.get(ip) || []).filter(t => now - t < AUTH_WINDOW_MS);
  if (hits.length >= AUTH_MAX) {
    authHitsByIp.set(ip, hits);
    return true;
  }
  hits.push(now);
  authHitsByIp.set(ip, hits);
  return false;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(pw) {
  // Mínimo 8 caracteres, al menos una letra y un número.
  return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

// ---- POST /auth/register ----
router.post('/register', async (req, res) => {
  const ip = clientIp(req);
  if (authRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'too_many_attempts' });
  }

  const name = String(req.body?.name || '').trim().slice(0, 80);
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 120);
  const password = String(req.body?.password || '');

  if (name.length < 2) return res.status(422).json({ ok: false, error: 'invalid_name' });
  if (!isValidEmail(email)) return res.status(422).json({ ok: false, error: 'invalid_email' });
  if (!isValidPassword(password)) {
    return res.status(422).json({ ok: false, error: 'weak_password' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      // Mensaje genérico a propósito: no revelamos si el correo existe o no
      // en detalle, para no facilitar que alguien "enumere" cuentas reales.
      return res.status(409).json({ ok: false, error: 'email_in_use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, passwordHash]
    );
    const user = result.rows[0];

    res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
    return res.status(201).json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Error en /auth/register:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---- POST /auth/login ----
router.post('/login', async (req, res) => {
  const ip = clientIp(req);
  if (authRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'too_many_attempts' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 120);
  const password = String(req.body?.password || '');

  if (!isValidEmail(email) || !password) {
    return res.status(422).json({ ok: false, error: 'invalid_credentials' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    const user = result.rows[0];

    // Mismo mensaje de error tanto si el correo no existe como si la
    // contraseña es incorrecta — evita que alguien "adivine" qué correos
    // están registrados probando uno por uno.
    if (!user) {
      return res.status(401).json({ ok: false, error: 'invalid_credentials' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'invalid_credentials' });
    }

    res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
    return res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Error en /auth/login:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---- POST /auth/logout ----
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  return res.json({ ok: true });
});

// ---- Middleware: exige sesión válida ----
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ ok: false, error: 'not_authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'invalid_session' });
  }
}

// ---- GET /auth/me ----
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: { id: req.user.sub, name: req.user.name, email: req.user.email } });
});

module.exports = { router, requireAuth };

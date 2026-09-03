/**
 * functions/api/_lib/auth.js
 * ---------------------------------------------------------------
 * Utilidades compartidas por todos los endpoints de /api/auth/*.
 * Al empezar el nombre de la carpeta con "_", Cloudflare Pages
 * Functions la excluye del enrutamiento: este archivo nunca es
 * accesible como URL pública, solo se puede importar.
 *
 * Nada de esto depende de paquetes npm: usa únicamente Web Crypto,
 * disponible de forma nativa en el runtime de Cloudflare Workers.
 */

const SESSION_COOKIE = 'ks_session';
const SESSION_DAYS = 14;
const PBKDF2_ITERATIONS = 210000;

// ---------- Codificación ----------
const enc = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return toHex(digest);
}

// ---------- Contraseñas (PBKDF2-SHA256) ----------
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt.buffer)}$${toHex(bits)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = Uint8Array.from(parts[2].match(/.{2}/g).map(h => parseInt(h, 16)));
  const expected = parts[3];
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  const actual = toHex(bits);
  // Comparación en tiempo constante
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 200;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '')) && email.length <= 190;
}

// ---------- Cookies de sesión ----------
export function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const out = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

export function sessionCookieHeader(token, maxAgeSeconds = SESSION_DAYS * 86400) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function createSession(db, userId, request) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  const ua = (request.headers.get('User-Agent') || '').slice(0, 200);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  await db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, user_agent, ip) VALUES (?, ?, ?, ?, ?)'
  ).bind(tokenHash, userId, expires, ua, ip).run();
  return token;
}

export async function getSessionUser(db, request) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await db.prepare(
    `SELECT u.id, u.email, u.name, u.email_verified, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`
  ).bind(tokenHash).first();
  return row || null;
}

export async function destroySession(db, request) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

// ---------- Tokens de un solo uso (verificación / reset) ----------
export async function createEmailToken(db, userId, type, ttlMinutes) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  await db.prepare(
    'INSERT INTO email_tokens (token_hash, user_id, type, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(tokenHash, userId, type, expires).run();
  return token;
}

export async function consumeEmailToken(db, token, type) {
  const tokenHash = await sha256Hex(token);
  const row = await db.prepare(
    `SELECT * FROM email_tokens WHERE token_hash = ? AND type = ? AND used = 0 AND expires_at > datetime('now')`
  ).bind(tokenHash, type).first();
  if (!row) return null;
  await db.prepare('UPDATE email_tokens SET used = 1 WHERE token_hash = ?').bind(tokenHash).run();
  return row;
}

// ---------- Rate limiting (D1) ----------
export async function checkRateLimit(db, key, max, windowMs) {
  const now = Date.now();
  const row = await db.prepare('SELECT hits FROM rate_limits WHERE rkey = ?').bind(key).first();
  const hits = row ? JSON.parse(row.hits).filter(t => now - t < windowMs) : [];
  if (hits.length >= max) return false;
  hits.push(now);
  await db.prepare(
    `INSERT INTO rate_limits (rkey, hits, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(rkey) DO UPDATE SET hits = excluded.hits, updated_at = excluded.updated_at`
  ).bind(key, JSON.stringify(hits)).run();
  return true;
}

// ---------- Correo (Resend) ----------
export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn('Falta RESEND_API_KEY: correo no enviado a', to);
    return false;
  }
  const from = env.MAIL_FROM || 'Kernel Shield <cuentas@kernelshield.xyz>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  });
  return res.ok;
}

// ---------- Respuestas / seguridad de origen ----------
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders }
  });
}

export function checkOrigin(request, env) {
  const allowed = env.ALLOWED_ORIGIN || 'https://kernelshield.xyz';
  const origin = request.headers.get('Origin');
  // Peticiones sin Origin (llamadas GET de navegación) se permiten;
  // toda escritura entre orígenes distintos se rechaza.
  if (!origin) return true;
  return origin === allowed;
}

export function clean(value, max = 500) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

export { SESSION_COOKIE };

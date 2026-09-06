import { verifyPassword, isValidEmail, clean, createSession, sessionCookieHeader, checkOrigin, checkRateLimit, json } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request, env)) return json({ error: 'Origen no permitido.' }, 403);

  const db = env.DB;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const email = clean(body.email, 190).toLowerCase();
  const password = body.password;

  if (!isValidEmail(email) || !password) return json({ error: 'Ingresa tu correo y contraseña.' }, 400);

  // Límite combinado por IP y por cuenta, para frenar fuerza bruta dirigida y distribuida.
  const okIp = await checkRateLimit(db, `login-ip:${ip}`, 10, 15 * 60 * 1000);
  const okAcc = await checkRateLimit(db, `login-acc:${email}`, 6, 15 * 60 * 1000);
  if (!okIp || !okAcc) return json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }, 429);

  const user = await db.prepare(
    'SELECT id, email, password_hash, name, email_verified FROM users WHERE email = ?'
  ).bind(email).first();

  // Mensaje idéntico exista o no la cuenta, para no filtrar qué correos están registrados.
  const invalid = () => json({ error: 'Correo o contraseña incorrectos.' }, 401);

  if (!user) return invalid();
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return invalid();

  if (!user.email_verified) {
    return json({ error: 'Debes confirmar tu correo antes de iniciar sesión.', code: 'unverified' }, 403);
  }

  const token = await createSession(db, user.id, request);
  await db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").bind(user.id).run();

  return json(
    { ok: true, user: { id: user.id, name: user.name, email: user.email } },
    200,
    { 'Set-Cookie': sessionCookieHeader(token) }
  );
}

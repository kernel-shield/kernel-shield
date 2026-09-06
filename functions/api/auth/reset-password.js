import { hashPassword, isStrongPassword, consumeEmailToken, checkOrigin, checkRateLimit, json } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request, env)) return json({ error: 'Origen no permitido.' }, 403);

  const db = env.DB;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const okRate = await checkRateLimit(db, `reset:${ip}`, 8, 15 * 60 * 1000);
  if (!okRate) return json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const token = String(body.token || '');
  const password = body.password;

  if (!token) return json({ error: 'Falta el token.' }, 400);
  if (!isStrongPassword(password)) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);

  const row = await consumeEmailToken(db, token, 'reset');
  if (!row) return json({ error: 'El enlace es inválido o ya venció. Solicita uno nuevo.' }, 400);

  const passwordHash = await hashPassword(password);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, row.user_id).run();

  // Cerrar todas las sesiones activas: si alguien más tenía acceso, queda fuera.
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id).run();

  return json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
}

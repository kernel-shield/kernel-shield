import { consumeEmailToken, json } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const token = String(body.token || '');
  if (!token) return json({ error: 'Falta el token de verificación.' }, 400);

  const row = await consumeEmailToken(db, token, 'verify');
  if (!row) return json({ error: 'El enlace es inválido o ya venció. Solicita uno nuevo.' }, 400);

  await db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(row.user_id).run();
  return json({ ok: true, message: 'Tu correo quedó confirmado. Ya puedes iniciar sesión.' });
}

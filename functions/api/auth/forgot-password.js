import { isValidEmail, clean, createEmailToken, sendEmail, checkOrigin, checkRateLimit, json } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request, env)) return json({ error: 'Origen no permitido.' }, 403);

  const db = env.DB;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const okRate = await checkRateLimit(db, `forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!okRate) return json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const email = clean(body.email, 190).toLowerCase();
  if (!isValidEmail(email)) return json({ error: 'Ingresa un correo válido.' }, 400);

  const generic = { ok: true, message: 'Si el correo está registrado, te enviamos instrucciones para restablecer tu contraseña.' };
  const user = await db.prepare('SELECT id, name FROM users WHERE email = ?').bind(email).first();
  if (!user) return json(generic);

  const token = await createEmailToken(db, user.id, 'reset', 30);
  const resetUrl = `${env.APP_URL || 'https://kernelshield.xyz'}/restablecer.html?token=${token}`;

  await sendEmail(env, {
    to: email,
    subject: 'Restablece tu contraseña — Kernel Shield',
    html: `
      <div style="font-family:Arial,sans-serif;background:#08090d;color:#e9ebef;padding:32px">
        <h2 style="color:#3d7fff;margin:0 0 16px">Kernel Shield</h2>
        <p>Hola ${user.name.split(' ')[0]},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Si no fuiste tú, ignora este correo.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}" style="background:#3d7fff;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Elegir nueva contraseña</a>
        </p>
        <p style="color:#a7aebb;font-size:13px">Este enlace vence en 30 minutos y solo puede usarse una vez.</p>
      </div>`
  });

  return json(generic);
}

import { hashPassword, isStrongPassword, isValidEmail, clean, createEmailToken, sendEmail, checkOrigin, checkRateLimit, json } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request, env)) return json({ error: 'Origen no permitido.' }, 403);

  const db = env.DB;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const okRate = await checkRateLimit(db, `register:${ip}`, 5, 15 * 60 * 1000);
  if (!okRate) return json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const name = clean(body.name, 80);
  const email = clean(body.email, 190).toLowerCase();
  const password = body.password;

  if (name.length < 2) return json({ error: 'Ingresa tu nombre completo.' }, 400);
  if (!isValidEmail(email)) return json({ error: 'Ingresa un correo válido.' }, 400);
  if (!isStrongPassword(password)) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'Ya existe una cuenta registrada con ese correo.' }, 409);

  const passwordHash = await hashPassword(password);
  const result = await db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).bind(email, passwordHash, name).run();

  const userId = result.meta.last_row_id;
  const token = await createEmailToken(db, userId, 'verify', 60 * 24);
  const verifyUrl = `${env.APP_URL || 'https://kernelshield.xyz'}/verificar.html?token=${token}`;

  await sendEmail(env, {
    to: email,
    subject: 'Confirma tu cuenta en Kernel Shield',
    html: `
      <div style="font-family:Arial,sans-serif;background:#08090d;color:#e9ebef;padding:32px">
        <h2 style="color:#3d7fff;margin:0 0 16px">Kernel Shield</h2>
        <p>Hola ${name.split(' ')[0]},</p>
        <p>Gracias por crear tu cuenta. Confirma tu correo para activarla:</p>
        <p style="margin:28px 0">
          <a href="${verifyUrl}" style="background:#3d7fff;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Confirmar mi cuenta</a>
        </p>
        <p style="color:#a7aebb;font-size:13px">Este enlace vence en 24 horas. Si no creaste esta cuenta, ignora este correo.</p>
      </div>`
  });

  return json({ ok: true, message: 'Cuenta creada. Revisa tu correo para confirmarla.' }, 201);
}

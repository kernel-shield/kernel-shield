# Kernel Shield · Despliegue del sistema de cuentas (D1 + Resend)

Esta guía activa el login real: base de datos SQL (Cloudflare D1), envío de
correos (Resend) y el panel `/cuenta.html`. Tiempo estimado: 15-20 minutos.
No necesitas instalar nada localmente si usas el dashboard de Cloudflare.

---

## 1. Crear la base de datos D1

1. Entra a **dash.cloudflare.com → Workers & Pages → D1**.
2. **Create database** → nómbrala `kernelshield-db` → **Create**.
3. Abre la base de datos → pestaña **Console**.
4. Pega el contenido completo de `schema.sql` (raíz del proyecto) y ejecútalo.
   Verás las tablas creadas: `users`, `sessions`, `email_tokens`, `quotes`, `services`, `rate_limits`.

## 2. Enlazar D1 a tu proyecto de Pages

1. Ve a tu proyecto en **Workers & Pages → kernel-shield → Settings → Functions**.
2. Baja hasta **D1 database bindings** → **Add binding**.
3. **Variable name:** `DB` (exactamente así, en mayúsculas — el código lo espera).
4. **D1 database:** selecciona `kernelshield-db` → **Save**.
5. Esto aplica a producción; si usas ramas de preview, repite el binding para "Preview".

## 3. Crear la cuenta de Resend (correos)

1. Regístrate en **resend.com** (plan gratuito: 3.000 correos/mes).
2. **Domains → Add Domain** → agrega `kernelshield.xyz` y crea los registros
   DNS (SPF/DKIM) que te indique, en el mismo panel de Cloudflare DNS.
   Espera a que el dominio quede en estado **Verified** (puede tardar minutos).
3. **API Keys → Create API Key** → cópiala, no se vuelve a mostrar completa.

## 4. Variables de entorno del proyecto

En **Settings → Environment variables** (producción), agrega:

| Variable          | Valor                                                     |
|-------------------|------------------------------------------------------------|
| `RESEND_API_KEY`  | La API key que copiaste en el paso 3                       |
| `MAIL_FROM`       | `Kernel Shield <cuentas@kernelshield.xyz>`                  |
| `APP_URL`         | `https://kernelshield.xyz`                                  |
| `ALLOWED_ORIGIN`  | `https://kernelshield.xyz` (ya la tenías para el formulario)|
| `ADMIN_TOKEN`     | Genera uno fuerte (ver abajo) — para asignar VPS a clientes |

Para generar `ADMIN_TOKEN`, en cualquier terminal con Node:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Guárdalo también en tu propio gestor de contraseñas — es la llave para asignar
servicios a clientes y no se puede recuperar desde el panel.

## 5. Redesplegar

Sube estos cambios a tu repo de GitHub (o súbelos directo en el dashboard si
usas "Direct upload"). Cloudflare Pages redespliega solo. Cuando termine:

- `/registro.html` debe crear la cuenta y enviarte el correo de confirmación.
- El enlace del correo lleva a `/verificar.html` y activa la cuenta.
- `/login.html` debe dejarte entrar y redirigir a `/cuenta.html`.
- El botón **Iniciar sesión** de la barra de navegación cambia a tu nombre.

## 6. Asignar un VPS a un cliente (uso diario)

Cuando apruebes una cotización y actives el servidor del cliente, dale de
alta en su cuenta con una petición a tu propio endpoint admin:

```bash
curl -X POST https://kernelshield.xyz/api/admin/add-service \
  -H "Content-Type: application/json" \
  -H "Origin: https://kernelshield.xyz" \
  -H "X-Admin-Token: TU_ADMIN_TOKEN" \
  -d '{
    "email": "cliente@correo.com",
    "planName": "VPS Ryzen 4vCPU / 8GB",
    "location": "Miami, FL",
    "ipAddress": "203.0.113.10",
    "renewsAt": "2026-10-03"
  }'
```

El servicio aparece de inmediato en `/cuenta.html` del cliente. Más adelante
esto se puede automatizar (por ejemplo, un pequeño formulario admin protegido
con el mismo token) si el volumen lo justifica.

## 7. Qué quedó implementado

- Contraseñas con **PBKDF2-SHA256, 210.000 iteraciones**, salt único por
  usuario — nunca se guardan en texto plano.
- Sesiones por **cookie `HttpOnly` + `Secure` + `SameSite=Lax`**, con el
  token real solo en el navegador del usuario (en la base de datos se guarda
  únicamente su hash).
- Verificación de correo obligatoria antes de poder iniciar sesión.
- Recuperación de contraseña con token de un solo uso (30 min de validez) que
  cierra todas las sesiones activas al usarse.
- Límite de intentos (rate limiting) en registro, login, recuperación y
  reenvío de verificación, por IP y por cuenta.
- Los mensajes de error nunca revelan si un correo existe o no en el sistema.
- Cada endpoint valida que la petición venga del propio dominio
  (`Origin` check), como protección adicional contra CSRF.
- El formulario de cotización del home ahora guarda cada solicitud en D1 y,
  si el visitante tiene sesión iniciada, la vincula a su cuenta automáticamente.

## 8. Próximos pasos sugeridos (opcionales)

- Reglas de Cloudflare **Turnstile** (captcha invisible) en registro/login si
  ves abuso automatizado.
- Un log de auditoría simple (tabla `admin_actions`) si más de una persona va
  a usar `/api/admin/add-service`.
- Cambiar el correo del usuario (hoy no es editable desde el panel; puedes
  agregarlo cuando lo necesites, reutilizando el flujo de verificación).

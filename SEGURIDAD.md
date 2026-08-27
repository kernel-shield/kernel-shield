# Seguridad — Kernel Shield

## Lo que ya está activo en el sitio (sin necesidad de servidor)
- **CSP (Content-Security-Policy)** restrictiva: solo permite scripts/estilos propios,
  fuentes de Google Fonts, el widget de Trustpilot y las conexiones a Web3Forms,
  FormSubmit y Discord.
- **Honeypot anti-bot** en el formulario de cotización (campo oculto `website`).
- **Sanitización de inputs** en el frontend antes de enviar cualquier dato.
- **Validación de email/teléfono/país** antes de permitir el envío.

## El problema que resolvimos con `/api/lead-handler.php`
Antes, el webhook de Discord estaba escrito directamente en `app.js`. Cualquiera
que abriera "Ver código fuente" en el navegador podía copiarlo y:
- Enviar mensajes falsos a tu canal de ventas (spam).
- Saturarlo con miles de solicitudes (sin límite).

`api/lead-handler.php` soluciona esto:
1. El webhook vive **solo en el servidor** (PHP), nunca llega al navegador del cliente.
2. Aplica **rate limiting** (máx. 4 solicitudes cada 10 minutos por IP).
3. Vuelve a **validar y limpiar** todos los campos del lado del servidor
   (nunca confíes solo en la validación del navegador).
4. Filtra CORS: solo acepta peticiones desde tu dominio (`ALLOWED_ORIGIN`).

## Cómo activarlo
1. Necesitas hosting con **PHP 7.4+** (la mayoría de hostings de cPanel lo traen).
2. Sube la carpeta `api/` completa (incluye `.htaccess` de protección).
3. Abre `api/lead-handler.php` y confirma:
   - `DISCORD_WEBHOOK_URL` (ya está puesto).
   - `ALLOWED_ORIGIN` → cámbialo si tu dominio final es distinto a `kernelshield.xyz`.
4. Listo — `app.js` ya intenta usar este endpoint primero de forma automática.
   Si el hosting no tiene PHP (por ejemplo, GitHub Pages o Netlify estático),
   el aviso de Discord simplemente no se envía (el webhook YA NO está expuesto
   en el navegador bajo ningún escenario), pero el correo de respaldo sigue
   llegando por Web3Forms/FormSubmit sin que tengas que cambiar nada.

## Recomendaciones adicionales (fuera del código, a nivel de hosting)
- Activa **HTTPS forzado** (redirección http→https) en tu hosting/DNS.
- Si te preocupan ataques DDoS/bots más agresivos, pon el dominio detrás de
  **Cloudflare** (plan gratuito ya incluye protección básica anti-DDoS y WAF).
- En `web3forms.com`, activa "Allowed Domains" con `kernelshield.xyz` para que
  esa clave no funcione si alguien la copia y la usa desde otro sitio.
- Cambia el webhook de Discord periódicamente si notas spam (Configuración del
  canal → Integraciones → Webhooks → Regenerar token).
- Si más adelante manejas pagos o datos de tarjetas, **no los proceses tú
  mismo**: usa una pasarela certificada PCI-DSS (Stripe, PayPal, etc.) — nunca
  guardes números de tarjeta en tu propio servidor.

# Desplegar el backend de cotizaciones en tu Pterodactyl (Node.js 20)

## 1. Crea el servidor
En tu panel Pterodactyl: **Crear servidor** → selecciona el egg **"Node.js Generic"**
(o el que uses para tus apps Node) → asígnale RAM/CPU mínimos (esto es liviano,
con 256–512 MB sobra) → asigna un **puerto** (por ejemplo `3000`) y una IP/subdominio.

## 2. Sube los archivos
Sube todo el contenido de esta carpeta `server/` (o arrástralos por el
Administrador de Archivos del panel):
- `server.js`
- `package.json`

## 3. Variables de entorno (Startup → Variables, si tu egg las soporta)
Configura estas variables en el panel en vez de dejarlas quemadas en el código:
- `DISCORD_WEBHOOK_URL` → tu webhook de Discord
- `ALLOWED_ORIGINS` → `https://kernelshield.xyz,https://www.kernelshield.xyz`
  (agrega también tu dominio de GitHub Pages si lo usas mientras tanto, ej.
  `https://tuusuario.github.io`)
- `PORT` → el mismo puerto que asignaste en el paso 1

Si tu egg no permite variables de entorno fácilmente, edita directamente los
valores por defecto dentro de `server.js` (líneas marcadas con `process.env`).

## 4. Instala dependencias y arranca
En la consola del servidor (Pterodactyl trae terminal integrada):
```
npm install
npm start
```
Startup command del egg debería quedar como: `node server.js`

## 5. Dominio público
Para que `kernelshield.xyz` (GitHub Pages) pueda llamar a este servidor,
necesitas que sea accesible por HTTPS desde internet. Dos formas comunes:
- Si tu Pterodactyl ya tiene una IP/puerto público, apunta un subdominio
  (ej. `api.kernelshield.xyz`) a esa IP con un registro **A**, y pon el
  servidor detrás de **Cloudflare** (proxy naranja activado) para que te dé
  HTTPS gratis automáticamente.
- O usa un reverse proxy (Nginx/Caddy) en la misma máquina si tienes acceso
  a nivel de host, apuntando `api.kernelshield.xyz` → `localhost:3000`.

## 6. Conecta el frontend
En `app.js`, donde dice:
```js
const resPhp = await fetch('/api/lead-handler.php', { ... });
```
Reemplázalo por tu URL real, por ejemplo:
```js
const resPhp = await fetch('https://api.kernelshield.xyz/lead-handler', { ... });
```
(Te dejo esto ya cambiado en el `app.js` de este paquete — solo confirma
que la URL coincide con tu subdominio real antes de subir a GitHub.)

## 7. Prueba
Abre `https://api.kernelshield.xyz/health` en el navegador — debe responder
`{"ok":true}`. Si eso funciona, envía una cotización de prueba desde la web
y revisa tu canal de Discord.

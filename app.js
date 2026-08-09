(() => {
  'use strict';
  document.getElementById('year').textContent = new Date().getFullYear();

  // Boot screen
  const bootLines = ['inicializando kernelshield…', 'verificando nodo · miami, fl', 'protección ddos: en línea', 'listo.'];
  const bootEl = document.getElementById('bootText');
  let bi = 0;
  const bootInterval = setInterval(() => {
    bi++;
    if (bi < bootLines.length) bootEl.textContent = bootLines[bi];
  }, 380);
  window.addEventListener('load', () => {
    setTimeout(() => {
      clearInterval(bootInterval);
      document.getElementById('boot').classList.add('hide');
    }, 1500);
  });
  setTimeout(() => { document.getElementById('boot').classList.add('hide'); }, 3500);

  // Terminal typing
  const termBody = document.getElementById('termBody');
  const script = [
    { t: '$ status --check', cls: 'p' },
    { t: 'nodo ..... miami, fl', cls: 'ok' },
    { t: 'cpu ...... amd ryzen 5 5600x', cls: 'v' },
    { t: 'red ...... 1 gbit/s dedicado', cls: 'v' },
    { t: 'ddos ..... 10 tbps activo', cls: 'ok' },
    { t: 'uptime ... 99.9%', cls: 'ok' },
    { t: '$ deploy --game=minecraft', cls: 'p' },
    { t: 'servidor desplegado en 27s', cls: 'ok' }
  ];
  let li = 0;
  function typeLine() {
    if (li >= script.length) {
      const cur = document.createElement('div');
      cur.innerHTML = '<span class="p">$ </span><span class="cursor"></span>';
      termBody.appendChild(cur);
      return;
    }
    const row = document.createElement('div');
    row.className = script[li].cls;
    termBody.appendChild(row);
    const text = script[li].t;
    let ci = 0;
    const typer = setInterval(() => {
      row.textContent = text.slice(0, ci + 1);
      ci++;
      if (ci >= text.length) {
        clearInterval(typer);
        li++;
        setTimeout(typeLine, 220);
      }
    }, 18);
  }
  setTimeout(typeLine, 1700);

  // Mobile menu
  document.querySelector('.burger')?.addEventListener('click', () => {
    const links = document.querySelector('.nav-links');
    const visible = links.style.display === 'flex';
    links.style.display = visible ? 'none' : 'flex';
    if (!visible) {
      links.style.cssText +=
        'position:absolute;top:74px;left:0;right:0;background:#0d0f15;flex-direction:column;padding:20px 32px;border-bottom:1px solid #22262f;z-index:100;';
    }
  });

  // VPS tabs
  function openVpsPanel(name) {
    document.querySelectorAll('.vps-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.panel === name);
    });
    document.querySelectorAll('.vps-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.add('active');
  }

  document.querySelectorAll('.vps-tab').forEach(tab => {
    tab.addEventListener('click', () => openVpsPanel(tab.dataset.panel));
  });

  // "Configurar ahora" / links a #configurador → abrir tab custom + scroll
  function goToConfigurator(e) {
    if (e) e.preventDefault();
    openVpsPanel('custom');
    // esperar un frame para que el panel sea visible antes del scroll
    requestAnimationFrame(() => {
      const el = document.getElementById('configurador') || document.getElementById('vps');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    history.replaceState(null, '', '#configurador');
  }

  document.querySelectorAll('a[href="#configurador"]').forEach(a => {
    a.addEventListener('click', goToConfigurator);
  });

  // Si entra directo con #configurador en la URL
  if (location.hash === '#configurador') {
    setTimeout(goToConfigurator, 400);
  }

  // Configurator pricing
  const PRICE = { base: 2, cpu: 1.8, ram: 0.65, storage: 0.04 };
  let currentType = 'ryzen';
  const cpuRange = document.getElementById('cpuRange');
  const ramRange = document.getElementById('ramRange');
  const storageRange = document.getElementById('storageRange');
  const fmt = n => '$' + n.toFixed(2);

  function updatePrice() {
    if (!cpuRange) return;
    const cpu = +cpuRange.value;
    const ram = +ramRange.value;
    const storage = +storageRange.value;
    const cpuC = cpu * PRICE.cpu;
    const ramC = ram * PRICE.ram;
    const storageC = storage * PRICE.storage;
    const total = PRICE.base + cpuC + ramC + storageC;
    document.getElementById('cpuValue').textContent = cpu;
    document.getElementById('ramValue').textContent = ram;
    document.getElementById('storageValue').textContent = storage;
    document.getElementById('cpuCost').textContent = fmt(cpuC);
    document.getElementById('ramCost').textContent = fmt(ramC);
    document.getElementById('storageCost').textContent = fmt(storageC);
    document.getElementById('sumCpu').textContent = cpu;
    document.getElementById('sumRam').textContent = ram;
    document.getElementById('sumStorage').textContent = storage;
    document.getElementById('sumCpuCost').textContent = fmt(cpuC);
    document.getElementById('sumRamCost').textContent = fmt(ramC);
    document.getElementById('sumStorageCost').textContent = fmt(storageC);
    document.getElementById('totalPrice').textContent = fmt(total);
  }
  if (cpuRange) {
    [cpuRange, ramRange, storageRange].forEach(el => el.addEventListener('input', updatePrice));
    updatePrice();
  }
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type || 'ryzen';
    });
  });

  function getConfig() {
    const cpu = cpuRange ? +cpuRange.value : 2;
    const ram = ramRange ? +ramRange.value : 4;
    const storage = storageRange ? +storageRange.value : 40;
    const total = PRICE.base + cpu * PRICE.cpu + ram * PRICE.ram + storage * PRICE.storage;
    return { cpu, ram, storage, type: currentType, total: Math.round(total * 100) / 100 };
  }
  function sanitize(s) {
    return String(s || '')
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 500);
  }
  function buildConfigText() {
    const c = getConfig();
    const typeLabel = c.type === 'intel' ? 'Intel Xeon' : 'Ryzen 5 5600X';
    return [
      '—— Configuración ——',
      'Procesador: ' + typeLabel,
      'vCPU: ' + c.cpu,
      'RAM: ' + c.ram + ' GB',
      'Disco: ' + c.storage + ' GB NVMe',
      'Ubicación: Miami, FL',
      'Estimado: $' + c.total.toFixed(2) + '/mes',
      '————————'
    ].join('\n');
  }

  // Quote modal
  const modal = document.getElementById('quoteModal');
  const quoteForm = document.getElementById('quoteForm');
  const quoteSuccess = document.getElementById('quoteSuccess');

  function openModal() {
    const c = getConfig();
    const typeLabel = c.type === 'intel' ? 'Intel Xeon' : 'Ryzen 5 5600X';
    document.getElementById('configPreview').innerHTML =
      '<strong>' + typeLabel + '</strong> · ' + c.cpu + ' vCPU · ' + c.ram + ' GB · ' + c.storage +
      ' GB NVMe<br>Miami, FL · Est. <strong>$' + c.total.toFixed(2) + '/mes</strong>';
    quoteForm.hidden = false;
    quoteSuccess.hidden = true;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.hidden = true;
      document.body.style.overflow = '';
    }, 250);
  }
  document.getElementById('openQuoteBtn')?.addEventListener('click', openModal);
  document.getElementById('closeQuoteBtn')?.addEventListener('click', closeModal);
  document.getElementById('closeSuccessBtn')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal();
  });

  document.getElementById('copyConfigBtn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildConfigText());
      document.getElementById('copyConfigBtn').textContent = '¡Copiado!';
      setTimeout(() => {
        document.getElementById('copyConfigBtn').textContent = 'Copiar config';
      }, 2000);
    } catch (_) {}
  });

  // ====== ENVÍO DE COTIZACIÓN → k3rnelshield@gmail.com ======
  // Funciona para CUALQUIER cliente desde CUALQUIER país
  quoteForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (document.getElementById('hpWebsite')?.value) return;

    const name = sanitize(document.getElementById('qName').value);
    const email = sanitize(document.getElementById('qEmail').value);
    const discord = sanitize(document.getElementById('qDiscord').value);
    const whatsapp = sanitize(document.getElementById('qWhatsapp').value);
    const message = sanitize(document.getElementById('qMessage').value);

    if (!name || name.length < 2) {
      document.getElementById('qName').focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('qEmail').focus();
      return;
    }

    const btn = document.getElementById('submitQuoteBtn');
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    const c = getConfig();
    const typeLabel = c.type === 'intel' ? 'Intel Xeon' : 'Ryzen 5 5600X';

    const formBody = {
      _subject: 'Cotización VPS a medida – ' + name,
      _template: 'table',
      _captcha: 'false',
      name: name,
      email: email,
      replyto: email,
      discord: discord || 'No indicado',
      whatsapp: whatsapp || 'No indicado',
      procesador: typeLabel,
      vcpu: c.cpu + ' cores',
      ram: c.ram + ' GB',
      almacenamiento: c.storage + ' GB NVMe',
      ubicacion: 'Miami, FL',
      precio_estimado: '$' + c.total.toFixed(2) + '/mes',
      mensaje: message || 'Sin mensaje extra',
      origen: 'kernelshield.xyz – configurador VPS'
    };

    let sent = false;

    // 1) Web3Forms (key correcta) → llega a tu Gmail
    const WEB3FORMS_KEY = 'dee72bfa-1550-49b0-84cd-4ee8c9e4efa2';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: formBody._subject,
          from_name: 'KernelShield',
          name: name,
          email: email,
          replyto: email,
          discord: formBody.discord,
          whatsapp: formBody.whatsapp,
          procesador: formBody.procesador,
          vcpu: formBody.vcpu,
          ram: formBody.ram,
          almacenamiento: formBody.almacenamiento,
          ubicacion: formBody.ubicacion,
          precio_estimado: formBody.precio_estimado,
          mensaje: formBody.mensaje,
          origen: formBody.origen
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.success) {
        sent = true;
      } else {
        /* silent */
      }
    } catch (err) {
      /* silent */
    }

    // 2) FormSubmit backup → también a k3rnelshield@gmail.com
    if (!sent) {
      try {
        const res2 = await fetch('https://formsubmit.co/ajax/k3rnelshield@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(formBody)
        });
        const data2 = await res2.json().catch(() => ({}));
        if (res2.ok || data2.success === true || data2.success === 'true') {
          sent = true;
        } else {
          /* silent */
        }
      } catch (err) {
        /* silent */
      }
    }

    // 3) Último recurso: mailto del cliente
    if (!sent) {
      const body =
        'Nueva cotización VPS a medida\n\n' +
        'Nombre: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'Discord: ' + (discord || '—') + '\n' +
        'WhatsApp: ' + (whatsapp || '—') + '\n\n' +
        buildConfigText() + '\n' +
        (message ? '\nMensaje:\n' + message + '\n' : '') +
        '\n— kernelshield.xyz';
      window.location.href =
        'mailto:k3rnelshield@gmail.com?subject=' +
        encodeURIComponent('Cotización VPS – ' + name) +
        '&body=' +
        encodeURIComponent(body);
    }

    quoteForm.hidden = true;
    quoteSuccess.hidden = false;
    btn.disabled = false;
    btn.textContent = orig;
  });
})();

/* =====================================================
   KERNEL SHIELD — script.js
   Interactivity: tabs, reveal, particles, nav, domain
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- NAVBAR SCROLL ---- */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  /* ---- MOBILE MENU ---- */
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  /* ---- TABS ---- */
  const tabs       = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');
      // Re-trigger reveal for newly shown cards
      triggerReveal();
    });
  });

  /* ---- SCROLL REVEAL ---- */
  const revealEls = document.querySelectorAll('.reveal');
  const observer  = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Staggered delay for plan cards
        const delay = entry.target.closest('.plans-grid')
          ? Array.from(entry.target.closest('.plans-grid').children).indexOf(entry.target) * 80
          : 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  function triggerReveal() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
  }
  triggerReveal();

  /* ---- HERO PARTICLES ---- */
  const container = document.getElementById('heroParticles');
  if (container) {
    const count = 28;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 4 + 1.5;
      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${40 + Math.random() * 55}%;
        --dur: ${6 + Math.random() * 10}s;
        --delay: ${Math.random() * 8}s;
        --op: ${0.15 + Math.random() * 0.35};
        background: ${Math.random() > 0.7 ? '#0aff70' : '#00e5ff'};
      `;
      container.appendChild(p);
    }
  }

  /* ---- BACK TO TOP ---- */
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- DOMAIN SEARCH (simulado) ---- */
  const domainBtn    = document.getElementById('domainBtn');
  const domainInput  = document.getElementById('domainInput');
  const domainResult = document.getElementById('domainResult');

  const domainPrices = { xyz: '$5.00', com: '$15.00', net: '$18.00' };

  function checkDomain() {
    const val = domainInput.value.trim().toLowerCase();
    if (!val) { showResult('⚠️ Ingresa un dominio', '#ffc107'); return; }

    const ext = val.includes('.') ? val.split('.').pop() : '';
    const price = domainPrices[ext];

    domainResult.style.color = '';
    if (!ext) {
      showResult('⚠️ Incluye la extensión, ej: misitio.com', '#ffc107');
    } else if (price) {
      showResult(`✅ ${val} — ${price}/año — ¡Disponible!`, '#0aff70');
    } else {
      showResult(`ℹ️ Extensión .${ext} no listada. Consulta vía Discord.`, '#00e5ff');
    }
  }

  function showResult(msg, color) {
    domainResult.textContent = msg;
    domainResult.style.color = color;
    domainResult.style.padding = '8px 0';
  }

  domainBtn.addEventListener('click', checkDomain);
  domainInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkDomain(); });

  /* ---- SMOOTH SCROLL FOR ANCHOR LINKS ---- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        const offset = 72; // navbar height
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ---- ACTIVE NAV LINK ON SCROLL ---- */
  const sections = document.querySelectorAll('section[id], div[id]');
  const navAnchors = document.querySelectorAll('.nav-link');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => {
          a.classList.toggle('active-link', a.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));

});

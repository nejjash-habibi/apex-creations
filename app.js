/* ═══════════════════════════════════════════════════════════════
   APEX CREATIONS — MASTER FRONTEND SCRIPT
   Handles: Intro animation, particle canvas, admin easter egg,
   welcome sequence, admin dashboard CRUD, public portfolio,
   project form, lightbox, toasts
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── Configuration ──────────────────────────────────────────────────────────
const API = {
  base: '/api',
  auth: '/api/auth',
  posts: '/api/posts',
  projects: '/api/projects',
};

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  adminToken: null,
  triggerCount: 0,
  triggerTimer: null,
  allPosts: [],
  allProjects: [],
  currentPostFilter: 'all',
  currentProjectFilter: 'all',
  lightboxOrigin: null,
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
};

const categoryLabel = (cat) => ({
  web_development: 'Web Development',
  logo_creation: 'Logo Creation',
  fashion_design: 'Fashion Design',
  book_cover_design: 'Book Cover Design',
  announcement: 'Announcement',
}[cat] || cat);

const categoryIcon = (cat) => ({
  web_development: '⬡',
  logo_creation: '◈',
  fashion_design: '✦',
  book_cover_design: '▣',
  announcement: '📢',
}[cat] || '◈');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Toast ───────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const icons = { success: '✓', error: '✕', info: '◈' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${escapeHtml(msg)}</span>`;
  $('#toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 350);
  }, duration);
}

// ─── API Fetch Wrapper ───────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.adminToken && !options._noAuth) {
    headers['Authorization'] = `Bearer ${state.adminToken}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = data?.error || data?.errors?.[0] || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════
// INTRO ANIMATION
// ═══════════════════════════════════════════════════════════════
function runIntroAnimation() {
  const overlay = $('#intro-overlay');
  const canvas = $('#intro-canvas');
  const ctx = canvas.getContext('2d');
  const progressFill = $('#intro-progress-fill');
  const tagline = $('#intro-tagline');

  // Resize canvas
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // Matrix rain particles
  const cols = [];
  const colCount = Math.floor(window.innerWidth / 20);
  for (let i = 0; i < colCount; i++) {
    cols.push({ x: i * 20, y: Math.random() * -500, speed: 1 + Math.random() * 3, opacity: Math.random() });
  }

  // Floating orbs
  const orbs = Array.from({ length: 12 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: 1 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    hue: Math.random() > 0.5 ? 45 : 200,
  }));

  let frame = 0;
  let progress = 0;
  let animId;

  const chars = 'APEX CREATIONS 0110 ✦ ◈ ⬡ ▣ ELITE DIGITAL STUDIO';

  const draw = () => {
    animId = requestAnimationFrame(draw);
    frame++;

    ctx.fillStyle = 'rgba(10,10,15,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Matrix rain
    cols.forEach(col => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const alpha = 0.06 + Math.random() * 0.2;
      ctx.fillStyle = `rgba(184,134,11,${alpha})`;
      ctx.font = '13px "Space Mono", monospace';
      ctx.fillText(char, col.x, col.y);
      col.y += col.speed;
      if (col.y > canvas.height + 20) {
        col.y = -20;
        col.speed = 1 + Math.random() * 3;
      }
    });

    // Floating orbs with glow
    orbs.forEach(orb => {
      orb.x += orb.vx;
      orb.y += orb.vy;
      if (orb.x < 0 || orb.x > canvas.width) orb.vx *= -1;
      if (orb.y < 0 || orb.y > canvas.height) orb.vy *= -1;
      const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r * 20);
      grad.addColorStop(0, `hsla(${orb.hue},80%,60%,0.7)`);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r * 20, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // SVG path animation progress
    progress = Math.min(progress + 0.6, 100);
    progressFill.style.width = progress + '%';

    if (frame === 30) {
      // Animate SVG path stroke
      const path = document.getElementById('apex-path');
      path.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
      path.style.strokeDashoffset = '0';
    }
    if (frame === 60) {
      const introText = document.getElementById('intro-text');
      introText.style.transition = 'opacity 0.8s ease';
      introText.style.opacity = '1';
    }
    if (frame === 90) {
      const introSub = document.getElementById('intro-sub');
      introSub.style.transition = 'opacity 0.8s ease';
      introSub.style.opacity = '1';
      tagline.classList.add('visible');
    }

    if (frame >= 150) {
      cancelAnimationFrame(animId);
      finishIntro();
    }
  };

  draw();
}

function finishIntro() {
  const overlay = $('#intro-overlay');
  overlay.classList.add('fade-out');
  setTimeout(() => {
    overlay.remove();
    showMainSite();
  }, 800);
}

// ═══════════════════════════════════════════════════════════════
// MAIN SITE REVEAL
// ═══════════════════════════════════════════════════════════════
function showMainSite() {
  const mainSite = $('#main-site');
  mainSite.classList.remove('hidden');
  startParticleBackground();
  initScrollReveal();
  initNav();
  loadPublicPosts();
  initProjectForm();
  initPortfolioFilter();
  initMobileMenu();
}

// ═══════════════════════════════════════════════════════════════
// PARTICLE BACKGROUND CANVAS
// ═══════════════════════════════════════════════════════════════
function startParticleBackground() {
  const canvas = $('#bg-canvas');
  const ctx = canvas.getContext('2d');

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', () => { resize(); initParticles(); });

  let particles = [];
  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function initParticles() {
    const count = Math.floor((canvas.width * canvas.height) / 14000);
    particles = Array.from({ length: count }, () => createParticle());
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.5 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      hue: Math.random() > 0.7 ? 45 + Math.random() * 15 : 200 + Math.random() * 40,
      brightness: 40 + Math.random() * 40,
      alpha: 0.2 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  initParticles();

  const draw = () => {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.pulse += 0.015;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      const pulsedAlpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
      const pulsedR = p.r * (0.8 + 0.2 * Math.sin(p.pulse * 0.7));

      // Mouse proximity glow
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const extra = dist < 120 ? (1 - dist / 120) * 0.6 : 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, pulsedR + extra * 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},70%,${p.brightness}%,${pulsedAlpha + extra})`;
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const ddx = p.x - p2.x;
        const ddy = p.y - p2.y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < 90) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(184,134,11,${0.07 * (1 - d / 90)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });
  };

  draw();
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function initNav() {
  const nav = $('#main-nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });
  // Smooth scroll for anchor links
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        $('#nav-mobile-menu').classList.add('hidden');
      }
    });
  });
}

function initMobileMenu() {
  const btn = $('#nav-hamburger');
  const menu = $('#nav-mobile-menu');
  btn.addEventListener('click', () => menu.classList.toggle('hidden'));
  $$('.mobile-link').forEach(l => l.addEventListener('click', () => menu.classList.add('hidden')));
}

// ═══════════════════════════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════════════════════════
function initScrollReveal() {
  const targets = $$('.service-card, .learn-card, .contact-card, .section-title, .section-eyebrow, .section-desc');
  targets.forEach(el => el.classList.add('reveal'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO FILTER (Public)
// ═══════════════════════════════════════════════════════════════
function initPortfolioFilter() {
  $$('.port-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.port-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      renderPublicPosts(cat === 'all' ? state.allPosts : state.allPosts.filter(p => p.category === cat));
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC POSTS LOADING
// ═══════════════════════════════════════════════════════════════
async function loadPublicPosts() {
  const grid = $('#portfolio-grid');
  const empty = $('#portfolio-empty');
  grid.innerHTML = '<div class="loading-state">Loading portfolio...</div>';
  try {
    const data = await apiFetch(`${API.posts}?limit=100`, { _noAuth: true });
    state.allPosts = data.posts || [];
    if (state.allPosts.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      renderPublicPosts(state.allPosts);
    }
  } catch (err) {
    grid.innerHTML = `<div class="loading-state">Could not load portfolio. Please try again later.</div>`;
  }
}

function renderPublicPosts(posts) {
  const grid = $('#portfolio-grid');
  const empty = $('#portfolio-empty');
  if (!posts || posts.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = posts.map((p, idx) => buildPortfolioCard(p, idx)).join('');

  // Bind lightbox triggers
  $$('.portfolio-card[data-has-img="true"]').forEach(card => {
    card.addEventListener('click', () => {
      const src = card.dataset.imgSrc;
      const caption = card.dataset.caption;
      openLightbox(src, caption, card);
    });
  });
}

function buildPortfolioCard(post, idx) {
  const isAnnouncement = post.category === 'announcement';
  const hasImg = !!post.image_path;
  const imgSrc = hasImg ? post.image_path : null;

  const tags = post.tags
    ? post.tags.split(',').slice(0, 4).map(t =>
        `<span class="admin-post-tag">#${escapeHtml(t.trim())}</span>`).join('')
    : '';

  return `
    <div class="portfolio-card reveal ${isAnnouncement ? 'is-announcement' : ''}"
         data-has-img="${hasImg}"
         data-img-src="${escapeHtml(imgSrc || '')}"
         data-caption="${escapeHtml(post.title)}"
         style="animation-delay:${idx * 0.06}s">
      <div class="portfolio-card-img-wrap">
        ${hasImg
          ? `<img class="portfolio-card-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(post.title)}" loading="lazy" />
             <div class="portfolio-card-zoom-hint">🔍</div>`
          : `<div class="portfolio-card-no-img">${categoryIcon(post.category)}</div>`
        }
      </div>
      <div class="portfolio-card-body">
        <div class="portfolio-card-cat">${categoryLabel(post.category)}</div>
        <div class="portfolio-card-title">${escapeHtml(post.title)}</div>
        <div class="portfolio-card-desc">${escapeHtml(post.description)}</div>
        ${tags ? `<div class="admin-post-tags" style="margin-top:10px">${tags}</div>` : ''}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════════════
function openLightbox(src, caption, originEl) {
  if (!src) return;
  state.lightboxOrigin = originEl;
  const lb = $('#lightbox');
  const img = $('#lightbox-img');
  const cap = $('#lightbox-caption');
  img.src = src;
  img.alt = caption || '';
  cap.textContent = caption || '';
  lb.classList.remove('hidden');
  lb.classList.add('opening');
  setTimeout(() => lb.classList.remove('opening'), 400);
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = $('#lightbox');
  lb.classList.add('closing');
  setTimeout(() => {
    lb.classList.remove('closing');
    lb.classList.add('hidden');
    $('#lightbox-img').src = '';
    document.body.style.overflow = '';
  }, 350);
}

$('#lightbox-bg').addEventListener('click', closeLightbox);
$('#lightbox-close').addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ═══════════════════════════════════════════════════════════════
// PROJECT REGISTRATION FORM
// ═══════════════════════════════════════════════════════════════
function initProjectForm() {
  const form = $('#project-form');
  const concept = $('#pf-concept');
  const conceptCount = $('#concept-count');
  const errorDiv = $('#project-form-error');
  const successDiv = $('#project-form-success');
  const submitBtn = $('#project-submit-btn');
  const submitLabel = $('#submit-label');
  const submitLoading = $('#submit-loading');

  concept.addEventListener('input', () => {
    conceptCount.textContent = `${concept.value.length} / 5000`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    // Client-side validation
    const projectName = $('#pf-project-name').value.trim();
    const budget = $('#pf-budget').value.trim();
    const projectType = $('#pf-project-type').value;
    const conceptVal = $('#pf-concept').value.trim();

    if (!projectName) { showFormError(errorDiv, 'Project name is required.'); return; }
    if (!budget) { showFormError(errorDiv, 'Budget is required.'); return; }
    if (!projectType) { showFormError(errorDiv, 'Please select a project type.'); return; }
    if (!conceptVal || conceptVal.length < 10) { showFormError(errorDiv, 'Please describe your concept (at least 10 characters).'); return; }

    submitLabel.classList.add('hidden');
    submitLoading.classList.remove('hidden');
    submitBtn.disabled = true;

    const payload = {
      project_name: projectName,
      budget,
      project_type: projectType,
      contact_phone: $('#pf-phone').value.trim() || undefined,
      contact_email: $('#pf-email').value.trim() || undefined,
      address: $('#pf-address').value.trim() || undefined,
      business_name: $('#pf-business-name').value.trim() || undefined,
      custom_concept: conceptVal,
      additional_description: $('#pf-description').value.trim() || undefined,
    };

    try {
      const data = await apiFetch(API.projects, {
        method: 'POST',
        body: JSON.stringify(payload),
        _noAuth: true,
      });
      successDiv.textContent = '🎉 ' + data.message;
      successDiv.classList.remove('hidden');
      form.reset();
      conceptCount.textContent = '0 / 5000';
      toast('Project submitted successfully!', 'success');
    } catch (err) {
      showFormError(errorDiv, err.message);
      toast(err.message, 'error');
    } finally {
      submitLabel.classList.remove('hidden');
      submitLoading.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });
}

function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ═══════════════════════════════════════════════════════════════
// ADMIN EASTER EGG TRIGGER
// ═══════════════════════════════════════════════════════════════
function initAdminTrigger() {
  const zone = $('#admin-trigger-zone');
  zone.addEventListener('click', handleAdminTrigger);
  zone.addEventListener('touchend', e => { e.preventDefault(); handleAdminTrigger(); });
}

function handleAdminTrigger() {
  state.triggerCount++;
  clearTimeout(state.triggerTimer);
  state.triggerTimer = setTimeout(() => { state.triggerCount = 0; }, 5000);
  if (state.triggerCount >= 10) {
    state.triggerCount = 0;
    clearTimeout(state.triggerTimer);
    showAdminLogin();
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════════════════
function showAdminLogin() {
  const overlay = $('#admin-login-overlay');
  overlay.classList.remove('hidden');
  setTimeout(() => $('#admin-username').focus(), 300);
}

$('#close-admin-login').addEventListener('click', () => {
  $('#admin-login-overlay').classList.add('hidden');
  $('#admin-username').value = '';
  $('#admin-password').value = '';
  $('#admin-login-error').classList.add('hidden');
});

$('#admin-login-btn').addEventListener('click', attemptAdminLogin);
$('#admin-password').addEventListener('keydown', e => { if (e.key === 'Enter') attemptAdminLogin(); });
$('#admin-username').addEventListener('keydown', e => { if (e.key === 'Enter') $('#admin-password').focus(); });

async function attemptAdminLogin() {
  const btn = $('#admin-login-btn');
  const errorDiv = $('#admin-login-error');
  const username = $('#admin-username').value.trim();
  const password = $('#admin-password').value;

  if (!username || !password) {
    errorDiv.textContent = 'Enter both username and password.';
    errorDiv.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>Authenticating...</span>';
  errorDiv.classList.add('hidden');

  try {
    const data = await apiFetch(`${API.auth}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      _noAuth: true,
    });
    state.adminToken = data.token;
    $('#admin-login-overlay').classList.add('hidden');
    runWelcomeSequence();
  } catch (err) {
    errorDiv.textContent = err.message || 'Invalid credentials.';
    errorDiv.classList.remove('hidden');
    $('#admin-password').value = '';
    $('#admin-password').focus();
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>AUTHENTICATE</span>';
  }
}

// ═══════════════════════════════════════════════════════════════
// WELCOME SEQUENCE — Lord Nejju
// ═══════════════════════════════════════════════════════════════
async function runWelcomeSequence() {
  const overlay = $('#welcome-overlay');
  const textEl = $('#welcome-text');
  const subEl = $('#welcome-sub-text');
  const enterBtn = $('#welcome-enter-btn');

  overlay.classList.remove('hidden');

  // Start welcome canvas
  const canvas = $('#welcome-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: canvas.height + Math.random() * 200,
    vx: (Math.random() - 0.5) * 2,
    vy: -(1 + Math.random() * 3),
    r: 1 + Math.random() * 3,
    hue: 40 + Math.random() * 20,
    alpha: 0.6 + Math.random() * 0.4,
    life: 1,
  }));

  let animRunning = true;
  const animate = () => {
    if (!animRunning) return;
    requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(10,10,15,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.004;
      if (p.y < -10 || p.life <= 0) {
        p.x = Math.random() * canvas.width;
        p.y = canvas.height + 10;
        p.life = 1;
      }
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grad.addColorStop(0, `hsla(${p.hue},90%,70%,${p.alpha * p.life})`);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  };
  animate();

  // Typewriter effect
  await sleep(400);
  await typeText(textEl, 'IDENTITY CONFIRMED', 40);
  await sleep(500);
  textEl.style.transition = 'opacity 0.5s ease';
  textEl.style.opacity = '0';
  await sleep(600);
  textEl.style.opacity = '1';
  await typeText(textEl, 'Welcome, Lord Nejju', 65);
  await sleep(300);
  await typeText(subEl, '[ ACCESS LEVEL: SUPREME · ALL SYSTEMS UNLOCKED ]', 28);
  await sleep(800);
  enterBtn.classList.remove('hidden');
  enterBtn.style.animation = 'fadeInUp 0.5s ease forwards';
}

async function typeText(el, text, speed = 50) {
  el.textContent = '';
  for (const char of text) {
    el.textContent += char;
    await sleep(speed);
  }
}

$('#enter-dashboard-btn').addEventListener('click', () => {
  const overlay = $('#welcome-overlay');
  overlay.style.transition = 'opacity 0.6s ease';
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.style.opacity = '';
    showAdminDashboard();
  }, 600);
});

// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
function showAdminDashboard() {
  // Hide main site, show dashboard
  $('#main-site').classList.add('hidden');
  const dash = $('#admin-dashboard');
  dash.classList.remove('hidden');
  loadAdminPosts();
  loadAdminProjects();
  initDashboardNav();
  initPostForm();
  initDashboardFilters();
}

function initDashboardNav() {
  $$('.dash-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.dash-nav-btn').forEach(b => b.classList.remove('active'));
      $$('.dash-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#panel-${btn.dataset.panel}`).classList.add('active');
    });
  });
}

$('#admin-logout-btn').addEventListener('click', async () => {
  try {
    await apiFetch(`${API.auth}/logout`, { method: 'POST' });
  } catch {}
  state.adminToken = null;
  $('#admin-dashboard').classList.add('hidden');
  $('#main-site').classList.remove('hidden');
  toast('Logged out successfully.', 'info');
});

// ─── Post Form ───────────────────────────────────────────────────────────────
function initPostForm() {
  const newPostBtn = $('#new-post-btn');
  const cancelBtn = $('#cancel-post-btn');
  const formContainer = $('#post-form-container');
  const submitBtn = $('#submit-post-btn');
  const fileInput = $('#post-image');
  const dropZone = $('#file-drop-zone');
  const previewContainer = $('#file-preview-container');
  const previewImg = $('#file-preview-img');
  const removeBtn = $('#file-remove-btn');
  const postFormError = $('#post-form-error');

  newPostBtn.addEventListener('click', () => {
    formContainer.classList.toggle('hidden');
    if (!formContainer.classList.contains('hidden')) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  });

  cancelBtn.addEventListener('click', () => {
    formContainer.classList.add('hidden');
    resetPostForm();
  });

  // File preview
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) showFilePreview(file, previewImg, previewContainer, dropZone);
  });

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      showFilePreview(file, previewImg, previewContainer, dropZone);
    }
  });

  removeBtn.addEventListener('click', () => {
    fileInput.value = '';
    previewContainer.classList.add('hidden');
    $('#file-drop-label').style.display = 'flex';
  });

  submitBtn.addEventListener('click', submitNewPost);
}

function showFilePreview(file, previewImg, previewContainer, dropZone) {
  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  if (!allowed.includes(file.type)) { toast('Invalid file type. Use JPEG, PNG, WebP, or GIF.', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('File too large. Max 5MB.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    previewContainer.classList.remove('hidden');
    $('#file-drop-label').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function submitNewPost() {
  const btn = $('#submit-post-btn');
  const errorDiv = $('#post-form-error');
  const category = $('#post-category').value;
  const title = $('#post-title').value.trim();
  const description = $('#post-description').value.trim();
  const tags = $('#post-tags').value.trim();
  const fileInput = $('#post-image');

  errorDiv.classList.add('hidden');
  if (!title || title.length < 2) { showFormError(errorDiv, 'Title is required (min 2 characters).'); return; }
  if (!description || description.length < 5) { showFormError(errorDiv, 'Description is required (min 5 characters).'); return; }

  btn.disabled = true;
  btn.textContent = 'Publishing...';

  try {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('title', title);
    formData.append('description', description);
    if (tags) formData.append('tags', tags);
    if (fileInput.files[0]) formData.append('image', fileInput.files[0]);

    const headers = { 'Authorization': `Bearer ${state.adminToken}` };
    const res = await fetch(API.posts, { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to publish post.');

    toast('Post published successfully!', 'success');
    resetPostForm();
    $('#post-form-container').classList.add('hidden');
    await loadAdminPosts();
    await loadPublicPosts();
  } catch (err) {
    showFormError(errorDiv, err.message);
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'PUBLISH POST';
  }
}

function resetPostForm() {
  $('#post-title').value = '';
  $('#post-description').value = '';
  $('#post-tags').value = '';
  $('#post-image').value = '';
  $('#post-category').selectedIndex = 0;
  $('#file-preview-container').classList.add('hidden');
  $('#file-drop-label').style.display = 'flex';
  $('#post-form-error').classList.add('hidden');
}

// ─── Dashboard Filters ────────────────────────────────────────────────────────
function initDashboardFilters() {
  $$('#panel-posts .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#panel-posts .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentPostFilter = btn.dataset.cat;
      renderAdminPosts();
    });
  });

  $$('#panel-projects .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#panel-projects .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentProjectFilter = btn.dataset.status;
      renderAdminProjects();
    });
  });
}

// ─── Load Admin Posts ─────────────────────────────────────────────────────────
async function loadAdminPosts() {
  const grid = $('#admin-posts-grid');
  grid.innerHTML = '<div class="loading-state">Loading posts...</div>';
  try {
    const data = await apiFetch(`${API.posts}?limit=200`);
    state.allPosts = data.posts || [];
    renderAdminPosts();
  } catch (err) {
    grid.innerHTML = `<div class="loading-state">Error: ${escapeHtml(err.message)}</div>`;
  }
}

function renderAdminPosts() {
  const grid = $('#admin-posts-grid');
  const filter = state.currentPostFilter;
  const posts = filter === 'all' ? state.allPosts : state.allPosts.filter(p => p.category === filter);

  if (posts.length === 0) {
    grid.innerHTML = '<div class="loading-state">No posts in this category yet.</div>';
    return;
  }

  grid.innerHTML = posts.map(p => `
    <div class="admin-post-card" id="post-card-${p.id}">
      ${p.image_path
        ? `<img class="admin-post-img" src="${escapeHtml(p.image_path)}" alt="${escapeHtml(p.title)}" loading="lazy" />`
        : `<div class="admin-post-no-img">${categoryIcon(p.category)}</div>`
      }
      <div class="admin-post-body">
        <span class="admin-post-category">${categoryLabel(p.category)}</span>
        <div class="admin-post-title">${escapeHtml(p.title)}</div>
        <div class="admin-post-desc">${escapeHtml(p.description)}</div>
        ${p.tags ? `<div class="admin-post-tags">${p.tags.split(',').map(t => `<span class="admin-post-tag">#${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
      </div>
      <div class="admin-post-footer">
        <span class="admin-post-date">${formatDate(p.created_at)}</span>
        <button class="btn-danger" onclick="deletePost('${p.id}')">Delete Post</button>
      </div>
    </div>
  `).join('');
}

window.deletePost = async (id) => {
  if (!confirm('Permanently delete this post and its image from server storage?')) return;
  try {
    await apiFetch(`${API.posts}/${id}`, { method: 'DELETE' });
    state.allPosts = state.allPosts.filter(p => p.id !== id);
    renderAdminPosts();
    // also update public view
    state.allPosts = state.allPosts.filter(p => p.id !== id);
    const grid = $('#portfolio-grid');
    if (grid) renderPublicPosts(state.allPosts);
    toast('Post deleted and storage cleared.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ─── Load Admin Projects ──────────────────────────────────────────────────────
async function loadAdminProjects() {
  const list = $('#projects-list');
  list.innerHTML = '<div class="loading-state">Loading requests...</div>';
  try {
    const data = await apiFetch(`${API.projects}?limit=200`);
    state.allProjects = data.projects || [];
    renderAdminProjects();
    updateProjectStats();
  } catch (err) {
    list.innerHTML = `<div class="loading-state">Error: ${escapeHtml(err.message)}</div>`;
  }
}

function updateProjectStats() {
  const pending = state.allProjects.filter(p => p.status === 'pending').length;
  const total = state.allProjects.length;
  $('#project-stats').textContent = `${total} total · ${pending} pending`;
}

function renderAdminProjects() {
  const list = $('#projects-list');
  const filter = state.currentProjectFilter;
  const projects = filter === 'all'
    ? state.allProjects
    : state.allProjects.filter(p => p.status === filter);

  if (projects.length === 0) {
    list.innerHTML = '<div class="loading-state">No project requests yet.</div>';
    return;
  }

  list.innerHTML = projects.map(p => `
    <div class="project-card" id="proj-card-${p.id}">
      <div class="project-card-header">
        <div class="project-card-title">${escapeHtml(p.project_name)}</div>
        <div class="project-card-badges">
          <span class="badge badge-type">${escapeHtml(p.project_type)}</span>
          <span class="badge ${p.status === 'pending' ? 'badge-pending' : 'badge-reviewed'}">${p.status}</span>
        </div>
      </div>
      <div class="project-card-grid">
        <div class="project-card-field">
          <label>Budget</label>
          <span>${escapeHtml(p.budget)}</span>
        </div>
        ${p.contact_phone ? `<div class="project-card-field"><label>Phone</label><span>${escapeHtml(p.contact_phone)}</span></div>` : ''}
        ${p.contact_email ? `<div class="project-card-field"><label>Email</label><span>${escapeHtml(p.contact_email)}</span></div>` : ''}
        ${p.business_name ? `<div class="project-card-field"><label>Business</label><span>${escapeHtml(p.business_name)}</span></div>` : ''}
        ${p.address ? `<div class="project-card-field"><label>Location</label><span>${escapeHtml(p.address)}</span></div>` : ''}
      </div>
      ${p.custom_concept ? `
        <div style="margin-bottom:8px;font-size:0.72rem;color:var(--gold-dim);letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Concept & Ideas</div>
        <div class="project-card-concept">${escapeHtml(p.custom_concept)}</div>
      ` : ''}
      ${p.additional_description ? `
        <div style="margin-bottom:8px;font-size:0.72rem;color:var(--gold-dim);letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Additional Notes</div>
        <div class="project-card-concept">${escapeHtml(p.additional_description)}</div>
      ` : ''}
      <div class="project-card-footer">
        <span class="project-card-date">Submitted: ${formatDate(p.submitted_at)}</span>
        <div class="project-card-actions">
          ${p.status === 'pending' ? `<button class="btn-mark-reviewed" onclick="markProjectReviewed('${p.id}')">Mark Reviewed</button>` : ''}
          <button class="btn-danger" onclick="deleteProject('${p.id}')">Clear Project</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.markProjectReviewed = async (id) => {
  try {
    await apiFetch(`${API.projects}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'reviewed' }),
    });
    const proj = state.allProjects.find(p => p.id === id);
    if (proj) proj.status = 'reviewed';
    renderAdminProjects();
    updateProjectStats();
    toast('Project marked as reviewed.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

window.deleteProject = async (id) => {
  if (!confirm('Permanently clear this project request from server storage?')) return;
  try {
    await apiFetch(`${API.projects}/${id}`, { method: 'DELETE' });
    state.allProjects = state.allProjects.filter(p => p.id !== id);
    renderAdminProjects();
    updateProjectStats();
    toast('Project cleared from storage.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initAdminTrigger();
  runIntroAnimation();
});

/**
 * StadiumIQ — Main Application Entry Point
 * FIFA World Cup 2026 GenAI Smart Stadium Operations Platform
 */

import { initAssistant } from './js/assistant.js';
import { initCrowd, destroyCrowd } from './js/crowd.js';
import { initNavigation } from './js/navigation.js';
import { initTransport } from './js/transport.js';
import { initSustainability } from './js/sustainability.js';
import { initOperations } from './js/operations.js';
import { showToast, animateCounters } from './js/utils.js';
import { api } from './js/api.js';

// ─── App State ────────────────────────────────────────────────────────────────
const app = {
  currentSection: 'home',
  initialized: new Set(),
  backendAvailable: false
};

// ─── Section Registry ────────────────────────────────────────────────────────
const SECTIONS = {
  home: { id: 'section-home', title: 'Home', init: initHome },
  assistant: { id: 'section-assistant', title: 'AI Assistant', init: initAssistant },
  crowd: { id: 'section-crowd', title: 'Crowd Intel', init: initCrowd },
  navigate: { id: 'section-navigate', title: 'Navigate', init: initNavigation },
  transport: { id: 'section-transport', title: 'Transport', init: initTransport },
  sustainability: { id: 'section-sustainability', title: 'Eco', init: initSustainability },
  ops: { id: 'section-ops', title: 'Ops Dashboard', init: initOperations }
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkBackendStatus();
  setupNavigation();
  setupMobileMenu();
  setupScrollEffects();
  setupLanguageSelector();
  initHome();

  // Delay to avoid layout thrash
  setTimeout(animateCounters, 400);
});

// ─── Backend Check ────────────────────────────────────────────────────────────
async function checkBackendStatus() {
  try {
    const res = await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      app.backendAvailable = true;
      updateLiveBadge(true);
      showToast('✅ Backend connected — Live AI mode active!', 'success', 5000);
    }
  } catch {
    app.backendAvailable = false;
    updateLiveBadge(false);
    showToast('ℹ️ Backend offline — Demo mode active. Start the backend for live AI.', 'info', 6000);
  }
}

function updateLiveBadge(online) {
  const badge = document.querySelector('.live-badge');
  const dot = document.querySelector('.live-dot');
  if (!badge) return;

  if (online) {
    badge.setAttribute('aria-label', 'System status: Live');
    badge.style.background = 'linear-gradient(135deg, rgba(6,214,160,0.15), rgba(6,214,160,0.05))';
    badge.style.borderColor = 'rgba(6,214,160,0.3)';
    if (dot) dot.style.background = '#06d6a0';
  } else {
    badge.setAttribute('aria-label', 'System status: Demo Mode');
    badge.innerHTML = '<span class="live-dot" style="background:#ffd93d" aria-hidden="true"></span>DEMO';
    badge.style.background = 'linear-gradient(135deg, rgba(255,217,61,0.15), rgba(255,217,61,0.05))';
    badge.style.borderColor = 'rgba(255,217,61,0.3)';
  }
}

// ─── Navigation ────────────────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const section = this.dataset.section;
      if (section) navigateTo(section);
    });
  });

  // Hero CTA buttons
  document.getElementById('startAIBtn')?.addEventListener('click', () => navigateTo('assistant'));
  document.getElementById('exploreDemoBtn')?.addEventListener('click', () => navigateTo('crowd'));

  // Feature card clicks
  document.querySelectorAll('.feature-card[data-module]').forEach(card => {
    card.addEventListener('click', () => {
      const module = card.dataset.module;
      if (module) navigateTo(module);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const module = card.dataset.module;
        if (module) navigateTo(module);
      }
    });
  });
}

function navigateTo(sectionKey) {
  if (!SECTIONS[sectionKey]) return;
  if (app.currentSection === sectionKey) return;

  // Hide all sections
  Object.values(SECTIONS).forEach(s => {
    const el = document.getElementById(s.id);
    if (el) {
      el.classList.remove('active');
      el.hidden = true;
    }
  });

  // Show target section
  const target = SECTIONS[sectionKey];
  const el = document.getElementById(target.id);
  if (el) {
    el.classList.add('active');
    el.hidden = false;
    el.scrollTop = 0;
  }

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = btn.dataset.section === sectionKey;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Update page title
  document.title = `${target.title} — StadiumIQ | FIFA World Cup 2026`;

  // Init section if first visit
  if (!app.initialized.has(sectionKey)) {
    try {
      target.init?.();
      app.initialized.add(sectionKey);
    } catch (err) {
      console.error(`[Init ${sectionKey}]`, err);
    }
  }

  app.currentSection = sectionKey;

  // Close mobile menu
  const mobileMenu = document.getElementById('mobileMenu');
  const menuToggle = document.getElementById('menuToggle');
  if (mobileMenu?.classList.contains('open')) {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Mobile Menu ──────────────────────────────────────────────────────────────
function setupMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');

  toggle?.addEventListener('click', () => {
    const isOpen = menu?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen.toString());
    menu?.setAttribute('aria-hidden', (!isOpen).toString());
    toggle.classList.toggle('active', isOpen);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggle?.contains(e.target) && !menu?.contains(e.target)) {
      menu?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      menu?.setAttribute('aria-hidden', 'true');
      toggle?.classList.remove('active');
    }
  });
}

// ─── Scroll Effects ───────────────────────────────────────────────────────────
function setupScrollEffects() {
  const header = document.querySelector('.header');

  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Intersection observer for feature cards
  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.feature-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(24px)';
    card.style.transitionDelay = `${i * 60}ms`;
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
  });
}

// ─── Language Selector ────────────────────────────────────────────────────────
function setupLanguageSelector() {
  const select = document.getElementById('langSelect');
  select?.addEventListener('change', () => {
    const lang = select.value;
    const names = { en: 'English', es: 'Spanish', fr: 'French', ar: 'Arabic', pt: 'Portuguese', zh: 'Chinese', hi: 'Hindi', de: 'German' };
    showToast(`🌐 Language preference set to ${names[lang] || lang}`, 'info', 2500);

    // Sync with AI assistant language
    const respLang = document.getElementById('responseLanguage');
    if (respLang) respLang.value = lang;

    // RTL for Arabic
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  });
}

// ─── Home Section Init ────────────────────────────────────────────────────────
function initHome() {
  // Trigger stat counter animations after a short delay
  setTimeout(() => {
    animateCounters();
  }, 300);
}

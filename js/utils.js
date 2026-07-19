/**
 * Utility Functions — StadiumIQ
 * Shared helpers across all frontend modules
 */

// ─── Toast Notifications ──────────────────────────────────────────────────────
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = icons[type] || icons.info;

  const msg = document.createElement('span');
  msg.textContent = message; // Safe: textContent

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => dismissToast(toast));

  toast.appendChild(icon);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-show'));

  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

function dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.remove('toast-show');
  toast.classList.add('toast-hide');
  setTimeout(() => toast.remove(), 400);
}

// ─── HTML Sanitizer ───────────────────────────────────────────────────────────
export function sanitizeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

// ─── Time Formatter ───────────────────────────────────────────────────────────
export function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatPercent(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function formatNumber(n) {
  return (n || 0).toLocaleString();
}

// ─── Stat Counter Animation ───────────────────────────────────────────────────
export function animateCounters() {
  const counters = document.querySelectorAll('[data-target]');
  counters.forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  });
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function renderMarkdownToElement(container, text) {
  container.textContent = '';
  const lines = (text || '').split('\n');
  
  let currentList = null;

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Check if it is a list item
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const isNumbered = /^\d+\.\s/.test(trimmed);

    if (isBullet || isNumbered) {
      if (!currentList) {
        currentList = document.createElement(isBullet ? 'ul' : 'ol');
        container.appendChild(currentList);
      }
      const li = document.createElement('li');
      let itemText = trimmed;
      if (isBullet) {
        itemText = trimmed.substring(2);
      } else {
        itemText = trimmed.replace(/^\d+\.\s/, '');
      }
      parseInlineMarkdown(li, itemText);
      currentList.appendChild(li);
    } else {
      currentList = null;
      if (trimmed === '') {
        container.appendChild(document.createElement('br'));
      } else {
        const p = document.createElement('p');
        p.style.margin = '4px 0';
        parseInlineMarkdown(p, trimmed);
        container.appendChild(p);
      }
    }
  });
}

function parseInlineMarkdown(element, text) {
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const textBefore = text.substring(lastIndex, matchIndex);
    if (textBefore) {
      element.appendChild(document.createTextNode(textBefore));
    }
    const matchedStr = match[0];
    if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = matchedStr.slice(2, -2);
      element.appendChild(strong);
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      const em = document.createElement('em');
      em.textContent = matchedStr.slice(1, -1);
      element.appendChild(em);
    }
    lastIndex = regex.lastIndex;
  }
  const textAfter = text.substring(lastIndex);
  if (textAfter) {
    element.appendChild(document.createTextNode(textAfter));
  }
}

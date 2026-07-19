/**
 * AI Assistant Module — StadiumIQ
 * Gemini-powered multilingual fan assistant with streaming UI
 */

import { api } from './api.js';
import { showToast, sanitizeHTML, formatTime, renderMarkdownToElement } from './utils.js';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  history: [],
  totalMessages: 0,
  totalTokens: 0,
  responseTimes: [],
  isStreaming: false,
  streamEnabled: true
};

// ─── DOM References ──────────────────────────────────────────────────────────
function getEl(id) { return document.getElementById(id); }

// ─── Init ────────────────────────────────────────────────────────────────────
export function initAssistant() {
  renderWelcomeMessage();
  setupEventListeners();
  setupQuickPrompts();
  setupApiKeyToggle();
  setupCharCount();
}

function setupEventListeners() {
  const form = getEl('chatForm');
  const clearBtn = getEl('clearChat');
  const downloadBtn = getEl('downloadChat');
  const streamToggle = getEl('streamToggle');
  const tempRange = getEl('tempRange');
  const tempVal = getEl('tempVal');
  const apiKeyInput = getEl('apiKeyInput');

  form?.addEventListener('submit', handleSend);

  clearBtn?.addEventListener('click', () => {
    state.history = [];
    const msgs = getEl('chatMessages');
    if (msgs) msgs.textContent = '';
    renderWelcomeMessage();
    updateStats();
    showToast('Chat cleared', 'info');
  });

  downloadBtn?.addEventListener('click', downloadTranscript);

  streamToggle?.addEventListener('click', () => {
    state.streamEnabled = !state.streamEnabled;
    streamToggle.textContent = state.streamEnabled ? 'ON' : 'OFF';
    streamToggle.setAttribute('aria-checked', state.streamEnabled.toString());
    streamToggle.classList.toggle('active', state.streamEnabled);
  });

  tempRange?.addEventListener('input', () => {
    if (tempVal) tempVal.textContent = parseFloat(tempRange.value).toFixed(1);
    tempRange.setAttribute('aria-valuenow', tempRange.value);
  });

  apiKeyInput?.addEventListener('input', () => {
    api.setApiKey(apiKeyInput.value.trim() || null);
  });

  // Save API key to sessionStorage for convenience
  apiKeyInput?.addEventListener('change', () => {
    if (apiKeyInput.value.trim()) {
      sessionStorage.setItem('stadiumiq_apikey', apiKeyInput.value.trim());
    }
  });

  // Restore API key
  const savedKey = sessionStorage.getItem('stadiumiq_apikey');
  if (savedKey && apiKeyInput) {
    apiKeyInput.value = savedKey;
    api.setApiKey(savedKey);
  }
}

function setupQuickPrompts() {
  document.querySelectorAll('.quick-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      const input = getEl('chatInput');
      if (input && prompt) {
        input.value = prompt;
        input.focus();
        updateCharCount(prompt.length);
      }
    });
  });
}

function setupApiKeyToggle() {
  const toggleBtn = getEl('toggleApiKey');
  const input = getEl('apiKeyInput');
  toggleBtn?.addEventListener('click', () => {
    const isHidden = input?.type === 'password';
    if (input) input.type = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? '🙈' : '👁️';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Hide API key' : 'Show API key');
  });
}

function setupCharCount() {
  const input = getEl('chatInput');
  input?.addEventListener('input', () => updateCharCount(input.value.length));
}

function updateCharCount(len) {
  const el = getEl('charCount');
  if (el) {
    el.textContent = `${len}/500`;
    el.style.color = len > 450 ? '#ff6b6b' : len > 350 ? '#ffd93d' : '';
  }
}

// ─── Send Message ─────────────────────────────────────────────────────────────
async function handleSend(e) {
  e.preventDefault();
  if (state.isStreaming) return;

  const input = getEl('chatInput');
  const message = input?.value.trim();
  if (!message) return;

  // Append user message
  appendMessage('user', message);
  if (input) { input.value = ''; updateCharCount(0); }

  state.history.push({ role: 'user', content: message });
  state.isStreaming = true;

  const sendBtn = getEl('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  const stadium = getEl('stadiumSelect')?.value || 'nrg';
  const role = getEl('roleSelect')?.value || 'fan';
  const language = getEl('responseLanguage')?.value || 'en';
  const temperature = parseFloat(getEl('tempRange')?.value || '0.7');

  // Show typing indicator
  const typingId = appendTypingIndicator();
  const startTime = Date.now();

  try {
    const data = await api.chat(message, {
      stadium, role, language,
      history: state.history.slice(-10),
      temperature
    });

    removeTypingIndicator(typingId);

    // Render Agentic Workflow execution steps
    const logBox = getEl('agenticWorkflowLog');
    if (logBox && data.agentExecution && data.agentExecution.steps) {
      logBox.textContent = '';
      data.agentExecution.steps.forEach(step => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'agent-log-step';
        stepDiv.style.cssText = 'margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px dashed rgba(255,255,255,0.03); line-height: 1.3;';
        stepDiv.textContent = step;
        logBox.appendChild(stepDiv);
      });
    }

    const elapsed = Date.now() - startTime;
    state.responseTimes.push(elapsed);
    state.totalTokens += data.tokensUsed || 0;

    if (state.streamEnabled) {
      await appendStreamingMessage('ai', data.response);
    } else {
      appendMessage('ai', data.response);
    }

    state.history.push({ role: 'ai', content: data.response });
    state.totalMessages += 2;
    updateStats();

  } catch (err) {
    removeTypingIndicator(typingId);
    const errMsg = err.message.includes('API key')
      ? '🔑 Please enter your Gemini API key in the configuration panel to enable AI responses.'
      : `⚠️ ${err.message}`;
    appendMessage('ai', errMsg, 'error');
    showToast(err.message, 'error');
  } finally {
    state.isStreaming = false;
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
  }
}

// ─── Message Rendering ───────────────────────────────────────────────────────
function appendMessage(role, content, type = '') {
  const container = getEl('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `message ${role} ${type}`;
  div.setAttribute('role', 'article');
  div.setAttribute('aria-label', `${role === 'user' ? 'You' : 'StadiumIQ AI'} said`);

  const avatar = role === 'user' ? '👤' : '🤖';
  const name = role === 'user' ? 'You' : 'StadiumIQ AI';
  const time = formatTime(new Date());

  // Use textContent for user messages, allow markdown-like formatting for AI
  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';

  if (role === 'ai') {
    renderMarkdownToElement(contentEl, content);
  } else {
    const p = document.createElement('p');
    p.textContent = content;
    contentEl.appendChild(p);
  }

  const header = document.createElement('div');
  header.className = 'message-header';

  const avatarSpan = document.createElement('span');
  avatarSpan.className = 'message-avatar';
  avatarSpan.setAttribute('aria-hidden', 'true');
  avatarSpan.textContent = avatar;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'message-name';
  nameSpan.textContent = name;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = time;

  header.appendChild(avatarSpan);
  header.appendChild(nameSpan);
  header.appendChild(timeSpan);
  div.appendChild(header);
  div.appendChild(contentEl);

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function formatAIResponse(text) {
  // Safe markdown-like formatting: sanitize/escape input first
  const escaped = sanitizeHTML(text);
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>');
}

async function appendStreamingMessage(role, content) {
  const container = getEl('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.setAttribute('role', 'article');
  div.setAttribute('aria-label', 'StadiumIQ AI said');

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content streaming';

  const header = document.createElement('div');
  header.className = 'message-header';

  const avatarSpan = document.createElement('span');
  avatarSpan.className = 'message-avatar';
  avatarSpan.setAttribute('aria-hidden', 'true');
  avatarSpan.textContent = '🤖';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'message-name';
  nameSpan.textContent = 'StadiumIQ AI';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(new Date());

  header.appendChild(avatarSpan);
  header.appendChild(nameSpan);
  header.appendChild(timeSpan);
  div.appendChild(header);
  div.appendChild(contentEl);
  container.appendChild(div);

  // Stream characters
  const words = content.split(' ');
  let displayed = '';
  for (const word of words) {
    displayed += (displayed ? ' ' : '') + word;
    renderMarkdownToElement(contentEl, displayed);
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '▋';
    contentEl.appendChild(cursor);
    container.scrollTop = container.scrollHeight;
    await sleep(25 + Math.random() * 20);
  }

  contentEl.classList.remove('streaming');
  renderMarkdownToElement(contentEl, content);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = getEl('chatMessages');
  if (!container) return null;

  const id = `typing-${Date.now()}`;
  const div = document.createElement('div');
  div.className = 'message ai typing-indicator';
  div.id = id;
  div.setAttribute('aria-label', 'AI is typing');
  const header = document.createElement('div');
  header.className = 'message-header';

  const avatarSpan = document.createElement('span');
  avatarSpan.className = 'message-avatar';
  avatarSpan.setAttribute('aria-hidden', 'true');
  avatarSpan.textContent = '🤖';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'message-name';
  nameSpan.textContent = 'StadiumIQ AI';

  header.appendChild(avatarSpan);
  header.appendChild(nameSpan);

  const mContent = document.createElement('div');
  mContent.className = 'message-content';

  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    dots.appendChild(document.createElement('span'));
  }

  mContent.appendChild(dots);
  div.appendChild(header);
  div.appendChild(mContent);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  if (id) document.getElementById(id)?.remove();
}

function renderWelcomeMessage() {
  const container = getEl('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'message ai welcome';
  div.setAttribute('role', 'article');
  const header = document.createElement('div');
  header.className = 'message-header';

  const avatarSpan = document.createElement('span');
  avatarSpan.className = 'message-avatar';
  avatarSpan.setAttribute('aria-hidden', 'true');
  avatarSpan.textContent = '🤖';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'message-name';
  nameSpan.textContent = 'StadiumIQ AI';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = 'Now';

  header.appendChild(avatarSpan);
  header.appendChild(nameSpan);
  header.appendChild(timeSpan);

  const mContent = document.createElement('div');
  mContent.className = 'message-content';

  const welcomeText = `👋 **Welcome to StadiumIQ!**
I'm your AI-powered assistant for **FIFA World Cup 2026**. I can help you with:
- 🗺️ **Navigation** — Find your seat, facilities, and exits
- 👥 **Crowd info** — Avoid congested areas in real-time
- 🚌 **Transport** — Shuttles, metro, rideshare options
- ♿ **Accessibility** — Wheelchair routes, elevators, services
- 🌍 **Multilingual** — Ask me in any language!
- 📋 **Stadium info** — Rules, food, schedules, and more

*Enter your **Gemini API key** in the configuration panel to enable live AI responses. Or just ask away and I'll use smart fallbacks!*`;

  renderMarkdownToElement(mContent, welcomeText);

  div.appendChild(header);
  div.appendChild(mContent);
  container.appendChild(div);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  const setEl = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
  setEl('totalMessages', state.totalMessages);
  setEl('totalTokens', state.totalTokens.toLocaleString());

  if (state.responseTimes.length > 0) {
    const avg = state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length;
    setEl('avgResponse', `${(avg / 1000).toFixed(1)}s`);
  }
}

// ─── Download Transcript ──────────────────────────────────────────────────────
function downloadTranscript() {
  if (state.history.length === 0) {
    showToast('No messages to download', 'info');
    return;
  }

  const lines = state.history.map(m => `[${m.role === 'user' ? 'YOU' : 'STADIUMIQ AI'}]\n${m.content}\n`);
  const content = `StadiumIQ Chat Transcript\nFIFA World Cup 2026\nExported: ${new Date().toLocaleString()}\n\n${'─'.repeat(50)}\n\n${lines.join('\n─'.repeat(30) + '\n\n')}`;

  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stadiumiq-chat-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Transcript downloaded!', 'success');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

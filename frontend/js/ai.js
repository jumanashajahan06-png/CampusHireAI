/* ============================================================
   ai.js — AI Assistant (Phase 6: Claude API connected)
   
   Sends messages to /api/ai/ask which calls Claude.
   Shows a "Demo Mode" badge if the API key isn't configured.
   Falls back to local mock if the server is completely offline.
   ============================================================ */

let messages      = [];
let isLoading     = false;
let conversations = [];
let isDemoMode    = false; // set to true if server returns source:'mock'

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  setupChatInput();
  setupWelcomeChips();
  setupPromptChips();
  setupNewChat();
  loadConversations();
  setupInterviewPrepBtn();
});

// ── Input handling ────────────────────────────────────────────
function setupChatInput() {
  const input   = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim() || isLoading;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
}

// ── Welcome & quick chips ─────────────────────────────────────
function setupWelcomeChips() {
  document.querySelectorAll('.welcome-chip').forEach(chip => {
    chip.addEventListener('click', () => sendUserMessage(chip.dataset.prompt));
  });
}

function setupPromptChips() {
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => sendUserMessage(chip.dataset.prompt));
  });
}

// ── Interview prep shortcut (uses dedicated endpoint) ─────────
function setupInterviewPrepBtn() {
  // Dynamically adds a chip if user has applications
  const chipsBar = document.getElementById('promptChips');
  if (!chipsBar) return;

  // Check if user has any applications to suggest company-specific prep
  apiRequest('/applications').then(data => {
    const apps = data?.applications || [];
    if (!apps.length) return;

    // Find most recent interview-stage application
    const interviewApp = apps.find(a => a.status === 'Interview');
    if (!interviewApp) return;

    const chip = document.createElement('button');
    chip.className   = 'prompt-chip';
    chip.textContent = `Prep for ${interviewApp.company}`;
    chip.addEventListener('click', () => {
      fetchInterviewPrep(interviewApp.company, interviewApp.role);
    });
    chipsBar.prepend(chip);
  }).catch(() => {});
}

// ── Send message ──────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || isLoading) return;

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;
  await sendUserMessage(text);
}

async function sendUserMessage(text) {
  if (isLoading) return;

  hideWelcome();
  messages.push({ role: 'user', content: text });
  appendMessage('user', text);

  const typingId = showTyping();
  isLoading = true;

  try {
    const data = await apiRequest('/ai/ask', {
      method: 'POST',
      body:   { messages }
    });

    removeTyping(typingId);
    const reply = data.reply || 'Sorry, I could not generate a response.';

    // Track if we're in demo mode (no API key configured)
    if (data.source === 'mock' && !isDemoMode) {
      isDemoMode = true;
      showDemoBanner();
    }

    messages.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply, data.source);

  } catch (err) {
    // Server offline — use fully local fallback
    removeTyping(typingId);
    const reply = localFallbackReply(text);
    messages.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply, 'offline');
    if (!isDemoMode) { isDemoMode = true; showDemoBanner(); }
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('chatInput').focus();
  document.getElementById('promptChips').style.display = 'flex';
}

// ── Interview prep via dedicated endpoint ─────────────────────
async function fetchInterviewPrep(company, role) {
  hideWelcome();

  // Show what we're asking as a user message
  const userText = `Generate interview questions for ${role} at ${company}`;
  messages.push({ role: 'user', content: userText });
  appendMessage('user', userText);

  const typingId = showTyping();
  isLoading = true;

  try {
    const data = await apiRequest('/ai/interview-prep', {
      method: 'POST',
      body:   { company, role }
    });

    removeTyping(typingId);
    const reply = data.questions || 'Could not generate questions.';
    if (data.source === 'mock' && !isDemoMode) { isDemoMode = true; showDemoBanner(); }
    messages.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply, data.source);

  } catch (err) {
    removeTyping(typingId);
    const reply = localInterviewFallback(company, role);
    messages.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply, 'offline');
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('promptChips').style.display = 'flex';
}

// ── Render message bubble ─────────────────────────────────────
function appendMessage(role, content, source) {
  const area = document.getElementById('messagesArea');

  const wrap         = document.createElement('div');
  wrap.className     = `message ${role}`;

  const avatar       = document.createElement('div');
  avatar.className   = 'msg-avatar';
  avatar.textContent = role === 'assistant' ? '🤖' : '👤';

  const bubble       = document.createElement('div');
  bubble.className   = 'msg-bubble';
  bubble.innerHTML   = formatContent(content);

  // Small source tag for assistant messages (claude vs mock vs offline)
  if (role === 'assistant' && source) {
    const tag = document.createElement('div');
    tag.style.cssText = 'font-size:0.68rem;color:var(--text-dim);margin-top:0.5rem;text-align:right';
    tag.textContent   = source === 'claude' ? '✦ Claude AI' : source === 'offline' ? '⚡ Offline mode' : '⚡ Demo mode';
    bubble.appendChild(tag);
  }

  if (role === 'user') {
    wrap.appendChild(bubble);
    wrap.appendChild(avatar);
  } else {
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
  }

  area.appendChild(wrap);
  area.scrollTop = area.scrollHeight;
}

// ── Simple markdown → HTML ────────────────────────────────────
function formatContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g,  '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,      '<em>$1</em>')
    .replace(/`([^`]+)`/g,      '<code>$1</code>')
    .replace(/^#{1,3}\s(.+)$/gm,'<strong>$1</strong><br>')
    .replace(/^[-•*]\s(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g,    '<br>')
    .replace(/^/,      '<p>')
    + '</p>';
}

// ── Typing indicator ──────────────────────────────────────────
function showTyping() {
  const area = document.getElementById('messagesArea');
  const id   = 'typing-' + Date.now();
  area.insertAdjacentHTML('beforeend', `
    <div class="message assistant typing-indicator" id="${id}">
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`);
  area.scrollTop = area.scrollHeight;
  return id;
}
function removeTyping(id) { document.getElementById(id)?.remove(); }

// ── Demo mode banner ──────────────────────────────────────────
function showDemoBanner() {
  const header = document.querySelector('.chat-header');
  if (!header || document.getElementById('demoBanner')) return;

  const banner = document.createElement('div');
  banner.id    = 'demoBanner';
  banner.style.cssText = `
    background: rgba(247,201,72,0.1);
    border: 1px solid rgba(247,201,72,0.3);
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-size: 0.78rem;
    color: var(--yellow);
    margin: 0 1.5rem 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;
  banner.innerHTML = `⚡ <strong>Demo Mode</strong> — Add your <code>ANTHROPIC_API_KEY</code> to <code>.env</code> to enable real Claude AI responses.`;

  // Insert after the chat header
  header.insertAdjacentElement('afterend', banner);
}

// ── Welcome / chat screen ─────────────────────────────────────
function hideWelcome() {
  const w = document.getElementById('chatWelcome');
  if (w) w.style.display = 'none';
}

function showWelcome() {
  document.getElementById('messagesArea')
    .querySelectorAll('.message').forEach(el => el.remove());
  const w = document.getElementById('chatWelcome');
  const c = document.getElementById('promptChips');
  if (w) w.style.display = 'flex';
  if (c) c.style.display = 'none';
  isDemoMode = false;
  document.getElementById('demoBanner')?.remove();
}

// ── New chat ──────────────────────────────────────────────────
function setupNewChat() {
  document.getElementById('newChatBtn')?.addEventListener('click', () => {
    if (messages.length) saveCurrentConversation();
    messages = [];
    showWelcome();
  });
}

// ── Conversation history (localStorage) ──────────────────────
function saveCurrentConversation() {
  if (!messages.length) return;
  const first = messages.find(m => m.role === 'user');
  const title = first
    ? first.content.slice(0, 48) + (first.content.length > 48 ? '…' : '')
    : 'Conversation';

  conversations.unshift({
    id:       Date.now(),
    title,
    messages: [...messages],
    date:     new Date().toLocaleDateString()
  });
  conversations = conversations.slice(0, 20);
  try { localStorage.setItem('ch_conversations', JSON.stringify(conversations)); } catch {}
  renderConvList();
}

function loadConversations() {
  try { conversations = JSON.parse(localStorage.getItem('ch_conversations') || '[]'); } catch { conversations = []; }
  renderConvList();
}

function renderConvList() {
  const list = document.getElementById('convList');
  if (!list) return;

  if (!conversations.length) {
    list.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-dim);font-size:0.8rem">No conversations yet</div>`;
    return;
  }

  list.innerHTML = conversations.map((conv, i) => `
    <div class="conv-item${i === 0 ? ' active' : ''}" data-idx="${i}">
      <div class="conv-item-title">${escapeHtml(conv.title)}</div>
      <div class="conv-item-meta">${conv.date} · ${conv.messages.length} messages</div>
    </div>`).join('');

  list.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => {
      const conv = conversations[parseInt(item.dataset.idx)];
      if (!conv) return;
      messages = [...conv.messages];
      hideWelcome();
      document.getElementById('messagesArea')
        .querySelectorAll('.message').forEach(el => el.remove());
      messages.forEach(m => appendMessage(m.role, m.content));
      document.getElementById('promptChips').style.display = 'flex';
      list.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// ── Local fallbacks (when server is completely offline) ───────
function localFallbackReply(msg) {
  const m = msg.toLowerCase();

  if (m.includes('resume') || m.includes('cv'))
    return `**5 high-impact resume tips:**\n\n1. **Quantify everything** — "Grew user retention by 32%" > "improved retention"\n2. **Action verbs** — Built, Shipped, Reduced, Designed, Led, Automated\n3. **Mirror the JD** — Copy exact keywords for ATS filters\n4. **One tight page** — Brevity signals communication skill\n5. **Live project links** — GitHub/deployment URL > description alone\n\nShare a specific company for tailored advice!`;

  if (m.includes('interview'))
    return `**Interview prep framework:**\n\n**Behavioural (everyone):**\n- Prepare 6 STAR stories: leadership, conflict, failure, achievement, collaboration, initiative\n- "Tell me about yourself" → 90-sec Past/Present/Future\n\n**Technical (SWE/data):**\n- LeetCode: 2 Easy + 1 Medium daily for 3 weeks pre-interview\n- Core topics: Arrays, HashMaps, Trees, Two Pointers, DP basics\n\n**Questions to ask:**\n- "What does success look like at 90 days?"\n- "What's the team's biggest current challenge?"\n\nWant mock questions for a specific company?`;

  if (m.includes('cover letter'))
    return `**Cover letter structure (under 300 words):**\n\n1. **Hook** — Open with a specific observation or story, never "I am writing to apply…"\n2. **Why them** — Reference a specific product, blog post, or company value\n3. **Why you** — Map 2-3 achievements to their requirements with numbers\n4. **Close** — Enthusiastic, specific ask for a conversation\n\nTell me the company and role — I'll help draft the full letter.`;

  if (m.includes('salary') || m.includes('negotiat') || m.includes('offer'))
    return `**Salary negotiation playbook:**\n\n- **Always negotiate** — 85% of employers expect it\n- **Research first** — Levels.fyi, Glassdoor, LinkedIn Salary\n- **Don't anchor first** — "What's the budgeted range?"\n- **Script** — "I'm really excited — this is my top choice. Based on my research I was hoping for [X]. Is there flexibility?"\n- **Package** — Equity, sign-on, remote days all have dollar value\n\nShare the offer details for specific advice.`;

  return `I'm your **AI Career Coach** 🎯\n\nI can help with:\n- 📄 **Resume** tips and rewrites\n- 💬 **Interview** prep and mock Q&A\n- ✉️ **Cover letters** for specific companies\n- 💰 **Salary negotiation** scripts\n- 🔗 **Networking** and LinkedIn strategy\n\nWhat are you working on? Include the company and role for the most specific advice.`;
}

function localInterviewFallback(company, role) {
  return `**Interview questions for ${escapeHtml(role)} at ${escapeHtml(company)}:**\n\n**Behavioural:**\n1. "Tell me about a project where you had to learn a new technology under time pressure."\n   *Use STAR: describe the constraint, your learning approach, what you built, and the outcome.*\n\n2. "Describe a time you disagreed with a decision. How did you handle it?"\n   *Show you can hold a position respectfully while prioritising team goals.*\n\n**Technical:**\n3. "Walk me through the most complex system you've designed or built."\n4. "How would you debug a production issue where latency suddenly spiked 5x?"\n5. "What's your approach to writing code that others will maintain?"\n\n**Company-specific:**\n6. "Why ${escapeHtml(company)} specifically — what problem are you most excited about?"\n7. "Where do you see ${escapeHtml(company)}'s biggest opportunity in the next 2 years?"\n\n**Culture fit:**\n8. "What's a side project you built purely out of curiosity?"\n\n💡 Spend 60% of your prep time on behavioural questions — they eliminate more candidates than technical ones.`;
}
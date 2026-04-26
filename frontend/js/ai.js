/* ============================================================
   ai.js — AI Assistant chat interface
   - Renders chat messages
   - Handles prompt chips / welcome screen
   - Calls backend AI endpoint (Phase 6)
   - Falls back to mock responses until then
   ============================================================ */

// Conversation state
let messages = [];          // { role: 'user'|'assistant', content: string }
let isLoading = false;
let conversations = [];     // saved conversation list

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  setupChatInput();
  setupWelcomeChips();
  setupPromptChips();
  setupNewChat();
  loadConversations();
});

/* ── Chat input setup ────────────────────────────────────── */

function setupChatInput() {
  const input   = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');

  // Enable/disable send button based on input
  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim() === '' || isLoading;
    // Auto-resize textarea
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });

  // Send on Enter (Shift+Enter = new line)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
}

/* ── Welcome screen chips ────────────────────────────────── */

function setupWelcomeChips() {
  document.querySelectorAll('.welcome-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      sendUserMessage(prompt);
    });
  });
}

/* ── Quick prompt chips (shown during chat) ──────────────── */

function setupPromptChips() {
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      sendUserMessage(prompt);
    });
  });
}

/* ── New chat button ─────────────────────────────────────── */

function setupNewChat() {
  document.getElementById('newChatBtn')?.addEventListener('click', () => {
    // Save current conversation if it has messages
    if (messages.length > 0) saveCurrentConversation();
    // Reset to welcome screen
    messages = [];
    showWelcomeScreen();
  });
}

/* ── Send a message ──────────────────────────────────────── */

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || isLoading) return;

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  sendUserMessage(text);
}

async function sendUserMessage(text) {
  if (isLoading) return;

  // Hide welcome screen on first message
  hideWelcomeScreen();

  // Add user message
  messages.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Show typing indicator
  const typingId = showTypingIndicator();
  isLoading = true;

  try {
    // Call backend AI endpoint
    const data = await apiRequest('/ai/ask', {
      method: 'POST',
      body: { messages: messages }
    });

    const reply = data.reply || 'Sorry, I could not generate a response.';
    removeTypingIndicator(typingId);
    messages.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply);

  } catch (err) {
    // Fallback: mock AI response until Phase 6 backend is ready
    removeTypingIndicator(typingId);
    const mockReply = getMockReply(text);
    messages.push({ role: 'assistant', content: mockReply });
    appendMessage('assistant', mockReply);
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('chatInput').focus();

  // Show prompt chips after first exchange
  document.getElementById('promptChips').style.display = 'flex';
}

/* ── Render a message bubble ─────────────────────────────── */

function appendMessage(role, content) {
  const area = document.getElementById('messagesArea');

  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.textContent = role === 'assistant' ? '🤖' : '👤';

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';

  // Render markdown-like formatting
  bubbleEl.innerHTML = formatMessageContent(content);

  if (role === 'user') {
    msgEl.appendChild(bubbleEl);
    msgEl.appendChild(avatarEl);
  } else {
    msgEl.appendChild(avatarEl);
    msgEl.appendChild(bubbleEl);
  }

  area.appendChild(msgEl);

  // Scroll to bottom
  area.scrollTop = area.scrollHeight;
}

/* ── Basic markdown formatter ────────────────────────────── */

function formatMessageContent(text) {
  return text
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Numbered list: 1. item
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Bullet list: - item or • item
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Wrap in paragraph
    .replace(/^(.+)/, '<p>$1</p>');
}

/* ── Typing indicator ────────────────────────────────────── */

function showTypingIndicator() {
  const area = document.getElementById('messagesArea');
  const id   = 'typing-' + Date.now();

  const el = document.createElement('div');
  el.className = 'message assistant typing-indicator';
  el.id = id;
  el.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;

  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  document.getElementById(id)?.remove();
}

/* ── Welcome / chat screen toggling ─────────────────────── */

function hideWelcomeScreen() {
  const welcome = document.getElementById('chatWelcome');
  if (welcome) welcome.style.display = 'none';
}

function showWelcomeScreen() {
  const area    = document.getElementById('messagesArea');
  const welcome = document.getElementById('chatWelcome');
  const chips   = document.getElementById('promptChips');

  // Remove all message elements
  area.querySelectorAll('.message').forEach(el => el.remove());

  if (welcome) welcome.style.display = 'flex';
  if (chips)   chips.style.display   = 'none';
}

/* ── Conversation history ────────────────────────────────── */

function saveCurrentConversation() {
  if (messages.length === 0) return;

  const firstUserMsg = messages.find(m => m.role === 'user');
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '')
    : 'Conversation';

  conversations.unshift({
    id: Date.now(),
    title,
    messages: [...messages],
    date: new Date().toLocaleDateString()
  });

  // Keep only last 20 conversations
  conversations = conversations.slice(0, 20);

  // Save to localStorage
  try {
    localStorage.setItem('ch_conversations', JSON.stringify(conversations));
  } catch {}

  renderConversationList();
}

function loadConversations() {
  try {
    conversations = JSON.parse(localStorage.getItem('ch_conversations') || '[]');
  } catch {
    conversations = [];
  }
  renderConversationList();
}

function renderConversationList() {
  const list = document.getElementById('convList');
  if (!list) return;

  if (conversations.length === 0) {
    list.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-dim); font-size:0.8rem">No conversations yet</div>`;
    return;
  }

  list.innerHTML = conversations.map((conv, i) => `
    <div class="conv-item ${i === 0 ? 'active' : ''}" data-idx="${i}">
      <div class="conv-item-title">${escapeHtml(conv.title)}</div>
      <div class="conv-item-meta">${conv.date}</div>
    </div>
  `).join('');

  // Click to load a past conversation
  list.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx  = parseInt(item.dataset.idx);
      const conv = conversations[idx];
      if (!conv) return;

      messages = [...conv.messages];
      hideWelcomeScreen();

      // Clear and re-render messages
      const area = document.getElementById('messagesArea');
      area.querySelectorAll('.message').forEach(el => el.remove());
      messages.forEach(m => appendMessage(m.role, m.content));

      document.getElementById('promptChips').style.display = 'flex';

      // Mark active
      list.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

/* ── Mock AI responses (used until Phase 6 backend) ─────── */

function getMockReply(userMessage) {
  const msg = userMessage.toLowerCase();

  if (msg.includes('resume')) {
    return `Here are **5 key resume tips** for students:\n\n1. **Quantify achievements** — Instead of "helped grow user base", write "grew user base by 40% in 3 months"\n2. **Use action verbs** — Start bullets with: Built, Designed, Led, Optimized, Reduced\n3. **Tailor for each role** — Mirror keywords from the job description\n4. **Keep it 1 page** — For students, one page is almost always better\n5. **Add a projects section** — Personal projects show initiative and real skills\n\nWould you like me to review a specific section of your resume?`;
  }

  if (msg.includes('interview')) {
    return `Here are **common interview questions** with tips:\n\n**Behavioral:**\n- "Tell me about yourself" — Keep it to 2 mins: past → present → future\n- "Tell me about a challenge you faced" — Use the STAR method (Situation, Task, Action, Result)\n\n**Technical (for SWE roles):**\n- Data Structures: Arrays, HashMaps, Trees, Graphs\n- Algorithms: Sorting, Binary Search, Dynamic Programming\n- Practice on LeetCode — focus on Easy/Medium first\n\n**Questions to ask them:**\n- "What does success look like in this role?"\n- "What's the team culture like?"\n\nWant me to do a mock interview with you?`;
  }

  if (msg.includes('cover letter')) {
    return `A great cover letter has **4 key parts**:\n\n1. **Opening hook** — Start with something compelling, not "I am writing to apply for..."\n2. **Why this company** — Show you've done research. Mention a specific product, value, or recent news\n3. **Why you** — Connect 2-3 of your experiences directly to the job requirements\n4. **Strong close** — Express enthusiasm and request a conversation\n\n**Keep it under 300 words.** Recruiters spend ~30 seconds on cover letters.\n\nWant me to help you write one for a specific company?`;
  }

  if (msg.includes('salary') || msg.includes('negotiat')) {
    return `**Salary negotiation tips:**\n\n- **Always negotiate** — 80% of employers expect it. The worst they say is no.\n- **Anchor high** — Research market rates on Glassdoor/Levels.fyi, then ask 10-15% above\n- **Don't name a number first** — Say "I'm flexible, what's the budgeted range?"\n- **Consider the full package** — Sign-on bonus, equity, PTO, remote work can compensate for lower base\n- **Be enthusiastic** — "I'm really excited about this role. Based on my research, I was hoping for X"\n\nFor internships, stipend negotiation is less common but still possible at smaller companies.`;
  }

  // Default response
  return `That's a great question! As your career AI assistant, I can help you with:\n\n- 📄 **Resume reviews** and improvement tips\n- 💬 **Interview preparation** and mock questions\n- ✉️ **Cover letter** writing guidance\n- 💰 **Salary negotiation** strategies\n- 🎯 **Job search** tactics and networking tips\n\nCould you tell me more about what you're working on? For example, which company are you applying to, or what stage of the process are you at?`;
}

/* ── XSS protection ──────────────────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
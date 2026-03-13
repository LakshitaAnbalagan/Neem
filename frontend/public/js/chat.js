const user = getUser();
if (!user || !getToken()) {
  location.href = 'login.html';
}

document.getElementById('navBrand').href = user.role === 'shop' ? 'dashboard-shop.html' : 'dashboard-supplier.html';
document.getElementById('navDashboard').href = user.role === 'shop' ? 'dashboard-shop.html' : 'dashboard-supplier.html';
document.getElementById('navDashboard').textContent = 'Dashboard';
document.getElementById('logoutBtn').onclick = () => { clearAuth(); location.href = 'index.html'; };

const params = new URLSearchParams(location.search);
const openWithId = params.get('with');
const BOT_ID = window.NeemChatbot ? window.NeemChatbot.BOT_ID : 'neem-assistant';

let socket;
let currentOtherId = null;
let currentConversationId = null;
let isBotConversation = () => currentOtherId === BOT_ID;

function connectSocket() {
  const token = getToken();
  if (!token) return;
  socket = io(window.location.origin, {
    auth: { token, userId: user._id }
  });
  socket.on('connect', () => {});
  socket.on('chat:message', (msg) => {
    if (currentOtherId && (msg.senderId === currentOtherId || msg.receiverId === currentOtherId)) {
      appendMessage(msg.senderId === user._id ? 'sent' : 'received', msg.content, msg.createdAt);
    }
    loadConversations();
  });
  socket.on('chat:sent', () => loadConversations());
  socket.on('chat:error', (e) => alert(e.message || 'Send failed'));
}

function convId(a, b) {
  return [a, b].sort().join('_');
}

function setBotActive(active) {
  const el = document.getElementById('botConvItem');
  if (el) el.classList.toggle('active', active);
}

async function loadConversations() {
  const listEl = document.getElementById('convList');
  setBotActive(currentOtherId === BOT_ID);
  try {
    const list = await api('/api/chat/conversations');
    listEl.innerHTML = '';
    if (!list.length) {
      listEl.innerHTML = '<div class="p-3 text-muted text-small">No conversations yet. Open a product and click "Message supplier" to start.</div>';
      return;
    }
    list.forEach(c => {
      const el = document.createElement('div');
      el.className = 'conv-item' + (currentOtherId === c.otherUser._id ? ' active' : '');
      el.dataset.otherId = c.otherUser._id;
      el.innerHTML = `<div class="name">${escapeHtml(c.otherUser.businessName || c.otherUser.name)}</div><div class="preview">${escapeHtml((c.lastMessage?.content || '').slice(0, 40))}${(c.lastMessage?.content || '').length > 40 ? '…' : ''}</div>`;
      el.onclick = () => openConversation(c.otherUser._id, c.otherUser);
      listEl.appendChild(el);
    });
  } catch (e) {
    listEl.innerHTML = '<div class="p-3 text-danger text-small">Could not load conversations.</div>';
  }
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function openConversation(otherId, otherUser) {
  currentOtherId = otherId;
  if (otherId === BOT_ID) {
    currentConversationId = null;
    setBotActive(true);
    document.querySelectorAll('#convList .conv-item').forEach(el => el.classList.remove('active'));
    document.getElementById('chatHeaderText').textContent = 'Neem Assistant';
    document.getElementById('chatInputWrap').classList.remove('hide');
    document.getElementById('chatMessages').innerHTML = '';
    showBotWelcome();
    return;
  }
  currentConversationId = convId(user._id, otherId);
  setBotActive(false);
  document.querySelectorAll('.conv-item').forEach(el => {
    el.classList.toggle('active', el.dataset.otherId === otherId);
  });
  document.getElementById('chatHeaderText').textContent = otherUser?.businessName || otherUser?.name || 'Chat';
  document.getElementById('chatInputWrap').classList.remove('hide');
  document.getElementById('chatMessages').innerHTML = '';
  loadMessages();
}

function showBotWelcome() {
  const wrap = document.getElementById('chatMessages');
  const welcome = 'Hi! I\'m the Neem Sourcing Assistant. Ask me about availability, pricing, trust scores, seasonal tips, how to source neem, or type **help** for a full guide.';
  const div = document.createElement('div');
  div.className = 'chat-bubble bot received';
  div.innerHTML = '<div>' + welcome.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + '</div><div class="time">Just now</div>';
  wrap.appendChild(div);
  scrollChatToBottom();
}

async function loadMessages() {
  if (!currentOtherId || currentOtherId === BOT_ID) return;
  try {
    const messages = await api('/api/chat/' + currentOtherId + '/messages');
    document.getElementById('chatMessages').innerHTML = '';
    messages.forEach(m => {
      const dir = m.senderId === user._id ? 'sent' : 'received';
      appendMessage(dir, m.content, m.createdAt, false);
    });
    scrollChatToBottom();
  } catch (e) {
    document.getElementById('chatMessages').innerHTML = '<div class="text-muted text-small">Could not load messages.</div>';
  }
}

function appendMessage(dir, content, createdAt, scroll = true) {
  const wrap = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + dir;
  const escaped = escapeHtml(content);
  const withBr = escaped.split('\n').join('<br>');
  div.innerHTML = `<div>${withBr}</div><div class="time">${formatDate(createdAt)}</div>`;
  wrap.appendChild(div);
  if (scroll) scrollChatToBottom();
}

function appendBotMessage(content) {
  const wrap = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-bubble bot received';
  var html = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('\n').join('<br>');
  div.innerHTML = `<div>${html}</div><div class="time">Just now</div>`;
  wrap.appendChild(div);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const el = document.getElementById('chatMessages');
  el.scrollTop = el.scrollHeight;
}

document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('messageInput').onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
};

function showBotTyping(show) {
  const wrap = document.getElementById('chatMessages');
  const existing = wrap.querySelector('.chat-bubble.typing');
  if (existing) existing.remove();
  if (show) {
    const div = document.createElement('div');
    div.className = 'chat-bubble bot received typing';
    div.id = 'botTypingIndicator';
    div.innerHTML = '<div class="text-muted"><span class="typing-dots">...</span> Neem Assistant is typing</div>';
    wrap.appendChild(div);
    scrollChatToBottom();
  }
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text || !currentOtherId) return;
  if (currentOtherId === BOT_ID) {
    appendMessage('sent', text, new Date().toISOString());
    input.value = '';
    showBotTyping(true);
    var typingShownAt = Date.now();
    var minTypingMs = 600;

    function hideTypingAndReply(reply) {
      var elapsed = Date.now() - typingShownAt;
      var wait = Math.max(0, minTypingMs - elapsed);
      setTimeout(function () {
        showBotTyping(false);
        appendBotMessage(reply);
      }, wait);
    }

    api('/api/chat/assistant', {
      method: 'POST',
      body: JSON.stringify({ message: text })
    })
      .then(function (data) {
        hideTypingAndReply(data.reply || 'Sorry, I couldn\'t generate a reply. Try asking about availability, pricing, or type **help**.');
      })
      .catch(function () {
        var fallback = window.NeemChatbot && window.NeemChatbot.getResponse ? window.NeemChatbot.getResponse(text) : 'I\'m having trouble right now. Try asking about availability, pricing, trust scores, or type **help** for guidance.';
        hideTypingAndReply(fallback);
      });
    return;
  }
  if (!socket?.connected) return;
  socket.emit('chat:message', {
    receiverId: currentOtherId,
    content: text,
    isFromShop: user.role === 'shop'
  });
  input.value = '';
}

document.querySelectorAll('#quickPrompts [data-msg]').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById('messageInput');
    input.value = (input.value ? input.value + ' ' : '') + btn.dataset.msg;
    input.focus();
  });
});

if (typeof window.initVoice === 'function') {
  window.initVoice({
    inputEl: document.getElementById('messageInput'),
    statusEl: document.getElementById('voiceStatus'),
    buttonEl: document.getElementById('voiceBtn')
  });
}

document.getElementById('botConvItem').onclick = () => openConversation(BOT_ID, { name: 'Neem Assistant' });

connectSocket();
loadConversations();

if (openWithId) {
  api('/api/users/suppliers').then(suppliers => {
    const other = suppliers.find(s => s._id === openWithId);
    if (other) openConversation(openWithId, other);
  }).catch(() => {
    openConversation(openWithId, { name: 'Supplier', _id: openWithId });
  });
}

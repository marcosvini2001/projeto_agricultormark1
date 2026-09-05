let messages = [];

const messagesEl = document.getElementById('messages');
const welcomeEl = document.getElementById('welcome');
const loadingEl = document.getElementById('loading');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const messageCounter = document.getElementById('messageCounter');

// ===== CONFIGURAÇÃO =====
// Mantém apenas o tema no localStorage
const THEME_KEY = 'campoverde_theme';
const SESSION_KEY = 'campoverde_session';

// ===== ESTADO DA SESSÃO =====
let currentSessionId = null;

// ===== FUNÇÕES DE SESSÃO =====
async function getServerSession() {
  try {
    const response = await fetch('/session', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    console.error('Erro ao obter sessão do servidor:', error);
    return null;
  }
}

async function loadMessagesFromServer() {
  try {
    const response = await fetch('/messages', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': currentSessionId || ''
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Erro ao carregar mensagens do servidor:', error);
    return [];
  }
}

// ===== FUNÇÕES EXISTENTES (mantidas) =====
function updateMessageCounter() {
  const count = messages.length;
  messageCounter.textContent =
    count === 1 ? '1 mensagem' : `${count} mensagens`;
}

function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderMarkdown(text) {
  if (!text) return '';

  // Se a biblioteca marked estiver carregada no HTML, utiliza o renderizador nativo
  if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
    const parsed = marked.parse(text);
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(parsed) : parsed;
  }

  // Fallback seguro caso 'marked' não esteja disponível no index.html
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Renderização de Títulos (Headings)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Negrito, Itálico e Código Inline
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Bloco de citação
  html = html.replace(/^&gt;\s?(.*$)/gim, '<blockquote>$1</blockquote>');

  const lines = html.split('\n');
  const result = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^[-*]\s/.test(trimmed)) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${trimmed.replace(/^[-*]\s/, '')}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (trimmed) {
        if (/^<h[1-6]>|^<blockquote>/.test(trimmed)) {
          result.push(trimmed);
        } else {
          result.push(`<p>${trimmed}</p>`);
        }
      }
    }
  }

  if (inList) result.push('</ul>');

  return result.join('');
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function createMessageElement(role, content, timestamp, isError = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${isError ? 'error' : role}`;

  const header = document.createElement('div');
  header.className = 'message-header';

  const avatar = document.createElement('span');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? '🧑‍🌾' : isError ? '⚠️' : '🌱';

  const label = document.createElement('span');
  label.textContent =
    role === 'user' ? 'Você' : isError ? 'Erro' : 'CampoVerde';

  const time = document.createElement('span');
  time.textContent = formatTime(timestamp);

  header.appendChild(avatar);
  header.appendChild(label);
  header.appendChild(document.createTextNode(' · '));
  header.appendChild(time);

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (isError) {
    bubble.textContent = content;
  } else if (role === 'assistant') {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  wrapper.appendChild(header);
  wrapper.appendChild(bubble);

  if (role === 'assistant' && !isError) {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-copy';
    copyBtn.textContent = '📋 Copiar';
    copyBtn.addEventListener('click', () => copyToClipboard(content, copyBtn));
    wrapper.appendChild(copyBtn);
  }

  return wrapper;
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => {
      btn.textContent = original;
    }, 2000);
  } catch {
    btn.textContent = '❌ Falha ao copiar';
  }
}

function renderMessages() {
  messagesEl.innerHTML = '';

  if (messages.length === 0) {
    welcomeEl.classList.remove('hidden');
  } else {
    welcomeEl.classList.add('hidden');
    for (const msg of messages) {
      messagesEl.appendChild(
        createMessageElement(msg.role, msg.content, new Date(msg.timestamp), msg.isError)
      );
    }
  }

  updateMessageCounter();
  scrollToBottom();
}

function showLoading(show) {
  loadingEl.classList.toggle('hidden', !show);
  sendBtn.disabled = show;
  messageInput.disabled = show;
  if (show) scrollToBottom();
}

// ===== REMOVIDO: saveToLocalStorage() e loadFromLocalStorage() =====
// As mensagens agora são gerenciadas pelo servidor

// ===== FUNÇÕES DE TEMA (mantidas) =====
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ===== NOVA CONVERSA (modificada) =====
function startNewConversation() {
  messages = [];
  // Remove localStorage do histórico
  localStorage.removeItem(SESSION_KEY);
  currentSessionId = null;
  renderMessages();
  messageInput.focus();
}

// ===== FUNÇÃO DE ENVIO (modificada) =====
async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const userMsg = {
    role: 'user',
    content: trimmed,
    timestamp: Date.now(),
  };

  messages.push(userMsg);
  renderMessages();
  messageInput.value = '';
  messageInput.style.height = 'auto';
  showLoading(true);

  const historico = messages
    .slice(0, -1)
    .filter((m) => !m.isError)
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const response = await fetch(''https://projeto-agricultormark1.onrender.com/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Session-Id': currentSessionId || ''
      },
      body: JSON.stringify({ mensagem: trimmed, historico }),
    });

    const data = await response.json();

    // Atualiza sessionId se o servidor fornecer um novo
    if (data.sessionId) {
      currentSessionId = data.sessionId;
      localStorage.setItem(SESSION_KEY, currentSessionId);
    }

    if (!response.ok && !data.response) {
      throw new Error('Erro na comunicação com o servidor');
    }

    messages.push({
      role: 'assistant',
      content: data.response,
      timestamp: Date.now(),
    });
  } catch (error) {
    messages.push({
      role: 'assistant',
      content:
        'Não foi possível conectar ao assistente. Verifique se o servidor está rodando e tente novamente.',
      timestamp: Date.now(),
      isError: true,
    });
  }

  showLoading(false);
  // REMOVIDO: saveToLocalStorage();
  renderMessages();
  messageInput.focus();
}

// ===== EVENT LISTENERS (mantidos) =====
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(messageInput.value);
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(messageInput.value);
  }
});

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;
});

newChatBtn.addEventListener('click', startNewConversation);
themeToggle.addEventListener('click', toggleTheme);

document.querySelectorAll('.suggestion-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    sendMessage(chip.dataset.suggestion);
  });
});

// ===== INICIALIZAÇÃO (modificada) =====
async function initializeChat() {
  // Carrega tema
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(savedTheme);
  
  // Verifica sessão
  const savedSessionId = localStorage.getItem(SESSION_KEY);
  const serverSessionId = await getServerSession();
  
  // Se a sessão do servidor for diferente da salva, limpa as mensagens
  if (serverSessionId && savedSessionId !== serverSessionId) {
    currentSessionId = serverSessionId;
    localStorage.setItem(SESSION_KEY, serverSessionId);
    messages = [];
  } else if (savedSessionId) {
    currentSessionId = savedSessionId;
    // Carrega mensagens do servidor
    messages = await loadMessagesFromServer();
  } else if (serverSessionId) {
    currentSessionId = serverSessionId;
    localStorage.setItem(SESSION_KEY, serverSessionId);
    messages = [];
  }
  
  renderMessages();
  messageInput.focus();
}

// Inicializa o chat
initializeChat();

const nameScreen = document.getElementById('name-screen');
const chatScreen = document.getElementById('chat-screen');
const nameInput = document.getElementById('name-input');
const passwordInput = document.getElementById('password-input');
const startBtn = document.getElementById('start-btn');
const userLabel = document.getElementById('user-label');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

let userName = '';
let userPassword = '';

function addMessage(role, text, pending) {
  const el = document.createElement('div');
  el.className = `msg ${role}${pending ? ' pending' : ''}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function startChat() {
  const value = nameInput.value.trim();
  if (!value) return;
  userName = value;
  userPassword = passwordInput.value;
  userLabel.textContent = userName;
  nameScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  addMessage('gina', '안녕하세요! 여행 관련해서 무엇이든 물어보세요.');
  chatInput.focus();
}

startBtn.addEventListener('click', startChat);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startChat();
});
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startChat();
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  addMessage('user', text);
  const pendingEl = addMessage('gina', '...', true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName, message: text, password: userPassword }),
    });
    const data = await res.json();
    pendingEl.classList.remove('pending');
    pendingEl.textContent = res.ok ? data.reply : `오류: ${data.error || '알 수 없는 오류'}`;
  } catch (err) {
    pendingEl.classList.remove('pending');
    pendingEl.textContent = '네트워크 오류가 발생했습니다.';
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

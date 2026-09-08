const supabaseClient = window.supabase.createClient(window.__SUPABASE_URL__, window.__SUPABASE_ANON_KEY__);

const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const emailInput = document.getElementById('email-input');
const authPasswordInput = document.getElementById('auth-password-input');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authMsg = document.getElementById('auth-msg');
const logoutBtn = document.getElementById('logout-btn');
const userLabel = document.getElementById('user-label');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

let session = null;

function showAuthMessage(text) {
  authMsg.textContent = text;
  authMsg.classList.remove('hidden');
}

function addMessage(role, text, pending) {
  const el = document.createElement('div');
  el.className = `msg ${role}${pending ? ' pending' : ''}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function enterChatScreen() {
  userLabel.textContent = session.user.email;
  authScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  messagesEl.innerHTML = '';
  addMessage('gina', '안녕하세요! 여행 관련해서 무엇이든 물어보세요.');
  chatInput.focus();
}

function backToAuthScreen() {
  session = null;
  chatScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

async function handleLogin() {
  const email = emailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) return;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    showAuthMessage(`로그인 실패: ${error.message}`);
    return;
  }
  session = data.session;
  enterChatScreen();
}

async function handleSignup() {
  const email = emailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) return;

  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    showAuthMessage(`회원가입 실패: ${error.message}`);
    return;
  }
  if (!data.session) {
    showAuthMessage('가입 확인 메일을 보냈습니다. 메일함을 확인한 뒤 로그인해주세요.');
    return;
  }
  session = data.session;
  enterChatScreen();
}

loginBtn.addEventListener('click', handleLogin);
signupBtn.addEventListener('click', handleSignup);
authPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  backToAuthScreen();
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !session) return;

  chatInput.value = '';
  addMessage('user', text);
  const pendingEl = addMessage('gina', '...', true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    pendingEl.classList.remove('pending');
    if (res.status === 401) {
      backToAuthScreen();
      showAuthMessage('세션이 만료됐습니다. 다시 로그인해주세요.');
      return;
    }
    pendingEl.textContent = res.ok ? data.reply : `오류: ${data.error || '알 수 없는 오류'}`;
  } catch (err) {
    pendingEl.classList.remove('pending');
    pendingEl.textContent = '네트워크 오류가 발생했습니다.';
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    session = data.session;
    enterChatScreen();
  }
})();

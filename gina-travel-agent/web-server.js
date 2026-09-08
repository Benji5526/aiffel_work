require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const memory = require('./services/memoryService');
const { extractMessage } = require('./services/extractAgent');
const { generateReply } = require('./services/replyAgent');
const { verifyAccessToken } = require('./services/supabaseAuth');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// anon key는 공개돼도 되는 값(Supabase 설계상 클라이언트에 노출 전제) - 서버에서
// 만들어 내려주면 프론트엔드 코드에 하드코딩하지 않아도 된다.
app.get('/config.js', (req, res) => {
  res.type('application/javascript').send(
    `window.__SUPABASE_URL__ = ${JSON.stringify(process.env.SUPABASE_URL || '')};\n` +
      `window.__SUPABASE_ANON_KEY__ = ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')};\n`
  );
});

// Supabase 계정으로 로그인한 사람만 접근 가능 - 터널로 공개할 때 아무나 무료 API
// 할당량을 쓰지 못하게 막는 보호막이다 (이름만 입력받던 이전 방식을 대체).
app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const user = await verifyAccessToken(accessToken);
  if (!user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message가 필요합니다.' });
  }

  try {
    const customer = memory.getOrCreateCustomer('web', user.id, user.email);

    const extracted = await extractMessage(message);
    const intent = { intent: extracted.intent, destination: extracted.destination, product: extracted.product };
    const updatedCustomer = memory.applyExtractedMemory(customer.id, extracted);

    const history = memory
      .getRecentMessages(customer.id, 20)
      .map((m) => ({ role: m.role === 'gina' ? 'assistant' : 'user', content: m.content }));

    memory.recordMessage(customer.id, 'customer', message, intent);

    const reply = await generateReply({ customer: updatedCustomer, history, userMessage: message, intent });

    memory.recordMessage(customer.id, 'gina', reply, null);

    res.json({ reply });
  } catch (err) {
    console.error('웹 채팅 처리 오류:', err);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
});

function start(port = process.env.WEB_PORT || 3001) {
  return app.listen(port, () => {
    console.log(`web-server listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };

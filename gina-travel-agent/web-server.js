require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const memory = require('./services/memoryService');
const { extractMessage } = require('./services/extractAgent');
const { generateReply } = require('./services/replyAgent');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 이름만으로 사람을 구분한다 (로그인 없음, MVP 범위) - 같은 이름을 쓰는 다른 사람과는
// 대화가 섞일 수 있다는 한계를 감수한다 (cli.js/webhook-server.js와 같은 서비스 계층 재사용).
//
// WEB_ACCESS_PASSWORD가 설정되어 있으면 요청마다 비밀번호를 확인한다 - 터널(ngrok 등)로
// 공개할 때 아무나 무료 API 할당량을 쓰지 못하게 막는 최소한의 보호막이다.
// 설정 안 하면(로컬 전용일 때) 그냥 통과시킨다.
app.post('/api/chat', async (req, res) => {
  const { name, message, password } = req.body || {};

  const requiredPassword = process.env.WEB_ACCESS_PASSWORD;
  if (requiredPassword && password !== requiredPassword) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }

  if (!name || !name.trim() || !message || !message.trim()) {
    return res.status(400).json({ error: 'name과 message가 모두 필요합니다.' });
  }

  try {
    const customer = memory.getOrCreateCustomer('web', name.trim(), name.trim());

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

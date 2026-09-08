require('dotenv').config({ quiet: true });

const express = require('express');
const instagram = require('./platforms/instagram');
const memory = require('./services/memoryService');
const { extractMessage } = require('./services/extractAgent');
const { generateReply } = require('./services/replyAgent');

const app = express();

// 서명 검증에 원본 바이트가 필요해서, JSON 파싱과 동시에 raw body를 보관해 둔다.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Meta 웹훅 검증 (구독 시 1회, 그리고 설정 변경 시).
app.get('/webhook/instagram', (req, res) => {
  const result = instagram.verifyChallenge(req.query);
  if (result.ok) {
    res.status(200).send(result.challenge);
  } else {
    res.sendStatus(403);
  }
});

// 실제 메시지 수신.
app.post('/webhook/instagram', async (req, res) => {
  const signature = req.get('X-Hub-Signature-256');
  if (!instagram.verifySignature(req.rawBody, signature)) {
    return res.sendStatus(401);
  }

  // Meta는 빠른 200 응답을 기대한다 - 먼저 ack하고 그 다음에 처리한다.
  res.sendStatus(200);

  const events = instagram.parseMessagingEvents(req.body);
  for (const event of events) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await handleInstagramMessage(event.senderId, event.text);
    } catch (err) {
      console.error('Instagram 메시지 처리 오류:', err);
    }
  }
});

// cli.js의 handleMessage와 같은 서비스 계층(extractAgent/memoryService/replyAgent)을 그대로 사용한다 -
// 채널마다 다른 건 "고객을 어떻게 식별하는지"뿐이다 (여긴 IGSID, cli.js는 사람이 입력한 이름).
async function handleInstagramMessage(senderId, text) {
  const customer = memory.getOrCreateCustomer('instagram', senderId, null);

  const extracted = await extractMessage(text);
  const intent = { intent: extracted.intent, destination: extracted.destination, product: extracted.product };
  const updatedCustomer = memory.applyExtractedMemory(customer.id, extracted);

  const history = memory
    .getRecentMessages(customer.id, 20)
    .map((m) => ({ role: m.role === 'gina' ? 'assistant' : 'user', content: m.content }));

  memory.recordMessage(customer.id, 'customer', text, intent);

  const reply = await generateReply({ customer: updatedCustomer, history, userMessage: text, intent });

  memory.recordMessage(customer.id, 'gina', reply, null);

  await instagram.sendReply(senderId, reply);
}

function start(port = process.env.PORT || 3000) {
  return app.listen(port, () => {
    console.log(`webhook-server listening on port ${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start, handleInstagramMessage };

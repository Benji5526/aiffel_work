const crypto = require('crypto');

const SEND_API_VERSION = 'v25.0';

// GET /webhook/instagram 검증. Meta 문서: hub.verify_token이 맞을 때만 hub.challenge를 그대로 돌려준다.
function verifyChallenge(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return { ok: true, challenge };
  }
  return { ok: false };
}

// X-Hub-Signature-256 검증. rawBody는 Buffer/string(파싱 전 원본), signatureHeader는 "sha256=<hex>" 형식.
function verifySignature(rawBody, signatureHeader) {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!signatureHeader || !appSecret) return false;

  const [algo, providedHex] = signatureHeader.split('=');
  if (algo !== 'sha256' || !providedHex) return false;

  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  const expected = Buffer.from(expectedHex, 'hex');
  const provided = Buffer.from(providedHex, 'hex');
  if (expected.length !== provided.length) return false;

  return crypto.timingSafeEqual(expected, provided);
}

// Meta 웹훅 payload -> [{ senderId, text }]. 텍스트 메시지가 아닌 이벤트(postback 등)는 건너뛴다.
function parseMessagingEvents(payload) {
  if (!payload || payload.object !== 'instagram' || !Array.isArray(payload.entry)) {
    return [];
  }

  const events = [];
  for (const entry of payload.entry) {
    for (const item of entry.messaging || []) {
      if (item.sender && item.sender.id && item.message && typeof item.message.text === 'string') {
        events.push({ senderId: item.sender.id, text: item.message.text });
      }
    }
  }
  return events;
}

// 답장 발송. 토큰이 없으면(테스트/App Review 대기 중) 실제 호출 없이 로그만 남긴다.
async function sendReply(recipientId, text) {
  const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_IG_ID;

  if (!token) {
    console.log(
      `[DRY-RUN - INSTAGRAM_PAGE_ACCESS_TOKEN 없음, 실제 Send API 호출 안 함] recipient=${recipientId} message=${JSON.stringify(text)}`
    );
    return { dryRun: true };
  }

  const response = await fetch(`https://graph.instagram.com/${SEND_API_VERSION}/${igId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Instagram Send API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

module.exports = { verifyChallenge, verifySignature, parseMessagingEvents, sendReply };

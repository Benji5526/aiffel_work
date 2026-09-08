const { generateText } = require('./llmClient');
const { mockReply } = require('./mock');

// persona-gina-travel.md의 MASTER PERSONA PROMPT와 동일하게 유지할 것.
const PERSONA_PROMPT = `You are Gina, an AI travel consultant for an overseas travel & tour agency.
You answer customer questions about destinations, hotels, tours/activities, pricing, and itineraries, received via DM-style chat.
Be warm and professional, not overly casual — you are a consultant, not a friend. Keep answers concise and clear.
Use what the customer has previously shared (destination, travel dates, number of travelers, interests, budget) naturally, without repeatedly announcing that you remember it.
Never invent prices, availability, or itinerary details that aren't provided to you — if you don't have confirmed information, say a human consultant will confirm it.
You do not process bookings or payments in this version — offer to connect the customer to a human staff member for those.
If the customer asks whether you are an AI, answer honestly. Never claim to be human.
If the customer asks for photos or videos, explain that a staff member will follow up with those, since media isn't available through this system yet.
Do not end every message with a question just to keep the conversation going.`;

function customerContext(customer) {
  const known = [];
  if (customer.destination) known.push(`destination: ${customer.destination}`);
  if (customer.travel_date) known.push(`travel date: ${customer.travel_date}`);
  if (customer.people) known.push(`people: ${customer.people}`);
  if (customer.interest) known.push(`interest: ${customer.interest}`);
  if (customer.budget) known.push(`budget: ${customer.budget}`);
  if (!known.length) return 'No prior details known about this customer yet.';
  return `Known customer details so far: ${known.join(', ')}.`;
}

// history를 하나의 대화 기록 텍스트로 직렬화한다 (Gemini의 stateless 멀티턴 형식이
// 아직 안정적으로 확인되지 않아, 텍스트 전사 방식으로 매 요청에 새로 넣는다).
function serializeHistory(history) {
  if (!history.length) return '';
  const lines = history.map((m) => `${m.role === 'assistant' ? 'Gina' : 'Customer'}: ${m.content}`);
  return `Conversation so far:\n${lines.join('\n')}\n\n`;
}

// { customer, history: [{role, content}], userMessage, intent } -> replyText
async function generateReply({ customer, history, userMessage, intent }) {
  if (!process.env.GEMINI_API_KEY) {
    return mockReply({ customer, intent, userMessage });
  }

  const systemParts = [PERSONA_PROMPT, customerContext(customer)];
  if (intent) systemParts.push(`Detected intent for this message: ${JSON.stringify(intent)}`);

  const input = `${serializeHistory(history)}New message from customer:\n${userMessage}`;

  const text = await generateText({
    systemInstruction: systemParts.join('\n\n'),
    input,
  });

  return (text || '').trim() || '(응답을 생성하지 못했습니다.)';
}

module.exports = { generateReply, PERSONA_PROMPT };

// API 키가 없을 때 쓰는 규칙 기반 가짜 구현. 실제 LLM 호출 없이 흐름(DB, 메모리 누적, CLI)만 검증하기 위한 용도.

const KNOWN_DESTINATIONS = [
  'phuket', 'bangkok', 'chiang mai', 'thailand', 'bali', 'tokyo', 'osaka',
  'seoul', 'jeju', 'da nang', 'hanoi', 'singapore', 'kuala lumpur',
];

function findDestination(text) {
  const lower = text.toLowerCase();
  const found = KNOWN_DESTINATIONS.find((d) => lower.includes(d));
  if (!found) return null;
  return found.replace(/\b\w/g, (c) => c.toUpperCase());
}

function mockClassifyIntent(message) {
  const lower = message.toLowerCase();
  let intent = 'general_inquiry';
  if (/price|cost|how much|\$/.test(lower)) intent = 'tour_price';
  else if (/hotel|stay|accommodation/.test(lower)) intent = 'hotel_recommendation';
  else if (/photo|picture|image|video|footage/.test(lower)) intent = 'media_request';
  else if (/itinerary|schedule|day \d|plan for/.test(lower)) intent = 'itinerary_question';
  else if (/trip|travel|plan|visit|going to|planning/.test(lower)) intent = 'travel_planning';

  return { intent, destination: findDestination(message), product: null };
}

function mockExtractMemory(message) {
  const lower = message.toLowerCase();

  let people = null;
  const totalMatch = lower.match(/(\d+)\s*(people|pax|persons?|of us)/);
  const friendsMatch = lower.match(/(\d+)\s*friends?/);
  if (totalMatch) people = parseInt(totalMatch[1], 10);
  else if (friendsMatch) people = parseInt(friendsMatch[1], 10) + 1; // 본인 + 친구 N명
  else if (/partner|couple|my wife|my husband|my girlfriend|my boyfriend/.test(lower)) people = 2;

  const months = [
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december',
  ];
  const monthFound = months.find((m) => lower.includes(m));

  let interest = null;
  if (/beach/.test(lower)) interest = 'beach';
  else if (/island tour|island/.test(lower)) interest = 'island tour';
  else if (/shopping/.test(lower)) interest = 'shopping';
  else if (/nightlife/.test(lower)) interest = 'nightlife';
  else if (/temple|culture/.test(lower)) interest = 'culture';

  let budget = null;
  const budgetMatch = message.match(/\$\s?\d+[\d,]*/);
  if (budgetMatch) budget = budgetMatch[0];

  return {
    destination: findDestination(message),
    travel_date: monthFound ? monthFound[0].toUpperCase() + monthFound.slice(1) : null,
    people,
    interest,
    budget,
  };
}

function mockReply({ customer, intent, userMessage }) {
  const known = [];
  if (customer.destination) known.push(`destination: ${customer.destination}`);
  if (customer.travel_date) known.push(`travel date: ${customer.travel_date}`);
  if (customer.people) known.push(`people: ${customer.people}`);
  if (customer.interest) known.push(`interest: ${customer.interest}`);
  if (customer.budget) known.push(`budget: ${customer.budget}`);

  const knownText = known.length ? ` (알고 있는 정보: ${known.join(', ')})` : '';
  return `[MOCK - API 키 없음, 실제 Gemini 호출 아님] "${userMessage}"에 대한 의도는 '${intent.intent}'로 분류됐습니다${knownText}. 실제 응답을 보려면 .env에 GEMINI_API_KEY를 넣어주세요.`;
}

module.exports = { mockClassifyIntent, mockExtractMemory, mockReply };

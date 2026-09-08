const { generateStructured } = require('./llmClient');
const { mockClassifyIntent, mockExtractMemory } = require('./mock');

const INTENT_VALUES = [
  'travel_planning',
  'tour_price',
  'hotel_recommendation',
  'itinerary_question',
  'media_request',
  'general_inquiry',
];

// 의도 분석 + 고객 메모리 추출을 한 번의 구조화 출력 호출로 합친다
// (무료 API 티어의 요청 한도를 아끼기 위해 - 턴당 3회 -> 2회 호출).
const extractionJsonSchema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: INTENT_VALUES },
    destination: { type: ['string', 'null'] },
    product: { type: ['string', 'null'] },
    travel_date: { type: ['string', 'null'] },
    people: { type: ['integer', 'null'] },
    interest: { type: ['string', 'null'] },
    budget: { type: ['string', 'null'] },
  },
  required: ['intent', 'destination', 'product', 'travel_date', 'people', 'interest', 'budget'],
};

// message: string -> { intent, destination, product, travel_date, people, interest, budget }
async function extractMessage(message) {
  if (!process.env.GEMINI_API_KEY) {
    const intent = mockClassifyIntent(message);
    const memory = mockExtractMemory(message);
    return { ...intent, ...memory };
  }

  const parsed = await generateStructured({
    systemInstruction:
      'Analyze this customer DM for a travel agency chatbot. Classify its intent, AND separately extract any travel-planning details the customer explicitly stated (destination, product, travel_date, number of people, interest, budget). Fields not mentioned must be null - never guess or invent.',
    input: message,
    jsonSchema: extractionJsonSchema,
  });

  if (!parsed) {
    return {
      intent: 'general_inquiry',
      destination: null,
      product: null,
      travel_date: null,
      people: null,
      interest: null,
      budget: null,
    };
  }
  return parsed;
}

module.exports = { extractMessage, INTENT_VALUES };

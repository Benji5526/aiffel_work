const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-3.8-flash';

let _client = null;
function client() {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _client;
}

// 자유 형식 텍스트 응답. input은 페르소나/이력을 포함한 완성된 프롬프트 문자열.
async function generateText({ systemInstruction, input }) {
  const interaction = await client().interactions.create({
    model: MODEL,
    system_instruction: systemInstruction,
    input,
  });
  return interaction.output_text;
}

// jsonSchema를 따르는 구조화된 JSON 응답. 파싱 실패 시 null 반환.
async function generateStructured({ systemInstruction, input, jsonSchema }) {
  const interaction = await client().interactions.create({
    model: MODEL,
    system_instruction: systemInstruction,
    input,
    response_format: { type: 'text', mime_type: 'application/json', schema: jsonSchema },
  });

  try {
    return JSON.parse(interaction.output_text);
  } catch {
    return null;
  }
}

module.exports = { generateText, generateStructured, MODEL };

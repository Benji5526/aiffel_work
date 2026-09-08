const db = require('../db');

function getOrCreateCustomer(platform, platformUserId, name) {
  const existing = db
    .prepare('SELECT * FROM customers WHERE platform = ? AND platform_user_id = ?')
    .get(platform, platformUserId);
  if (existing) return existing;

  const result = db
    .prepare('INSERT INTO customers (platform, platform_user_id, name) VALUES (?, ?, ?)')
    .run(platform, platformUserId, name || null);

  return db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
}

function getCustomer(customerId) {
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
}

// extracted: { destination, travel_date, people, interest, budget } (extractAgent가 이미 뽑아온 값).
// 기존 프로필에 없는 값만 채운다 (덮어쓰지 않음). LLM 호출 없음 - 순수 DB 병합.
function applyExtractedMemory(customerId, extracted) {
  const existing = getCustomer(customerId);
  const merged = {
    destination: existing.destination ?? extracted.destination,
    travel_date: existing.travel_date ?? extracted.travel_date,
    people: existing.people ?? extracted.people,
    interest: existing.interest ?? extracted.interest,
    budget: existing.budget ?? extracted.budget,
  };

  db.prepare(
    `UPDATE customers SET
       destination = ?, travel_date = ?, people = ?, interest = ?, budget = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(merged.destination, merged.travel_date, merged.people, merged.interest, merged.budget, customerId);

  return getCustomer(customerId);
}

function recordMessage(customerId, role, content, intent) {
  db.prepare(
    'INSERT INTO messages (customer_id, role, content, intent_json) VALUES (?, ?, ?, ?)'
  ).run(customerId, role, content, intent ? JSON.stringify(intent) : null);
}

function getRecentMessages(customerId, limit = 20) {
  return db
    .prepare(
      'SELECT role, content FROM messages WHERE customer_id = ? ORDER BY id DESC LIMIT ?'
    )
    .all(customerId, limit)
    .reverse();
}

module.exports = {
  getOrCreateCustomer,
  getCustomer,
  applyExtractedMemory,
  recordMessage,
  getRecentMessages,
};

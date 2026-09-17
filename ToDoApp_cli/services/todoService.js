const db = require('../db');

// 이 앱은 한국 시간(KST, UTC+9) 기준으로 "오늘"을 판단한다. SQLite의 'now'와
// 저장된 타임스탬프는 모두 UTC라 +9시간을 더해야 KST 날짜가 된다.
// 한국은 서머타임이 없어 고정 오프셋으로 충분하다.
const KST_SHIFT = '+9 hours';

// 다듬은 title을 돌려주고, 문자열이 아니거나 공백뿐이면 null을 돌려준다.
function normalizeTitle(title) {
  if (typeof title !== 'string') return null;
  return title.trim() || null;
}

function getTagsForTodo(todoId) {
  return db
    .prepare(
      `SELECT tags.name FROM tags
       JOIN todo_tags ON todo_tags.tag_id = tags.id
       WHERE todo_tags.todo_id = ?
       ORDER BY tags.name`
    )
    .all(todoId)
    .map((row) => row.name);
}

function attachTags(todo) {
  return { ...todo, completed: !!todo.completed, tags: getTagsForTodo(todo.id) };
}

function upsertTag(name) {
  db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
  return db.prepare('SELECT id FROM tags WHERE name = ?').get(name).id;
}

function setTodoTags(todoId, tagNames) {
  db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(todoId);
  for (const name of tagNames) {
    const tagId = upsertTag(name);
    db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tagId);
  }
}

function parseTagNames(tags) {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : String(tags).split(',');
  return [...new Set(list.map((t) => t.trim()).filter(Boolean))];
}

// { q?, date?, tag? } -> todo[]
function listTodos({ q, date, tag } = {}) {
  let sql = 'SELECT DISTINCT todos.* FROM todos';
  const clauses = [];
  const params = [];

  if (tag) {
    sql += ' JOIN todo_tags ON todo_tags.todo_id = todos.id JOIN tags ON tags.id = todo_tags.tag_id';
    clauses.push('tags.name = ?');
    params.push(tag);
  }
  if (q) {
    clauses.push('todos.title LIKE ?');
    params.push(`%${q}%`);
  }
  if (date === 'today') {
    clauses.push(`todos.due_date = date('now', '${KST_SHIFT}')`);
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY todos.completed ASC, (todos.due_date IS NULL), todos.due_date ASC, todos.id DESC';

  return db.prepare(sql).all(...params).map(attachTags);
}

// { title, due_date?, tags? } -> todo | throws Error
function addTodo({ title, due_date, tags } = {}) {
  const newTitle = normalizeTitle(title);
  if (newTitle === null) {
    const err = new Error('title은 필수입니다.');
    err.code = 'INVALID_TITLE';
    throw err;
  }

  const result = db
    .prepare('INSERT INTO todos (title, due_date) VALUES (?, ?)')
    .run(newTitle, due_date || null);

  setTodoTags(result.lastInsertRowid, parseTagNames(tags));

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  return attachTags(todo);
}

// id, { title?, completed?, due_date?, tags? } -> todo | null
function updateTodo(id, { title, completed, due_date, tags } = {}) {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return null;

  // title을 보냈다면 반드시 유효해야 한다. 검증 없이 title.trim()을 부르면
  // null일 때 TypeError가 나고, 공백뿐이면 빈 제목이 저장된다.
  let nextTitle = existing.title;
  if (title !== undefined) {
    const normalized = normalizeTitle(title);
    if (normalized === null) {
      const err = new Error('title은 비어 있을 수 없습니다.');
      err.code = 'INVALID_TITLE';
      throw err;
    }
    nextTitle = normalized;
  }

  db.prepare(
    `UPDATE todos SET
       title = ?,
       completed = ?,
       due_date = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    nextTitle,
    completed !== undefined ? (completed ? 1 : 0) : existing.completed,
    due_date !== undefined ? (due_date || null) : existing.due_date,
    existing.id
  );

  if (tags !== undefined) setTodoTags(existing.id, parseTagNames(tags));

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(existing.id);
  return attachTags(todo);
}

// id -> boolean (성공 여부)
function deleteTodo(id) {
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return result.changes > 0;
}

// -> string[]
function listTags() {
  return db.prepare('SELECT name FROM tags ORDER BY name').all().map((row) => row.name);
}

// -> todo[] (오늘 완료 처리된 할 일)
function summaryToday() {
  return db
    .prepare(
      `SELECT * FROM todos
       WHERE completed = 1
         AND date(updated_at, '${KST_SHIFT}') = date('now', '${KST_SHIFT}')
       ORDER BY updated_at DESC`
    )
    .all()
    .map(attachTags);
}

module.exports = { listTodos, addTodo, updateTodo, deleteTodo, listTags, summaryToday };

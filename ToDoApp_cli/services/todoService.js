const db = require('../db');

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
    clauses.push("todos.due_date = date('now')");
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY todos.completed ASC, (todos.due_date IS NULL), todos.due_date ASC, todos.id DESC';

  return db.prepare(sql).all(...params).map(attachTags);
}

// { title, due_date?, tags? } -> todo | throws Error
function addTodo({ title, due_date, tags } = {}) {
  if (!title || !title.trim()) {
    const err = new Error('title은 필수입니다.');
    err.code = 'INVALID_TITLE';
    throw err;
  }

  const result = db
    .prepare('INSERT INTO todos (title, due_date) VALUES (?, ?)')
    .run(title.trim(), due_date || null);

  setTodoTags(result.lastInsertRowid, parseTagNames(tags));

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  return attachTags(todo);
}

// id, { title?, completed?, due_date?, tags? } -> todo | null
function updateTodo(id, { title, completed, due_date, tags } = {}) {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE todos SET
       title = ?,
       completed = ?,
       due_date = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title !== undefined ? title.trim() : existing.title,
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
       WHERE completed = 1 AND date(updated_at) = date('now')
       ORDER BY updated_at DESC`
    )
    .all()
    .map(attachTags);
}

module.exports = { listTodos, addTodo, updateTodo, deleteTodo, listTags, summaryToday };

const express = require('express');
const db = require('../db');

const router = express.Router();

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

// GET /api/todos?q=검색어&date=today&tag=이름
router.get('/', (req, res) => {
  const { q, date, tag } = req.query;

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

  const todos = db.prepare(sql).all(...params).map(attachTags);
  res.json(todos);
});

// POST /api/todos { title, due_date?, tags? }
router.post('/', (req, res) => {
  const { title, due_date, tags } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title은 필수입니다.' });
  }

  const result = db
    .prepare('INSERT INTO todos (title, due_date) VALUES (?, ?)')
    .run(title.trim(), due_date || null);

  setTodoTags(result.lastInsertRowid, parseTagNames(tags));

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(attachTags(todo));
});

// PATCH /api/todos/:id { title?, completed?, due_date?, tags? }
router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });

  const { title, completed, due_date, tags } = req.body;
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
  res.json(attachTags(todo));
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
  res.status(204).end();
});

module.exports = router;

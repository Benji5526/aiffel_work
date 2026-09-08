const addForm = document.getElementById('add-form');
const titleInput = document.getElementById('title-input');
const dueDateInput = document.getElementById('due-date-input');
const tagsInput = document.getElementById('tags-input');

const searchInput = document.getElementById('search-input');
const tagFilter = document.getElementById('tag-filter');
const todayToggle = document.getElementById('today-toggle');

const todoList = document.getElementById('todo-list');
const emptyMessage = document.getElementById('empty-message');

function buildQuery() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
  if (tagFilter.value) params.set('tag', tagFilter.value);
  if (todayToggle.checked) params.set('date', 'today');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetchTodos() {
  const res = await fetch(`/api/todos${buildQuery()}`);
  const todos = await res.json();
  renderTodos(todos);
}

async function fetchTags() {
  const res = await fetch('/api/tags');
  const tags = await res.json();
  const current = tagFilter.value;
  tagFilter.innerHTML = '<option value="">전체 태그</option>';
  for (const tag of tags) {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  }
  tagFilter.value = current;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function renderTodos(todos) {
  todoList.innerHTML = '';
  emptyMessage.hidden = todos.length > 0;

  for (const todo of todos) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => toggleCompleted(todo.id, checkbox.checked));

    const body = document.createElement('div');
    body.className = 'todo-body';

    const title = document.createElement('div');
    title.className = 'todo-title';
    title.textContent = todo.title;
    body.appendChild(title);

    if (todo.due_date || todo.tags.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'todo-meta';

      if (todo.due_date) {
        const due = document.createElement('span');
        due.className = 'due-date' + (!todo.completed && todo.due_date < todayISO() ? ' overdue' : '');
        due.textContent = `📅 ${todo.due_date}`;
        meta.appendChild(due);
      }

      for (const tag of todo.tags) {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = tag;
        meta.appendChild(chip);
      }

      body.appendChild(meta);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = '삭제';
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(deleteBtn);
    todoList.appendChild(li);
  }
}

async function toggleCompleted(id, completed) {
  await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  fetchTodos();
}

async function deleteTodo(id) {
  await fetch(`/api/todos/${id}`, { method: 'DELETE' });
  fetchTodos();
  fetchTags();
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      due_date: dueDateInput.value || null,
      tags: tagsInput.value,
    }),
  });

  titleInput.value = '';
  dueDateInput.value = '';
  tagsInput.value = '';
  fetchTodos();
  fetchTags();
});

searchInput.addEventListener('input', debounce(fetchTodos, 250));
tagFilter.addEventListener('change', fetchTodos);
todayToggle.addEventListener('change', fetchTodos);

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

fetchTodos();
fetchTags();

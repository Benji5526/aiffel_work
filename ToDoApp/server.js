require('dotenv').config();
const path = require('path');
const express = require('express');

const todosRouter = require('./routes/todos');
const tagsRouter = require('./routes/tags');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/todos', todosRouter);
app.use('/api/tags', tagsRouter);

app.listen(PORT, () => {
  console.log(`Todo 앱 실행 중: http://localhost:${PORT}`);
});

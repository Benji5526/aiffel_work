const path = require('path');
const express = require('express');

const todosRouter = require('./routes/todos');
const tagsRouter = require('./routes/tags');

// listen 은 server.js 가 맡는다. 여기서는 앱만 조립해 내보내므로
// 테스트가 포트를 열지 않고도 같은 구성을 그대로 쓸 수 있다.
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/todos', todosRouter);
app.use('/api/tags', tagsRouter);

module.exports = app;

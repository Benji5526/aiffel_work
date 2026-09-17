require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Todo 앱 실행 중: http://localhost:${PORT}`);
});

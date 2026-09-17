const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

// db.js 가 로드되기 전에 지정해야 한다. 실제 todo.db 를 건드리지 않기 위한 격리.
const DB_FILE = path.join(os.tmpdir(), `todo-test-${process.pid}-${Date.now()}.db`);
process.env.TODO_DB_PATH = DB_FILE;

const app = require('../app');
const db = require('../db');

// KST(UTC+9) 기준 날짜. 서버가 쓰는 기준과 같아야 한다.
function kstDate(offsetDays = 0) {
  const ms = Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

let server;
let base;

async function api(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // 204 No Content 등 본문이 없는 응답
  }
  return { status: res.status, body: json };
}

function storedTitle(id) {
  return db.prepare('SELECT title FROM todos WHERE id = ?').get(id).title;
}

function storedDue(id) {
  return db.prepare('SELECT due_date FROM todos WHERE id = ?').get(id).due_date;
}

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/todos`;
});

after(() => {
  server.close();
  db.close();
  fs.rmSync(DB_FILE, { force: true });
});

beforeEach(() => {
  db.exec('DELETE FROM todo_tags; DELETE FROM todos; DELETE FROM tags;');
});

describe('POST /api/todos — title 검증', () => {
  it('정상 제목은 201로 생성하고 앞뒤 공백을 지운다', async () => {
    const res = await api('POST', '/', { title: '  할 일  ' });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, '할 일');
  });

  for (const [value, why] of [
    [null, 'null'],
    [undefined, '미전달'],
    ['', '빈 문자열'],
    ['   ', '공백뿐'],
    [123, '숫자'],
  ]) {
    it(`title이 ${why}이면 400 (500이 아니라)`, async () => {
      const res = await api('POST', '/', { title: value });
      assert.equal(res.status, 400);
    });
  }
});

describe('PATCH /api/todos/:id — title 검증', () => {
  let id;

  beforeEach(async () => {
    id = (await api('POST', '/', { title: '원래 제목' })).body.id;
  });

  for (const [value, why] of [
    [null, 'null'],
    ['   ', '공백뿐'],
    [123, '숫자'],
  ]) {
    it(`title이 ${why}이면 400이고 저장값은 그대로다`, async () => {
      const res = await api('PATCH', `/${id}`, { title: value });
      assert.equal(res.status, 400);
      assert.equal(storedTitle(id), '원래 제목');
    });
  }

  it('정상 제목은 200으로 갱신하고 공백을 지운다', async () => {
    const res = await api('PATCH', `/${id}`, { title: '  새 제목  ' });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, '새 제목');
  });

  it('title을 보내지 않으면 기존 제목을 유지한다', async () => {
    const res = await api('PATCH', `/${id}`, { completed: true });
    assert.equal(res.body.title, '원래 제목');
    assert.equal(res.body.completed, true);
  });
});

describe('due_date 형식 검증', () => {
  const INVALID = [
    ['2026-02-30', '없는 날짜'],
    ['2026-02-29', '평년의 2월 29일'],
    ['2026-13-01', '13월'],
    ['2026-09-31', '9월 31일'],
    ['2026-2-5', '0 패딩 없음'],
    ['20260918', '구분자 없음'],
    ['2026/09/18', '슬래시 구분자'],
    ['tomorrow', '자연어'],
    ['2026-09-18T00:00:00Z', '시각 포함'],
    [true, 'boolean'],
    [123, '숫자'],
  ];

  for (const [value, why] of INVALID) {
    it(`POST에서 ${JSON.stringify(value)} (${why})는 400`, async () => {
      const res = await api('POST', '/', { title: 'x', due_date: value });
      assert.equal(res.status, 400);
    });
  }

  it('정상 날짜는 그대로 저장된다', async () => {
    const res = await api('POST', '/', { title: 'x', due_date: '2026-09-18' });
    assert.equal(res.status, 201);
    assert.equal(res.body.due_date, '2026-09-18');
  });

  it('윤년 2024-02-29는 허용한다', async () => {
    const res = await api('POST', '/', { title: 'x', due_date: '2024-02-29' });
    assert.equal(res.body.due_date, '2024-02-29');
  });

  it('앞뒤 공백을 지운다', async () => {
    const res = await api('POST', '/', { title: 'x', due_date: '  2026-09-18  ' });
    assert.equal(res.body.due_date, '2026-09-18');
  });

  for (const [value, why] of [[null, 'null'], ['', '빈 문자열'], [undefined, '미전달']]) {
    it(`${why}이면 마감일 없음으로 둔다`, async () => {
      const res = await api('POST', '/', { title: 'x', due_date: value });
      assert.equal(res.body.due_date, null);
    });
  }

  it('PATCH에서 잘못된 날짜는 400이고 저장값은 그대로다', async () => {
    const id = (await api('POST', '/', { title: 'x', due_date: '2026-09-18' })).body.id;
    const res = await api('PATCH', `/${id}`, { due_date: '2026-02-30' });
    assert.equal(res.status, 400);
    assert.equal(storedDue(id), '2026-09-18');
  });

  it('PATCH에 null을 보내면 마감일을 해제한다', async () => {
    const id = (await api('POST', '/', { title: 'x', due_date: '2026-09-18' })).body.id;
    const res = await api('PATCH', `/${id}`, { due_date: null });
    assert.equal(res.status, 200);
    assert.equal(res.body.due_date, null);
  });

  it('due_date를 보내지 않으면 기존 마감일을 유지한다', async () => {
    const id = (await api('POST', '/', { title: 'x', due_date: '2026-09-18' })).body.id;
    const res = await api('PATCH', `/${id}`, { completed: true });
    assert.equal(res.body.due_date, '2026-09-18');
  });
});

describe('GET /api/todos?date=today — KST 기준', () => {
  it('KST 오늘 마감만 돌려주고 어제 마감은 제외한다', async () => {
    await api('POST', '/', { title: '오늘 마감', due_date: kstDate(0) });
    await api('POST', '/', { title: '어제 마감', due_date: kstDate(-1) });
    await api('POST', '/', { title: '내일 마감', due_date: kstDate(1) });

    const titles = (await api('GET', '/?date=today')).body.map((t) => t.title);
    assert.deepEqual(titles, ['오늘 마감']);
  });

  it("SQLite의 date('now','+9 hours')가 KST 날짜와 일치한다", () => {
    const fromSqlite = db.prepare("SELECT date('now', '+9 hours') AS d").get().d;
    assert.equal(fromSqlite, kstDate(0));
  });
});

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// db.js 가 로드되기 전에 지정해야 한다. 실제 todo.db 를 건드리지 않기 위한 격리.
const DB_FILE = path.join(os.tmpdir(), `todo-cli-test-${process.pid}-${Date.now()}.db`);
process.env.TODO_DB_PATH = DB_FILE;

const svc = require('../services/todoService');
const db = require('../db');

// KST(UTC+9) 기준 날짜.
function kstDate(offsetDays = 0) {
  const ms = Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function expectCode(fn, code) {
  try {
    fn();
  } catch (err) {
    assert.equal(err.code, code, `기대한 code=${code}, 실제=${err.code} (${err.message})`);
    return err;
  }
  assert.fail('예외가 발생하지 않았습니다.');
}

after(() => {
  db.close();
  fs.rmSync(DB_FILE, { force: true });
});

beforeEach(() => {
  db.exec('DELETE FROM todo_tags; DELETE FROM todos; DELETE FROM tags;');
});

describe('addTodo — title 검증', () => {
  it('정상 제목은 공백을 지우고 저장한다', () => {
    assert.equal(svc.addTodo({ title: '  할 일  ' }).title, '할 일');
  });

  for (const [value, why] of [
    [null, 'null'],
    [undefined, '미전달'],
    ['', '빈 문자열'],
    ['   ', '공백뿐'],
    [123, '숫자'],
  ]) {
    it(`title이 ${why}이면 INVALID_TITLE (TypeError가 아니라)`, () => {
      const err = expectCode(() => svc.addTodo({ title: value }), 'INVALID_TITLE');
      assert.ok(!(err instanceof TypeError));
    });
  }
});

describe('updateTodo — title 검증', () => {
  let id;

  beforeEach(() => {
    id = svc.addTodo({ title: '원래 제목' }).id;
  });

  for (const [value, why] of [[null, 'null'], ['   ', '공백뿐'], [123, '숫자']]) {
    it(`title이 ${why}이면 INVALID_TITLE이고 저장값은 그대로다`, () => {
      expectCode(() => svc.updateTodo(id, { title: value }), 'INVALID_TITLE');
      assert.equal(db.prepare('SELECT title FROM todos WHERE id=?').get(id).title, '원래 제목');
    });
  }

  it('정상 제목은 공백을 지우고 갱신한다', () => {
    assert.equal(svc.updateTodo(id, { title: '  새 제목  ' }).title, '새 제목');
  });

  it('title을 넘기지 않으면 기존 제목을 유지한다', () => {
    const todo = svc.updateTodo(id, { completed: true });
    assert.equal(todo.title, '원래 제목');
    assert.equal(todo.completed, true);
  });

  it('없는 id면 null을 돌려준다', () => {
    assert.equal(svc.updateTodo(999999, { completed: true }), null);
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
    // cli.js 의 parseFlags 는 `--due` 에 값이 없으면 true 를 넘긴다.
    [true, 'boolean (--due 값 누락)'],
    [123, '숫자'],
  ];

  for (const [value, why] of INVALID) {
    it(`addTodo에서 ${JSON.stringify(value)} (${why})는 INVALID_DUE_DATE`, () => {
      expectCode(() => svc.addTodo({ title: 'x', due_date: value }), 'INVALID_DUE_DATE');
    });
  }

  it('정상 날짜는 그대로 저장한다', () => {
    assert.equal(svc.addTodo({ title: 'x', due_date: '2026-09-18' }).due_date, '2026-09-18');
  });

  it('윤년 2024-02-29는 허용한다', () => {
    assert.equal(svc.addTodo({ title: 'x', due_date: '2024-02-29' }).due_date, '2024-02-29');
  });

  it('앞뒤 공백을 지운다', () => {
    assert.equal(svc.addTodo({ title: 'x', due_date: '  2026-09-18  ' }).due_date, '2026-09-18');
  });

  for (const [value, why] of [[null, 'null'], ['', '빈 문자열'], [undefined, '미전달']]) {
    it(`${why}이면 마감일 없음으로 둔다`, () => {
      assert.equal(svc.addTodo({ title: 'x', due_date: value }).due_date, null);
    });
  }

  it('updateTodo에서 잘못된 날짜는 예외이고 저장값은 그대로다', () => {
    const id = svc.addTodo({ title: 'x', due_date: '2026-09-18' }).id;
    expectCode(() => svc.updateTodo(id, { due_date: '2026-02-30' }), 'INVALID_DUE_DATE');
    assert.equal(db.prepare('SELECT due_date FROM todos WHERE id=?').get(id).due_date, '2026-09-18');
  });

  it('null이나 빈 문자열로 마감일을 해제한다', () => {
    const id = svc.addTodo({ title: 'x', due_date: '2026-09-18' }).id;
    assert.equal(svc.updateTodo(id, { due_date: null }).due_date, null);

    svc.updateTodo(id, { due_date: '2026-12-25' });
    assert.equal(svc.updateTodo(id, { due_date: '' }).due_date, null);
  });

  it('due_date를 넘기지 않으면 기존 마감일을 유지한다', () => {
    const id = svc.addTodo({ title: 'x', due_date: '2026-09-18' }).id;
    assert.equal(svc.updateTodo(id, { completed: true }).due_date, '2026-09-18');
  });
});

describe('listTodos — KST 기준 today 필터', () => {
  it('KST 오늘 마감만 돌려주고 어제 마감은 제외한다', () => {
    svc.addTodo({ title: '오늘 마감', due_date: kstDate(0) });
    svc.addTodo({ title: '어제 마감', due_date: kstDate(-1) });
    svc.addTodo({ title: '내일 마감', due_date: kstDate(1) });

    assert.deepEqual(svc.listTodos({ date: 'today' }).map((t) => t.title), ['오늘 마감']);
  });
});

describe('summaryToday — KST 기준 완료일', () => {
  it('KST 오늘 새벽에 완료한 건을 포함한다', () => {
    // KST 오늘 01:00 == UTC 기준 어제 16:00. 저장은 UTC 이므로 그 값을 직접 넣는다.
    const utcStamp = new Date(new Date(`${kstDate(0)}T01:00:00Z`).getTime() - 9 * 3600 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    db.prepare('INSERT INTO todos (title, completed, updated_at) VALUES (?, 1, ?)')
      .run('새벽에 완료', utcStamp);

    assert.deepEqual(svc.summaryToday().map((t) => t.title), ['새벽에 완료']);
  });

  it('UTC 기준으로 비교하면 놓치는 경계를 KST 기준은 잡는다', () => {
    // 지금이 KST 09-18 10:00(UTC 09-18 01:00)이고, KST 09-18 02:00(UTC 09-17 17:00)에 완료한 건.
    // 둘 다 "KST 오늘"이지만 UTC 날짜는 하루 어긋난다.
    const doneAt = '2026-09-17 17:00:00';
    const nowRef = '2026-09-18 01:00:00';

    assert.equal(db.prepare('SELECT date(?) = date(?) AS m').get(doneAt, nowRef).m, 0,
      'UTC 기준 비교는 이 건을 놓쳐야 한다 (회귀 재현용)');
    assert.equal(db.prepare("SELECT date(?, '+9 hours') = date(?, '+9 hours') AS m").get(doneAt, nowRef).m, 1,
      'KST 기준 비교는 이 건을 잡아야 한다');
  });
});

describe('deleteTodo', () => {
  it('있는 id는 true, 없는 id는 false', () => {
    const id = svc.addTodo({ title: 'x' }).id;
    assert.equal(svc.deleteTodo(id), true);
    assert.equal(svc.deleteTodo(id), false);
  });
});

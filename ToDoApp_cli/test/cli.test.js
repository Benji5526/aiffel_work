const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// db.js 가 로드되기 전에 지정해야 한다. 하위 프로세스도 같은 파일을 보게 된다.
const DB_FILE = path.join(os.tmpdir(), `todo-cli-e2e-${process.pid}-${Date.now()}.db`);
process.env.TODO_DB_PATH = DB_FILE;

const { parseFlags, formatTodo } = require('../cli');
const db = require('../db');

const CLI = path.join(__dirname, '..', 'cli.js');

// cli.js 를 실제 하위 프로세스로 실행한다. bin 으로 쓰일 때와 같은 경로.
function run(...args) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TODO_DB_PATH: DB_FILE },
  });
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

after(() => {
  db.close();
  fs.rmSync(DB_FILE, { force: true });
});

beforeEach(() => {
  db.exec('DELETE FROM todo_tags; DELETE FROM todos; DELETE FROM tags;');
});

describe('parseFlags', () => {
  it('빈 입력', () => {
    assert.deepEqual(parseFlags([]), { flags: {}, positional: [] });
  });

  it('위치 인자만 있으면 순서대로 모은다', () => {
    assert.deepEqual(parseFlags(['우유', '사기']), { flags: {}, positional: ['우유', '사기'] });
  });

  it('--키 값 쌍을 읽고 값은 위치 인자로 새지 않는다', () => {
    assert.deepEqual(parseFlags(['--due', '2026-09-18']), {
      flags: { due: '2026-09-18' },
      positional: [],
    });
  });

  it('위치 인자와 플래그를 섞어도 분리한다', () => {
    assert.deepEqual(parseFlags(['우유', '--due', '2026-09-18', '사기', '--tags', 'a,b']), {
      flags: { due: '2026-09-18', tags: 'a,b' },
      positional: ['우유', '사기'],
    });
  });

  it('값 없이 끝나는 플래그는 true', () => {
    assert.deepEqual(parseFlags(['--today']), { flags: { today: true }, positional: [] });
  });

  // `todo add 할일 --due` 처럼 값을 빠뜨리면 문자열이 아니라 true 가 넘어간다.
  // todoService 가 이를 거절하므로 조용히 저장되지 않는다 (아래 e2e 로 확인).
  it('뒤에 다른 플래그가 오면 값이 아니라 true 로 둔다', () => {
    assert.deepEqual(parseFlags(['--due', '--tags', 'a']), {
      flags: { due: true, tags: 'a' },
      positional: [],
    });
  });

  it('음수처럼 -로 시작하는 값은 값으로 받는다', () => {
    assert.deepEqual(parseFlags(['--q', '-5']).flags, { q: '-5' });
  });

  it('같은 플래그가 반복되면 마지막 값이 남는다', () => {
    assert.deepEqual(parseFlags(['--tag', 'a', '--tag', 'b']).flags, { tag: 'b' });
  });
});

describe('formatTodo', () => {
  const base = { id: 1, title: '우유 사기', completed: false, due_date: null, tags: [] };

  it('미완료는 [ ], 완료는 [x]', () => {
    assert.equal(formatTodo(base), '[ ] 1. 우유 사기');
    assert.equal(formatTodo({ ...base, completed: true }), '[x] 1. 우유 사기');
  });

  it('마감일과 태그가 있으면 덧붙인다', () => {
    assert.equal(
      formatTodo({ ...base, due_date: '2026-09-18', tags: ['장보기', '집안일'] }),
      '[ ] 1. 우유 사기 (마감: 2026-09-18) #장보기 #집안일'
    );
  });

  it('마감일이 없으면 마감 표기를 넣지 않는다', () => {
    assert.ok(!formatTodo(base).includes('마감'));
  });
});

describe('todo add (하위 프로세스)', () => {
  it('제목만으로 추가한다', () => {
    const res = run('add', '우유', '사기');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /추가됨: \[ \] \d+\. 우유 사기/);
  });

  it('--due 와 --tags 를 반영한다', () => {
    const res = run('add', '우유', '--due', '2026-09-18', '--tags', '장보기,집안일');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\(마감: 2026-09-18\) #장보기 #집안일/);
  });

  // 값을 빠뜨리면 parseFlags 가 true 를 넘긴다. 예전에는 better-sqlite3 가
  // 바인딩 단계에서 날것의 TypeError 를 뱉었다.
  it('--due 에 값이 없으면 형식 오류로 끝난다', () => {
    const res = run('add', '우유', '--due');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /due_date는 YYYY-MM-DD/);
    assert.doesNotMatch(res.stderr, /TypeError/);
    assert.equal(db.prepare('SELECT COUNT(*) c FROM todos').get().c, 0);
  });

  it('없는 날짜는 형식 오류로 끝난다', () => {
    const res = run('add', '우유', '--due', '2026-02-30');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /due_date는 YYYY-MM-DD/);
    assert.equal(db.prepare('SELECT COUNT(*) c FROM todos').get().c, 0);
  });

  it('제목이 없으면 오류로 끝난다', () => {
    const res = run('add');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /title은 필수입니다/);
  });
});

describe('todo list (하위 프로세스)', () => {
  it('비어 있으면 안내 문구를 낸다', () => {
    assert.equal(run('list').stdout, '할 일이 없습니다.');
  });

  it('--q 로 제목을 검색한다', () => {
    run('add', '우유', '사기');
    run('add', '빨래', '하기');

    const res = run('list', '--q', '우유');
    assert.match(res.stdout, /우유 사기/);
    assert.doesNotMatch(res.stdout, /빨래 하기/);
  });

  it('--tag 로 태그를 거른다', () => {
    run('add', '우유', '--tags', '장보기');
    run('add', '빨래', '--tags', '집안일');

    const res = run('list', '--tag', '장보기');
    assert.match(res.stdout, /우유/);
    assert.doesNotMatch(res.stdout, /빨래/);
  });
});

describe('todo done (하위 프로세스)', () => {
  it('id 를 완료 처리한다', () => {
    run('add', '우유');
    const id = db.prepare('SELECT id FROM todos').get().id;

    const res = run('done', String(id));
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /완료 처리됨: \[x\]/);
    assert.equal(db.prepare('SELECT completed FROM todos WHERE id=?').get(id).completed, 1);
  });

  it('숫자가 아니면 사용법을 내고 1로 끝난다', () => {
    const res = run('done', 'abc');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /사용법: todo done <id>/);
  });

  it('id 를 빠뜨려도 사용법을 낸다', () => {
    assert.equal(run('done').status, 1);
  });

  it('없는 id 면 1로 끝난다', () => {
    const res = run('done', '999999');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /찾을 수 없습니다/);
  });
});

describe('todo undone (하위 프로세스)', () => {
  function addOne() {
    run('add', '우유');
    return db.prepare('SELECT id FROM todos').get().id;
  }

  it('완료를 해제한다', () => {
    const id = addOne();
    run('done', String(id));

    const res = run('undone', String(id));
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /완료 해제됨: \[ \]/);
    assert.equal(db.prepare('SELECT completed FROM todos WHERE id=?').get(id).completed, 0);
  });

  it('done 과 왕복해도 상태가 맞는다', () => {
    const id = addOne();
    const completed = () => db.prepare('SELECT completed FROM todos WHERE id=?').get(id).completed;

    assert.equal(completed(), 0);
    run('done', String(id));
    assert.equal(completed(), 1);
    run('undone', String(id));
    assert.equal(completed(), 0);
  });

  it('이미 미완료인 것을 해제해도 그대로 둔다', () => {
    const id = addOne();
    const res = run('undone', String(id));
    assert.equal(res.status, 0, res.stderr);
    assert.equal(db.prepare('SELECT completed FROM todos WHERE id=?').get(id).completed, 0);
  });

  it('숫자가 아니면 undone 사용법을 낸다', () => {
    const res = run('undone', 'abc');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /사용법: todo undone <id>/);
  });

  it('id 를 빠뜨려도 사용법을 낸다', () => {
    assert.equal(run('undone').status, 1);
  });

  it('없는 id 면 1로 끝난다', () => {
    const res = run('undone', '999999');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /찾을 수 없습니다/);
  });

  it('제목이나 마감일은 건드리지 않는다', () => {
    run('add', '우유', '--due', '2026-09-18');
    const id = db.prepare('SELECT id FROM todos').get().id;
    run('done', String(id));
    run('undone', String(id));

    const row = db.prepare('SELECT title, due_date FROM todos WHERE id=?').get(id);
    assert.equal(row.title, '우유');
    assert.equal(row.due_date, '2026-09-18');
  });
});

describe('todo summary (하위 프로세스)', () => {
  it('완료 건수를 낸다', () => {
    run('add', '우유');
    const id = db.prepare('SELECT id FROM todos').get().id;
    run('done', String(id));

    assert.match(run('summary').stdout, /오늘 완료한 할 일: 1건/);
  });

  it('완료한 게 없으면 0건', () => {
    assert.match(run('summary').stdout, /오늘 완료한 할 일: 0건/);
  });
});

describe('명령 없음 / 모르는 명령', () => {
  it('명령이 없으면 사용법을 내고 0으로 끝난다', () => {
    const res = run();
    assert.equal(res.status, 0);
    assert.match(res.stdout, /사용법:/);
  });

  it('모르는 명령이면 사용법을 내고 1로 끝난다', () => {
    const res = run('nope');
    assert.equal(res.status, 1);
    assert.match(res.stdout, /사용법:/);
  });

  it('사용법에 모든 명령이 실려 있다', () => {
    const { stdout } = run();
    for (const cmd of ['add', 'list', 'done', 'undone', 'summary']) {
      assert.match(stdout, new RegExp('todo ' + cmd), cmd + ' 가 사용법에 없습니다');
    }
  });
});

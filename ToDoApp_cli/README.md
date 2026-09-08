# Todo MCP 서버 & CLI

할 일을 관리하는 로컬 앱. 데이터는 SQLite 파일(`todo.db`) 하나에 저장되어 껐다 켜도 남습니다. 같은 할 일 로직(`services/todoService.js`)을 두 가지 진입점으로 쓸 수 있습니다.

- **MCP 서버** (`mcp-server.js`) — Claude Desktop, Claude Code 같은 MCP 클라이언트가 stdio로 연결해서 사용
- **CLI** (`cli.js`) — 터미널에서 `todo add/list/done/summary` 명령으로 직접 사용

## MCP 서버 실행 방법

```
npm install
npm start
```

MCP 서버는 표준입출력(stdio)으로 통신하므로, 브라우저가 아니라 MCP 클라이언트 설정에 등록해서 사용합니다.

### Claude Desktop / Claude Code 설정 예시

`claude_desktop_config.json`(또는 해당 클라이언트의 MCP 서버 설정)에 다음을 추가합니다.

```json
{
  "mcpServers": {
    "todo-app": {
      "command": "node",
      "args": ["C:\\aiffel_work\\ToDoApp_cli\\mcp-server.js"]
    }
  }
}
```

## 도구(tools)

| 이름 | 설명 |
| --- | --- |
| `list_todos` | 할 일 목록 조회. `q`(검색어), `date`(`'today'`), `tag`로 필터링 가능 |
| `add_todo` | 할 일 추가. `title`(필수), `due_date`, `tags`(배열) |
| `update_todo` | 할 일 수정. `id`(필수) + 변경할 필드만 전달 |
| `delete_todo` | 할 일 삭제. `id`(필수) |
| `list_tags` | 등록된 태그 목록 조회 |

## CLI 사용법

```
node cli.js add <제목> [--due YYYY-MM-DD] [--tags 태그1,태그2]
node cli.js list [--tag 태그] [--today] [--q 검색어]
node cli.js done <id>
node cli.js summary
```

전역에서 `todo` 명령으로 쓰려면 이 폴더에서 한 번 링크합니다.

```
npm link
todo add "우유 사기" --due 2026-09-10 --tags 장보기
todo list
todo done 3
todo summary
```

## 구조

- `mcp-server.js` — MCP 서버 진입점 (`@modelcontextprotocol/sdk`, stdio 트랜스포트, 도구 5개 등록)
- `cli.js` — 터미널용 CLI 진입점 (`add`/`list`/`done`/`summary`)
- `services/todoService.js` — 할 일/태그 CRUD 로직 (SQL 쿼리, MCP·CLI 어느 쪽과도 무관하게 재사용 가능한 순수 함수)
- `db.js` — SQLite 연결 및 테이블 생성
- `todo.db` — 실제 데이터 (git에는 커밋되지 않음)

## 이전 버전과의 차이

이 폴더는 Express REST API + 브라우저 프론트엔드로 되어 있던 `ToDoApp`을 복사해서, 웹 서버 대신 MCP 서버로 동작하도록 바꾼 버전입니다. 자세한 배경은 [HANDOFF.md](HANDOFF.md) 참고.

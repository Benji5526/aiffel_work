# HANDOFF

## 이번 작업 (2026-09-07)

`C:\aiffel_work\ToDoApp`(Express REST API + 브라우저 프론트엔드 할 일 앱)을 복사해서 `C:\aiffel_work\ToDoApp_cli`를 만들고, 웹 서버 레이어를 완전히 제거한 뒤 MCP(Model Context Protocol) 서버로 대체했다.

### 결정 사항
- 폴더는 기존 `ToDoApp`을 통째로 복사해서 생성 (새로 작성하지 않음).
- Express 웹 서버(REST API + 브라우저 화면)는 완전히 삭제. `server.js`, `routes/`, `public/` 제거.
- MCP 도구는 기존 REST API 기능과 1:1로 대응: `list_todos`, `add_todo`, `update_todo`, `delete_todo`, `list_tags`.
- 트랜스포트는 stdio (`StdioServerTransport`) — Claude Desktop/Claude Code 같은 로컬 MCP 클라이언트에서 `command: node, args: [mcp-server.js]`로 등록해 쓰는 걸 기준으로 함.

### 변경 내역
- 신규 `services/todoService.js` — 기존 `routes/todos.js`, `routes/tags.js`의 SQL·헬퍼 함수를 Express `req/res`와 분리한 순수 함수로 이식 (`listTodos`, `addTodo`, `updateTodo`, `deleteTodo`, `listTags`).
- 신규 `mcp-server.js` — `@modelcontextprotocol/sdk`의 `McpServer` + `StdioServerTransport`로 5개 도구 등록, `zod`로 입력 검증.
- `db.js`는 원본 그대로 재사용 (SQLite 스키마 동일).
- `package.json`: `express`·`dotenv` 의존성 제거(단, `@modelcontextprotocol/sdk`가 내부적으로 `express`를 전이 의존성으로 쓰므로 `node_modules`에는 여전히 존재함 — 정상), `@modelcontextprotocol/sdk`·`zod` 추가, `main`/`start`를 `mcp-server.js`로 변경.
- **중요 이슈였던 것**: 처음엔 기존 `.env`(PORT 설정)를 그대로 두고 `dotenv`도 유지했는데, `dotenv@17`이 기본적으로 `.env` 로딩 로그를 stdout에 출력해서 MCP stdio 프로토콜(stdout은 JSON-RPC 전용)이 깨질 뻔했다. PORT는 더 이상 쓰이지 않아 `dotenv` 의존성 자체와 `.env`/`.env.example`을 통째로 제거하는 걸로 해결함. **앞으로 환경변수가 다시 필요해지면 dotenv를 다시 넣되 `config({ quiet: true })`를 반드시 써야 한다.**
- `node_modules`는 새로 `npm install`하지 않고 원본 `ToDoApp`의 `node_modules`를 복사해서 재사용함 — 이 환경에 Python/빌드 도구가 없어서 `better-sqlite3`(네이티브 모듈)를 새로 빌드할 수 없기 때문. 이후 `npm install`로 신규 패키지(`@modelcontextprotocol/sdk`, `zod`)만 추가하고, `dotenv`는 폴더를 직접 지움.
- `.claude/launch.json`(`server.js`를 가리키던 dev-server 설정)은 삭제함 — MCP stdio 서버는 미리볼 HTTP 엔드포인트가 없음.

### 검증 완료
- `services/todoService.js`를 직접 호출하는 스모크 테스트로 add/list(태그 필터)/update/삭제/에러 케이스 확인.
- `mcp-server.js`를 자식 프로세스로 띄우고 실제 JSON-RPC(`initialize` → `tools/list` → `tools/call`)를 주고받아 5개 도구가 정상 동작하는 것 확인.
- 테스트 중 남은 임시 태그(`업무`, `급함`, `테스트`)는 정리해서 `todo.db`는 원본 데이터(`우유 사기 확인` 1건, 태그 `장보기`/`집안일`) 상태로 복원됨.

## 이어진 작업 (2026-09-07, CLI 추가)

터미널에서 바로 쓸 수 있는 `todo` 명령을 추가했다. 앱 코드는 갈아엎지 않고 `services/todoService.js`에 함수 하나만 더하고, 그 위에 얇은 CLI 진입점만 새로 얹었다.

### 변경 내역
- `services/todoService.js`에 `summaryToday()` 추가 (오늘 `completed=1`이면서 `updated_at`이 오늘인 항목 조회). 기존 함수는 손대지 않음.
- 신규 `cli.js` — 터미널 진입점. 서브커맨드 4개: `add`(제목 + `--due`/`--tags`), `list`(`--tag`/`--today`/`--q`), `done <id>`, `summary`. 전부 `todoService`의 기존/신규 함수를 그대로 호출하고, 출력만 사람이 읽기 좋은 텍스트로 포맷팅(`[x] 3. 제목 (마감: ...) #태그`).
- `package.json`에 `"bin": { "todo": "./cli.js" }` 추가. 이 폴더에서 `npm link`를 실행하면 아무 디렉터리에서나 `todo` 명령 사용 가능 (`D:\Git`에서 `todo list`로 확인 완료).
- 데이터는 기존 `todo.db`를 그대로 사용 — 스키마/DB 변경 없음.

### 검증 완료
- `node cli.js add/list/done/summary` 각각 정상 동작 확인 (성공 케이스 + 존재하지 않는 id, 숫자가 아닌 id, title 누락, 알 수 없는 명령, 인자 없음 등 에러 케이스 전부 exit code 1로 처리됨 확인).
- CLI 작업 이후에도 `mcp-server.js`가 여전히 정상 동작하는지 재확인함 (todoService 공유 로직이라 회귀 여부 체크 필요했음).
- `npm link`로 만든 전역 `todo` 명령이 다른 디렉터리(`D:\Git`)에서도 동작하는 것 확인.
- 테스트 중 추가했던 임시 할 일/태그는 모두 정리해서 `todo.db`는 원본 데이터 상태로 복원됨.

## 다음에 이어갈 수 있는 작업 후보
- MCP 서버를 Claude Desktop/Claude Code에 실제로 등록해서 써보는 실전 테스트 (지금까지는 자체 스모크 테스트만 함). `claude_desktop_config.json`에 `mcpServers` 항목 추가하는 안을 제안했지만 아직 사용자 승인 대기 중이었음 — 필요하면 이어서 진행.
- CLI 명령/출력 형식에 대한 사용자 피드백 반영 (예: `list`에 정렬/색상, `summary` 기간 옵션 등).

# Todo 앱

로컬에서 실행되는 할 일 관리 앱. 데이터는 SQLite 파일(`todo.db`) 하나에 저장되어 껐다 켜도 남습니다.

## 실행 방법

```
npm install
npm start
```

브라우저에서 `http://localhost:3000` 접속. 포트는 `.env`의 `PORT` 값으로 바꿀 수 있습니다.

## 기능

- 할 일 추가 / 목록 보기 / 완료 표시 / 삭제
- 마감일 지정 (지난 마감일은 빨갛게 표시)
- 태그(콤마로 여러 개 입력) + 태그별 필터
- 검색, 오늘 마감인 할 일만 보기

## 구조

- `server.js` — Express 서버 (정적 파일 + API)
- `db.js` — SQLite 연결 및 테이블 생성
- `routes/` — `/api/todos`, `/api/tags` API
- `public/` — 프론트엔드 (HTML/CSS/JS)
- `todo.db` — 실제 데이터 (git에는 커밋되지 않음)

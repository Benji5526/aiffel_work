# PRD: AI 챗봇 연인 (v1)

## 배경 / 목표

개인 학습 프로젝트. 자연스러운 텍스트 대화가 가능한 로맨틱 AI 컴패니언 웹앱을 만든다. 이미 만들어본 ToDoApp의 Node/Express + SQLite 패턴을 재사용해서 빠르게 v1을 완성하는 것이 목표.

## 범위 (v1)

- 단일 사용자 — 로그인/계정 시스템 없이 바로 대화
- 웹 채팅 UI (브라우저에서 메시지 주고받기)
- 고정된 페르소나 1개 — [persona-gina.md](persona-gina.md)에 설계 완료 ("Gina")
- 대화 기억 — 이전 대화 이력이 남아서 다음에 이어짐 (v1은 히스토리 전체를 컨텍스트로 사용, 별도 요약/추출 없음)
- 감정 표현 — 별도 상태 추적 없이, 시스템 프롬프트 + 대화 히스토리를 보고 Claude가 판단해서 톤을 조절

## 비범위 (v1에서 제외)

- 다중 사용자/로그인/인증
- 음성 출력(TTS)
- 이미지/아바타, 표정 변화
- 여러 페르소나 중 선택

## 기능 요구사항

1. **채팅 UI** — 메시지 입력 → 전송 → 응답 스트리밍 표시 (ToDoApp의 `public/` 프론트엔드 패턴 재사용)
2. **페르소나 설정** — [persona-gina.md](persona-gina.md)의 "MASTER PERSONA PROMPT"를 시스템 프롬프트로 그대로 사용
3. **대화 기억** — 대화 이력을 SQLite에 저장하고, 다음 요청 시 전체를 불러와 컨텍스트로 사용. 별도 사실 추출(구조화 메모리)이나 감정 수치 추적은 v1에서 하지 않음 — Claude가 히스토리를 보고 자연스럽게 기억/감정을 판단
4. **콘텐츠 가이드라인** — persona-gina.md의 9번(조작·협박·과도한 소유욕 금지)·11번(의존 유도 금지) 원칙을 시스템 프롬프트에 그대로 포함

## 기술 스택 (제안)

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 백엔드 | Node.js + Express | ToDoApp과 동일한 패턴, 바로 재사용 가능 |
| DB | SQLite (`better-sqlite3`) | ToDoApp과 동일. 대화 기록 저장 |
| LLM | Anthropic Claude API, 모델 `claude-opus-5` | 이 세션에서 확인한 현재 권장 모델. `@anthropic-ai/sdk`로 스트리밍 응답 |
| 프론트엔드 | 단순 HTML/CSS/JS | ToDoApp의 `public/` 패턴 재사용 |

## 데이터 모델 (초안)

- `messages` 테이블: `id`, `role` (`user`/`assistant`), `content`, `created_at`
- 페르소나(시스템 프롬프트)는 v1에서는 DB가 아니라 코드/설정 파일에 고정

## 키 관리

- `ANTHROPIC_API_KEY`는 `.env`로 관리 (ToDoApp의 dotenv 패턴 참고 — 이번엔 MCP 서버가 아니라 일반 웹 서버라서, 지난번 겪었던 "dotenv가 stdout에 로그를 찍어서 프로토콜이 깨지는" 문제는 해당 없음)

## 이번에 필요한 스킬/지식 — 결론

- **`claude-api` 스킬** (이 세션에서 이미 로드함) — 모델 선택(`claude-opus-5`), 스트리밍 응답, 시스템 프롬프트 구성, 대화가 길어질 때의 prompt caching까지 이 스킬 하나로 커버됨. 별도 스킬을 새로 만들 필요는 없어 보임.
- **Node/Express 웹 서버 구축, SQLite 대화 이력 저장** — 오늘 만든 `mcp-cli-from-rest-app` 스킬과 겹치진 않지만, ToDoApp 작업에서 이미 익힌 패턴이라 새 스킬화가 필요한 지식은 아님.
- 즉, 이 프로젝트를 위해 **새로 만들어야 할 스킬은 없고**, 기존 `claude-api` 스킬을 참고하며 바로 구현에 들어가면 됨.

## 다음 단계 (구현 시)

1. `package.json` + Express 서버 스캐폴딩 (ToDoApp 구조 참고)
2. SQLite `messages` 테이블 생성
3. Claude API 연동 (`claude-opus-5`, 스트리밍, 시스템 프롬프트로 페르소나 정의)
4. 채팅 UI 구현 (입력창 + 메시지 리스트 + 스트리밍 표시)
5. 로컬에서 실행해서 대화 테스트

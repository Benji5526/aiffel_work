# aiffel_work

AIFFEL 학습/실습용 작업 저장소입니다.

## 프로젝트 목록

### [오늘의운세](./오늘의운세) — 오늘의 별자리 & 12지신 운세

이름과 생년월일을 입력하면 오늘의 서양 별자리, 12지신(띠), 그리고 오늘의 운세(총운/애정운/금전운/건강운, 행운의 색·숫자·아이템)를 보여주는 웹앱입니다.

- **프론트엔드**: [`오늘의운세/front`](./오늘의운세/front) — 순수 HTML/CSS/JS
- **백엔드**: [`오늘의운세/back`](./오늘의운세/back) — Node.js + Express API
- **API 문서**: [`오늘의운세/API.md`](./오늘의운세/API.md)
- **외부 접속**: Cloudflare Tunnel로 로컬 서버를 외부에 노출

#### 실행 방법

```bash
cd 오늘의운세/back
npm install
npm start
```

`http://localhost:8000` 에서 프론트엔드와 API가 함께 실행됩니다. 자세한 API 스펙과 운세 계산 로직은 [API.md](./오늘의운세/API.md)를 참고하세요.

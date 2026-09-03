# 오늘의 별자리 & 12지신 운세 - API 문서

## 개요

- 이름과 생년월일을 입력받아 **서양 별자리**, **12지신(띠)**, 그리고 **오늘의 운세**를 계산해 돌려주는 API입니다.
- 백엔드: Node.js + Express (`back/`)
- 프론트엔드: 정적 HTML/CSS/JS (`front/`), 백엔드가 같은 포트에서 정적 파일로 함께 서빙합니다.
- 프론트엔드는 상대 경로(`/api/...`)로 백엔드를 호출하므로, Cloudflare Tunnel로 외부에 노출해도 별도 CORS 설정 없이 동작합니다.

## Base URL

- 로컬: `http://localhost:8000`
- 외부(Cloudflare Quick Tunnel): 실행할 때마다 발급되는 `https://<random-words>.trycloudflare.com` (아래 "실행 방법" 참고)

## 엔드포인트

### 1. `GET /api/health`

서버 상태 확인용 헬스체크.

**응답 200**
```json
{ "status": "ok" }
```

---

### 2. `POST /api/fortune`

이름과 생년월일로 오늘의 운세를 계산합니다.

**Request Header**
```
Content-Type: application/json
```

**Request Body**

| 필드        | 타입   | 필수 | 설명                                  |
|-------------|--------|------|---------------------------------------|
| `name`      | string | O    | 이름 (1~20자)                         |
| `birthDate` | string | O    | 생년월일, `YYYY-MM-DD` 형식 (ISO 8601 date) |

```json
{
  "name": "홍길동",
  "birthDate": "1998-05-21"
}
```

**응답 200**

```json
{
  "name": "홍길동",
  "birthDate": "1998-05-21",
  "date": "2026-09-03",
  "westernZodiac": {
    "sign": "쌍둥이자리",
    "signEn": "Gemini",
    "symbol": "♊"
  },
  "chineseZodiac": {
    "animal": "호랑이띠",
    "animalEn": "Tiger",
    "symbol": "🐯"
  },
  "fortune": {
    "overall": { "score": 61, "text": "작은 실수가 생기기 쉬우니 서두르지 말고 차분히 움직이세요." },
    "love":    { "score": 56, "text": "혼자만의 시간을 즐기는 것도 나쁘지 않은 하루입니다." },
    "money":   { "score": 91, "text": "충동적인 지출은 피하고 계획적인 소비를 하는 것이 좋습니다." },
    "health":  { "score": 94, "text": "과식이나 과음은 피하고 규칙적인 생활을 유지하세요." },
    "luckyColor": "파랑",
    "luckyNumber": 88,
    "luckyItem": "시계"
  }
}
```

**응답 필드 설명**

| 필드                      | 설명                                                       |
|---------------------------|--------------------------------------------------------------|
| `date`                    | 운세 계산 기준일 (KST, `YYYY-MM-DD`)                          |
| `westernZodiac.sign`      | 생년월일 기준 서양 별자리 (한글명)                            |
| `chineseZodiac.animal`    | 출생 연도 기준 12지신 띠 (한글명)                             |
| `fortune.overall/love/money/health` | 각 항목별 점수(1~100)와 코멘트                    |
| `fortune.luckyColor`      | 오늘의 행운의 색                                              |
| `fortune.luckyNumber`     | 오늘의 행운의 숫자 (1~99)                                     |
| `fortune.luckyItem`       | 오늘의 행운의 아이템                                          |

**에러 응답 (400)**

```json
{ "error": "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)" }
```

발생 케이스:
- `name` 누락/공백/20자 초과
- `birthDate` 누락 또는 `YYYY-MM-DD` 형식이 아니거나 존재하지 않는 날짜(예: 2월 30일)

## 운세 계산 로직

1. **서양 별자리**: `birthDate`의 월/일을 12궁 날짜 범위와 비교해 판정합니다.
2. **12지신**: 출생 연도를 12로 나눈 나머지를 이용해 판정합니다. `2020년 = 쥐띠`를 기준점으로 계산하는 **단순화된 방식**이며, 실제 음력 설(입춘) 기준이 아닌 **양력 연도 기준**입니다.
3. **오늘의 운세**: `이름 + 생년월일 + 오늘 날짜(KST)` 문자열을 해시하여 시드를 만들고, 시드 기반 난수 생성기(mulberry32)로 총운/애정운/금전운/건강운 점수와 문구, 행운의 색/숫자/아이템을 결정합니다.
   - 같은 사람이 같은 날 여러 번 조회하면 **항상 같은 결과**가 나옵니다.
   - 날짜가 바뀌면 자정(KST) 기준으로 결과가 새로 계산됩니다.
   - 실제 점성술/명리학적 근거가 아닌 **재미용 콘텐츠**입니다.

## 프로젝트 구조

```
오늘의운세/
├── API.md                  # 이 문서
├── front/                  # 프론트엔드 (정적 파일)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── back/                   # 백엔드 (Express 서버)
    ├── package.json
    ├── server.js            # 라우팅 + 정적 파일 서빙
    └── fortune.js           # 별자리/12지신/운세 계산 로직
```

## 실행 방법

### 1. 백엔드 설치 & 실행

```bash
cd back
npm install
npm start
```

기본적으로 `http://localhost:8000` 에서 서버가 뜨며, 같은 서버가 `front/` 폴더를 정적 파일로도 서빙합니다. (포트를 바꾸려면 `PORT` 환경변수 사용: `PORT=9000 npm start`)

### 2. Cloudflare Tunnel로 외부 노출

`cloudflared`가 설치되어 있어야 합니다 (`winget install --id Cloudflare.cloudflared`).

```bash
cloudflared tunnel --url http://localhost:8000
```

실행하면 콘솔에 `https://<random-words>.trycloudflare.com` 형태의 임시 공개 URL이 출력됩니다. 이 URL로 외부에서 접속하면 프론트엔드/백엔드가 동일하게 동작합니다.

> Quick Tunnel은 Cloudflare 계정 없이 즉시 테스트하기 위한 임시 URL이며, 재시작할 때마다 URL이 바뀝니다. 고정 도메인이 필요하면 Cloudflare 계정으로 named tunnel을 생성해야 합니다.

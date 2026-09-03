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

### 2. `GET /api/cities`

진태양시(眞太陽時) 보정에 사용 가능한 도시 목록(프론트엔드 자동완성용)을 반환합니다.

**응답 200**
```json
{ "cities": ["서울", "부산", "대구", "...", "도쿄", "뉴욕"] }
```

---

### 3. `POST /api/fortune`

이름·생년월일시(양력/음력)·출생 도시로 **사주팔자**, 서양 별자리, 12지신, 오늘의 운세를 계산합니다.

**Request Header**
```
Content-Type: application/json
```

**Request Body**

| 필드           | 타입           | 필수 | 설명                                                         |
|----------------|----------------|------|----------------------------------------------------------------|
| `name`         | string         | O    | 이름 (1~20자)                                                 |
| `birthDate`    | string         | O    | 생년월일, `YYYY-MM-DD`. `calendarType`에 따라 양력/음력으로 해석 |
| `calendarType` | string         | -    | `"solar"`(양력, 기본값) \| `"lunar"`(음력)                      |
| `isLeapMonth`  | boolean        | -    | 음력 입력 시 윤달 여부 (기본 `false`)                           |
| `gender`       | string \| null | -    | `"female"` \| `"male"`. 현재 사주 계산에는 사용되지 않고 응답에 그대로 반영만 됨 |
| `birthTime`    | string \| null | -    | 출생 시각, `HH:mm` (24시간제). `timeUnknown`이 true면 무시      |
| `timeUnknown`  | boolean        | -    | 출생 시각을 모르는 경우 `true` (기본 `false`). true면 시주(時柱) 계산을 생략 |
| `city`         | string \| null | -    | 출생 도시명. `/api/cities` 목록에 있는 이름이면 진태양시 보정 적용, 없으면 보정 없이 계산 |

```json
{
  "name": "홍길동",
  "birthDate": "1998-05-21",
  "calendarType": "solar",
  "isLeapMonth": false,
  "gender": "male",
  "birthTime": "13:28",
  "timeUnknown": false,
  "city": "서울"
}
```

**응답 200**

```json
{
  "name": "홍길동",
  "gender": "male",
  "birthDate": "1998-05-21",
  "calendarType": "solar",
  "isLeapMonth": false,
  "date": "2026-09-03",
  "westernZodiac": { "sign": "쌍둥이자리", "signEn": "Gemini", "symbol": "♊" },
  "chineseZodiac": { "animal": "호랑이띠", "symbol": "🐯" },
  "saju": {
    "input": { "calendarType": "solar", "isLeapMonth": false, "timeKnown": true, "city": "서울" },
    "solarDate": "1998-05-21",
    "lunarDate": "1998-4-26",
    "correctedTime": "12:56",
    "solarTimeCorrection": { "applied": true, "offsetMinutes": -32 },
    "zodiacAnimal": "호랑이띠",
    "zodiacAnimalSymbol": "🐯",
    "dayMaster": { "gan": "癸", "ganKo": "계", "element": "수" },
    "pillars": {
      "year":  { "gan": "戊", "zhi": "寅", "ganKo": "무", "zhiKo": "인", "combined": "戊寅", "combinedKo": "무인", "nayin": "..." },
      "month": { "gan": "...", "zhi": "...", "ganKo": "...", "zhiKo": "...", "combined": "...", "combinedKo": "...", "nayin": "..." },
      "day":   { "gan": "...", "zhi": "...", "ganKo": "...", "zhiKo": "...", "combined": "...", "combinedKo": "...", "nayin": "..." },
      "time":  { "gan": "...", "zhi": "...", "ganKo": "...", "zhiKo": "...", "combined": "...", "combinedKo": "...", "nayin": "..." }
    },
    "fiveElements": { "목": 1, "화": 2, "토": 3, "금": 0, "수": 2 }
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

| 필드                                 | 설명                                                              |
|---------------------------------------|---------------------------------------------------------------------|
| `date`                                 | 운세 계산 기준일 (KST, `YYYY-MM-DD`)                                |
| `westernZodiac.sign`                   | (양력으로 환산된) 생년월일 기준 서양 별자리                          |
| `chineseZodiac.animal`                 | 음력 연도 기준 12지신 띠 (`lunar-javascript`로 정확히 계산, 입력이 음력/양력이든 동일) |
| `saju.solarDate` / `saju.lunarDate`    | 입력을 정규화한 양력/음력 날짜                                       |
| `saju.correctedTime`                   | 진태양시 보정이 적용된 시각 (시간 미입력 시 `null`)                    |
| `saju.solarTimeCorrection`             | 보정 적용 여부와 보정된 분(分) 단위 오프셋 (도시를 못 찾으면 `applied: false`) |
| `saju.dayMaster`                       | 일간(日干, 나를 상징하는 천간)과 그 오행                              |
| `saju.pillars.year/month/day/time`     | 년주/월주/일주/시주. 각 `gan`(천간, 한자)·`zhi`(지지, 한자)·`ganKo`/`zhiKo`(한글)·`combined`·`nayin`(납음오행, 한자). 시간을 모르면 `time`은 `null` |
| `saju.fiveElements`                    | 사주 8자(시간 모르면 6자) 중 오행별 개수                              |
| `fortune.overall/love/money/health`    | 각 항목별 점수(1~100)와 코멘트                                       |
| `fortune.luckyColor/luckyNumber/luckyItem` | 오늘의 행운의 색/숫자/아이템                                     |

**에러 응답 (400)**

```json
{ "error": "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)" }
```

발생 케이스:
- `name` 누락/공백/20자 초과
- `birthDate` 누락 또는 `YYYY-MM-DD` 형식이 아니거나 존재하지 않는 날짜
- `birthTime`이 `HH:mm` 형식이 아님
- `calendarType`이 `solar`/`lunar`가 아님, `gender`가 `female`/`male`/`null`이 아님

## 계산 로직

1. **날짜 정규화**: `calendarType`이 `lunar`면 `lunar-javascript`로 양력으로 변환하고, 이후 모든 계산(별자리 포함)은 이 양력 날짜를 기준으로 합니다.
2. **진태양시 보정**: 시각을 알고(`timeUnknown`이 아니고) `city`가 `/api/cities` 목록에 있으면, `(도시 경도 - 135) × 4분`만큼 시각을 보정한 뒤 사주를 계산합니다. 135°E는 한국 표준시(KST, UTC+9)의 기준 경도입니다. 도시를 모르거나 목록에 없으면 보정 없이 입력 시각 그대로 사용합니다.
3. **사주팔자**: 보정된 일시로 `lunar-javascript`의 팔자(八字) 계산을 이용해 년주/월주/일주/시주(천간+지지)와 납음오행을 구합니다. 시각을 모르면 시주는 계산하지 않습니다(연·월·일주만 표시).
4. **서양 별자리**: 정규화된 양력 월/일을 12궁 날짜 범위와 비교해 판정합니다.
5. **12지신 띠**: `lunar-javascript`의 음력 연도(설날 기준) 기준 생초(生肖) 계산을 사용합니다. (과거 버전의 "양력 연도 % 12" 단순 계산은 폐기)
6. **오늘의 운세**: `이름 + 정규화된 양력 생년월일 + 오늘 날짜(KST)` 문자열을 해시하여 시드를 만들고, 시드 기반 난수 생성기(mulberry32)로 총운/애정운/금전운/건강운 점수와 문구, 행운의 색/숫자/아이템을 결정합니다.
   - 같은 사람이 같은 날 여러 번 조회하면 **항상 같은 결과**가 나옵니다.
   - 날짜가 바뀌면 자정(KST) 기준으로 결과가 새로 계산됩니다.
   - 사주팔자(년주/월주/일주/시주, 오행 분포)는 실제 명리학 계산식을 따르지만, `fortune`의 점수·코멘트는 명리학적 해석이 아닌 **재미용으로 생성된 콘텐츠**입니다.

### 도시/진태양시 보정 관련 제한사항

- `back/cityLongitude.js`에 하드코딩된 한국 주요 도시(약 90곳) + 해외 주요 도시(약 20곳)만 지원합니다. 실시간 지오코딩 API를 사용하지 않습니다.
- 경도 값은 도시 중심 기준 근사치이며, 정밀 측지 데이터가 아닙니다.
- 한국 표준시가 동경 127.5°였던 시기(1908~1911, 1954~1961)는 반영하지 않고 항상 135°E 기준으로 계산합니다.

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
    ├── fortune.js           # 별자리/오늘의 운세 계산 + 입력 검증
    ├── saju.js              # 사주팔자(년/월/일/시주, 오행, 진태양시 보정) 계산
    └── cityLongitude.js     # 진태양시 보정용 도시 경도 테이블
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

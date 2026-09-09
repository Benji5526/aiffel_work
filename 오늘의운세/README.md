# 오늘의운세

이름·성별·생년월일시(양력/음력)·출생 도시를 입력하면 **서양 별자리**, **12지신(띠)**, **사주팔자**, 그리고 **오늘의 운세**를 보여주는 웹앱입니다. Cloudflare Tunnel로 외부에서도 접속할 수 있습니다.

## 주요 기능

- **입력**: 이름, 성별, 양력/음력(+윤달), 생년월일, 태어난 시간(모름 선택 가능), 출생 도시(자동완성)
- **서양 별자리**: 생년월일 기준 12궁 판정
- **12지신(띠)**: 음력 연도 기준 정확한 판정 (`lunar-javascript` 사용)
- **사주팔자(四柱八字)**
  - 년주·월주·일주·시주(천간·지지, 한자+한글)
  - 오행(목화토금수) 분포 — 사주 8자 기준, 색상으로 구분
  - 일간(日干, 나를 상징하는 천간)과 그 오행
  - 십성(十神: 비겁·식상·재성·관성·인성) 분포 도넛 차트, 각 기둥의 십성 라벨
  - 진태양시(眞太陽時) 보정 — 출생 도시 경도를 이용해 실제 태양 기준 시각으로 보정 후 계산
- **오늘의 운세**: 총운·애정운·금전운·건강운(1~100점 + 코멘트), 행운의 색·숫자·아이템
  - 이름+생년월일+오늘 날짜로 시드를 만들어 **같은 날엔 항상 같은 결과**, 자정(KST) 기준으로 갱신
  - 사주팔자는 실제 명리학 계산식을 따르지만, 운세 점수/코멘트는 명리학적 해석이 아닌 **재미용 콘텐츠**입니다.

## 기술 스택

| 영역 | 스택 |
|------|------|
| 프론트엔드 | 순수 HTML / CSS / JavaScript (프레임워크 없음) |
| 백엔드 | Node.js + [Express](https://expressjs.com/) |
| 사주/음양력 계산 | [lunar-javascript](https://github.com/6tail/lunar-javascript) — 음양력 변환, 간지·팔자·절기 계산 |
| 외부 접속 | [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (`cloudflared`, Quick Tunnel) |

프론트엔드는 백엔드(Express)가 정적 파일로 함께 서빙하므로 별도의 프론트엔드 서버나 빌드 과정이 없습니다.

## 폴더 구조

```
오늘의운세/
├── README.md                # 이 문서
├── API.md                   # API 스펙 및 계산 로직 상세 문서
├── .gitignore
├── front/                    # 프론트엔드 (정적 파일)
│   ├── index.html            # 입력 폼 + 결과 화면 마크업
│   ├── style.css              # 크림톤 카드 UI 스타일
│   └── script.js               # 폼 제출, 결과 렌더링(사주 표/도넛 차트 등)
└── back/                      # 백엔드 (Express 서버)
    ├── package.json
    ├── server.js               # 라우팅(/api/health, /api/cities, /api/fortune) + 정적 파일 서빙
    ├── fortune.js               # 별자리/오늘의 운세 계산 + 입력 검증
    ├── saju.js                  # 사주팔자(년/월/일/시주, 오행, 십성, 진태양시 보정) 계산
    └── cityLongitude.js          # 진태양시 보정용 도시 경도 테이블 (국내 주요 도시 + 해외 일부)
```

## 실행 방법

### 1. 백엔드 설치 & 실행

```bash
cd back
npm install
npm start
```

`http://localhost:8000` 에서 프론트엔드와 API가 함께 실행됩니다. 포트를 바꾸려면 `PORT` 환경변수를 사용하세요 (`PORT=9000 npm start`).

### 2. Cloudflare Tunnel로 외부 노출 (선택)

`cloudflared`가 설치되어 있어야 합니다.

```bash
winget install --id Cloudflare.cloudflared   # 최초 1회
cloudflared tunnel --url http://localhost:8000
```

콘솔에 출력되는 `https://<random-words>.trycloudflare.com` URL로 외부에서 접속할 수 있습니다.

> Quick Tunnel은 Cloudflare 계정 없이 즉시 테스트하기 위한 임시 URL이며, `cloudflared`를 재시작할 때마다 URL이 바뀝니다. 고정 도메인이 필요하면 Cloudflare 계정으로 named tunnel을 생성해야 합니다 (`cloudflared tunnel login` → `cloudflared tunnel create`).

## API

`POST /api/fortune`, `GET /api/cities`, `GET /api/health` 세 개의 엔드포인트가 있습니다. 요청/응답 필드, 사주 계산 로직(진태양시 보정 공식, 십성 분류 방식 등), 도시 경도 테이블의 제한사항은 **[API.md](./API.md)** 에 상세히 정리되어 있습니다.

## 참고

- 결과 화면 디자인(카드 레이아웃, 사주 표, 십성 도넛 차트)은 [포스텔러 만세력](https://pro.forceteller.com/)의 UI를 참고해 자체적으로 새로 구현했습니다.
- 음양력 변환/간지/절기/십성 계산은 [6tail/lunar-javascript](https://github.com/6tail/lunar-javascript) 라이브러리를 사용합니다.

## 제한사항 / 알려진 한계

- 진태양시 보정은 `cityLongitude.js`에 등록된 도시(국내 주요 도시 약 90곳 + 해외 주요 도시 약 20곳)에서만 동작하며, 실시간 지오코딩 API를 사용하지 않습니다.
- 한국 표준시가 동경 127.5°였던 시기(1908~1911, 1954~1961)는 반영하지 않고 항상 135°E 기준으로 계산합니다.
- 오늘의 운세(총운/애정운/금전운/건강운) 점수와 코멘트는 시드 기반으로 생성되는 **재미용 콘텐츠**이며, 사주팔자 계산 결과와 별개입니다.

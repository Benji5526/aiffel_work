// 별자리 / 12지신 계산 + 오늘의 운세 생성 로직

const WESTERN_ZODIAC = [
  { sign: "염소자리", en: "Capricorn", symbol: "♑", from: [12, 22], to: [1, 19] },
  { sign: "물병자리", en: "Aquarius", symbol: "♒", from: [1, 20], to: [2, 18] },
  { sign: "물고기자리", en: "Pisces", symbol: "♓", from: [2, 19], to: [3, 20] },
  { sign: "양자리", en: "Aries", symbol: "♈", from: [3, 21], to: [4, 19] },
  { sign: "황소자리", en: "Taurus", symbol: "♉", from: [4, 20], to: [5, 20] },
  { sign: "쌍둥이자리", en: "Gemini", symbol: "♊", from: [5, 21], to: [6, 21] },
  { sign: "게자리", en: "Cancer", symbol: "♋", from: [6, 22], to: [7, 22] },
  { sign: "사자자리", en: "Leo", symbol: "♌", from: [7, 23], to: [8, 22] },
  { sign: "처녀자리", en: "Virgo", symbol: "♍", from: [8, 23], to: [9, 22] },
  { sign: "천칭자리", en: "Libra", symbol: "♎", from: [9, 23], to: [10, 23] },
  { sign: "전갈자리", en: "Scorpio", symbol: "♏", from: [10, 24], to: [11, 22] },
  { sign: "궁수자리", en: "Sagittarius", symbol: "♐", from: [11, 23], to: [12, 21] },
];

const CHINESE_ZODIAC = [
  { animal: "쥐띠", en: "Rat", symbol: "🐭" },
  { animal: "소띠", en: "Ox", symbol: "🐮" },
  { animal: "호랑이띠", en: "Tiger", symbol: "🐯" },
  { animal: "토끼띠", en: "Rabbit", symbol: "🐰" },
  { animal: "용띠", en: "Dragon", symbol: "🐲" },
  { animal: "뱀띠", en: "Snake", symbol: "🐍" },
  { animal: "말띠", en: "Horse", symbol: "🐴" },
  { animal: "양띠", en: "Goat", symbol: "🐑" },
  { animal: "원숭이띠", en: "Monkey", symbol: "🐵" },
  { animal: "닭띠", en: "Rooster", symbol: "🐔" },
  { animal: "개띠", en: "Dog", symbol: "🐶" },
  { animal: "돼지띠", en: "Pig", symbol: "🐷" },
]; // index 0 = 2020년(쥐띠) 기준 (양력 연도 기준 단순화 계산, 음력 설 미반영)

const FORTUNE_TEMPLATES = {
  overall: [
    "생각지도 못한 좋은 소식이 들려올 수 있는 하루입니다.",
    "평소보다 집중력이 높아져 미뤄뒀던 일을 해결하기 좋습니다.",
    "작은 실수가 생기기 쉬우니 서두르지 말고 차분히 움직이세요.",
    "주변 사람의 도움 덕분에 일이 순조롭게 풀립니다.",
    "새로운 시도를 하기에 좋은 에너지가 흐르는 날입니다.",
    "무리한 계획보다는 여유를 가지는 편이 더 나은 결과를 가져옵니다.",
    "오랜만에 만나는 인연에게서 반가운 이야기를 들을 수 있습니다.",
  ],
  love: [
    "솔직한 마음을 표현하면 관계가 한층 가까워집니다.",
    "괜한 오해가 생기지 않도록 말을 조심스럽게 고르세요.",
    "혼자만의 시간을 즐기는 것도 나쁘지 않은 하루입니다.",
    "설레는 만남이나 연락이 찾아올 수 있습니다.",
    "상대방의 입장에서 한 번 더 생각해보면 좋은 하루입니다.",
  ],
  money: [
    "충동적인 지출은 피하고 계획적인 소비를 하는 것이 좋습니다.",
    "예상치 못한 수입이나 이득이 생길 가능성이 있습니다.",
    "투자보다는 저축에 집중하는 것이 유리한 시기입니다.",
    "지인과의 금전 거래는 신중하게 결정하세요.",
    "작은 절약이 모여 나중에 큰 도움이 됩니다.",
  ],
  health: [
    "충분한 수면과 휴식이 컨디션 관리에 큰 도움이 됩니다.",
    "가벼운 스트레칭이나 산책이 활력을 불어넣어 줍니다.",
    "과식이나 과음은 피하고 규칙적인 생활을 유지하세요.",
    "스트레스가 쌓이기 쉬우니 마음을 편히 갖는 것이 중요합니다.",
    "몸이 보내는 신호를 무시하지 말고 무리하지 마세요.",
  ],
};

const LUCKY_COLORS = ["빨강", "주황", "노랑", "초록", "파랑", "남색", "보라", "하양", "검정", "베이지", "핑크", "골드"];
const LUCKY_ITEMS = ["우산", "머그컵", "손수건", "만년필", "이어폰", "다이어리", "향초", "동전", "책", "화분", "시계", "열쇠고리"];

// 문자열 -> 32bit 정수 해시 (djb2 변형)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

// mulberry32: 시드 기반 결정적 난수 생성기
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function scoreFrom(rng, min = 55, max = 99) {
  return Math.floor(min + rng() * (max - min + 1));
}

function getWesternZodiac(month, day) {
  for (const z of WESTERN_ZODIAC) {
    const [fm, fd] = z.from;
    const [tm, td] = z.to;
    if (fm === tm) {
      if (month === fm && day >= fd && day <= td) return z;
    } else if (fm > tm) {
      // 연말~연초 걸치는 경우 (염소자리: 12/22 ~ 1/19)
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return z;
    } else {
      if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) {
        return z;
      }
    }
  }
  throw new Error("올바르지 않은 날짜입니다.");
}

function getChineseZodiac(year) {
  const idx = (((year - 2020) % 12) + 12) % 12;
  return CHINESE_ZODIAC[idx];
}

function parseBirthDate(birthDateStr) {
  // 기대 형식: YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((birthDateStr || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function todayKST() {
  // KST(UTC+9) 기준 오늘 날짜 문자열(YYYY-MM-DD)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function computeFortune(name, birthDateStr) {
  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    throw Object.assign(new Error("이름을 입력해주세요."), { status: 400 });
  }
  if (trimmedName.length > 20) {
    throw Object.assign(new Error("이름은 20자 이하로 입력해주세요."), { status: 400 });
  }

  const parsed = parseBirthDate(birthDateStr);
  if (!parsed) {
    throw Object.assign(
      new Error("생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)"),
      { status: 400 }
    );
  }

  const { year, month, day } = parsed;
  const western = getWesternZodiac(month, day);
  const chinese = getChineseZodiac(year);
  const date = todayKST();

  // 이름 + 생년월일 + 오늘 날짜로 시드를 만들어 "하루 동안은 같은 결과"가 나오도록 함
  const seed = hashString(`${trimmedName}|${birthDateStr}|${date}`);
  const rng = mulberry32(seed);

  const fortune = {
    overall: { score: scoreFrom(rng), text: pick(rng, FORTUNE_TEMPLATES.overall) },
    love: { score: scoreFrom(rng), text: pick(rng, FORTUNE_TEMPLATES.love) },
    money: { score: scoreFrom(rng), text: pick(rng, FORTUNE_TEMPLATES.money) },
    health: { score: scoreFrom(rng), text: pick(rng, FORTUNE_TEMPLATES.health) },
    luckyColor: pick(rng, LUCKY_COLORS),
    luckyNumber: Math.floor(rng() * 99) + 1,
    luckyItem: pick(rng, LUCKY_ITEMS),
  };

  return {
    name: trimmedName,
    birthDate: birthDateStr,
    date,
    westernZodiac: {
      sign: western.sign,
      signEn: western.en,
      symbol: western.symbol,
    },
    chineseZodiac: {
      animal: chinese.animal,
      animalEn: chinese.en,
      symbol: chinese.symbol,
    },
    fortune,
  };
}

module.exports = { computeFortune, getWesternZodiac, getChineseZodiac };

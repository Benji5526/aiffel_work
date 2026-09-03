// 사주팔자(四柱八字) 계산 모듈
// lunar-javascript(간지/음양력 변환/절기 계산)를 사용해 년주/월주/일주/시주를 구하고,
// 출생 도시 경도를 이용한 진태양시(眞太陽時) 보정을 적용한다.

const { Lunar, Solar } = require("lunar-javascript");
const { getCityLongitude } = require("./cityLongitude");

const GAN_KO = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const ZHI_KO = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
const GAN_ELEMENT = { 甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토", 己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수" };
const ZHI_ELEMENT = { 寅: "목", 卯: "목", 巳: "화", 午: "화", 辰: "토", 戌: "토", 丑: "토", 未: "토", 申: "금", 酉: "금", 亥: "수", 子: "수" };
const SHENGXIAO_KO = {
  鼠: "쥐", 牛: "소", 虎: "호랑이", 兔: "토끼", 龍: "용", 蛇: "뱀",
  馬: "말", 羊: "양", 猴: "원숭이", 雞: "닭", 鷄: "닭", 狗: "개", 豬: "돼지",
};
const SHENGXIAO_SYMBOL = {
  쥐: "🐭", 소: "🐮", 호랑이: "🐯", 토끼: "🐰", 용: "🐲", 뱀: "🐍",
  말: "🐴", 양: "🐑", 원숭이: "🐵", 닭: "🐔", 개: "🐶", 돼지: "🐷",
};

// 십성(十神) 한자 -> 한글
const SHISHEN_KO = {
  比肩: "비견", 劫财: "겁재", 食神: "식신", 伤官: "상관",
  偏财: "편재", 正财: "정재", 七杀: "편관", 正官: "정관",
  偏印: "편인", 正印: "정인", 日主: "일주",
};

// 십성 10종 -> 5대 분류(비겁/식상/재성/관성/인성)
const SHISHEN_CATEGORY = {
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

// 일간(日干) 오행 기준 상대 오행 -> 십성 5대 분류
// 비겁: 나와 같은 오행 / 식상: 내가 생하는 오행 / 재성: 내가 극하는 오행
// 관성: 나를 극하는 오행 / 인성: 나를 생하는 오행
const ELEMENT_ORDER = ["목", "화", "토", "금", "수"]; // 상생 순환: 목→화→토→금→수→목
const CONTROL_ORDER = ["목", "토", "수", "화", "금"]; // 상극 순환: 목→토→수→화→금→목

function nextInCycle(order, el) {
  return order[(order.indexOf(el) + 1) % order.length];
}
function prevInCycle(order, el) {
  return order[(order.indexOf(el) - 1 + order.length) % order.length];
}

function elementCategoryMapFor(dayMasterElement) {
  const map = {};
  map[dayMasterElement] = "비겁";
  map[nextInCycle(ELEMENT_ORDER, dayMasterElement)] = "식상"; // 내가 생하는 것
  map[prevInCycle(ELEMENT_ORDER, dayMasterElement)] = "인성"; // 나를 생하는 것
  map[nextInCycle(CONTROL_ORDER, dayMasterElement)] = "재성"; // 내가 극하는 것
  map[prevInCycle(CONTROL_ORDER, dayMasterElement)] = "관성"; // 나를 극하는 것
  return map;
}

function pillar(gan, zhi, nayin, shishenGan) {
  return {
    gan,
    zhi,
    ganKo: GAN_KO[gan] || gan,
    zhiKo: ZHI_KO[zhi] || zhi,
    ganElement: GAN_ELEMENT[gan],
    zhiElement: ZHI_ELEMENT[zhi],
    combined: `${gan}${zhi}`,
    combinedKo: `${GAN_KO[gan] || gan}${ZHI_KO[zhi] || zhi}`,
    nayin,
    shishenGan: shishenGan ? (SHISHEN_KO[shishenGan] || shishenGan) : null,
  };
}

// 진태양시 보정: 표준시 기준 경도(135°E)와 출생 도시 경도의 차이(1도당 4분)만큼 시각을 이동
function applySolarTimeCorrection(year, month, day, hour, minute, city) {
  const longitude = getCityLongitude(city);
  if (longitude === null) {
    return { year, month, day, hour, minute, corrected: false, offsetMinutes: 0 };
  }
  const offsetMinutes = Math.round((longitude - 135) * 4);
  const base = Date.UTC(year, month - 1, day, hour, minute);
  const corrected = new Date(base + offsetMinutes * 60000);
  return {
    year: corrected.getUTCFullYear(),
    month: corrected.getUTCMonth() + 1,
    day: corrected.getUTCDate(),
    hour: corrected.getUTCHours(),
    minute: corrected.getUTCMinutes(),
    corrected: true,
    offsetMinutes,
  };
}

/**
 * @param {object} input
 * @param {number} input.year 입력 날짜의 연도
 * @param {number} input.month 입력 날짜의 월 (음력이면 윤달은 별도로 isLeapMonth로 표시)
 * @param {number} input.day 입력 날짜의 일
 * @param {"solar"|"lunar"} input.calendarType 입력 날짜가 양력인지 음력인지
 * @param {boolean} input.isLeapMonth 음력 입력일 때 윤달 여부
 * @param {number|null} input.hour 출생 시(24시간제), 모르면 null
 * @param {number|null} input.minute 출생 분, 모르면 null
 * @param {string} input.city 출생 도시명 (진태양시 보정용, 선택)
 */
function computeSaju(input) {
  const { year, month, day, calendarType, isLeapMonth, hour, minute, city } = input;
  const timeKnown = hour !== null && hour !== undefined && minute !== null && minute !== undefined;

  // 1) 입력을 양력 y/m/d로 정규화
  let solarYmd;
  if (calendarType === "lunar") {
    const lm = isLeapMonth ? -month : month;
    const lunarNoTime = Lunar.fromYmd(year, lm, day);
    const solar = lunarNoTime.getSolar();
    solarYmd = { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
  } else {
    solarYmd = { year, month, day };
  }

  // 2) 진태양시 보정 (시간을 알 때만; 모르면 정오를 임시값으로 사용해 년/월/일주만 계산)
  const baseHour = timeKnown ? hour : 12;
  const baseMinute = timeKnown ? minute : 0;
  const correction = timeKnown
    ? applySolarTimeCorrection(solarYmd.year, solarYmd.month, solarYmd.day, baseHour, baseMinute, city)
    : { ...solarYmd, hour: baseHour, minute: baseMinute, corrected: false, offsetMinutes: 0 };

  // 3) 최종 양력 일시로 Solar/Lunar/EightChar 계산
  const solar = Solar.fromYmdHms(correction.year, correction.month, correction.day, correction.hour, correction.minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const yearPillar = pillar(eightChar.getYearGan(), eightChar.getYearZhi(), eightChar.getYearNaYin(), eightChar.getYearShiShenGan());
  const monthPillar = pillar(eightChar.getMonthGan(), eightChar.getMonthZhi(), eightChar.getMonthNaYin(), eightChar.getMonthShiShenGan());
  const dayPillar = pillar(eightChar.getDayGan(), eightChar.getDayZhi(), eightChar.getDayNaYin(), null);
  const timePillar = timeKnown
    ? pillar(eightChar.getTimeGan(), eightChar.getTimeZhi(), eightChar.getTimeNaYin(), eightChar.getTimeShiShenGan())
    : null;

  const chars = [yearPillar, monthPillar, dayPillar, ...(timePillar ? [timePillar] : [])];
  const fiveElements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  chars.forEach((p) => {
    fiveElements[GAN_ELEMENT[p.gan]] += 1;
    fiveElements[ZHI_ELEMENT[p.zhi]] += 1;
  });

  const dayMasterElement = GAN_ELEMENT[dayPillar.gan];
  const categoryByElement = elementCategoryMapFor(dayMasterElement);
  const tenGodDistribution = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  Object.entries(fiveElements).forEach(([element, count]) => {
    tenGodDistribution[categoryByElement[element]] += count;
  });

  return {
    input: {
      calendarType,
      isLeapMonth: !!isLeapMonth,
      timeKnown,
      city: city || null,
    },
    solarDate: solar.toYmd(),
    lunarDate: `${lunar.getYear()}-${Math.abs(lunar.getMonth())}-${lunar.getDay()}${lunar.getMonth() < 0 ? " (윤달)" : ""}`,
    correctedTime: timeKnown ? `${String(correction.hour).padStart(2, "0")}:${String(correction.minute).padStart(2, "0")}` : null,
    solarTimeCorrection: {
      applied: correction.corrected,
      offsetMinutes: correction.offsetMinutes,
    },
    zodiacAnimal: (SHENGXIAO_KO[lunar.getYearShengXiao()] || lunar.getYearShengXiao()) + "띠",
    zodiacAnimalSymbol: SHENGXIAO_SYMBOL[SHENGXIAO_KO[lunar.getYearShengXiao()]] || "🐾",
    dayMaster: {
      gan: dayPillar.gan,
      ganKo: dayPillar.ganKo,
      element: GAN_ELEMENT[dayPillar.gan],
    },
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      time: timePillar,
    },
    fiveElements,
    elementCategory: categoryByElement, // 오행별 십성 5대 분류 (일간 기준)
    tenGodDistribution, // 십성 5대 분류(비겁/식상/재성/관성/인성)별 개수
  };
}

module.exports = { computeSaju };

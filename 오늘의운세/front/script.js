const form = document.getElementById("fortune-form");
const submitBtn = document.getElementById("submit-btn");
const errorMsg = document.getElementById("error-msg");
const resultSection = document.getElementById("result");

const genderInput = document.getElementById("gender");
const genderToggle = document.getElementById("gender-toggle");
const calendarTypeSelect = document.getElementById("calendarType");
const leapRow = document.getElementById("leap-row");
const isLeapMonthInput = document.getElementById("isLeapMonth");
const birthTimeInput = document.getElementById("birthTime");
const timeUnknownInput = document.getElementById("timeUnknown");
const cityInput = document.getElementById("city");
const cityList = document.getElementById("city-list");

const ELEMENT_COLORS = { 목: "#4caf50", 화: "#ff5252", 토: "#c98a3a", 금: "#c9a227", 수: "#2f5fa8" };
const TENGOD_COLORS = { 비겁: "#6c5ce7", 식상: "#00b894", 재성: "#fdcb6e", 관성: "#e17055", 인성: "#0984e3" };

// 성별 토글 버튼
genderToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  genderToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  genderInput.value = btn.dataset.value;
});

// 음력 선택 시에만 윤달 체크박스 노출
calendarTypeSelect.addEventListener("change", () => {
  const isLunar = calendarTypeSelect.value === "lunar";
  leapRow.hidden = !isLunar;
  if (!isLunar) isLeapMonthInput.checked = false;
});

// 시간 모름 체크 시 시간 입력 비활성화
timeUnknownInput.addEventListener("change", () => {
  birthTimeInput.disabled = timeUnknownInput.checked;
  if (timeUnknownInput.checked) birthTimeInput.value = "";
});

// 도시 자동완성 목록 로드
fetch("/api/cities")
  .then((res) => res.json())
  .then((data) => {
    (data.cities || []).forEach((city) => {
      const opt = document.createElement("option");
      opt.value = city;
      cityList.appendChild(opt);
    });
  })
  .catch(() => {});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.hidden = true;
  resultSection.hidden = true;

  const name = document.getElementById("name").value;
  const birthDate = document.getElementById("birthDate").value;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    errorMsg.textContent = "생년월일을 올바르게 입력해주세요 (연도 4자리).";
    errorMsg.hidden = false;
    return;
  }

  const payload = {
    name,
    birthDate,
    gender: genderInput.value,
    calendarType: calendarTypeSelect.value,
    isLeapMonth: isLeapMonthInput.checked,
    timeUnknown: timeUnknownInput.checked,
    birthTime: timeUnknownInput.checked ? null : birthTimeInput.value || null,
    city: cityInput.value.trim() || null,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "운세 확인 중...";

  try {
    const res = await fetch("/api/fortune", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "운세를 불러오지 못했습니다.");
    }

    renderResult(data);
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "오늘의 운세 보기";
  }
});

function renderResult(data) {
  document.getElementById("western-symbol").textContent = data.westernZodiac.symbol;
  document.getElementById("western-sign").textContent = data.westernZodiac.sign;
  document.getElementById("chinese-symbol").textContent = data.chineseZodiac.symbol;
  document.getElementById("chinese-animal").textContent = data.chineseZodiac.animal;

  document.getElementById("result-name").textContent = `${data.name}님`;
  document.getElementById("result-date").textContent = `${data.date} 기준 오늘의 운세`;

  renderSaju(data.saju);

  const f = data.fortune;
  setFortune("overall", f.overall);
  setFortune("love", f.love);
  setFortune("money", f.money);
  setFortune("health", f.health);

  document.getElementById("lucky-color").textContent = f.luckyColor;
  document.getElementById("lucky-number").textContent = f.luckyNumber;
  document.getElementById("lucky-item").textContent = f.luckyItem;

  // 바(bar-fill)를 0%에서 시작해 실제 점수까지 애니메이션으로 채움
  ["overall", "love", "money", "health"].forEach((key) => {
    document.getElementById(`bar-${key}`).style.width = "0%";
  });

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById("bar-overall").style.width = `${f.overall.score}%`;
      document.getElementById("bar-love").style.width = `${f.love.score}%`;
      document.getElementById("bar-money").style.width = `${f.money.score}%`;
      document.getElementById("bar-health").style.width = `${f.health.score}%`;
    });
  });
}

function renderSaju(saju) {
  const metaParts = [`음력 ${saju.lunarDate}`];
  document.getElementById("saju-lunar-date").textContent = metaParts.join(" · ");

  let timeNote;
  if (!saju.input.timeKnown) {
    timeNote = "시간 미입력 (연·월·일주만 표시)";
  } else if (saju.solarTimeCorrection.applied) {
    const sign = saju.solarTimeCorrection.offsetMinutes >= 0 ? "+" : "";
    timeNote = `진태양시 ${saju.correctedTime} (${sign}${saju.solarTimeCorrection.offsetMinutes}분 보정)`;
  } else {
    timeNote = `입력 시각 ${saju.correctedTime} 기준`;
  }
  document.getElementById("saju-time-note").textContent = timeNote;

  const { year, month, day, time } = saju.pillars;
  setCell("saju-year-gan", year.ganKo, year.ganElement);
  setCell("saju-year-zhi", year.zhiKo, year.zhiElement);
  setCell("saju-month-gan", month.ganKo, month.ganElement);
  setCell("saju-month-zhi", month.zhiKo, month.zhiElement);
  setCell("saju-day-gan", day.ganKo, day.ganElement);
  setCell("saju-day-zhi", day.zhiKo, day.zhiElement);
  setCell("saju-time-gan", time ? time.ganKo : "－", time ? time.ganElement : null);
  setCell("saju-time-zhi", time ? time.zhiKo : "－", time ? time.zhiElement : null);

  document.getElementById("saju-year-shishen").textContent = year.shishenGan || "";
  document.getElementById("saju-month-shishen").textContent = month.shishenGan || "";
  document.getElementById("saju-time-shishen").textContent = time ? time.shishenGan || "" : "－";

  document.getElementById("saju-daymaster-note").textContent =
    `나를 상징하는 일간(日干)은 ${saju.dayMaster.ganKo}(${saju.dayMaster.gan}), 오행은 ${saju.dayMaster.element}입니다.`;

  renderElementBars(saju.fiveElements);
  renderTenGodDonut(saju.tenGodDistribution);
}

function setCell(id, text, element) {
  const el = document.getElementById(id);
  el.textContent = text;
  if (element) {
    el.dataset.element = element;
  } else {
    delete el.dataset.element;
  }
}

function renderElementBars(fiveElements) {
  const container = document.getElementById("element-bars");
  container.innerHTML = "";
  const maxCount = Math.max(1, ...Object.values(fiveElements));
  Object.entries(fiveElements).forEach(([name, count]) => {
    const row = document.createElement("div");
    row.className = "element-bar-row";
    row.innerHTML = `
      <span class="element-name">${name}</span>
      <span class="element-track"><span class="element-fill" style="width:${(count / maxCount) * 100}%; background:${ELEMENT_COLORS[name]}"></span></span>
      <span class="element-count">${count}</span>
    `;
    container.appendChild(row);
  });
}

function renderTenGodDonut(distribution) {
  const donut = document.getElementById("tengod-donut");
  const legend = document.getElementById("tengod-legend");
  const total = Object.values(distribution).reduce((sum, n) => sum + n, 0) || 1;

  let angle = 0;
  const segments = [];
  Object.entries(distribution).forEach(([name, count]) => {
    if (count <= 0) return;
    const start = (angle / total) * 100;
    angle += count;
    const end = (angle / total) * 100;
    segments.push(`${TENGOD_COLORS[name]} ${start}% ${end}%`);
  });

  donut.style.background = segments.length
    ? `conic-gradient(${segments.join(", ")})`
    : "conic-gradient(var(--pill-bg) 0 100%)";

  legend.innerHTML = "";
  Object.entries(distribution).forEach(([name, count]) => {
    const pct = Math.round((count / total) * 100);
    const row = document.createElement("div");
    row.className = "tengod-legend-row";
    row.innerHTML = `
      <span class="tengod-dot" style="background:${TENGOD_COLORS[name]}"></span>
      <span class="tengod-name">${name}</span>
      <span class="tengod-count">${count}자 (${pct}%)</span>
    `;
    legend.appendChild(row);
  });
}

function setFortune(key, item) {
  document.getElementById(`score-${key}`).textContent = `${item.score}점`;
  document.getElementById(`text-${key}`).textContent = item.text;
}

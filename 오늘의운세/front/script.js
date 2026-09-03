const form = document.getElementById("fortune-form");
const submitBtn = document.getElementById("submit-btn");
const errorMsg = document.getElementById("error-msg");
const resultSection = document.getElementById("result");

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

  submitBtn.disabled = true;
  submitBtn.textContent = "운세 확인 중...";

  try {
    const res = await fetch("/api/fortune", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, birthDate }),
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

function setFortune(key, item) {
  document.getElementById(`score-${key}`).textContent = `${item.score}점`;
  document.getElementById(`text-${key}`).textContent = item.text;
}

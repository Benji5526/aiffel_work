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

  document.getElementById("result-summary").textContent =
    `${data.name}님, ${data.date} 기준 오늘의 운세입니다.`;

  const f = data.fortune;
  setFortune("overall", f.overall);
  setFortune("love", f.love);
  setFortune("money", f.money);
  setFortune("health", f.health);

  document.getElementById("lucky-color").textContent = f.luckyColor;
  document.getElementById("lucky-number").textContent = f.luckyNumber;
  document.getElementById("lucky-item").textContent = f.luckyItem;

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setFortune(key, item) {
  document.getElementById(`score-${key}`).textContent = `${item.score}점`;
  document.getElementById(`text-${key}`).textContent = item.text;
}

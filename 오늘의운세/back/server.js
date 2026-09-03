const path = require("path");
const express = require("express");
const { computeFortune } = require("./fortune");
const { listCities } = require("./cityLongitude");

const app = express();
const PORT = process.env.PORT || 8000;
const FRONT_DIR = path.join(__dirname, "..", "front");

app.use(express.json());
app.use(express.static(FRONT_DIR));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/cities", (req, res) => {
  res.json({ cities: listCities() });
});

app.post("/api/fortune", (req, res) => {
  try {
    const result = computeFortune(req.body || {});
    res.json(result);
  } catch (err) {
    const status = err.status || 400;
    res.status(status).json({ error: err.message || "요청을 처리할 수 없습니다." });
  }
});

// SPA 폴백: 정의되지 않은 경로는 index.html 반환
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONT_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`오늘의 운세 서버 실행 중: http://localhost:${PORT}`);
});

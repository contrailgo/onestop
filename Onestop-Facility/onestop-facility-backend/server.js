const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./database");
const { seedFacilities } = require("./seedFacilities");

const facilitiesRouter = require("./routes/facilities");
const facilityReservationsRouter = require("./routes/facilityReservations");

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "onestop-facility-reservation-backend",
    time: new Date().toISOString(),
  });
});

app.use("/api/facilities", facilitiesRouter);
app.use("/api/facility-reservations", facilityReservationsRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "존재하지 않는 API 경로입니다.",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    message: error.message || "서버 오류가 발생했습니다.",
  });
});

async function startServer() {
  await initDatabase();
  const seedResult = await seedFacilities();

  app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
    console.log("DB 초기 데이터 상태:", seedResult);
  });
}

startServer().catch((error) => {
  console.error("서버 시작 실패:", error);
  process.exit(1);
});

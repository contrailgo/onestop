require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ── 미들웨어 ──
app.use(cors({
  origin: 'http://localhost:3000', // 프론트엔드 주소로 변경
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 라우터 ──
app.use('/api/auth', authRouter);

// ── 헬스체크 ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HUFS Rental API running' });
});

// ── 404 처리 ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: '요청한 경로를 찾을 수 없습니다.' });
});

// ── 에러 처리 ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`✅ HUFS Rental API 서버 실행 중: http://localhost:${PORT}`);
});

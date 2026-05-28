const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const users = require('../data/users');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
  }

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      department: user.department,
      phone: user.phone,
      role: user.role,
    },
  });
});

// GET /api/auth/me  (토큰 검증 & 내 정보)
router.get('/me', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      department: user.department,
      phone: user.phone,
      role: user.role,
    },
  });
});

// POST /api/auth/logout  (클라이언트 토큰 삭제 안내)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: '로그아웃 되었습니다. 클라이언트 토큰을 삭제해주세요.' });
});

module.exports = router;

const bcrypt = require('bcryptjs');

// 실제 서비스에서는 MySQL/PostgreSQL 등 DB로 교체하세요
const users = [
  {
    id: 1,
    username: '20210001',
    password: bcrypt.hashSync('password123', 10),
    name: '홍길동',
    department: '컴퓨터공학과',
    phone: '010-1234-5678',
    role: 'student',
  },
  {
    id: 2,
    username: 'staff001',
    password: bcrypt.hashSync('staff1234', 10),
    name: '김교수',
    department: '정보지원처',
    phone: '02-2173-2134',
    role: 'staff',
  },
];

module.exports = users;

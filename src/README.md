# HUFS One Stop Rental System

## 프로젝트 구조

```
hufs-rental/
├── backend/
│   ├── data/
│   │   └── users.js          # 임시 사용자 DB (실제 DB로 교체 필요)
│   ├── middleware/
│   │   └── auth.js           # JWT 인증 미들웨어
│   ├── routes/
│   │   └── auth.js           # 로그인/로그아웃/내 정보 API
│   ├── .env                  # 환경변수
│   └── server.js             # Express 서버 진입점
└── frontend/
    └── index.html            # 로그인 페이지 (백엔드 연결)
```

---

## 시작하기

### 1. 백엔드 실행

```bash
cd backend
npm install
node server.js
# → http://localhost:3001 에서 실행
```

개발 중 자동 재시작이 필요하면:
```bash
npm install -g nodemon
nodemon server.js
```

### 2. 프론트엔드 실행

`frontend/index.html` 을 브라우저로 열거나, 간단한 서버로 실행:

```bash
cd frontend
npx serve .
# → http://localhost:3000
```

---

## API 엔드포인트

| 메서드 | 경로              | 설명              | 인증 필요 |
|--------|-------------------|-------------------|-----------|
| GET    | /health           | 서버 상태 확인    | ✗         |
| POST   | /api/auth/login   | 로그인 → JWT 발급 | ✗         |
| GET    | /api/auth/me      | 내 정보 조회      | ✓         |
| POST   | /api/auth/logout  | 로그아웃          | ✓         |

### 로그인 요청 예시

```json
POST /api/auth/login
{
  "username": "20210001",
  "password": "password123"
}
```

### 로그인 응답 예시

```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "username": "20210001",
    "name": "홍길동",
    "department": "컴퓨터공학과",
    "phone": "010-1234-5678",
    "role": "student"
  }
}
```

---

## 테스트 계정

| 구분   | 아이디     | 비밀번호     |
|--------|------------|--------------|
| 학생   | 20210001   | password123  |
| 교직원 | staff001   | staff1234    |

---

## 실제 DB 연결 시

`backend/data/users.js` 를 실제 DB 쿼리로 교체하세요.

```js
// MySQL 예시 (mysql2 패키지 설치 필요)
const pool = require('../db/pool');

async function findUserByUsername(username) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE username = ?', [username]
  );
  return rows[0];
}
```

---

## 환경변수 (.env)

```
PORT=3001
JWT_SECRET=변경필수_랜덤문자열
JWT_EXPIRES_IN=1d
```

> ⚠️ `JWT_SECRET` 은 반드시 안전한 랜덤 문자열로 변경하세요!

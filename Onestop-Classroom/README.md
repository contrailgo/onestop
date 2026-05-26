# 원스톱 대실 시스템 - 강의실 대실

한국외국어대학교 글로벌캠퍼스 원스톱 대실 시스템의 강의실 대실 페이지 구현 프로젝트입니다.

## 폴더 구조

```text
Onestop-Classroom
├─ onestop-classroom-backend
└─ onestop-classroom-frontend
```

## 주요 기능

- 날짜 선택
- 건물 선택
- 강의실 선택
- 기타 정보 및 시간 선택
- 일반 강의실 17:00부터 21:00까지 1시간 단위 시간 선택
- 학생회관 1무용실 10:00부터 22:00까지 2시간 단위 시간 선택
- 여러 시간대 선택
- 강의실 상태 표시
  - 대실가능
  - 일부 예약됨
  - 마감됨
  - 조회만 가능
- 예약 신청
- 예약 이력 조회
- 예약 취소
- 중복 예약 방지
- React 프론트엔드와 Express 백엔드 연동
- SQLite 데이터베이스 저장

## 실행 순서

### 1. 백엔드 실행

```bash
cd onestop-classroom-backend
npm install
npm run dev
```

확인 주소:

```text
http://localhost:4000/api/health
http://localhost:4000/api/rooms
```

### 2. 프론트엔드 실행

새 터미널에서 실행합니다.

```bash
cd onestop-classroom-frontend
npm install
npm run dev
```

접속 주소:

```text
http://localhost:5173
```

## 안내

이 저장소에는 `node_modules`, `database.sqlite`, `dist`, `.env`, 로그 파일을 포함하지 않습니다.
서버 실행 시 SQLite DB 파일은 자동 생성되고, 강의실 초기 데이터가 삽입됩니다.

# 원스톱 대실 시스템 - 행사 및 기타시설 대실

한국외대 글로벌캠퍼스 원스톱 대실 시스템의 행사 및 기타시설 대실 페이지 구현 프로젝트입니다.

## 폴더 구조

```text
Onestop-Facility
├─ onestop-facility-backend
└─ onestop-facility-frontend
```

## 주요 기능

- 날짜 선택
- 시설 선택
- 기타 정보 입력 및 시간 선택
- 09:00부터 20:00까지 1시간 단위 시간 선택
- 여러 시간대 선택
- 예약 신청
- 예약 이력 조회
- 예약 취소
- 중복 예약 방지

## 실행 순서

### 1. 백엔드 실행

```bash
cd onestop-facility-backend
npm install
npm run dev
```

확인 주소:

```text
http://localhost:4100/api/health
http://localhost:4100/api/facilities
```

### 2. 프론트엔드 실행

새 터미널에서 실행합니다.

```bash
cd onestop-facility-frontend
npm install
npm run dev
```

접속 주소:

```text
http://localhost:5173
```


## 안내

`node_modules`, `database.sqlite`, `dist`, `.env`, 로그 파일을 포함하지 않습니다.
서버 실행 시 SQLite DB 파일은 자동 생성되고, 시설 초기 데이터가 삽입됩니다.

# 원스톱 대실 백엔드 API 명세

기본 주소:

```text
http://localhost:4000/api
```

## 1. 서버 상태 확인

```http
GET /api/health
```

## 2. 강의실 목록 조회

```http
GET /api/rooms
```

건물별 조회:

```http
GET /api/rooms?building=교양관
```

응답 예시:

```json
[
  {
    "id": 9,
    "building": "교양관",
    "roomNumber": "2305",
    "capacity": 65,
    "openTime": "17:00",
    "closeTime": "21:00",
    "slotUnitHours": 1,
    "status": "available"
  }
]
```

## 3. 예약 목록 조회

```http
GET /api/reservations
```

필터 예시:

```http
GET /api/reservations?date=2026-05-25
GET /api/reservations?date=2026-05-25&roomId=9
GET /api/reservations?userId=test-user
```

## 4. 예약 신청

```http
POST /api/reservations
Content-Type: application/json
```

요청 예시:

```json
{
  "userId": "test-user",
  "date": "2026-05-25",
  "roomId": 9,
  "times": [
    {
      "id": "17:00-18:00",
      "startTime": "17:00",
      "endTime": "18:00",
      "label": "17:00 ~ 18:00"
    }
  ],
  "contact": "010-0000-0000",
  "groupType": "스터디",
  "purpose": "오픈소스SW 팀 프로젝트 회의"
}
```

백엔드는 `roomId` 기준으로 `building`, `roomNumber`를 DB에서 다시 확인합니다.

중복 예약이면 `409 Conflict`를 반환합니다.

## 5. 예약 취소

```http
DELETE /api/reservations/:id
```

실제 삭제가 아니라 상태를 `취소됨`으로 바꿉니다.
기본 예약 목록 조회에서는 취소된 예약을 제외합니다.

## 상태값

예약 상태:

```text
승인 대기
승인 완료
반려
취소됨
```

강의실 상태:

```text
available
viewOnly
```

프론트엔드에서는 예약 현황에 따라 `대실가능`, `일부 예약됨`, `마감됨`을 계산해 표시할 수 있습니다.

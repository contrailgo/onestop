# 행사 및 기타시설 대실 API 명세

기본 주소:

```text
http://localhost:4100/api
```

## GET /health

서버 상태 확인.

## GET /facilities

시설 목록 조회.

예시 응답:

```json
[
  {
    "id": 1,
    "campus": "글로벌캠퍼스",
    "building": "자연과학관",
    "facilityName": "세향관(250석)",
    "capacity": 250,
    "openTime": "09:00",
    "closeTime": "20:00",
    "slotUnitHours": 1,
    "status": "available"
  }
]
```

## GET /facility-reservations

예약 목록 조회.

쿼리 파라미터:

```text
date
facilityId
userId
building
includeCanceled=true
```

## POST /facility-reservations

예약 신청.

```json
{
  "userId": "test-user",
  "date": "2026-06-12",
  "facilityId": 1,
  "times": [
    {
      "id": "09:00-10:00",
      "startTime": "09:00",
      "endTime": "10:00",
      "label": "09:00 ~ 10:00"
    }
  ],
  "applicantContact": "010-0000-0000",
  "purpose": "행사 준비",
  "hostGroup": "오픈소스SW팀",
  "leaderName": "홍길동",
  "leaderContact": "010-1111-2222"
}
```

## DELETE /facility-reservations/:id

예약 취소.

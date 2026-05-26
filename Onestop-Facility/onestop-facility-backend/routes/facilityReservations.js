const express = require("express");
const { all, get, run } = require("../database");

const router = express.Router();

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
}

function toMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function makeAllowedSlots(facility) {
  const start = toMinutes(facility.open_time);
  const end = toMinutes(facility.close_time);
  const unit = Number(facility.slot_unit_hours || 1) * 60;
  const slots = [];

  for (let cursor = start; cursor < end; cursor += unit) {
    const startHour = Math.floor(cursor / 60);
    const endHour = Math.floor((cursor + unit) / 60);
    const startTime = `${pad2(startHour)}:00`;
    const endTime = `${pad2(endHour)}:00`;

    slots.push({
      id: `${startTime}-${endTime}`,
      startTime,
      endTime,
      label: `${startTime} ~ ${endTime}`,
    });
  }

  return slots;
}

function groupReservationRows(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        userId: row.user_id,
        date: row.date,
        campus: row.campus,
        building: row.building,
        facilityId: row.facility_id,
        facilityName: row.facility_name,
        applicantContact: row.applicant_contact,
        purpose: row.purpose,
        hostGroup: row.host_group,
        leaderName: row.leader_name,
        leaderContact: row.leader_contact,
        status: row.status,
        createdAt: row.created_at,
        times: [],
      });
    }

    if (row.time_id) {
      map.get(row.id).times.push({
        id: `${row.start_time}-${row.end_time}`,
        timeId: row.time_id,
        startTime: row.start_time,
        endTime: row.end_time,
        label: row.label,
      });
    }
  }

  return Array.from(map.values()).map((reservation) => ({
    ...reservation,
    times: reservation.times.sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

async function findConflicts({ date, facilityId, times }) {
  const conflicts = [];

  for (const time of times) {
    const rows = await all(
      `
      SELECT
        r.id AS reservation_id,
        rt.start_time,
        rt.end_time,
        rt.label
      FROM facility_reservations r
      JOIN facility_reservation_times rt ON rt.reservation_id = r.id
      WHERE r.date = ?
        AND r.facility_id = ?
        AND r.status <> '취소됨'
        AND rt.start_time < ?
        AND ? < rt.end_time
      `,
      [date, facilityId, time.endTime, time.startTime]
    );

    conflicts.push(...rows);
  }

  return conflicts;
}

function validateReservationBody(body) {
  const errors = [];

  if (!isValidDate(body.date)) {
    errors.push("date는 YYYY-MM-DD 형식이어야 합니다.");
  }

  if (!body.facilityId || Number.isNaN(Number(body.facilityId))) {
    errors.push("facilityId가 필요합니다.");
  }

  if (!Array.isArray(body.times) || body.times.length === 0) {
    errors.push("times는 하나 이상의 시간대를 포함해야 합니다.");
  }

  if (!String(body.applicantContact || "").trim()) {
    errors.push("applicantContact가 필요합니다.");
  } else if (!/^[0-9-]{9,20}$/.test(String(body.applicantContact).trim())) {
    errors.push("applicantContact는 숫자와 하이픈(-)만 입력할 수 있습니다.");
  }

  if (!String(body.purpose || "").trim()) {
    errors.push("purpose가 필요합니다.");
  }

  if (!String(body.hostGroup || "").trim()) {
    errors.push("hostGroup이 필요합니다.");
  }

  if (!String(body.leaderName || "").trim()) {
    errors.push("leaderName이 필요합니다.");
  }

  if (!String(body.leaderContact || "").trim()) {
    errors.push("leaderContact가 필요합니다.");
  } else if (!/^[0-9-]{9,20}$/.test(String(body.leaderContact).trim())) {
    errors.push("leaderContact는 숫자와 하이픈(-)만 입력할 수 있습니다.");
  }

  const normalizedTimes = [];

  if (Array.isArray(body.times)) {
    for (const time of body.times) {
      if (!time || !isValidTime(time.startTime) || !isValidTime(time.endTime)) {
        errors.push("times의 startTime/endTime은 HH:MM 형식이어야 합니다.");
        continue;
      }

      if (time.startTime >= time.endTime) {
        errors.push("startTime은 endTime보다 빨라야 합니다.");
        continue;
      }

      normalizedTimes.push({
        id: `${time.startTime}-${time.endTime}`,
        startTime: time.startTime,
        endTime: time.endTime,
        label: time.label || `${time.startTime} ~ ${time.endTime}`,
      });
    }
  }

  const uniqueTimeIds = new Set(normalizedTimes.map((time) => time.id));
  if (uniqueTimeIds.size !== normalizedTimes.length) {
    errors.push("같은 시간대를 중복으로 보낼 수 없습니다.");
  }

  return {
    errors,
    normalized: {
      userId: String(body.userId || "test-user").trim(),
      date: body.date,
      facilityId: Number(body.facilityId),
      times: normalizedTimes,
      applicantContact: String(body.applicantContact || "").trim(),
      purpose: String(body.purpose || "").trim(),
      hostGroup: String(body.hostGroup || "").trim(),
      leaderName: String(body.leaderName || "").trim(),
      leaderContact: String(body.leaderContact || "").trim(),
    },
  };
}

router.get("/", async (req, res, next) => {
  try {
    const {
      date,
      facilityId,
      userId,
      building,
      includeCanceled,
    } = req.query;

    let sql = `
      SELECT
        r.id,
        r.user_id,
        r.date,
        r.campus,
        r.building,
        r.facility_id,
        r.facility_name,
        r.applicant_contact,
        r.purpose,
        r.host_group,
        r.leader_name,
        r.leader_contact,
        r.status,
        r.created_at,
        rt.id AS time_id,
        rt.start_time,
        rt.end_time,
        rt.label
      FROM facility_reservations r
      LEFT JOIN facility_reservation_times rt ON rt.reservation_id = r.id
      WHERE 1 = 1
    `;
    const params = [];

    if (date) {
      sql += " AND r.date = ?";
      params.push(date);
    }

    if (facilityId) {
      sql += " AND r.facility_id = ?";
      params.push(facilityId);
    }

    if (userId) {
      sql += " AND r.user_id = ?";
      params.push(userId);
    }

    if (building) {
      sql += " AND r.building = ?";
      params.push(building);
    }

    if (includeCanceled !== "true") {
      sql += " AND r.status <> '취소됨'";
    }

    sql += " ORDER BY r.created_at DESC, r.id DESC, rt.start_time ASC";

    const rows = await all(sql, params);
    res.json(groupReservationRows(rows));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { errors, normalized } = validateReservationBody(req.body);

    if (errors.length > 0) {
      res.status(400).json({
        message: "예약 신청 데이터가 올바르지 않습니다.",
        errors,
      });
      return;
    }

    const facility = await get(
      `
      SELECT
        id,
        campus,
        building,
        facility_name,
        capacity,
        open_time,
        close_time,
        slot_unit_hours,
        status
      FROM facilities
      WHERE id = ?
      `,
      [normalized.facilityId]
    );

    if (!facility) {
      res.status(404).json({ message: "시설을 찾을 수 없습니다." });
      return;
    }

    if (facility.status === "viewOnly") {
      res.status(400).json({ message: "조회만 가능한 시설은 예약할 수 없습니다." });
      return;
    }

    const allowedSlots = makeAllowedSlots(facility);
    const allowedSlotIds = new Set(allowedSlots.map((slot) => slot.id));

    const hasInvalidSlot = normalized.times.some((time) => {
      return !allowedSlotIds.has(time.id);
    });

    if (hasInvalidSlot) {
      res.status(400).json({
        message: "해당 시설에서 선택할 수 없는 시간대가 포함되어 있습니다.",
        allowedSlots,
      });
      return;
    }

    const conflicts = await findConflicts({
      date: normalized.date,
      facilityId: normalized.facilityId,
      times: normalized.times,
    });

    if (conflicts.length > 0) {
      res.status(409).json({
        message: "이미 예약된 시간대가 있습니다.",
        conflicts,
      });
      return;
    }

    await run(
      `
      INSERT OR IGNORE INTO users (id, name, role)
      VALUES (?, ?, ?)
      `,
      [normalized.userId, "임시 사용자", "student"]
    );

    const result = await run(
      `
      INSERT INTO facility_reservations (
        user_id,
        date,
        campus,
        building,
        facility_id,
        facility_name,
        applicant_contact,
        purpose,
        host_group,
        leader_name,
        leader_contact,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalized.userId,
        normalized.date,
        facility.campus,
        facility.building,
        facility.id,
        facility.facility_name,
        normalized.applicantContact,
        normalized.purpose,
        normalized.hostGroup,
        normalized.leaderName,
        normalized.leaderContact,
        "승인 대기",
      ]
    );

    for (const time of normalized.times) {
      await run(
        `
        INSERT INTO facility_reservation_times (
          reservation_id,
          start_time,
          end_time,
          label
        )
        VALUES (?, ?, ?, ?)
        `,
        [result.id, time.startTime, time.endTime, time.label]
      );
    }

    const rows = await all(
      `
      SELECT
        r.id,
        r.user_id,
        r.date,
        r.campus,
        r.building,
        r.facility_id,
        r.facility_name,
        r.applicant_contact,
        r.purpose,
        r.host_group,
        r.leader_name,
        r.leader_contact,
        r.status,
        r.created_at,
        rt.id AS time_id,
        rt.start_time,
        rt.end_time,
        rt.label
      FROM facility_reservations r
      LEFT JOIN facility_reservation_times rt ON rt.reservation_id = r.id
      WHERE r.id = ?
      ORDER BY rt.start_time ASC
      `,
      [result.id]
    );

    res.status(201).json(groupReservationRows(rows)[0]);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const reservation = await get(
      `
      SELECT id, status
      FROM facility_reservations
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (!reservation) {
      res.status(404).json({ message: "예약을 찾을 수 없습니다." });
      return;
    }

    if (reservation.status === "취소됨") {
      res.json({
        success: true,
        id: reservation.id,
        status: "취소됨",
      });
      return;
    }

    await run(
      `
      UPDATE facility_reservations
      SET status = '취소됨'
      WHERE id = ?
      `,
      [req.params.id]
    );

    res.json({
      success: true,
      id: Number(req.params.id),
      status: "취소됨",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

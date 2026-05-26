const express = require("express");
const { all, get, run } = require("../database");

const router = express.Router();

function isTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

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

function makeAllowedSlots(room) {
  const start = toMinutes(room.open_time);
  const end = toMinutes(room.close_time);
  const unit = Number(room.slot_unit_hours || 1) * 60;
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
        building: row.building,
        roomId: row.room_id,
        roomNumber: row.room_number,
        contact: row.contact,
        groupType: row.group_type,
        purpose: row.purpose,
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

async function findConflicts({ date, roomId, times }) {
  const conflicts = [];

  for (const time of times) {
    const rows = await all(
      `
      SELECT
        r.id AS reservation_id,
        rt.start_time,
        rt.end_time,
        rt.label
      FROM reservations r
      JOIN reservation_times rt ON rt.reservation_id = r.id
      WHERE r.date = ?
        AND r.room_id = ?
        AND r.status <> '취소됨'
        AND rt.start_time < ?
        AND ? < rt.end_time
      `,
      [date, roomId, time.endTime, time.startTime]
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

  if (!body.roomId || Number.isNaN(Number(body.roomId))) {
    errors.push("roomId가 필요합니다.");
  }

  if (!Array.isArray(body.times) || body.times.length === 0) {
    errors.push("times는 하나 이상의 시간대를 포함해야 합니다.");
  }

  if (!String(body.contact || "").trim()) {
    errors.push("contact가 필요합니다.");
  } else if (!/^[0-9-]{9,20}$/.test(String(body.contact).trim())) {
    errors.push("contact는 숫자와 하이픈(-)만 입력할 수 있습니다.");
  }

  if (!String(body.groupType || "").trim()) {
    errors.push("groupType이 필요합니다.");
  }

  if (!String(body.purpose || "").trim()) {
    errors.push("purpose가 필요합니다.");
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

  return {
    errors,
    normalizedTimes,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { date, roomId, userId, building, includeCanceled } = req.query;

    let sql = `
      SELECT
        r.id,
        r.user_id,
        r.date,
        r.building,
        r.room_id,
        r.room_number,
        r.contact,
        r.group_type,
        r.purpose,
        r.status,
        r.created_at,
        rt.id AS time_id,
        rt.start_time,
        rt.end_time,
        rt.label
      FROM reservations r
      LEFT JOIN reservation_times rt ON rt.reservation_id = r.id
      WHERE 1 = 1
    `;
    const params = [];

    if (includeCanceled !== "true") {
      sql += " AND r.status <> '취소됨'";
    }

    if (date) {
      sql += " AND r.date = ?";
      params.push(date);
    }

    if (roomId) {
      sql += " AND r.room_id = ?";
      params.push(Number(roomId));
    }

    if (userId) {
      sql += " AND r.user_id = ?";
      params.push(userId);
    }

    if (building) {
      sql += " AND r.building = ?";
      params.push(building);
    }

    sql += " ORDER BY r.date DESC, r.created_at DESC, r.id DESC, rt.start_time ASC";

    const rows = await all(sql, params);
    res.json(groupReservationRows(rows));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const rows = await all(
      `
      SELECT
        r.id,
        r.user_id,
        r.date,
        r.building,
        r.room_id,
        r.room_number,
        r.contact,
        r.group_type,
        r.purpose,
        r.status,
        r.created_at,
        rt.id AS time_id,
        rt.start_time,
        rt.end_time,
        rt.label
      FROM reservations r
      LEFT JOIN reservation_times rt ON rt.reservation_id = r.id
      WHERE r.id = ?
      ORDER BY rt.start_time ASC
      `,
      [req.params.id]
    );

    const [reservation] = groupReservationRows(rows);

    if (!reservation) {
      res.status(404).json({ message: "예약을 찾을 수 없습니다." });
      return;
    }

    res.json(reservation);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    const { errors, normalizedTimes } = validateReservationBody(body);

    if (errors.length > 0) {
      res.status(400).json({
        message: "예약 요청값이 올바르지 않습니다.",
        errors,
      });
      return;
    }

    const room = await get(
      `
      SELECT id, building, room_number, capacity, open_time, close_time, slot_unit_hours, status
      FROM rooms
      WHERE id = ?
      `,
      [Number(body.roomId)]
    );

    if (!room) {
      res.status(404).json({ message: "강의실을 찾을 수 없습니다." });
      return;
    }

    if (room.status === "viewOnly") {
      res.status(400).json({ message: "조회만 가능한 강의실은 예약할 수 없습니다." });
      return;
    }

    const allowedSlots = makeAllowedSlots(room);
    const invalidSlots = normalizedTimes.filter((time) => {
      return !allowedSlots.some((slot) => {
        return slot.startTime === time.startTime && slot.endTime === time.endTime;
      });
    });

    if (invalidSlots.length > 0) {
      res.status(400).json({
        message: "해당 강의실에서 선택할 수 없는 시간대가 포함되어 있습니다.",
        invalidSlots,
        allowedSlots,
      });
      return;
    }

    const conflicts = await findConflicts({
      date: body.date,
      roomId: room.id,
      times: normalizedTimes,
    });

    if (conflicts.length > 0) {
      res.status(409).json({
        message: "이미 예약된 시간대가 있습니다.",
        conflicts,
      });
      return;
    }

    await run("BEGIN TRANSACTION");

    try {
      const insertResult = await run(
        `
        INSERT INTO reservations
          (user_id, date, building, room_id, room_number, contact, group_type, purpose, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          body.userId || "test-user",
          body.date,
          room.building,
          room.id,
          room.room_number,
          String(body.contact).trim(),
          String(body.groupType).trim(),
          String(body.purpose).trim(),
          "승인 대기",
        ]
      );

      const reservationId = insertResult.id;

      for (const time of normalizedTimes) {
        await run(
          `
          INSERT INTO reservation_times
            (reservation_id, start_time, end_time, label)
          VALUES (?, ?, ?, ?)
          `,
          [reservationId, time.startTime, time.endTime, time.label]
        );
      }

      await run("COMMIT");

      const rows = await all(
        `
        SELECT
          r.id,
          r.user_id,
          r.date,
          r.building,
          r.room_id,
          r.room_number,
          r.contact,
          r.group_type,
          r.purpose,
          r.status,
          r.created_at,
          rt.id AS time_id,
          rt.start_time,
          rt.end_time,
          rt.label
        FROM reservations r
        LEFT JOIN reservation_times rt ON rt.reservation_id = r.id
        WHERE r.id = ?
        ORDER BY rt.start_time ASC
        `,
        [reservationId]
      );

      const [createdReservation] = groupReservationRows(rows);
      res.status(201).json(createdReservation);
    } catch (error) {
      await run("ROLLBACK");
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const reservation = await get("SELECT id, status FROM reservations WHERE id = ?", [req.params.id]);

    if (!reservation) {
      res.status(404).json({ message: "예약을 찾을 수 없습니다." });
      return;
    }

    if (reservation.status === "취소됨") {
      res.json({ success: true, id: Number(req.params.id), status: "취소됨" });
      return;
    }

    await run("UPDATE reservations SET status = '취소됨' WHERE id = ?", [req.params.id]);

    res.json({ success: true, id: Number(req.params.id), status: "취소됨" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require("express");
const { all, get } = require("../database");

const router = express.Router();

function toRoomDTO(row) {
  return {
    id: row.id,
    building: row.building,
    roomNumber: row.room_number,
    capacity: row.capacity,
    openTime: row.open_time,
    closeTime: row.close_time,
    slotUnitHours: row.slot_unit_hours,
    status: row.status,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { building } = req.query;

    let sql = `
      SELECT id, building, room_number, capacity, open_time, close_time, slot_unit_hours, status
      FROM rooms
    `;
    const params = [];

    if (building) {
      sql += " WHERE building = ?";
      params.push(building);
    }

    sql += " ORDER BY building ASC, id ASC";

    const rows = await all(sql, params);
    res.json(rows.map(toRoomDTO));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const room = await get(
      `
      SELECT id, building, room_number, capacity, open_time, close_time, slot_unit_hours, status
      FROM rooms
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (!room) {
      res.status(404).json({ message: "강의실을 찾을 수 없습니다." });
      return;
    }

    res.json(toRoomDTO(room));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

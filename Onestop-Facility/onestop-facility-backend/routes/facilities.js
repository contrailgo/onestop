const express = require("express");
const { all, get } = require("../database");

const router = express.Router();

function toFacilityDTO(row) {
  return {
    id: row.id,
    campus: row.campus,
    building: row.building,
    facilityName: row.facility_name,
    capacity: row.capacity,
    openTime: row.open_time,
    closeTime: row.close_time,
    slotUnitHours: row.slot_unit_hours,
    status: row.status,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { building, campus } = req.query;

    let sql = `
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
      WHERE 1 = 1
    `;
    const params = [];

    if (building) {
      sql += " AND building = ?";
      params.push(building);
    }

    if (campus) {
      sql += " AND campus = ?";
      params.push(campus);
    }

    sql += " ORDER BY id ASC";

    const rows = await all(sql, params);
    res.json(rows.map(toFacilityDTO));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
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
      [req.params.id]
    );

    if (!facility) {
      res.status(404).json({ message: "시설을 찾을 수 없습니다." });
      return;
    }

    res.json(toFacilityDTO(facility));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

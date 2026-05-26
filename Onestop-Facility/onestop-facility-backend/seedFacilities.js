const { get, run, initDatabase } = require("./database");
const { facilities } = require("./data/facilityData");

async function seedFacilities() {
  const row = await get("SELECT COUNT(*) AS count FROM facilities");

  if (row.count > 0) {
    return {
      inserted: 0,
      skipped: true,
      reason: "facilities 테이블에 기존 데이터가 있습니다.",
    };
  }

  for (const facility of facilities) {
    await run(
      `
      INSERT INTO facilities (
        id,
        campus,
        building,
        facility_name,
        capacity,
        open_time,
        close_time,
        slot_unit_hours,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        facility.id,
        facility.campus,
        facility.building,
        facility.facilityName,
        facility.capacity,
        facility.openTime,
        facility.closeTime,
        facility.slotUnitHours,
        facility.status,
      ]
    );
  }

  await run(
    `
    INSERT OR IGNORE INTO users (id, name, student_id, email, role)
    VALUES (?, ?, ?, ?, ?)
    `,
    ["test-user", "테스트 사용자", "202402188", "test@example.com", "student"]
  );

  return {
    inserted: facilities.length,
    skipped: false,
  };
}

if (require.main === module) {
  initDatabase()
    .then(seedFacilities)
    .then((result) => {
      console.log("시설 초기 데이터 삽입 결과:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("시설 초기 데이터 삽입 실패:", error);
      process.exit(1);
    });
}

module.exports = {
  seedFacilities,
};

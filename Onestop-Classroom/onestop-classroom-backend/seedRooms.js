const { initDatabase, closeDatabase, get, run } = require("./database");
const { classroomData } = require("./data/classroomData");

async function seedRooms() {
  const row = await get("SELECT COUNT(*) AS count FROM rooms");
  if (row && row.count > 0) {
    return { inserted: 0, skipped: row.count };
  }

  let inserted = 0;

  await run(
    `
    INSERT OR IGNORE INTO users (id, name, student_id, email, role)
    VALUES (?, ?, ?, ?, ?)
    `,
    ["test-user", "테스트 사용자", "202402188", "test@example.com", "student"]
  );

  for (const room of classroomData) {
    const result = await run(
      `
      INSERT OR IGNORE INTO rooms
        (id, building, room_number, capacity, open_time, close_time, slot_unit_hours, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        room.id,
        room.building,
        room.roomNumber,
        room.capacity,
        room.openTime,
        room.closeTime,
        room.slotUnitHours,
        room.status,
      ]
    );

    if (result.changes > 0) {
      inserted += 1;
    }
  }

  return { inserted, skipped: 0 };
}

if (require.main === module) {
  initDatabase()
    .then(seedRooms)
    .then((result) => {
      console.log("강의실 초기 데이터 처리 완료:", result);
      return closeDatabase();
    })
    .catch((error) => {
      console.error("초기 데이터 처리 실패:", error);
      process.exit(1);
    });
}

module.exports = {
  seedRooms,
};

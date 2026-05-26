function createFacility(
  id,
  building,
  facilityName,
  capacity,
  openTime = "09:00",
  closeTime = "20:00",
  slotUnitHours = 1,
  campus = "글로벌캠퍼스"
) {
  return {
    id,
    campus,
    building,
    facilityName,
    capacity,
    openTime,
    closeTime,
    slotUnitHours,
    status: "available",
  };
}

const facilities = [
  createFacility(1, "자연과학관", "세향관(250석)", 250),
  createFacility(2, "주차복지관", "소극장(151석)", 151),
  createFacility(3, "소운동장", "소운동장", 0),
  createFacility(4, "구기숙사", "테니스장(학생용) 입구 좌측 (1면)", 1),
];

module.exports = {
  facilities,
  createFacility,
};

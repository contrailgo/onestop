export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function makeDateKey(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function getHour(time) {
  return Number(time.split(":")[0]);
}

export function makeTimeSlots(facility) {
  const startHour = getHour(facility.openTime);
  const endHour = getHour(facility.closeTime);
  const unit = Number(facility.slotUnitHours || 1);
  const slots = [];

  for (let hour = startHour; hour < endHour; hour += unit) {
    slots.push({
      id: `${pad2(hour)}:00-${pad2(hour + unit)}:00`,
      startTime: `${pad2(hour)}:00`,
      endTime: `${pad2(hour + unit)}:00`,
      label: `${pad2(hour)}:00 ~ ${pad2(hour + unit)}:00`,
    });
  }

  return slots;
}

export function isTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function getStatusText(status) {
  if (status === "available") return "대실가능";
  if (status === "partial") return "일부 예약됨";
  if (status === "closed") return "마감됨";
  return "조회만 가능";
}

export function getStatusClass(status) {
  if (status === "available") return "available";
  if (status === "partial") return "partial";
  if (status === "closed") return "closed";
  return "view-only";
}

export function formatCapacity(value, facilityName = "") {
  const capacity = Number(value || 0);

  if (!capacity) return "-";
  if (String(facilityName).includes("테니스장")) return `${capacity}면`;
  return `${capacity}석`;
}

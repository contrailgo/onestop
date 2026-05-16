import { useState } from "react";

const steps = [
  { id: 1, label: "날짜 선택" },
  { id: 2, label: "건물 선택" },
  { id: 3, label: "호실 선택" },
];

// 건물별 호실 데이터
const ROOM_DATA = {
  "어문학관-1": [
    { name: "1호실" }, { name: "2호실" }, { name: "3호실" }, { name: "4호실" },
  ],
  "어문학관-2": [
    { name: "5호실" }, { name: "6호실" }, { name: "7호실" },
  ],
  "자연과학관-1": [
    { name: "1호실" }, { name: "2호실" },
  ],
  "인문경상관-1": [
    { name: "101호" }, { name: "102호" }, { name: "103호" },
  ],
  "백년관-1": [
    { name: "5호실" }, { name: "6호실" }, { name: "7호실" }, { name: "8호실" },
  ],
  "백년관-2": [
    { name: "9호실" },
  ],
  "교수학습개발원-1": [
    { name: "스터디 1" }, { name: "스터디 2" }, { name: "스터디 3" }, { name: "스터디 4" },
  ],
  "교수학습개발원-2": [
    { name: "말하기 1 (2인용)" }, { name: "말하기 2 (2인용)" },
    { name: "말하기 3 (2인용)" }, { name: "말하기 4 (2인용)" },
  ],
  "교수학습개발원-3": [
    { name: "말하기 5 (2인용) 장애인우선배정" }, { name: "말하기 6 (2인용)" },
    { name: "말하기 7 (2인용)" }, { name: "말하기 8 (2인용)" },
  ],
  "교수학습개발원-4": [
    { name: "말하기 9 (2인용)" }, { name: "말하기 10 (2인용)" },
  ],
};

// 9:00 ~ 21:30 까지 30분 단위 슬롯 생성 (끝은 22:00)
const generateSlots = () => {
  const slots = [];
  for (let h = 9; h <= 21; h++) {
    slots.push({ hour: h, minute: 0, label: `${String(h).padStart(2, "0")} ~ 30` });
    slots.push({ hour: h, minute: 30, label: `30 ~ ${String(h === 21 ? 22 : h + 1).padStart(2, "0")}` });
  }
  // 21:30 ~ 22:00
  slots[slots.length - 1] = { hour: 21, minute: 30, label: "30 ~ 00" };
  return slots;
};

const SLOTS = generateSlots();

// 슬롯 인덱스를 분으로 환산
const slotToMinutes = (idx) => SLOTS[idx].hour * 60 + SLOTS[idx].minute;

// 시간대별로 슬롯 그룹핑
const groupByHour = () => {
  const groups = {};
  SLOTS.forEach((slot, idx) => {
    if (!groups[slot.hour]) groups[slot.hour] = [];
    groups[slot.hour].push({ ...slot, idx });
  });
  return groups;
};

const HOUR_GROUPS = groupByHour();

export default function RoomPicker({ building, onPrev, onNext }) {
  const rooms = ROOM_DATA[building?.name] || [];
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [startIdx, setStartIdx] = useState(null);
  const [endIdx, setEndIdx] = useState(null);

  const handleRoomClick = (roomName) => {
    setSelectedRoom(roomName);
    setStartIdx(null);
    setEndIdx(null);
  };

  const handleSlotClick = (idx) => {
    // 이미 범위가 설정된 상태 → 초기화
    if (startIdx !== null && endIdx !== null) {
      setStartIdx(null);
      setEndIdx(null);
      return;
    }
    // 시작 타임 미설정
    if (startIdx === null) {
      setStartIdx(idx);
      return;
    }
    // 끝 타임 설정
    if (idx === startIdx) {
      setStartIdx(null);
      return;
    }
    const min = Math.min(startIdx, idx);
    const max = Math.max(startIdx, idx);
    setStartIdx(min);
    setEndIdx(max);
  };

  const isInRange = (idx) => {
    if (startIdx === null) return false;
    if (endIdx === null) return idx === startIdx;
    return idx >= startIdx && idx <= endIdx;
  };

  const isStart = (idx) => idx === startIdx && endIdx !== null;
  const isEnd = (idx) => idx === endIdx;

  const canConfirm = selectedRoom && startIdx !== null && endIdx !== null;

  const getTimeLabel = () => {
    if (startIdx === null) return null;
    const s = SLOTS[startIdx];
    const e = SLOTS[endIdx ?? startIdx];
    const startStr = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
    const endMin = slotToMinutes(endIdx ?? startIdx) + 30;
    const endStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    return `${startStr} ~ ${endStr}`;
  };

  return (
    <div style={styles.wrapper}>
      {/* 단계 표시 */}
      <div style={styles.stepBar}>
        {steps.map((step) => (
          <div key={step.id} style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, ...(step.id === 3 ? styles.stepCircleActive : {}) }}>
              {step.id}
            </div>
            <span style={{ ...styles.stepLabel, ...(step.id === 3 ? styles.stepLabelActive : {}) }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* 메인 카드 */}
      <div style={styles.card}>
        <div style={styles.mainContent}>

          {/* 왼쪽: 호실 목록 */}
          <div style={styles.roomList}>
            <div style={styles.listHeader}>호실</div>
            {rooms.map((room) => (
              <div
                key={room.name}
                style={{
                  ...styles.roomItem,
                  background: selectedRoom === room.name ? "#d4e157" : "#fff",
                  fontWeight: selectedRoom === room.name ? 700 : 400,
                }}
                onClick={() => handleRoomClick(room.name)}
              >
                {room.name}
              </div>
            ))}
          </div>

          {/* 오른쪽: 시간 선택 */}
          <div style={styles.timeArea}>
            {!selectedRoom ? (
              <div style={styles.placeholder}>← 호실을 선택하세요</div>
            ) : (
              <>
                {/* 호실명 헤더 */}
                <div style={styles.timeHeader}>{selectedRoom}</div>

                {/* 시간 슬롯 */}
                <div style={styles.slotTable}>
                  {Object.entries(HOUR_GROUPS).map(([hour, slots]) => (
                    <div key={hour} style={styles.hourRow}>
                      {/* 시간 레이블 */}
                      <div style={styles.hourLabel}>{hour}시</div>
                      {/* 30분 슬롯 2개 */}
                      <div style={styles.slotGroup}>
                        {slots.map((slot) => (
                          <div
                            key={slot.idx}
                            style={{
                              ...styles.slot,
                              background: isInRange(slot.idx) ? "#d4e157" : "#fff",
                              fontWeight: isStart(slot.idx) || isEnd(slot.idx) ? 700 : 400,
                              cursor: "pointer",
                            }}
                            onClick={() => handleSlotClick(slot.idx)}
                          >
                            {slot.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={styles.bottomBar}>
          <button style={styles.prevBtn} onClick={onPrev}>← 이전 단계</button>
          <button
            style={{ ...styles.nextBtn, ...(canConfirm ? {} : styles.nextBtnDisabled) }}
            disabled={!canConfirm}
            onClick={() => canConfirm && onNext && onNext({ room: selectedRoom, time: getTimeLabel() })}
          >
            다음 단계 →
          </button>
        </div>
      </div>

      <div style={styles.footer}>정보처 정보시스템팀</div>
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: "'Noto Sans KR', sans-serif",
    width: "100%",
    maxWidth: 450,
    margin: "0 auto",
    padding: "20px 16px",
  },
  stepBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #ddd",
  },
  stepItem: { display: "flex", alignItems: "center", gap: 6 },
  stepCircle: {
    width: 28, height: 28, borderRadius: "50%",
    border: "2px solid #aaa", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 600, color: "#aaa", background: "#fff",
  },
  stepCircleActive: { borderColor: "#3bb8e0", color: "#3bb8e0" },
  stepLabel: { fontSize: 13, color: "#aaa", marginRight: 12 },
  stepLabelActive: { color: "#3bb8e0", fontWeight: 600 },
  card: {
    border: "1px solid #ccc", borderRadius: 4,
    overflow: "hidden", background: "#fff",
  },
  mainContent: {
    display: "flex",
    minHeight: 400,
  },
  roomList: {
    width: 130,
    borderRight: "1px solid #ddd",
    flexShrink: 0,
  },
  listHeader: {
    padding: "10px 16px",
    background: "#f7f7f7",
    borderBottom: "1px solid #ddd",
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    textAlign: "center",
  },
  roomItem: {
    padding: "12px 16px",
    fontSize: 13,
    borderBottom: "1px solid #eee",
    cursor: "pointer",
    transition: "background 0.1s",
    color: "#333",
  },
  timeArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  placeholder: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#aaa",
    fontSize: 14,
  },
  timeHeader: {
    padding: "10px 16px",
    background: "#f7f7f7",
    borderBottom: "1px solid #ddd",
    fontSize: 13,
    fontWeight: 700,
    color: "#333",
    textAlign: "center",
  },
  slotTable: {
    height: 600,
    overflowY: "auto",
  },
  hourRow: {
    display: "flex",
    borderBottom: "1px solid #eee",
  },
  hourLabel: {
    width: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    color: "#555",
    borderRight: "1px solid #eee",
    flexShrink: 0,
    fontWeight: 600,
  },
  slotGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  slot: {
    padding: "16px 20px",
    fontSize: 13,
    color: "#333",
    borderBottom: "1px solid #f0f0f0",
    transition: "background 0.1s",
    userSelect: "none",
  },
  selectedTimeInfo: {
    padding: "8px 16px",
    background: "#f0f9ff",
    borderTop: "1px solid #ddd",
    fontSize: 13,
    color: "#1a8fb5",
    fontWeight: 600,
  },
  bottomBar: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "10px 16px",
    borderTop: "1px solid #eee",
    background: "#fafafa",
  },
  prevBtn: {
    background: "#f0f0f0", border: "1px solid #ccc",
    borderRadius: 4, padding: "6px 16px",
    fontSize: 13, color: "#555", cursor: "pointer",
  },
  nextBtn: {
    background: "#3bb8e0", border: "none",
    borderRadius: 4, padding: "6px 16px",
    fontSize: 13, color: "#fff",
    cursor: "pointer", fontWeight: 600,
  },
  nextBtnDisabled: { background: "#b0d9ea", cursor: "not-allowed" },
  footer: {
    textAlign: "center", marginTop: 16,
    fontSize: 12, color: "#999",
  },
};

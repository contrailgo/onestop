import { useState } from "react";

const DAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

const steps = [
  { id: 1, label: "날짜 선택" },
  { id: 2, label: "건물 선택" },
  { id: 3, label: "호실 선택" },
];

export default function DatePicker({ onNext }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const getAvailableDays = () => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const day = date.getDay();
      if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && day !== 0 && day !== 6) {
        count++;
      }
    }
    return count;
  };

  const availableCount = getAvailableDays();

  const isToday = (day) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const isPast = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayMidnight;
  };

  const isSelected = (day) =>
    selectedDate &&
    selectedDate.day === day &&
    selectedDate.month === currentMonth &&
    selectedDate.year === currentYear;

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const handleDayClick = (day) => {
    if (isPast(day)) return;
    setSelectedDate({ year: currentYear, month: currentMonth, day });
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  return (
    <div style={styles.wrapper}>
      {/* 단계 표시 */}
      <div style={styles.stepBar}>
        {steps.map((step) => (
          <div key={step.id} style={styles.stepItem}>
            <div
              style={{
                ...styles.stepCircle,
                ...(step.id === 1 ? styles.stepCircleActive : {}),
              }}
            >
              {step.id}
            </div>
            <span
              style={{
                ...styles.stepLabel,
                ...(step.id === 1 ? styles.stepLabelActive : {}),
              }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* 달력 카드 */}
      <div style={styles.card}>
        <div style={styles.calHeader}>
          <button style={styles.navBtn} onClick={handlePrevMonth}>← 이전달</button>
          <div style={styles.monthInfo}>
            <div style={styles.monthTitle}>{monthLabel}</div>
            <div style={styles.badge}>
              {currentYear}년{String(currentMonth + 1).padStart(2, "0")}월 대실 가능일 : {availableCount}
            </div>
          </div>
          <button style={styles.navBtn} onClick={handleNextMonth}>다음달 →</button>
        </div>

        <div style={styles.grid}>
          {DAYS.map((d, i) => (
            <div
              key={d}
              style={{
                ...styles.dayHeader,
                color: i === 0 ? "#e74c3c" : i === 6 ? "#3498db" : "#333",
              }}
            >
              {d}
            </div>
          ))}

          {cells.map((day, idx) => {
            const col = idx % 7;
            const past = day && isPast(day);
            const todayCell = day && isToday(day);
            const sel = day && isSelected(day);

            let cellStyle = { ...styles.cell };
            if (!day) {
              cellStyle = { ...cellStyle, ...styles.emptyCell };
            } else if (sel) {
              cellStyle = { ...cellStyle, ...styles.selectedCell };
            } else if (todayCell) {
              cellStyle = { ...cellStyle, ...styles.todayCell };
            } else if (past) {
              cellStyle = { ...cellStyle, ...styles.pastCell };
            } else {
              cellStyle = {
                ...cellStyle,
                cursor: "pointer",
                color: col === 0 ? "#e74c3c" : col === 6 ? "#3498db" : "#222",
              };
            }

            return (
              <div
                key={idx}
                style={cellStyle}
                onClick={() => day && handleDayClick(day)}
                onDoubleClick={() => {
                  if (day && !isPast(day)) {
                    setSelectedDate({ year: currentYear, month: currentMonth, day });
                    onNext && onNext({ year: currentYear, month: currentMonth, day });
                  }
                }}
              >
                {day || ""}
              </div>
            );
          })}
        </div>

        <div style={styles.bottomBar}>
          <button style={styles.prevStepBtn} disabled>← 이전 단계</button>
          <button
            style={{
              ...styles.nextStepBtn,
              ...(selectedDate ? {} : styles.nextStepBtnDisabled),
            }}
            disabled={!selectedDate}
            onClick={() => selectedDate && onNext && onNext(selectedDate)}
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
    maxWidth: 780,
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
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2px solid #aaa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    color: "#aaa",
    background: "#fff",
  },
  stepCircleActive: {
    borderColor: "#3bb8e0",
    color: "#3bb8e0",
  },
  stepLabel: {
    fontSize: 13,
    color: "#aaa",
    marginRight: 12,
  },
  stepLabelActive: {
    color: "#3bb8e0",
    fontWeight: 600,
  },
  card: {
    border: "1px solid #ccc",
    borderRadius: 4,
    overflow: "hidden",
    background: "#fff",
  },
  calHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#fff",
  },
  navBtn: {
    background: "#f0f0f0",
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    color: "#333",
  },
  monthInfo: { textAlign: "center" },
  monthTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#222",
    marginBottom: 4,
  },
  badge: {
    background: "#3bb8e0",
    color: "#fff",
    fontSize: 12,
    padding: "2px 10px",
    borderRadius: 10,
    display: "inline-block",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    borderTop: "1px solid #ddd",
  },
  dayHeader: {
    textAlign: "center",
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 600,
    background: "#f7f7f7",
    borderBottom: "1px solid #ddd",
    borderRight: "1px solid #eee",
  },
  cell: {
    textAlign: "center",
    padding: "18px 0",
    fontSize: 14,
    borderBottom: "1px solid #eee",
    borderRight: "1px solid #eee",
    transition: "background 0.15s",
  },
  emptyCell: { background: "#b0b8c1", opacity: 0.5 },
  pastCell: { background: "#c8cdd4", color: "#888", cursor: "not-allowed" },
  todayCell: { background: "#3bb8e0", color: "#fff", fontWeight: 700, cursor: "pointer" },
  selectedCell: { background: "#1a8fb5", color: "#fff", fontWeight: 700, cursor: "pointer" },
  bottomBar: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "10px 16px",
    borderTop: "1px solid #eee",
    background: "#fafafa",
  },
  prevStepBtn: {
    background: "#f0f0f0",
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: "6px 16px",
    fontSize: 13,
    color: "#aaa",
    cursor: "not-allowed",
  },
  nextStepBtn: {
    background: "#3bb8e0",
    border: "none",
    borderRadius: 4,
    padding: "6px 16px",
    fontSize: 13,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  nextStepBtnDisabled: { background: "#b0d9ea", cursor: "not-allowed" },
  footer: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
    color: "#999",
  },
};

import { useState } from "react";

const steps = [
  { id: 1, label: "날짜 선택" },
  { id: 2, label: "건물 선택" },
  { id: 3, label: "호실 선택" },
];

const BUILDINGS = [
  { campus: "글로벌", name: "어문학관-1", rooms: 4 },
  { campus: "글로벌", name: "어문학관-2", rooms: 3 },
  { campus: "글로벌", name: "자연과학관-1", rooms: 2 },
  { campus: "글로벌", name: "인문경상관-1", rooms: 3 },
  { campus: "글로벌", name: "백년관-1", rooms: 4 },
  { campus: "글로벌", name: "백년관-2", rooms: 1 },
  { campus: "서울", name: "교수학습개발원-1", rooms: 4 },
  { campus: "서울", name: "교수학습개발원-2", rooms: 4 },
  { campus: "서울", name: "교수학습개발원-3", rooms: 4 },
  { campus: "서울", name: "교수학습개발원-4", rooms: 2 },
];

export default function BuildingPicker({ onPrev, onNext }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  const handleRowClick = (idx) => setSelectedIdx(idx);

  const handleDoubleClick = (idx) => {
    setSelectedIdx(idx);
    onNext && onNext(BUILDINGS[idx]);
  };

  return (
    <div style={styles.wrapper}>
      {/* 단계 표시 */}
      <div style={styles.stepBar}>
        {steps.map((step) => (
          <div key={step.id} style={styles.stepItem}>
            <div
              style={{
                ...styles.stepCircle,
                ...(step.id === 2 ? styles.stepCircleActive : {}),
              }}
            >
              {step.id}
            </div>
            <span
              style={{
                ...styles.stepLabel,
                ...(step.id === 2 ? styles.stepLabelActive : {}),
              }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>캠퍼스</th>
              <th style={{ ...styles.th, textAlign: "center" }}>그룹</th>
            </tr>
          </thead>
          <tbody>
            {BUILDINGS.map((b, idx) => (
              <tr
                key={idx}
                style={{
                  ...styles.tr,
                  background: selectedIdx === idx ? "#d4e157" : "#fff",
                  cursor: "pointer",
                }}
                onClick={() => handleRowClick(idx)}
                onDoubleClick={() => handleDoubleClick(idx)}
              >
                <td style={styles.td}>{b.campus}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  {b.name} [{b.rooms}실]
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 하단 버튼 */}
        <div style={styles.bottomBar}>
          <button style={styles.prevBtn} onClick={onPrev}>
            ← 이전 단계
          </button>
          <button
            style={{
              ...styles.nextBtn,
              ...(selectedIdx === null ? styles.nextBtnDisabled : {}),
            }}
            disabled={selectedIdx === null}
            onClick={() => selectedIdx !== null && onNext && onNext(BUILDINGS[selectedIdx])}
          >
            다음 단계 →
          </button>
        </div>
      </div>

      {/* 푸터 */}
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "10px 20px",
    background: "#f7f7f7",
    borderBottom: "1px solid #ddd",
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    textAlign: "left",
  },
  tr: {
    borderBottom: "1px solid #eee",
    transition: "background 0.1s",
  },
  td: {
    padding: "12px 20px",
    fontSize: 14,
    color: "#333",
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
    background: "#f0f0f0",
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: "6px 16px",
    fontSize: 13,
    color: "#555",
    cursor: "pointer",
  },
  nextBtn: {
    background: "#3bb8e0",
    border: "none",
    borderRadius: 4,
    padding: "6px 16px",
    fontSize: 13,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  nextBtnDisabled: {
    background: "#b0d9ea",
    cursor: "not-allowed",
  },
  footer: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
    color: "#999",
  },
};

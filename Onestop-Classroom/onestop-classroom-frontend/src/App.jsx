import { useCallback, useEffect, useMemo, useState } from "react";
import { buildings as defaultBuildings, fixedReservedSlots } from "./data/classroomData.js";
import {
  formatRoomLabel,
  getStatusClass,
  getStatusText,
  isTimeOverlap,
  makeDateKey,
  makeTimeSlots,
  pad2,
} from "./utils/reservationUtils.js";
import {
  createReservation,
  deleteReservation,
  getReservations,
  getRooms,
} from "./api/reservationApi.js";

const stepNames = ["날짜 선택", "건물 선택", "강의실 선택", "기타 정보 및 시간 선택"];
const today = new Date();
const TEST_USER_ID = "test-user";

function normalizeRooms(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((room) => {
      if (!room || typeof room !== "object") return null;

      return {
        id: Number(room.id),
        building: room.building || "",
        roomNumber: room.roomNumber || room.room_number || "",
        capacity: Number(room.capacity || 0),
        openTime: room.openTime || room.open_time || "17:00",
        closeTime: room.closeTime || room.close_time || "21:00",
        slotUnitHours: Number(room.slotUnitHours || room.slot_unit_hours || 1),
        status: room.status || "available",
      };
    })
    .filter((room) => room && room.id && room.building && room.roomNumber);
}

function normalizeReservations(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((reservation) => {
      if (!reservation || typeof reservation !== "object") return null;

      const times = Array.isArray(reservation.times)
        ? reservation.times.map((time) => ({
            id: time.id || `${time.startTime}-${time.endTime}`,
            timeId: time.timeId,
            startTime: time.startTime,
            endTime: time.endTime,
            label: time.label || `${time.startTime} ~ ${time.endTime}`,
          }))
        : [];

      if (!reservation.date || !reservation.roomId || times.length === 0) return null;

      return {
        id: reservation.id,
        userId: reservation.userId || reservation.user_id || TEST_USER_ID,
        date: reservation.date,
        building: reservation.building || "",
        roomId: Number(reservation.roomId || reservation.room_id),
        roomNumber: reservation.roomNumber || reservation.room_number || "",
        times,
        contact: reservation.contact || "",
        groupType: reservation.groupType || reservation.group_type || "",
        purpose: reservation.purpose || "",
        status: reservation.status || "승인 대기",
        createdAt: reservation.createdAt || reservation.created_at || "",
      };
    })
    .filter(Boolean);
}

function App() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [contact, setContact] = useState("");
  const [purpose, setPurpose] = useState("");
  const [groupType, setGroupType] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRooms = useCallback(async () => {
    const data = await getRooms();
    setRooms(normalizeRooms(data));
  }, []);

  const loadReservations = useCallback(async () => {
    const data = await getReservations();
    setReservations(normalizeReservations(data));
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadInitialData() {
      try {
        setLoading(true);
        setErrorMessage("");

        const [roomData, reservationData] = await Promise.all([
          getRooms(),
          getReservations(),
        ]);

        if (!alive) return;
        setRooms(normalizeRooms(roomData));
        setReservations(normalizeReservations(reservationData));
      } catch (error) {
        if (!alive) return;
        setErrorMessage(error.message || "서버 데이터를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadInitialData();

    return () => {
      alive = false;
    };
  }, []);

  const buildings = useMemo(() => {
    const fromServer = Array.from(new Set(rooms.map((room) => room.building)));
    const merged = [...defaultBuildings];

    for (const building of fromServer) {
      if (!merged.includes(building)) merged.push(building);
    }

    return merged;
  }, [rooms]);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  function getTodayKey() {
    return makeDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function isFixedSlotReserved(roomId, slot) {
    return fixedReservedSlots.some((reservation) => {
      return (
        reservation.roomId === roomId &&
        isTimeOverlap(slot.startTime, slot.endTime, reservation.startTime, reservation.endTime)
      );
    });
  }

  function isUserSlotReserved(roomId, date, slot) {
    return reservations.some((reservation) => {
      if (reservation.roomId !== roomId || reservation.date !== date) return false;
      if (reservation.status === "취소됨") return false;
      if (!Array.isArray(reservation.times)) return false;

      return reservation.times.some((time) => {
        return isTimeOverlap(slot.startTime, slot.endTime, time.startTime, time.endTime);
      });
    });
  }

  function isSlotReserved(roomId, date, slot) {
    return isFixedSlotReserved(roomId, slot) || isUserSlotReserved(roomId, date, slot);
  }

  function getRoomStatus(room) {
    if (room.status === "viewOnly") return "viewOnly";
    if (!selectedDate) return "available";

    const slots = makeTimeSlots(room);
    const reservedCount = slots.filter((slot) => {
      return isSlotReserved(room.id, selectedDate, slot);
    }).length;

    if (reservedCount === 0) return "available";
    if (reservedCount === slots.length) return "closed";
    return "partial";
  }

  function resetAfterDateChange() {
    setSelectedBuilding("");
    setSelectedRoomId(null);
    setSelectedTimes([]);
  }

  function resetAfterBuildingChange() {
    setSelectedRoomId(null);
    setSelectedTimes([]);
  }

  function resetAfterRoomChange() {
    setSelectedTimes([]);
  }

  function canMoveToStep(targetStep) {
    if (targetStep === 1) return true;

    if (targetStep >= 2 && !selectedDate) {
      alert("날짜를 먼저 선택해주세요.");
      return false;
    }

    if (targetStep >= 3 && !selectedBuilding) {
      alert("건물을 먼저 선택해주세요.");
      return false;
    }

    if (targetStep >= 4 && !selectedRoomId) {
      alert("강의실을 먼저 선택해주세요.");
      return false;
    }

    return true;
  }

  function validateBeforeNextStep() {
    if (currentStep === 1 && !selectedDate) {
      alert("날짜를 선택해주세요.");
      return false;
    }

    if (currentStep === 2 && !selectedBuilding) {
      alert("건물을 선택해주세요.");
      return false;
    }

    if (currentStep === 3 && !selectedRoomId) {
      alert("강의실을 선택해주세요.");
      return false;
    }

    return true;
  }

  function validateReservation() {
    if (!selectedDate) {
      alert("날짜를 선택해주세요.");
      return false;
    }

    if (!selectedBuilding) {
      alert("건물을 선택해주세요.");
      return false;
    }

    if (!selectedRoomId || !selectedRoom) {
      alert("강의실을 선택해주세요.");
      return false;
    }

    if (selectedTimes.length === 0) {
      alert("사용 시간을 하나 이상 선택해주세요.");
      return false;
    }

    if (!contact.trim()) {
      alert("연락처를 입력해주세요.");
      return false;
    }

    if (!/^[0-9-]{9,20}$/.test(contact.trim())) {
      alert("연락처는 숫자와 하이픈(-)만 입력해주세요.");
      return false;
    }

    if (!groupType) {
      alert("대실 단체 유형을 선택해주세요.");
      return false;
    }

    if (!purpose.trim()) {
      alert("대실 사유를 입력해주세요.");
      return false;
    }

    const hasReservedTime = selectedTimes.some((time) => {
      return isSlotReserved(selectedRoom.id, selectedDate, time);
    });

    if (hasReservedTime) {
      alert("선택한 시간 중 이미 예약된 시간이 있습니다.");
      return false;
    }

    return true;
  }

  async function handleSubmitReservation() {
    if (!validateReservation()) return;

    const reservationData = {
      userId: TEST_USER_ID,
      date: selectedDate,
      roomId: selectedRoom.id,
      times: selectedTimes.map((time) => ({ ...time })),
      contact: contact.trim(),
      groupType,
      purpose: purpose.trim(),
    };

    try {
      setSubmitting(true);
      setErrorMessage("");
      const savedReservation = await createReservation(reservationData);
      setReservations((prev) => [normalizeReservations([savedReservation])[0], ...prev].filter(Boolean));
      alert("예약 신청이 완료되었습니다.");

      setCurrentStep(1);
      setSelectedDate("");
      setSelectedBuilding("");
      setSelectedRoomId(null);
      setSelectedTimes([]);
      setContact("");
      setPurpose("");
      setGroupType("");
    } catch (error) {
      alert(error.message || "예약 신청에 실패했습니다.");
      await loadReservations().catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  }

  function handleStepClick(targetStep) {
    if (!canMoveToStep(targetStep)) return;
    setCurrentStep(targetStep);
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }

    setViewMonth((month) => month - 1);
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }

    setViewMonth((month) => month + 1);
  }

  function handleNextStep() {
    if (!validateBeforeNextStep()) return;
    setCurrentStep((step) => step + 1);
  }

  function handlePrevStep() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function handleSelectDate(dateKey) {
    setSelectedDate(dateKey);
    resetAfterDateChange();
  }

  function handleSelectBuilding(building) {
    setSelectedBuilding(building);
    resetAfterBuildingChange();
  }

  function handleSelectBuildingDirect(building) {
    setSelectedBuilding(building);
    resetAfterBuildingChange();
    setCurrentStep(3);
  }

  function handleSelectRoom(roomId, status, moveNext = false) {
    if (status !== "available" && status !== "partial") {
      alert("예약할 수 없는 강의실입니다.");
      return;
    }

    setSelectedRoomId(roomId);
    resetAfterRoomChange();
    if (moveNext) setCurrentStep(4);
  }

  function handleToggleTime(slot) {
    if (!selectedRoom) return;

    if (isSlotReserved(selectedRoom.id, selectedDate, slot)) {
      alert("이미 예약된 시간입니다.");
      return;
    }

    setSelectedTimes((prev) => {
      const alreadySelected = prev.some((time) => time.id === slot.id);
      if (alreadySelected) {
        return prev.filter((time) => time.id !== slot.id);
      }

      return [...prev, slot].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  }

  async function handleCancelReservation(id) {
    if (!confirm("예약을 취소하시겠습니까?")) return;

    try {
      setErrorMessage("");
      await deleteReservation(id);
      setReservations((prev) => prev.filter((reservation) => reservation.id !== id));
    } catch (error) {
      alert(error.message || "예약 취소에 실패했습니다.");
      await loadReservations().catch(() => undefined);
    }
  }

  async function handleReloadData() {
    try {
      setLoading(true);
      setErrorMessage("");
      await Promise.all([loadRooms(), loadReservations()]);
    } catch (error) {
      setErrorMessage(error.message || "서버 데이터를 다시 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="page">
        {errorMessage && (
          <div className="error-message">
            <span>{errorMessage}</span>
            <button type="button" className="small-btn" onClick={handleReloadData}>
              다시 불러오기
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-message">서버 데이터를 불러오는 중입니다.</div>
        ) : (
          <>
            <ReservationHistory reservations={reservations} onCancel={handleCancelReservation} />

            <section className="step-box">
              <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

              {currentStep === 1 && (
                <DateStep
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  selectedDate={selectedDate}
                  todayKey={getTodayKey()}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onSelectDate={handleSelectDate}
                />
              )}

              {currentStep === 2 && (
                <BuildingStep
                  buildings={buildings}
                  selectedBuilding={selectedBuilding}
                  onSelectBuilding={handleSelectBuilding}
                  onSelectBuildingDirect={handleSelectBuildingDirect}
                />
              )}

              {currentStep === 3 && (
                <RoomStep
                  rooms={rooms}
                  selectedBuilding={selectedBuilding}
                  selectedRoomId={selectedRoomId}
                  getRoomStatus={getRoomStatus}
                  onSelectRoom={handleSelectRoom}
                />
              )}

              {currentStep === 4 && selectedRoom && (
                <InfoStep
                  selectedDate={selectedDate}
                  selectedBuilding={selectedBuilding}
                  selectedRoom={selectedRoom}
                  selectedTimes={selectedTimes}
                  contact={contact}
                  purpose={purpose}
                  groupType={groupType}
                  submitting={submitting}
                  isSlotReserved={isSlotReserved}
                  onToggleTime={handleToggleTime}
                  onContactChange={setContact}
                  onPurposeChange={setPurpose}
                  onGroupTypeChange={setGroupType}
                  onPrevStep={handlePrevStep}
                  onSubmit={handleSubmitReservation}
                />
              )}

              {currentStep !== 4 && (
                <div className="button-area" style={{ padding: "0 20px 20px" }}>
                  <button type="button" className="gray-btn" disabled={currentStep === 1} onClick={handlePrevStep}>
                    이전 단계
                  </button>
                  <button type="button" className="primary-btn" onClick={handleNextStep}>
                    다음 단계
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        <div className="footer">정보처 정보시스템팀</div>
      </main>
    </>
  );
}

function Header() {
  return (
    <header className="top-bar">
      <div className="top-inner">
        <div className="logo">
          <span className="logo-icon" />
          <span>원스톱 대실 시스템</span>
        </div>

        <nav className="nav">
          <a href="#" className="active">강의실</a>
          <a href="#">스터디룸</a>
          <a href="#">행사시설</a>
          <a href="#">기타시설</a>
          <a href="#">열람실</a>
          <a href="#">로그아웃</a>
        </nav>
      </div>
    </header>
  );
}

function ReservationHistory({ reservations, onCancel }) {
  if (reservations.length === 0) {
    return (
      <section className="panel">
        <div className="panel-title">나의 대실 이력</div>
        <div className="empty-history">예약된 시설이 없습니다.</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">나의 대실 이력</div>
      <div className="history-list">
        {reservations.map((reservation) => {
          const timeText = reservation.times.map((time) => time.label).join(", ");

          return (
            <div className="history-item" key={reservation.id}>
              <div>
                <strong>
                  {reservation.building} {formatRoomLabel(reservation.roomNumber)}
                </strong>
                <p>{reservation.date} {timeText}</p>
                <p>{reservation.purpose}</p>
                <p>{reservation.groupType} / {reservation.contact}</p>
              </div>
              <div>
                <span className="status available">{reservation.status}</span>
                <button type="button" className="gray-btn cancel-btn" onClick={() => onCancel(reservation.id)}>
                  취소
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StepIndicator({ currentStep, onStepClick }) {
  return (
    <div className="steps">
      {stepNames.map((name, index) => {
        const step = index + 1;
        let className = "step";
        if (step < currentStep) className += " done";
        if (step === currentStep) className += " active";

        return (
          <div className={className} key={step} onClick={() => onStepClick(step)}>
            <span className="step-number">{step}</span>
            {name}
          </div>
        );
      })}
    </div>
  );
}

function DateStep({
  viewYear,
  viewMonth,
  selectedDate,
  todayKey,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}) {
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push({ key: `empty-${i}`, disabled: true, label: "" });
  }

  for (let day = 1; day <= lastDate; day += 1) {
    const dateKey = makeDateKey(viewYear, viewMonth, day);
    const date = new Date(viewYear, viewMonth, day);
    const isPast = dateKey < todayKey;
    const isSunday = date.getDay() === 0;
    const isSelected = selectedDate === dateKey;

    cells.push({
      key: dateKey,
      label: day,
      dateKey,
      disabled: isPast || isSunday,
      selected: isSelected,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, disabled: true, label: "" });
  }

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>1. 날짜 선택</h2>
          <p>예약할 날짜를 선택합니다.</p>
        </div>
      </div>

      <div className="calendar-top">
        <button type="button" className="small-btn" onClick={onPrevMonth}>← 이전달</button>
        <div className="calendar-title">
          <h3>{viewYear}-{pad2(viewMonth + 1)}</h3>
          <span>예약 가능 날짜를 선택하십시오</span>
        </div>
        <button type="button" className="small-btn" onClick={onNextMonth}>다음달 →</button>
      </div>

      <table className="calendar">
        <thead>
          <tr>
            <th className="sunday">일요일</th>
            <th>월요일</th>
            <th>화요일</th>
            <th>수요일</th>
            <th>목요일</th>
            <th>금요일</th>
            <th className="saturday">토요일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell) => {
                let className = "disabled";
                if (!cell.disabled) className = cell.selected ? "selected" : "available";

                return (
                  <td
                    key={cell.key}
                    className={className}
                    onClick={() => {
                      if (!cell.disabled) onSelectDate(cell.dateKey);
                    }}
                  >
                    {cell.label}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function BuildingStep({ buildings, selectedBuilding, onSelectBuilding, onSelectBuildingDirect }) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>2. 건물 선택</h2>
          <p>선택한 날짜에 예약할 건물을 선택합니다.</p>
        </div>
      </div>

      <table className="select-table">
        <thead>
          <tr>
            <th>캠퍼스</th>
            <th>건물명</th>
            <th className="right">이동</th>
          </tr>
        </thead>
        <tbody>
          {buildings.map((building) => (
            <tr
              key={building}
              className={selectedBuilding === building ? "selected-row" : ""}
              onClick={() => onSelectBuilding(building)}
            >
              <td>글로벌캠퍼스</td>
              <td>{building}</td>
              <td className="right">
                <button
                  type="button"
                  className="select-action-btn arrow-btn"
                  aria-label={`${building} 선택`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectBuildingDirect(building);
                  }}
                >
                  <span className="arrow-icon" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RoomStep({ rooms, selectedBuilding, selectedRoomId, getRoomStatus, onSelectRoom }) {
  const filteredRooms = rooms.filter((room) => room.building === selectedBuilding);

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>3. 강의실 선택</h2>
          <p>{selectedBuilding}의 강의실 목록입니다.</p>
        </div>
      </div>

      <table className="select-table">
        <thead>
          <tr>
            <th>호실</th>
            <th>개방시간</th>
            <th className="right">수용인원</th>
            <th className="right">상태</th>
            <th className="right">이동</th>
          </tr>
        </thead>
        <tbody>
          {filteredRooms.length === 0 ? (
            <tr>
              <td colSpan="5">등록된 강의실이 없습니다.</td>
            </tr>
          ) : (
            filteredRooms.map((room) => {
              const status = getRoomStatus(room);
              const canSelect = status === "available" || status === "partial";
              const rowClass = [
                selectedRoomId === room.id ? "selected-row" : "",
                canSelect ? "" : "disabled-room",
              ].join(" ").trim();

              return (
                <tr
                  key={room.id}
                  className={rowClass}
                  onClick={() => onSelectRoom(room.id, status, false)}
                >
                  <td>{room.roomNumber}</td>
                  <td>{room.openTime} ~ {room.closeTime}</td>
                  <td className="right">{room.capacity}명</td>
                  <td className="right">
                    <span className={`status ${getStatusClass(status)}`}>{getStatusText(status)}</span>
                  </td>
                  <td className="right">
                    <button
                      type="button"
                      className="select-action-btn arrow-btn"
                      disabled={!canSelect}
                      aria-label={`${room.roomNumber} 선택`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectRoom(room.id, status, true);
                      }}
                    >
                      <span className="arrow-icon" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}

function InfoStep({
  selectedDate,
  selectedBuilding,
  selectedRoom,
  selectedTimes,
  contact,
  purpose,
  groupType,
  submitting,
  isSlotReserved,
  onToggleTime,
  onContactChange,
  onPurposeChange,
  onGroupTypeChange,
  onPrevStep,
  onSubmit,
}) {
  const slots = makeTimeSlots(selectedRoom);
  const selectedTimeText = selectedTimes.length > 0
    ? selectedTimes.map((time) => time.label).join(", ")
    : "미선택";

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>4. 기타 정보 및 시간 선택</h2>
          <p>사용 시간과 대실 정보를 입력합니다.</p>
        </div>
      </div>

      <div className="selected-summary">
        <div className="summary-title">선택 정보</div>
        <div className="summary-content">
          <div className="summary-item"><span>선택일</span>{selectedDate}</div>
          <div className="summary-item"><span>건물</span>{selectedBuilding}</div>
          <div className="summary-item"><span>강의실</span>{formatRoomLabel(selectedRoom.roomNumber)}</div>
          <div className="summary-item"><span>수용인원</span>{selectedRoom.capacity}명</div>
          <div className="summary-item"><span>시간 단위</span>{selectedRoom.slotUnitHours}시간</div>
          <div className="summary-item"><span>선택 시간</span>{selectedTimeText}</div>
        </div>
      </div>

      <div className="reservation-layout">
        <div className="time-card">
          <div className="time-title">{selectedRoom.building} {selectedRoom.roomNumber}</div>
          {slots.map((slot) => {
            const reserved = isSlotReserved(selectedRoom.id, selectedDate, slot);
            const selected = selectedTimes.some((time) => time.id === slot.id);
            const className = ["slot", reserved ? "reserved" : "", selected ? "selected" : ""].join(" ").trim();

            return (
              <div className="time-row" key={slot.id}>
                <div className="hour">{slot.startTime.slice(0, 2)}시</div>
                <button
                  type="button"
                  className={className}
                  disabled={reserved}
                  onClick={() => onToggleTime(slot)}
                >
                  {slot.label}{reserved ? " 예약됨" : ""}
                </button>
              </div>
            );
          })}
        </div>

        <div className="form-box">
          <div className="form-title">기타 정보</div>
          <div className="form-content">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="contact">연락처</label>
                <input
                  id="contact"
                  type="text"
                  placeholder="010-0000-0000"
                  value={contact}
                  maxLength={20}
                  onChange={(event) => onContactChange(event.target.value)}
                />
              </div>

              <div className="form-group">
                <span className="form-label">대실 단체 유형</span>
                <div className="radio-group">
                  {["동아리", "학회", "스터디", "기타"].map((value) => (
                    <label className={`radio-card ${groupType === value ? "checked" : ""}`} key={value}>
                      <input
                        type="radio"
                        name="group"
                        value={value}
                        checked={groupType === value}
                        onChange={(event) => onGroupTypeChange(event.target.value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group full">
                <label htmlFor="purpose">대실 사유</label>
                <textarea
                  id="purpose"
                  placeholder="예: 오픈소스SW 팀 프로젝트 회의"
                  maxLength={200}
                  value={purpose}
                  onChange={(event) => onPurposeChange(event.target.value)}
                />
              </div>
            </div>

            <div className="button-area">
              <button type="button" className="gray-btn" onClick={onPrevStep} disabled={submitting}>이전 단계</button>
              <button type="button" className="primary-btn" onClick={onSubmit} disabled={submitting}>
                {submitting ? "예약 신청 중..." : "대실 예약"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;

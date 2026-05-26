import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReservation,
  deleteReservation,
  getFacilities,
  getReservations,
} from "./api/reservationApi.js";
import {
  formatCapacity,
  getStatusClass,
  getStatusText,
  isTimeOverlap,
  makeDateKey,
  makeTimeSlots,
  pad2,
} from "./utils/reservationUtils.js";

const stepNames = ["날짜 선택", "시설 선택", "기타 정보 입력"];
const today = new Date();
const TEST_USER_ID = "test-user";

function normalizeFacilities(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((facility) => {
      if (!facility || typeof facility !== "object") return null;

      return {
        id: Number(facility.id),
        campus: facility.campus || "글로벌캠퍼스",
        building: facility.building || "",
        facilityName: facility.facilityName || facility.facility_name || "",
        capacity: Number(facility.capacity || 0),
        openTime: facility.openTime || facility.open_time || "09:00",
        closeTime: facility.closeTime || facility.close_time || "20:00",
        slotUnitHours: Number(facility.slotUnitHours || facility.slot_unit_hours || 1),
        status: facility.status || "available",
      };
    })
    .filter((facility) => facility && facility.id && facility.building && facility.facilityName);
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

      if (!reservation.date || !reservation.facilityId || times.length === 0) return null;

      return {
        id: reservation.id,
        userId: reservation.userId || reservation.user_id || TEST_USER_ID,
        date: reservation.date,
        campus: reservation.campus || "글로벌캠퍼스",
        building: reservation.building || "",
        facilityId: Number(reservation.facilityId || reservation.facility_id),
        facilityName: reservation.facilityName || reservation.facility_name || "",
        times,
        applicantContact: reservation.applicantContact || reservation.applicant_contact || "",
        purpose: reservation.purpose || "",
        hostGroup: reservation.hostGroup || reservation.host_group || "",
        leaderName: reservation.leaderName || reservation.leader_name || "",
        leaderContact: reservation.leaderContact || reservation.leader_contact || "",
        status: reservation.status || "승인 대기",
        createdAt: reservation.createdAt || reservation.created_at || "",
      };
    })
    .filter(Boolean);
}

function App() {
  const [facilities, setFacilities] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);

  const [applicantContact, setApplicantContact] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hostGroup, setHostGroup] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderContact, setLeaderContact] = useState("");

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedFacility = useMemo(() => {
    return facilities.find((facility) => facility.id === selectedFacilityId) || null;
  }, [facilities, selectedFacilityId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setApiError("");

      const [facilityData, reservationData] = await Promise.all([
        getFacilities(),
        getReservations({ userId: TEST_USER_ID }),
      ]);

      setFacilities(normalizeFacilities(facilityData));
      setReservations(normalizeReservations(reservationData));
    } catch (error) {
      setApiError(error.message || "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getTodayKey() {
    return makeDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function isSlotReserved(facilityId, date, slot) {
    return reservations.some((reservation) => {
      if (reservation.facilityId !== facilityId || reservation.date !== date || reservation.status === "취소됨") {
        return false;
      }

      return reservation.times.some((time) => {
        return isTimeOverlap(slot.startTime, slot.endTime, time.startTime, time.endTime);
      });
    });
  }

  function getFacilityStatus(facility) {
    if (facility.status === "viewOnly") return "viewOnly";
    if (!selectedDate) return "available";

    const slots = makeTimeSlots(facility);
    const reservedCount = slots.filter((slot) => {
      return isSlotReserved(facility.id, selectedDate, slot);
    }).length;

    if (reservedCount === 0) return "available";
    if (reservedCount === slots.length) return "closed";
    return "partial";
  }

  function resetAfterDateChange() {
    setSelectedFacilityId(null);
    setSelectedTimes([]);
  }

  function resetAfterFacilityChange() {
    setSelectedTimes([]);
  }

  function canMoveToStep(targetStep) {
    if (targetStep === 1) return true;

    if (targetStep >= 2 && !selectedDate) {
      alert("날짜를 먼저 선택해주세요.");
      return false;
    }

    if (targetStep >= 3 && !selectedFacilityId) {
      alert("시설을 먼저 선택해주세요.");
      return false;
    }

    return true;
  }

  function validateBeforeNextStep() {
    if (currentStep === 1 && !selectedDate) {
      alert("날짜를 선택해주세요.");
      return false;
    }

    if (currentStep === 2 && !selectedFacilityId) {
      alert("시설을 선택해주세요.");
      return false;
    }

    return true;
  }

  function handlePrevMonth() {
    setViewMonth((month) => {
      if (month === 0) {
        setViewYear((year) => year - 1);
        return 11;
      }

      return month - 1;
    });
  }

  function handleNextMonth() {
    setViewMonth((month) => {
      if (month === 11) {
        setViewYear((year) => year + 1);
        return 0;
      }

      return month + 1;
    });
  }

  function handleSelectDate(dateKey) {
    setSelectedDate(dateKey);
    resetAfterDateChange();
  }

  function handleSelectFacility(facilityId) {
    setSelectedFacilityId(facilityId);
    resetAfterFacilityChange();
  }

  function handleSelectFacilityDirect(facilityId) {
    handleSelectFacility(facilityId);
    setCurrentStep(3);
  }

  function handleToggleTime(slot) {
    if (!selectedFacility) return;

    if (isSlotReserved(selectedFacility.id, selectedDate, slot)) {
      alert("이미 예약된 시간입니다.");
      return;
    }

    setSelectedTimes((prevTimes) => {
      const alreadySelected = prevTimes.some((time) => time.id === slot.id);

      if (alreadySelected) {
        return prevTimes.filter((time) => time.id !== slot.id);
      }

      return [...prevTimes, slot].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  }

  function validateReservation() {
    if (!selectedDate) {
      alert("날짜를 선택해주세요.");
      return false;
    }

    if (!selectedFacility) {
      alert("시설을 선택해주세요.");
      return false;
    }

    if (selectedTimes.length === 0) {
      alert("사용 시간을 하나 이상 선택해주세요.");
      return false;
    }

    if (!applicantContact.trim()) {
      alert("신청자 연락처를 입력해주세요.");
      return false;
    }

    if (!/^[0-9-]{9,20}$/.test(applicantContact.trim())) {
      alert("신청자 연락처는 숫자와 하이픈(-)만 입력해주세요.");
      return false;
    }

    if (!purpose.trim()) {
      alert("대실 사유를 입력해주세요.");
      return false;
    }

    if (!hostGroup.trim()) {
      alert("주관 단체를 입력해주세요.");
      return false;
    }

    if (!leaderName.trim()) {
      alert("단체장 성명을 입력해주세요.");
      return false;
    }

    if (!leaderContact.trim()) {
      alert("단체장 연락처를 입력해주세요.");
      return false;
    }

    if (!/^[0-9-]{9,20}$/.test(leaderContact.trim())) {
      alert("단체장 연락처는 숫자와 하이픈(-)만 입력해주세요.");
      return false;
    }

    const hasReservedTime = selectedTimes.some((time) => {
      return isSlotReserved(selectedFacility.id, selectedDate, time);
    });

    if (hasReservedTime) {
      alert("선택한 시간 중 이미 예약된 시간이 있습니다.");
      return false;
    }

    return true;
  }

  async function handleSubmitReservation() {
    if (!validateReservation()) return;

    try {
      setSubmitting(true);
      setApiError("");

      const reservationData = {
        userId: TEST_USER_ID,
        date: selectedDate,
        facilityId: selectedFacility.id,
        times: selectedTimes,
        applicantContact: applicantContact.trim(),
        purpose: purpose.trim(),
        hostGroup: hostGroup.trim(),
        leaderName: leaderName.trim(),
        leaderContact: leaderContact.trim(),
      };

      const created = await createReservation(reservationData);

      setReservations((prevReservations) => [
        ...normalizeReservations([created]),
        ...prevReservations,
      ]);

      alert("예약 신청이 완료되었습니다.");

      setCurrentStep(1);
      setSelectedDate("");
      setSelectedFacilityId(null);
      setSelectedTimes([]);
      setApplicantContact("");
      setPurpose("");
      setHostGroup("");
      setLeaderName("");
      setLeaderContact("");
    } catch (error) {
      alert(error.message || "예약 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelReservation(id) {
    const result = confirm("예약을 취소하시겠습니까?");

    if (!result) return;

    try {
      setApiError("");
      await deleteReservation(id);

      setReservations((prevReservations) => {
        return prevReservations.filter((reservation) => reservation.id !== id);
      });
    } catch (error) {
      alert(error.message || "예약 취소에 실패했습니다.");
    }
  }

  function handleStepClick(step) {
    if (!canMoveToStep(step)) return;
    setCurrentStep(step);
  }

  function handleNextStep() {
    if (!validateBeforeNextStep()) return;
    setCurrentStep((step) => Math.min(step + 1, stepNames.length));
  }

  function handlePrevStep() {
    setCurrentStep((step) => Math.max(step - 1, 1));
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="page">
          <section className="panel">
            <div className="panel-title">행사 및 기타시설 대실</div>
            <div className="empty-history">데이터를 불러오는 중입니다.</div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="page">
        {apiError && (
          <section className="error-panel">
            <strong>오류</strong>
            <p>{apiError}</p>
            <button type="button" className="small-btn" onClick={loadData}>
              다시 불러오기
            </button>
          </section>
        )}

        <ReservationHistory
          reservations={reservations}
          onCancelReservation={handleCancelReservation}
        />

        <section className="step-box">
          <StepIndicator
            currentStep={currentStep}
            stepNames={stepNames}
            onStepClick={handleStepClick}
          />

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
            <FacilityStep
              facilities={facilities}
              selectedDate={selectedDate}
              selectedFacilityId={selectedFacilityId}
              getFacilityStatus={getFacilityStatus}
              onSelectFacility={handleSelectFacility}
              onSelectFacilityDirect={handleSelectFacilityDirect}
            />
          )}

          {currentStep === 3 && (
            <InfoStep
              selectedDate={selectedDate}
              selectedFacility={selectedFacility}
              selectedTimes={selectedTimes}
              applicantContact={applicantContact}
              purpose={purpose}
              hostGroup={hostGroup}
              leaderName={leaderName}
              leaderContact={leaderContact}
              submitting={submitting}
              isSlotReserved={isSlotReserved}
              getFacilityStatus={getFacilityStatus}
              onToggleTime={handleToggleTime}
              onApplicantContactChange={setApplicantContact}
              onPurposeChange={setPurpose}
              onHostGroupChange={setHostGroup}
              onLeaderNameChange={setLeaderName}
              onLeaderContactChange={setLeaderContact}
              onPrevStep={handlePrevStep}
              onSubmit={handleSubmitReservation}
            />
          )}

          {currentStep < stepNames.length && (
            <div className="button-area" style={{ padding: "0 20px 20px" }}>
              <button
                type="button"
                className="gray-btn"
                disabled={currentStep === 1}
                onClick={handlePrevStep}
              >
                이전 단계
              </button>
              <button type="button" className="primary-btn" onClick={handleNextStep}>
                다음 단계
              </button>
            </div>
          )}
        </section>

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
          <a href="#">강의실</a>
          <a href="#">스터디룸</a>
          <a href="#" className="active">행사시설</a>
          <a href="#" className="active">기타시설</a>
          <a href="#">열람실</a>
          <a href="#">로그아웃</a>
        </nav>
      </div>
    </header>
  );
}

function ReservationHistory({ reservations, onCancelReservation }) {
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
                  {reservation.building} {reservation.facilityName}
                </strong>
                <p>{reservation.date} {timeText}</p>
                <p>{reservation.purpose}</p>
                <p>{reservation.hostGroup} / {reservation.applicantContact}</p>
              </div>
              <div>
                <span className="status available">{reservation.status}</span>
                <button
                  type="button"
                  className="gray-btn cancel-btn"
                  onClick={() => onCancelReservation(reservation.id)}
                >
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

function StepIndicator({ currentStep, stepNames, onStepClick }) {
  return (
    <div className="steps">
      {stepNames.map((name, index) => {
        const step = index + 1;
        const className = [
          "step",
          step < currentStep ? "done" : "",
          step === currentStep ? "active" : "",
        ].join(" ").trim();

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
    cells.push({ type: "empty", key: `empty-start-${i}` });
  }

  for (let day = 1; day <= lastDate; day += 1) {
    const dateKey = makeDateKey(viewYear, viewMonth, day);
    const date = new Date(viewYear, viewMonth, day);
    const isPast = dateKey < todayKey;
    const isSunday = date.getDay() === 0;
    const isSelected = selectedDate === dateKey;

    let className = "";
    let disabled = false;

    if (isPast || isSunday) {
      className = "disabled";
      disabled = true;
    } else if (isSelected) {
      className = "selected";
    } else {
      className = "available";
    }

    cells.push({
      type: "date",
      key: dateKey,
      day,
      dateKey,
      className,
      disabled,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: "empty", key: `empty-end-${cells.length}` });
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
        <button type="button" className="small-btn" onClick={onPrevMonth}>
          ← 이전달
        </button>
        <div className="calendar-title">
          <h3>{viewYear}-{pad2(viewMonth + 1)}</h3>
          <span>예약 가능 날짜를 선택하십시오</span>
        </div>
        <button type="button" className="small-btn" onClick={onNextMonth}>
          다음달 →
        </button>
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
                if (cell.type === "empty") {
                  return <td className="disabled" key={cell.key} />;
                }

                return (
                  <td
                    className={cell.className}
                    key={cell.key}
                    onClick={() => {
                      if (!cell.disabled) onSelectDate(cell.dateKey);
                    }}
                  >
                    {cell.day}
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

function FacilityStep({
  facilities,
  selectedDate,
  selectedFacilityId,
  getFacilityStatus,
  onSelectFacility,
  onSelectFacilityDirect,
}) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>2. 시설 선택</h2>
          <p>선택한 날짜에 예약할 시설을 선택합니다.</p>
        </div>
      </div>

      <table className="select-table">
        <thead>
          <tr>
            <th>캠퍼스</th>
            <th>건물명</th>
            <th>시설명</th>
            <th className="right">상태</th>
            <th className="right">이동</th>
          </tr>
        </thead>
        <tbody>
          {facilities.map((facility) => {
            const status = getFacilityStatus(facility);
            const canSelect = status === "available" || status === "partial";
            const selectedClass = selectedFacilityId === facility.id ? "selected-row" : "";
            const disabledClass = canSelect ? "" : "disabled-room";

            return (
              <tr
                className={`${selectedClass} ${disabledClass}`.trim()}
                key={facility.id}
                onClick={() => {
                  if (canSelect) onSelectFacility(facility.id);
                }}
              >
                <td>{facility.campus}</td>
                <td>{facility.building}</td>
                <td>{facility.facilityName}</td>
                <td className="right">
                  <span className={`status ${getStatusClass(status)}`}>
                    {getStatusText(status)}
                  </span>
                </td>
                <td className="right">
                  <button
                    type="button"
                    className="select-action-btn arrow-btn"
                    disabled={!canSelect}
                    aria-label={`${facility.facilityName} 선택`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectFacilityDirect(facility.id);
                    }}
                  >
                    <span className="arrow-icon" />
                  </button>
                </td>
              </tr>
            );
          })}

          {facilities.length === 0 && (
            <tr>
              <td colSpan="5">등록된 시설이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>

      {!selectedDate && (
        <p className="hint-text">시설 상태는 날짜를 선택한 뒤 정확하게 계산됩니다.</p>
      )}
    </section>
  );
}

function InfoStep({
  selectedDate,
  selectedFacility,
  selectedTimes,
  applicantContact,
  purpose,
  hostGroup,
  leaderName,
  leaderContact,
  submitting,
  isSlotReserved,
  getFacilityStatus,
  onToggleTime,
  onApplicantContactChange,
  onPurposeChange,
  onHostGroupChange,
  onLeaderNameChange,
  onLeaderContactChange,
  onPrevStep,
  onSubmit,
}) {
  if (!selectedFacility) {
    return (
      <section className="section">
        <p>선택된 시설이 없습니다.</p>
      </section>
    );
  }

  const slots = makeTimeSlots(selectedFacility);
  const selectedTimeText =
    selectedTimes.length > 0
      ? selectedTimes.map((time) => time.label).join(", ")
      : "미선택";

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>3. 기타 정보 입력</h2>
          <p>사용 시간과 대실 정보를 입력합니다.</p>
        </div>
      </div>

      <div className="selected-summary">
        <div className="summary-title">선택 정보</div>
        <div className="summary-content">
          <div className="summary-item"><span>선택일</span>{selectedDate}</div>
          <div className="summary-item"><span>시설명</span>{selectedFacility.building} {selectedFacility.facilityName}</div>
          <div className="summary-item"><span>수용정보</span>{formatCapacity(selectedFacility.capacity, selectedFacility.facilityName)}</div>
          <div className="summary-item"><span>상태</span>{getStatusText(getFacilityStatus(selectedFacility))}</div>
          <div className="summary-item full-summary"><span>선택 시간</span>{selectedTimeText}</div>
        </div>
      </div>

      <div className="reservation-layout">
        <div className="time-card">
          <div className="time-title">사용 시간 선택</div>
          {slots.map((slot) => {
            const reserved = isSlotReserved(selectedFacility.id, selectedDate, slot);
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
                <label htmlFor="applicantContact">신청자 연락처</label>
                <input
                  id="applicantContact"
                  type="text"
                  placeholder="신청자 연락처(지역번호 포함)"
                  value={applicantContact}
                  maxLength={20}
                  onChange={(event) => onApplicantContactChange(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="purpose">대실 사유</label>
                <input
                  id="purpose"
                  type="text"
                  placeholder="대실 사유"
                  value={purpose}
                  maxLength={100}
                  onChange={(event) => onPurposeChange(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="hostGroup">주관 단체</label>
                <input
                  id="hostGroup"
                  type="text"
                  placeholder="주관 단체"
                  value={hostGroup}
                  maxLength={50}
                  onChange={(event) => onHostGroupChange(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="leaderName">단체장 성명</label>
                <input
                  id="leaderName"
                  type="text"
                  placeholder="단체장 성명"
                  value={leaderName}
                  maxLength={30}
                  onChange={(event) => onLeaderNameChange(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="leaderContact">단체장 연락처</label>
                <input
                  id="leaderContact"
                  type="text"
                  placeholder="단체장 연락처(지역번호 포함)"
                  value={leaderContact}
                  maxLength={20}
                  onChange={(event) => onLeaderContactChange(event.target.value)}
                />
              </div>
            </div>

            <div className="button-area">
              <button type="button" className="gray-btn" onClick={onPrevStep} disabled={submitting}>
                이전 단계
              </button>
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

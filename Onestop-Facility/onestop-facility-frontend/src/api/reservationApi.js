const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4100/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || "API 요청에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export function getFacilities(params = {}) {
  const query = new URLSearchParams();

  if (params.building) query.set("building", params.building);
  if (params.campus) query.set("campus", params.campus);

  const queryString = query.toString();
  return request(`/facilities${queryString ? `?${queryString}` : ""}`);
}

export function getReservations(params = {}) {
  const query = new URLSearchParams();

  if (params.date) query.set("date", params.date);
  if (params.facilityId) query.set("facilityId", params.facilityId);
  if (params.userId) query.set("userId", params.userId);
  if (params.building) query.set("building", params.building);
  if (params.includeCanceled) query.set("includeCanceled", "true");

  const queryString = query.toString();
  return request(`/facility-reservations${queryString ? `?${queryString}` : ""}`);
}

export function createReservation(reservationData) {
  return request("/facility-reservations", {
    method: "POST",
    body: JSON.stringify(reservationData),
  });
}

export function deleteReservation(id) {
  return request(`/facility-reservations/${id}`, {
    method: "DELETE",
  });
}

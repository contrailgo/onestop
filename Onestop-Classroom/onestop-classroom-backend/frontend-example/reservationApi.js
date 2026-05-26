const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

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

export function getRooms(building) {
  const query = building ? `?building=${encodeURIComponent(building)}` : "";
  return request(`/rooms${query}`);
}

export function getReservations(params = {}) {
  const query = new URLSearchParams();

  if (params.date) query.set("date", params.date);
  if (params.roomId) query.set("roomId", params.roomId);
  if (params.userId) query.set("userId", params.userId);
  if (params.building) query.set("building", params.building);

  const queryString = query.toString();
  return request(`/reservations${queryString ? `?${queryString}` : ""}`);
}

export function createReservation(reservationData) {
  return request("/reservations", {
    method: "POST",
    body: JSON.stringify(reservationData),
  });
}

export function deleteReservation(id) {
  return request(`/reservations/${id}`, {
    method: "DELETE",
  });
}

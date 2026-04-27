import { emitEvent } from "../socket.js";

const trackers = new Map();
const SPEED_STEPS = {
  slow: [2, 5],
  normal: [5, 9],
  fast: [10, 16],
};

function normalizeSpeed(speed) {
  return SPEED_STEPS[speed] ? speed : "normal";
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) - h) + str.charCodeAt(i);
  return Math.abs(h);
}

function normalizeCoordinate(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value < min || value > max) return null;
  return +value.toFixed(6);
}

function normalizeDestination(destination) {
  if (!destination || typeof destination !== "object") return null;
  const lat = normalizeCoordinate(destination.lat, -90, 90);
  const lng = normalizeCoordinate(destination.lng, -180, 180);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function buildFallbackRoute(orderNo = "ORD-DEMO", destinationOverride) {
  // Demo origin (restaurant) around Colombo city center.
  const origin = { lat: 6.9271, lng: 79.8612 };

  // Deterministic destination offset from order number so each order has a stable path.
  const seed = hashCode(orderNo);
  const explicitDestination = normalizeDestination(destinationOverride);
  const destination = explicitDestination || {
    lat: +(origin.lat + (((seed % 180) - 90) / 1000)).toFixed(6),
    lng: +(origin.lng + ((((Math.floor(seed / 180)) % 180) - 90) / 1000)).toFixed(6),
  };

  const bendA = {
    lat: +(origin.lat + (destination.lat - origin.lat) * 0.28 + (((seed % 9) - 4) / 4000)).toFixed(6),
    lng: +(origin.lng + (destination.lng - origin.lng) * 0.22 + ((((seed >> 3) % 9) - 4) / 3500)).toFixed(6),
  };
  const bendB = {
    lat: +(origin.lat + (destination.lat - origin.lat) * 0.68 + ((((seed >> 6) % 9) - 4) / 4200)).toFixed(6),
    lng: +(origin.lng + (destination.lng - origin.lng) * 0.73 + ((((seed >> 9) % 9) - 4) / 3300)).toFixed(6),
  };

  const routePoints = [origin, bendA, bendB, destination];
  return { origin, destination, routePoints };
}

async function fetchRoadRoute(origin, destination) {
  const base = String(process.env.ROUTING_API_BASE || "https://router.project-osrm.org").replace(/\/$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const url = new URL(`${base}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`);
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("alternatives", "false");
    url.searchParams.set("steps", "false");

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "restaurant-mern-demo/1.0 (local-dev)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;

    const points = coords
      .map((c) => {
        const lng = Number(c?.[0]);
        const lat = Number(c?.[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
      })
      .filter(Boolean);

    if (points.length < 2) return null;

    // Keep payloads light for socket updates.
    if (points.length > 140) {
      const stride = Math.ceil(points.length / 120);
      const reduced = points.filter((_, idx) => idx % stride === 0);
      if (reduced[reduced.length - 1]?.lat !== points[points.length - 1].lat || reduced[reduced.length - 1]?.lng !== points[points.length - 1].lng) {
        reduced.push(points[points.length - 1]);
      }
      return reduced;
    }

    return points;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildRoute(orderNo = "ORD-DEMO", destinationOverride) {
  const fallback = buildFallbackRoute(orderNo, destinationOverride);
  const roadPoints = await fetchRoadRoute(fallback.origin, fallback.destination);
  if (!roadPoints) return fallback;
  return {
    origin: roadPoints[0],
    destination: roadPoints[roadPoints.length - 1],
    routePoints: roadPoints,
  };
}

function interpolate(from, to, t) {
  return {
    lat: +(from.lat + (to.lat - from.lat) * t).toFixed(6),
    lng: +(from.lng + (to.lng - from.lng) * t).toFixed(6),
  };
}

function segmentLength(a, b) {
  return Math.hypot(b.lat - a.lat, b.lng - a.lng);
}

function getRouteProgressPoint(routePoints, progress) {
  if (!Array.isArray(routePoints) || routePoints.length < 2) {
    const fallback = routePoints?.[0] || { lat: 6.9271, lng: 79.8612 };
    return { currentLocation: fallback, completedRoutePoints: [fallback] };
  }

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const segments = [];
  let total = 0;

  for (let i = 0; i < routePoints.length - 1; i += 1) {
    const len = segmentLength(routePoints[i], routePoints[i + 1]);
    segments.push(len);
    total += len;
  }

  if (total <= 0) {
    return { currentLocation: routePoints[0], completedRoutePoints: [routePoints[0]] };
  }

  const targetDistance = (clampedProgress / 100) * total;
  let covered = 0;
  const completedRoutePoints = [routePoints[0]];

  for (let i = 0; i < segments.length; i += 1) {
    const segLen = segments[i];
    const from = routePoints[i];
    const to = routePoints[i + 1];

    if (covered + segLen >= targetDistance) {
      const remaining = targetDistance - covered;
      const t = segLen > 0 ? remaining / segLen : 0;
      const currentLocation = interpolate(from, to, t);
      completedRoutePoints.push(currentLocation);
      return { currentLocation, completedRoutePoints };
    }

    covered += segLen;
    completedRoutePoints.push(to);
  }

  return {
    currentLocation: routePoints[routePoints.length - 1],
    completedRoutePoints,
  };
}

function toSnapshot(state) {
  const remaining = Math.max(0, 100 - state.progress);
  const speedDivisor = state.speedProfile === "fast" ? 14 : state.speedProfile === "slow" ? 4 : 9;
  const etaMinutes = Math.max(1, Math.ceil(remaining / speedDivisor));
  return {
    orderId: state.orderId,
    orderNo: state.orderNo,
    active: state.active,
    paused: state.paused,
    speedProfile: state.speedProfile,
    progress: state.progress,
    etaMinutes,
    currentLocation: state.currentLocation,
    origin: state.origin,
    destination: state.destination,
    routePoints: state.routePoints,
    completedRoutePoints: state.completedRoutePoints,
    updatedAt: new Date().toISOString(),
  };
}

function emitUpdate(state) {
  const payload = toSnapshot(state);
  emitEvent("customer", "delivery:location", payload);
}

export async function startDeliverySimulation({ orderId, orderNo, destination }) {
  if (!orderId) return null;

  stopDeliverySimulation(orderId);

  const route = await buildRoute(orderNo, destination);
  const initialPoint = getRouteProgressPoint(route.routePoints, 4);

  const state = {
    orderId: String(orderId),
    orderNo,
    active: true,
    paused: false,
    speedProfile: "normal",
    progress: 4,
    origin: route.origin,
    destination: route.destination,
    routePoints: route.routePoints,
    currentLocation: initialPoint.currentLocation,
    completedRoutePoints: initialPoint.completedRoutePoints,
    timer: null,
  };

  state.timer = setInterval(() => {
    if (!state.active || state.paused) return;

    const [minStep, maxStep] = SPEED_STEPS[state.speedProfile];
    const step = minStep + Math.floor(Math.random() * (maxStep - minStep + 1));
    state.progress = Math.min(100, state.progress + step);
    const point = getRouteProgressPoint(state.routePoints, state.progress);
    state.currentLocation = point.currentLocation;
    state.completedRoutePoints = point.completedRoutePoints;
    emitUpdate(state);

    if (state.progress >= 100) {
      state.active = false;
      clearInterval(state.timer);
      state.timer = null;
    }
  }, 3500);

  trackers.set(state.orderId, state);
  emitUpdate(state);
  return toSnapshot(state);
}

export function stopDeliverySimulation(orderId) {
  const key = String(orderId || "");
  const state = trackers.get(key);
  if (!state) return;

  state.active = false;
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  trackers.delete(key);
}

export function getDeliverySimulation(orderId) {
  const state = trackers.get(String(orderId || ""));
  if (!state) return null;
  return toSnapshot(state);
}

export function pauseDeliverySimulation(orderId) {
  const state = trackers.get(String(orderId || ""));
  if (!state) return null;
  state.paused = true;
  emitUpdate(state);
  return toSnapshot(state);
}

export function resumeDeliverySimulation(orderId) {
  const state = trackers.get(String(orderId || ""));
  if (!state) return null;
  state.paused = false;
  emitUpdate(state);
  return toSnapshot(state);
}

export function resetDeliverySimulation(orderId) {
  const state = trackers.get(String(orderId || ""));
  if (!state) return null;
  state.progress = 4;
  state.paused = false;
  const point = getRouteProgressPoint(state.routePoints, state.progress);
  state.currentLocation = point.currentLocation;
  state.completedRoutePoints = point.completedRoutePoints;
  emitUpdate(state);
  return toSnapshot(state);
}

export function setDeliverySimulationSpeed(orderId, speedProfile) {
  const state = trackers.get(String(orderId || ""));
  if (!state) return null;
  state.speedProfile = normalizeSpeed(speedProfile);
  emitUpdate(state);
  return toSnapshot(state);
}

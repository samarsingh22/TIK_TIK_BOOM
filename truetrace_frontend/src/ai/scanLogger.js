const SCAN_LOG_STORAGE_KEY = "sentinelchain.ai.scan.events.v1";

function normalizeStoredEvent(event) {
  return {
    batchId: String(event?.batchId ?? event?.batchID ?? "").trim(),
    location: String(event?.location || "").trim(),
    role: String(event?.role || "Unknown").trim(),
    timestamp: Number(event?.timestamp || Date.now()),
  };
}

function withLegacyBatchId(event) {
  return {
    ...event,
    batchID: event.batchId,
  };
}

function readRawEvents() {
  try {
    const raw = localStorage.getItem(SCAN_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeStoredEvent).filter((event) => event.batchId) : [];
  } catch {
    return [];
  }
}

function writeRawEvents(events) {
  localStorage.setItem(SCAN_LOG_STORAGE_KEY, JSON.stringify(events));
}

export function getCurrentLocation() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown/Unknown";
  const city = timeZone.includes("/") ? timeZone.split("/").pop() : timeZone;
  return city.replace(/_/g, " ");
}

export function logScanEvent(batchId, location, role) {
  const eventInput =
    typeof batchId === "object" && batchId !== null
      ? {
          batchId: batchId.batchId ?? batchId.batchID,
          location: batchId.location,
          role: batchId.role,
          timestamp: batchId.timestamp,
        }
      : {
          batchId,
          location,
          role,
          timestamp: Date.now(),
        };

  const event = normalizeStoredEvent({
    ...eventInput,
    location: eventInput.location || getCurrentLocation(),
  });

  if (!event.batchId) {
    throw new Error("batchId is required to log a scan event.");
  }

  const events = readRawEvents();
  const nextEvents = [...events.slice(-499), event];
  writeRawEvents(nextEvents);
  return withLegacyBatchId(event);
}

export function getScanHistory(batchId) {
  const key = String(batchId || "").trim().toLowerCase();
  if (!key) return [];

  return readRawEvents()
    .filter((event) => event.batchId.toLowerCase() === key)
    .map(withLegacyBatchId);
}

export function getAllScans() {
  return readRawEvents().map(withLegacyBatchId);
}

export function readScanEvents() {
  return getAllScans();
}

export function getBatchScanEvents(batchId) {
  return getScanHistory(batchId);
}

export function clearScanEvents() {
  localStorage.removeItem(SCAN_LOG_STORAGE_KEY);
}

import demoDataset from "./demoDataset";

const FIVE_MINUTES = 5 * 60 * 1000;
const TWO_MINUTES = 2 * 60 * 1000;

function normalizeTimestamp(timestamp) {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp;
  }

  const parsed = Date.parse(timestamp || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLocation(location) {
  return String(location || "").trim().toLowerCase();
}

function normalizeScanEvent(event) {
  return {
    batchId: String(event?.batchId ?? event?.batchID ?? "").trim(),
    location: String(event?.location || "").trim(),
    role: String(event?.role || "Unknown").trim(),
    timestamp: normalizeTimestamp(event?.timestamp),
  };
}

function resolveBatchProduct(batchId, options = {}) {
  const key = String(batchId || "").trim().toLowerCase();
  const catalog = Array.isArray(options.catalog) ? options.catalog : demoDataset;

  return (
    options.batchData ||
    options.product ||
    catalog.find((entry) => String(entry?.batchId || "").trim().toLowerCase() === key) ||
    null
  );
}

function getDistributorReceivedTimestamp(batchProduct) {
  const transfers = Array.isArray(batchProduct?.transfers) ? batchProduct.transfers : [];
  const distributorTransfer = transfers.find((transfer) => String(transfer?.to || "").trim().toLowerCase() === "distributor");
  return distributorTransfer ? normalizeTimestamp(distributorTransfer.timestamp) : 0;
}

function detectLocationJumpAnomaly(batchScans) {
  for (let index = 0; index < batchScans.length; index += 1) {
    const current = batchScans[index];

    for (let compareIndex = index + 1; compareIndex < batchScans.length; compareIndex += 1) {
      const next = batchScans[compareIndex];
      const timeGap = next.timestamp - current.timestamp;

      if (timeGap > FIVE_MINUTES) {
        break;
      }

      if (normalizeLocation(current.location) && normalizeLocation(current.location) !== normalizeLocation(next.location)) {
        return {
          type: "location_jump",
          risk: "HIGH",
          description: "Location jump detected",
        };
      }
    }
  }

  return null;
}

function detectScanFloodAnomaly(batchScans) {
  let left = 0;

  for (let right = 0; right < batchScans.length; right += 1) {
    while (batchScans[right].timestamp - batchScans[left].timestamp > TWO_MINUTES) {
      left += 1;
    }

    if (right - left + 1 > 10) {
      return {
        type: "scan_flood",
        risk: "HIGH",
        description: "Scan flood detected",
      };
    }
  }

  return null;
}

function detectUnauthorizedScanAnomaly(batchScans, batchProduct) {
  const distributorReceivedAt = getDistributorReceivedTimestamp(batchProduct);
  if (!distributorReceivedAt) {
    return null;
  }

  const unauthorizedScan = batchScans.find((scan) => {
    const role = String(scan.role || "").trim().toLowerCase();
    return scan.timestamp < distributorReceivedAt && role !== "manufacturer";
  });

  if (!unauthorizedScan) {
    return null;
  }

  return {
    type: "unauthorized_scan",
    risk: "HIGH",
    description: "Unauthorized scan detected before distributor received product",
  };
}

function detectPostRecallAnomaly(batchScans, batchProduct, options = {}) {
  const recallTimestamp = normalizeTimestamp(options.recallDate ?? batchProduct?.recallDate);
  const recalled = Boolean(options.recalled ?? batchProduct?.recalled ?? recallTimestamp);

  if (!recalled || batchScans.length === 0) {
    return null;
  }

  const violatingScan = recallTimestamp
    ? batchScans.find((scan) => scan.timestamp >= recallTimestamp)
    : batchScans[0];

  if (!violatingScan) {
    return null;
  }

  return {
    type: "post_recall_scan",
    risk: "CRITICAL",
    description: "Product was scanned after recall",
  };
}

export function detectAnomalies(scanEvents, batchId, currentLocation, options = {}) {
  const batchKey = String(batchId || "").trim();
  const batchProduct = resolveBatchProduct(batchKey, options);
  const normalizedScans = Array.isArray(scanEvents)
    ? scanEvents
        .map(normalizeScanEvent)
        .filter((event) => event.batchId.toLowerCase() === batchKey.toLowerCase())
        .sort((left, right) => left.timestamp - right.timestamp)
    : [];

  const anomalies = [];
  const locationJump = detectLocationJumpAnomaly(normalizedScans);
  const scanFlood = detectScanFloodAnomaly(normalizedScans);
  const unauthorizedScan = detectUnauthorizedScanAnomaly(normalizedScans, batchProduct);
  const postRecallScan = detectPostRecallAnomaly(normalizedScans, batchProduct, options);

  if (locationJump) anomalies.push(locationJump);
  if (scanFlood) anomalies.push(scanFlood);
  if (unauthorizedScan) anomalies.push(unauthorizedScan);
  if (postRecallScan) anomalies.push(postRecallScan);

  const distinctLocations = new Set(
    normalizedScans.map((scan) => normalizeLocation(scan.location)).filter(Boolean),
  );

  if (currentLocation) {
    distinctLocations.add(normalizeLocation(currentLocation));
  }

  return {
    batchId: batchKey,
    anomalies,
    flags: anomalies.map((anomaly) => anomaly.description),
    suspiciousScans: anomalies.length > 0 ? normalizedScans.length : 0,
    recentScans: normalizedScans.length,
    citiesDetected: distinctLocations.size,
  };
}

export default detectAnomalies;

import { getUnifiedProductCatalog } from "./productCatalog";

const FIVE_MINUTES = 5 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

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
    scannerRole: String(event?.scannerRole ?? event?.role ?? "Unknown").trim(),
    role: String(event?.scannerRole ?? event?.role ?? "Unknown").trim(),
    deviceFingerprint: String(event?.deviceFingerprint || "unknown-device").trim(),
    timestamp: normalizeTimestamp(event?.timestamp),
  };
}

function resolveBatchProduct(batchId, options = {}) {
  const key = String(batchId || "").trim().toLowerCase();
  const catalog = Array.isArray(options.catalog) ? options.catalog : getUnifiedProductCatalog();

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

      if (timeGap > TEN_MINUTES) {
        break;
      }

      if (normalizeLocation(current.location) && normalizeLocation(current.location) !== normalizeLocation(next.location)) {
        return {
          type: "location_jump",
          risk: "HIGH",
          description: "Impossible location jump",
        };
      }
    }
  }

  return null;
}

function detectScanFloodAnomaly(batchScans) {
  let left = 0;

  for (let right = 0; right < batchScans.length; right += 1) {
    while (batchScans[right].timestamp - batchScans[left].timestamp > FIVE_MINUTES) {
      left += 1;
    }

    if (batchScans[right].timestamp - batchScans[left].timestamp <= FIVE_MINUTES && right - left + 1 > 5) {
      return {
        type: "scan_flood",
        risk: "MEDIUM",
        description: "Excessive scan frequency",
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
    const role = String(scan.scannerRole || scan.role || "").trim().toLowerCase();
    return scan.timestamp < distributorReceivedAt && role === "distributor";
  });

  if (!unauthorizedScan) {
    return null;
  }

  return {
    type: "unauthorized_scan",
    risk: "HIGH",
    description: "Unauthorized distributor transfer",
  };
}

function detectBeforeCreationAnomaly(batchScans, batchProduct, options = {}) {
  const createdAt = normalizeTimestamp(
    options.createdAt || options.productCreatedAt || batchProduct?.createdAt || batchProduct?.manufactureDate || batchProduct?.mfgDate,
  );

  if (!createdAt) return null;
  const violatingScan = batchScans.find((scan) => scan.timestamp > 0 && scan.timestamp < createdAt);
  if (!violatingScan) return null;

  return {
    type: "scan_before_creation",
    risk: "HIGH",
    description: "Scan before product creation time",
  };
}

function detectDeviceMismatchAnomaly(batchScans) {
  const uniqueDevices = new Set(batchScans.map((scan) => scan.deviceFingerprint).filter(Boolean));
  if (uniqueDevices.size < 3 || batchScans.length < 4) return null;

  return {
    type: "device_mismatch",
    risk: "MEDIUM",
    description: "Device mismatch",
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
    risk: "HIGH",
    description: "Product was scanned after recall",
  };
}

function calculateRiskLevel(anomalyObjects = []) {
  if (!Array.isArray(anomalyObjects) || anomalyObjects.length === 0) return "LOW";

  if (anomalyObjects.some((item) => String(item.risk || "").toUpperCase() === "HIGH")) {
    return "HIGH";
  }

  return "MEDIUM";
}

function resolveSupplyChainContext(arg2, arg3, arg4) {
  // New signature: detectAnomalies(scanHistory, supplyChainHistory)
  if (arg2 && (Array.isArray(arg2) || typeof arg2 === "object") && typeof arg2 !== "string") {
    return {
      batchId: String(arg2?.batchId || arg2?.id || "").trim(),
      currentLocation: "",
      options: {
        supplyChainHistory: arg2,
        createdAt: arg2?.createdAt || arg2?.manufactureDate || arg2?.mfgDate,
        recallDate: arg2?.recallDate,
        recalled: arg2?.recalled,
        product: arg2,
      },
    };
  }

  return {
    batchId: String(arg2 || "").trim(),
    currentLocation: arg3,
    options: arg4 || {},
  };
}

export function detectAnomalies(scanEvents, arg2, arg3, arg4 = {}) {
  const context = resolveSupplyChainContext(arg2, arg3, arg4);
  const batchKey = context.batchId || String(scanEvents?.[0]?.batchId ?? scanEvents?.[0]?.batchID ?? "").trim();
  const options = context.options;
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
  const beforeCreation = detectBeforeCreationAnomaly(normalizedScans, batchProduct, options);
  const deviceMismatch = detectDeviceMismatchAnomaly(normalizedScans);
  const postRecallScan = detectPostRecallAnomaly(normalizedScans, batchProduct, options);

  if (locationJump) anomalies.push(locationJump);
  if (scanFlood) anomalies.push(scanFlood);
  if (unauthorizedScan) anomalies.push(unauthorizedScan);
  if (beforeCreation) anomalies.push(beforeCreation);
  if (deviceMismatch) anomalies.push(deviceMismatch);
  if (postRecallScan) anomalies.push(postRecallScan);

  const distinctLocations = new Set(
    normalizedScans.map((scan) => normalizeLocation(scan.location)).filter(Boolean),
  );

  if (context.currentLocation) {
    distinctLocations.add(normalizeLocation(context.currentLocation));
  }

  const anomalyDescriptions = anomalies.map((anomaly) => anomaly.description);

  return {
    batchId: batchKey,
    riskLevel: calculateRiskLevel(anomalies),
    anomalies: anomalyDescriptions,
    anomalyObjects: anomalies,
    flags: anomalyDescriptions,
    suspiciousScans: anomalies.length > 0 ? normalizedScans.length : 0,
    recentScans: normalizedScans.length,
    citiesDetected: distinctLocations.size,
    deviceCount: new Set(normalizedScans.map((scan) => scan.deviceFingerprint).filter(Boolean)).size,
  };
}

export default detectAnomalies;

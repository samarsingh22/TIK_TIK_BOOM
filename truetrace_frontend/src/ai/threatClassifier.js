const THREAT_BY_ANOMALY_TYPE = {
  location_jump: "HIGH",
  too_many_scans: "MEDIUM",
  scan_flood: "MEDIUM",
  scan_before_transfer: "HIGH",
  unauthorized_scan: "HIGH",
  scan_after_recall: "CRITICAL",
  post_recall_scan: "CRITICAL",
};

const THREAT_PRIORITY = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

export function classifyThreat(anomalyResult = {}) {
  const anomalies = Array.isArray(anomalyResult.anomalyObjects)
    ? anomalyResult.anomalyObjects
    : Array.isArray(anomalyResult.anomalies)
      ? anomalyResult.anomalies
      : [];

  if (anomalies.length === 0) {
    return "LOW";
  }

  return anomalies.reduce((highestThreat, anomaly) => {
    const threat = THREAT_BY_ANOMALY_TYPE[normalizeType(anomaly?.type)] || "LOW";
    return THREAT_PRIORITY[threat] > THREAT_PRIORITY[highestThreat] ? threat : highestThreat;
  }, "LOW");
}

export default classifyThreat;

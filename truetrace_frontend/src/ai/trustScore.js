const DEDUCTION_BY_TYPE = {
  location_jump: 30,
  scan_flood: 15,
  unauthorized_scan: 25,
  device_mismatch: 10,
  scan_before_creation: 20,
  post_recall_scan: 20,
};

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

function normalizeAnomalyObjects(anomalyResult = {}) {
  if (Array.isArray(anomalyResult.anomalyObjects)) {
    return anomalyResult.anomalyObjects;
  }

  if (Array.isArray(anomalyResult.anomalies) && anomalyResult.anomalies.every((item) => typeof item === "object")) {
    return anomalyResult.anomalies;
  }

  return [];
}

function deriveRiskLevel(score, explicitRiskLevel = "") {
  const normalizedExplicit = String(explicitRiskLevel || "").toUpperCase();
  if (normalizedExplicit === "HIGH" || normalizedExplicit === "MEDIUM" || normalizedExplicit === "LOW") {
    return normalizedExplicit;
  }

  if (score < 65) return "HIGH";
  if (score < 85) return "MEDIUM";
  return "LOW";
}

export function calculateTrustScore(input = {}) {
  const anomalyObjects = normalizeAnomalyObjects(input);
  const recalled = Boolean(input.recalled);
  const suspiciousScans = Number(input.suspiciousScans || 0);

  let score = 100;
  const deductions = [];

  anomalyObjects.forEach((anomaly) => {
    const type = normalizeType(anomaly?.type);
    const deduction = DEDUCTION_BY_TYPE[type] || 0;
    if (deduction > 0) {
      score -= deduction;
      deductions.push({ type, deduction });
    }
  });

  if (anomalyObjects.length === 0 && suspiciousScans > 0) {
    const legacyPenalty = Math.min(30, suspiciousScans * 10);
    score -= legacyPenalty;
    deductions.push({ type: "legacy_suspicious_scans", deduction: legacyPenalty });
  }

  if (recalled) {
    score = Math.min(score, 20);
    deductions.push({ type: "recalled", deduction: 80 });
  }

  const trustScore = Math.max(0, Math.min(100, Math.round(score)));
  const riskLevel = deriveRiskLevel(trustScore, input.riskLevel);

  return {
    trustScore,
    riskLevel,
    deductions,
  };
}

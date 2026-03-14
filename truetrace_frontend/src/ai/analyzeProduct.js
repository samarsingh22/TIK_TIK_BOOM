import { detectAnomalies } from "./anomalyDetection";
import { getScanHistory } from "./scanLogger";
import { classifyThreat } from "./threatClassifier";
import { getUnifiedProductByBatchId } from "./productCatalog";

function normalizeTimestamp(timestamp) {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp;
  }

  const parsed = Date.parse(timestamp || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function toScanEvent(batchId, scan) {
  return {
    batchId: String(batchId || "").trim(),
    location: String(scan?.location || "").trim(),
    role: String(scan?.role || "Unknown").trim(),
    timestamp: normalizeTimestamp(scan?.timestamp),
  };
}

function findProduct(batchId) {
  return getUnifiedProductByBatchId(batchId);
}

function getCombinedScans(product) {
  const demoScans = Array.isArray(product?.scans) ? product.scans.map((scan) => toScanEvent(product.batchId, scan)) : [];
  const loggedScans = getScanHistory(product?.batchId).map((scan) => toScanEvent(product.batchId, scan));

  return [...demoScans, ...loggedScans].sort((left, right) => left.timestamp - right.timestamp);
}

function calculateAnalysisTrustScore(anomalies) {
  const anomalyCount = Array.isArray(anomalies) ? anomalies.length : 0;
  return Math.max(0, 100 - anomalyCount * 15);
}

export function analyzeProduct(batchId) {
  const product = findProduct(batchId);

  if (!product) {
    throw new Error(`Product not found for batchId: ${batchId}`);
  }

  const scans = getCombinedScans(product);
  const anomalyResult = detectAnomalies(scans, product.batchId, scans.at(-1)?.location || "", {
    product,
    recalled: Boolean(product.recallDate || product.recalled),
    recallDate: product.recallDate,
  });
  const threatLevel = classifyThreat(anomalyResult);
  const anomalyDetails = Array.isArray(anomalyResult.anomalyObjects) ? anomalyResult.anomalyObjects : anomalyResult.anomalies;
  const trustScore = calculateAnalysisTrustScore(anomalyDetails);

  return {
    batchId: product.batchId,
    productName: product.productName,
    trustScore,
    threatLevel,
    anomalies: anomalyDetails,
    transfers: Array.isArray(product.transfers) ? product.transfers : [],
    scans,
  };
}

export default analyzeProduct;
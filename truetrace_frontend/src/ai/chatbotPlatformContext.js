import { analyzeAllProducts } from "./globalAnalytics";
import { analyzeProduct } from "./analyzeProduct";
import { getUnifiedProductCatalog } from "./productCatalog";
import { readScanEvents } from "./scanLogger";

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(product) {
  if (product.recalled || product.recallDate) return "RECALLED";
  if (product.distributionBlocked || product.blocked) return "BLOCKED";
  if (product.counterfeitFlagged || product.flaggedCounterfeit) return "FLAGGED_COUNTERFEIT";
  if (Number(product.suspiciousScans || 0) > 0) return "FLAGGED";
  return String(product.productStatus || "ACTIVE").toUpperCase();
}

function buildProductSnapshot(product) {
  let analysis = null;
  try {
    analysis = analyzeProduct(product.batchId);
  } catch {
    analysis = null;
  }

  return {
    batchId: product.batchId,
    productName: product.productName,
    manufacturer: product.manufacturer || "Unknown",
    status: normalizeStatus(product),
    dataSource: product.dataSource || "demo",
    threatLevel: analysis?.threatLevel || "LOW",
    trustScore: Number(analysis?.trustScore ?? product.trustScore ?? 100),
    anomalyCount: Array.isArray(analysis?.anomalies) ? analysis.anomalies.length : Number(product.suspiciousScans || 0),
    scanCount: Array.isArray(analysis?.scans) ? analysis.scans.length : Array.isArray(product.scans) ? product.scans.length : 0,
    transferCount: Array.isArray(analysis?.transfers) ? analysis.transfers.length : Array.isArray(product.transfers) ? product.transfers.length : 0,
    updatedAt: product.statusUpdatedAt || product.recallDate || product.expiryDate || product.manufactureDate || "",
  };
}

function buildRecentScans(limit = 20) {
  return readScanEvents()
    .slice()
    .sort((left, right) => Number(right.timestamp || 0) - Number(left.timestamp || 0))
    .slice(0, limit)
    .map((scan) => ({
      batchId: String(scan.batchId || scan.batchID || ""),
      location: String(scan.location || "Unknown"),
      role: String(scan.role || "Unknown"),
      timestamp: Number(scan.timestamp || 0),
    }));
}

export function buildPlatformChatContext() {
  const catalog = getUnifiedProductCatalog();
  const analytics = analyzeAllProducts();

  const products = catalog
    .slice()
    .sort((left, right) => toTimestamp(right.statusUpdatedAt || right.recallDate || right.expiryDate) - toTimestamp(left.statusUpdatedAt || left.recallDate || left.expiryDate))
    .map(buildProductSnapshot)
    .slice(0, 40);

  return {
    generatedAt: new Date().toISOString(),
    scope: "True Trace platform data only",
    analytics: {
      totalProducts: analytics.totalProducts,
      totalScans: analytics.totalScans,
      totalAnomalies: analytics.totalAnomalies,
      globalTrustScore: analytics.globalTrustScore,
    },
    products,
    recentScans: buildRecentScans(20),
    qrWorkflow: {
      createQr: [
        "Open Register Batch and create an on-chain batch.",
        "After transaction success, QR is generated from batch payload.",
        "Download QR from the QR section.",
      ],
      verifyQr: [
        "Use Scan/Verify flow or paste QR payload/URL.",
        "System extracts BatchID and verifies on-chain record.",
        "Verification logs scan events and updates AI trust/anomaly view.",
      ],
    },
  };
}

export function buildPlatformChatContextText() {
  const context = buildPlatformChatContext();
  const productHints = context.products
    .slice(0, 12)
    .map((product) => `${product.batchId} | ${product.productName} | ${product.status} | trust ${product.trustScore} | threat ${product.threatLevel}`)
    .join("; ");

  return [
    `Context timestamp: ${context.generatedAt}.`,
    `Scope: ${context.scope}.`,
    `Analytics: products=${context.analytics.totalProducts}, scans=${context.analytics.totalScans}, anomalies=${context.analytics.totalAnomalies}, trust=${context.analytics.globalTrustScore}.`,
    `Known products: ${productHints || "none"}.`,
    "QR creation flow: create batch on Register Batch, wait for tx success, then QR is available for download.",
    "QR verification flow: scan/paste QR payload, resolve BatchID, verify on-chain, then scan telemetry updates analytics.",
  ].join(" ");
}

export default buildPlatformChatContext;

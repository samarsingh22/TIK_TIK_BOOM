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

function buildTopAnomalies(products, limit = 8) {
  return products
    .filter((product) => Number(product.anomalyCount || 0) > 0)
    .sort((left, right) => {
      const anomalyDelta = Number(right.anomalyCount || 0) - Number(left.anomalyCount || 0);
      if (anomalyDelta !== 0) return anomalyDelta;
      return Number(left.trustScore || 0) - Number(right.trustScore || 0);
    })
    .slice(0, limit)
    .map((product) => ({
      batchId: product.batchId,
      productName: product.productName,
      threatLevel: product.threatLevel,
      anomalyCount: product.anomalyCount,
      trustScore: product.trustScore,
    }));
}

function buildRecentTransfers(catalog, limit = 12) {
  return catalog
    .flatMap((product) =>
      (Array.isArray(product.transfers) ? product.transfers : []).map((transfer) => ({
        batchId: product.batchId,
        productName: product.productName,
        from: String(transfer.from || "Unknown"),
        to: String(transfer.to || "Unknown"),
        location: String(transfer.location || "Unknown"),
        timestamp: String(transfer.timestamp || ""),
      })),
    )
    .sort((left, right) => toTimestamp(right.timestamp) - toTimestamp(left.timestamp))
    .slice(0, limit);
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
    recentTransfers: buildRecentTransfers(catalog, 12),
    topAnomalies: buildTopAnomalies(products, 8),
    process: {
      registerTrackVerify: [
        "Register: Manufacturer creates on-chain batch with batch metadata.",
        "Track: Ownership transfers are logged across distributor/retailer steps.",
        "Verify: QR scan resolves batch and validates current on-chain state.",
      ],
      roleActions: {
        manufacturer: ["register batches", "generate QR", "transfer to distributor", "monitor product intelligence"],
        distributor: ["receive products", "transfer ownership", "track shipment chain"],
        retailer: ["verify authenticity", "receive and pass products", "flag suspicious batches"],
        consumer: ["scan QR", "view history", "check trust score"],
        regulator: ["review anomalies", "issue recalls", "monitor platform-wide risk"],
      },
    },
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
    `Top anomaly batches: ${context.topAnomalies.map((item) => `${item.batchId}:${item.anomalyCount}`).join(", ") || "none"}.`,
    `Recent transfer count: ${context.recentTransfers.length}.`,
    `Core process: ${context.process.registerTrackVerify.join(" ")}`,
    "Role actions: manufacturer registers/transfers, distributor receives/transfers, retailer verifies/flags, consumer scans/verifies, regulator monitors/recalls.",
    "QR creation flow: create batch on Register Batch, wait for tx success, then QR is available for download.",
    "QR verification flow: scan/paste QR payload, resolve BatchID, verify on-chain, then scan telemetry updates analytics.",
  ].join(" ");
}

export default buildPlatformChatContext;

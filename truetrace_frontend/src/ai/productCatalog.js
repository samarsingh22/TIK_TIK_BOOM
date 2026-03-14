import demoDataset, { getProductByBatchId, updateProductStatus } from "./demoDataset";
import { getScanHistory } from "./scanLogger";
import { listTrackedBatches, upsertTrackedBatch } from "../services/batchStore";

function normalizeBatchId(batchId) {
  return String(batchId || "").trim().toLowerCase();
}

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapHistoryToTransfers(history = []) {
  return history
    .filter((event) => String(event?.type || "").toLowerCase() === "transferred")
    .map((event) => ({
      from: "Custodian",
      to: "Custodian",
      location: String(event?.location || "Unknown"),
      timestamp: String(event?.at || event?.timestamp || ""),
    }));
}

function mapTrackedToProduct(tracked, baseProduct = null) {
  const scans = getScanHistory(tracked.batchId).map((scan) => ({
    location: scan.location,
    role: scan.role,
    timestamp: scan.timestamp,
  }));
  const historyTransfers = mapHistoryToTransfers(tracked.history || baseProduct?.history || []);

  return {
    batchId: tracked.batchId,
    productName: tracked.productName || baseProduct?.productName || "Unlabeled Product",
    manufacturer: tracked.manufacturer || tracked.owner || baseProduct?.manufacturer || "Unknown",
    manufactureDate: tracked.mfgDate || baseProduct?.manufactureDate || "",
    expiryDate: tracked.expDate || baseProduct?.expiryDate || "",
    recallDate: tracked.recallDate || baseProduct?.recallDate,
    recalled: Boolean(tracked.recalled || baseProduct?.recalled),
    distributionBlocked: Boolean(tracked.distributionBlocked || baseProduct?.distributionBlocked),
    counterfeitFlagged: Boolean(tracked.counterfeitFlagged || baseProduct?.counterfeitFlagged),
    productStatus: tracked.productStatus || baseProduct?.productStatus || "ACTIVE",
    regulatorAction: tracked.regulatorAction || baseProduct?.regulatorAction,
    statusUpdatedAt: tracked.statusUpdatedAt || baseProduct?.statusUpdatedAt,
    trustScore: Number(tracked.trustScore ?? baseProduct?.trustScore ?? 100),
    suspiciousScans: Number(tracked.suspiciousScans ?? baseProduct?.suspiciousScans ?? 0),
    dataSource: baseProduct ? "hybrid" : "real",
    scans,
    transfers: historyTransfers.length > 0 ? historyTransfers : baseProduct?.transfers || [],
  };
}

export function getUnifiedProductCatalog() {
  const tracked = listTrackedBatches();
  const demoMap = new Map(demoDataset.map((item) => [normalizeBatchId(item.batchId), item]));
  const trackedMap = new Map(tracked.map((item) => [normalizeBatchId(item.batchId), item]));
  const keys = new Set([...demoMap.keys(), ...trackedMap.keys()]);

  return Array.from(keys)
    .map((key) => {
      const demo = demoMap.get(key) || null;
      const real = trackedMap.get(key) || null;
      if (!real && demo) {
        return {
          ...demo,
          dataSource: "demo",
          scans: [
            ...(Array.isArray(demo.scans) ? demo.scans : []),
            ...getScanHistory(demo.batchId).map((scan) => ({
              location: scan.location,
              role: scan.role,
              timestamp: scan.timestamp,
            })),
          ],
        };
      }
      return mapTrackedToProduct(real, demo);
    })
    .sort((left, right) => toTimestamp(right.statusUpdatedAt || right.recallDate || right.expiryDate) - toTimestamp(left.statusUpdatedAt || left.recallDate || left.expiryDate));
}

export function getUnifiedProductByBatchId(batchId) {
  const key = normalizeBatchId(batchId);
  if (!key) return null;
  return getUnifiedProductCatalog().find((item) => normalizeBatchId(item.batchId) === key) || null;
}

export function setUnifiedProductStatus(batchId, statusPatch = {}) {
  const product = getUnifiedProductByBatchId(batchId);
  if (!product) return null;

  if (getProductByBatchId(batchId)) {
    updateProductStatus(batchId, statusPatch);
  }

  const next = upsertTrackedBatch({
    batchId: product.batchId,
    productName: product.productName,
    mfgDate: product.manufactureDate || product.mfgDate || "",
    expDate: product.expiryDate || product.expDate || "",
    recalled: Boolean(statusPatch.recalled ?? product.recalled),
    recallDate: statusPatch.recallDate ?? product.recallDate,
    trustScore: Number(product.trustScore ?? 100),
    suspiciousScans: Number(product.suspiciousScans ?? 0),
    distributionBlocked: Boolean(statusPatch.distributionBlocked ?? product.distributionBlocked),
    counterfeitFlagged: Boolean(statusPatch.counterfeitFlagged ?? product.counterfeitFlagged),
    regulatorAction: statusPatch.regulatorAction ?? product.regulatorAction,
    productStatus: statusPatch.productStatus ?? product.productStatus,
    statusUpdatedAt: new Date().toISOString(),
  });

  return {
    ...product,
    ...statusPatch,
    ...next,
  };
}

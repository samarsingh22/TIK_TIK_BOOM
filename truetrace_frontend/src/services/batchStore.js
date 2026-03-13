const BATCHES_KEY = "True Trace.batches.v1";
const LEGACY_BATCH_KEYS = ["sentinelchain.batches.v1", "sentinelchain.tracked.batches.v1"];

function readBatches() {
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    for (const key of LEGACY_BATCH_KEYS) {
      const legacyRaw = localStorage.getItem(key);
      if (!legacyRaw) continue;
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        localStorage.setItem(BATCHES_KEY, JSON.stringify(legacyParsed));
        return legacyParsed;
      }
    }

    return [];
  } catch {
    return [];
  }
}

function writeBatches(batches) {
  localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
}

function normalizeBatchId(batchId) {
  return String(batchId || "").trim().toLowerCase();
}

export function listTrackedBatches() {
  return readBatches()
    .slice()
    .sort((a, b) => Number(new Date(b.updatedAt || 0)) - Number(new Date(a.updatedAt || 0)));
}

export function clearTrackedBatches() {
  localStorage.removeItem(BATCHES_KEY);
}

export function upsertTrackedBatch(input, options = {}) {
  const batchId = String(input.batchId || "").trim();
  if (!batchId) return null;

  const nowIso = new Date().toISOString();
  const batches = readBatches();
  const key = normalizeBatchId(batchId);
  const index = batches.findIndex((item) => normalizeBatchId(item.batchId) === key);
  const existing = index >= 0 ? batches[index] : null;

  const event = options.eventType
    ? {
        type: options.eventType,
        at: nowIso,
        txHash: options.txHash || "",
        owner: input.owner || existing?.owner || "",
      }
    : null;

  const next = {
    batchId,
    productName: String(input.productName ?? existing?.productName ?? ""),
    mfgDate: String(input.mfgDate ?? existing?.mfgDate ?? ""),
    expDate: String(input.expDate ?? existing?.expDate ?? ""),
    owner: String(input.owner ?? existing?.owner ?? ""),
    recalled: Boolean(input.recalled ?? existing?.recalled ?? false),
    trustScore: Number(input.trustScore ?? existing?.trustScore ?? 100),
    suspiciousScans: Number(input.suspiciousScans ?? existing?.suspiciousScans ?? 0),
    scansObserved: Number(input.scansObserved ?? existing?.scansObserved ?? 0),
    lastLocation: String(input.lastLocation ?? existing?.lastLocation ?? ""),
    manufacturerCategory: String(input.manufacturerCategory ?? existing?.manufacturerCategory ?? ""),
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    history: event ? [...(existing?.history || []), event] : existing?.history || [],
  };

  if (index >= 0) {
    batches[index] = next;
  } else {
    batches.push(next);
  }

  writeBatches(batches);
  return next;
}

export function markBatchTransferred(batchId, newOwner, txHash = "") {
  const key = normalizeBatchId(batchId);
  if (!key) return null;

  const batches = readBatches();
  const index = batches.findIndex((item) => normalizeBatchId(item.batchId) === key);
  if (index < 0) return null;

  const nowIso = new Date().toISOString();
  const current = batches[index];
  const next = {
    ...current,
    owner: String(newOwner || current.owner || ""),
    updatedAt: nowIso,
    history: [
      ...(current.history || []),
      { type: "transferred", at: nowIso, txHash, owner: String(newOwner || current.owner || "") },
    ],
  };

  batches[index] = next;
  writeBatches(batches);
  return next;
}

export function markBatchRecalled(batchId, txHash = "") {
  const key = normalizeBatchId(batchId);
  if (!key) return null;

  const batches = readBatches();
  const index = batches.findIndex((item) => normalizeBatchId(item.batchId) === key);
  if (index < 0) return null;

  const nowIso = new Date().toISOString();
  const current = batches[index];
  const next = {
    ...current,
    recalled: true,
    updatedAt: nowIso,
    history: [...(current.history || []), { type: "recalled", at: nowIso, txHash, owner: current.owner || "" }],
  };

  batches[index] = next;
  writeBatches(batches);
  return next;
}

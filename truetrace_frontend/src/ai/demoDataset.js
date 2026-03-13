export const demoDataset = [
  {
    batchId: "MED-001",
    productName: "Painkiller",
    manufacturer: "ABC Pharma",
    manufactureDate: "2026-02-25",
    expiryDate: "2028-02-25",
    transfers: [
      {
        from: "Manufacturer",
        to: "Distributor",
        location: "Kolkata",
        timestamp: "2026-03-13T09:00:00",
      },
      {
        from: "Distributor",
        to: "Retailer",
        location: "Delhi",
        timestamp: "2026-03-13T13:30:00",
      },
    ],
    scans: [
      {
        location: "Delhi",
        role: "Retailer",
        timestamp: "2026-03-13T13:40:00",
      },
      {
        location: "Delhi",
        role: "Consumer",
        timestamp: "2026-03-13T15:10:00",
      },
    ],
  },
  {
    batchId: "MED-002",
    productName: "Antibiotic",
    manufacturer: "ZenCure Labs",
    manufactureDate: "2026-02-20",
    expiryDate: "2028-02-20",
    transfers: [
      {
        from: "Manufacturer",
        to: "Distributor",
        location: "Delhi",
        timestamp: "2026-03-13T10:00:00",
      },
      {
        from: "Distributor",
        to: "Retailer",
        location: "Mumbai",
        timestamp: "2026-03-13T14:00:00",
      },
    ],
    scans: [
      {
        location: "Delhi",
        role: "Distributor",
        timestamp: "2026-03-13T10:05:00",
      },
      {
        location: "Mumbai",
        role: "Retailer",
        timestamp: "2026-03-13T10:07:00",
      },
    ],
  },
  {
    batchId: "MED-003",
    productName: "Vitamin Syrup",
    manufacturer: "NutriMeds",
    manufactureDate: "2026-02-15",
    expiryDate: "2027-08-15",
    transfers: [
      {
        from: "Manufacturer",
        to: "Distributor",
        location: "Hyderabad",
        timestamp: "2026-03-13T08:30:00",
      },
      {
        from: "Distributor",
        to: "Retailer",
        location: "Bengaluru",
        timestamp: "2026-03-13T11:00:00",
      },
    ],
    scans: [
      {
        location: "Bengaluru",
        role: "Retailer",
        timestamp: "2026-03-13T11:05:00",
      },
      {
        location: "Bengaluru",
        role: "Retailer",
        timestamp: "2026-03-13T11:06:00",
      },
      {
        location: "Bengaluru",
        role: "Retailer",
        timestamp: "2026-03-13T11:07:00",
      },
      {
        location: "Bengaluru",
        role: "Retailer",
        timestamp: "2026-03-13T11:08:00",
      },
      {
        location: "Bengaluru",
        role: "Retailer",
        timestamp: "2026-03-13T11:09:00",
      },
      {
        location: "Bengaluru",
        role: "Consumer",
        timestamp: "2026-03-13T11:10:00",
      },
      {
        location: "Bengaluru",
        role: "Consumer",
        timestamp: "2026-03-13T11:11:00",
      },
    ],
  },
  {
    batchId: "MED-004",
    productName: "Insulin Pen",
    manufacturer: "LifeLine Biotech",
    manufactureDate: "2026-02-28",
    expiryDate: "2027-12-31",
    transfers: [
      {
        from: "Manufacturer",
        to: "Distributor",
        location: "Pune",
        timestamp: "2026-03-13T10:30:00",
      },
      {
        from: "Distributor",
        to: "Retailer",
        location: "Chennai",
        timestamp: "2026-03-13T12:45:00",
      },
    ],
    scans: [
      {
        location: "Chennai",
        role: "Retailer",
        timestamp: "2026-03-13T11:55:00",
      },
      {
        location: "Chennai",
        role: "Consumer",
        timestamp: "2026-03-13T12:00:00",
      },
    ],
  },
  {
    batchId: "MED-005",
    productName: "Cough Relief",
    manufacturer: "HealWell Pharma",
    manufactureDate: "2026-02-18",
    expiryDate: "2027-11-18",
    recallDate: "2026-03-13T09:15:00",
    transfers: [
      {
        from: "Manufacturer",
        to: "Distributor",
        location: "Ahmedabad",
        timestamp: "2026-03-13T07:45:00",
      },
      {
        from: "Distributor",
        to: "Retailer",
        location: "Jaipur",
        timestamp: "2026-03-13T08:50:00",
      },
    ],
    scans: [
      {
        location: "Jaipur",
        role: "Retailer",
        timestamp: "2026-03-13T09:05:00",
      },
      {
        location: "Jaipur",
        role: "Consumer",
        timestamp: "2026-03-13T09:20:00",
      },
    ],
  },
];

const DEMO_DATASET_STATUS_KEY = "sentinelchain.ai.demo.status.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeBatchId(batchId) {
  return String(batchId || "").trim().toLowerCase();
}

function readStatusOverrides() {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(DEMO_DATASET_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStatusOverrides(overrides) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DEMO_DATASET_STATUS_KEY, JSON.stringify(overrides));
}

function findProductIndex(batchId) {
  const key = normalizeBatchId(batchId);
  return demoDataset.findIndex((product) => normalizeBatchId(product.batchId) === key);
}

function applyStatusOverrides() {
  const overrides = readStatusOverrides();

  Object.entries(overrides).forEach(([batchIdKey, statusPatch]) => {
    const index = demoDataset.findIndex((product) => normalizeBatchId(product.batchId) === batchIdKey);
    if (index >= 0 && statusPatch && typeof statusPatch === "object") {
      demoDataset[index] = {
        ...demoDataset[index],
        ...statusPatch,
      };
    }
  });
}

export function getProductByBatchId(batchId) {
  const index = findProductIndex(batchId);
  return index >= 0 ? demoDataset[index] : null;
}

export function updateProductStatus(batchId, statusPatch = {}) {
  const index = findProductIndex(batchId);
  if (index < 0) {
    return null;
  }

  const current = demoDataset[index];
  const next = {
    ...current,
    ...statusPatch,
    statusUpdatedAt: new Date().toISOString(),
  };

  demoDataset[index] = next;

  const overrides = readStatusOverrides();
  overrides[normalizeBatchId(batchId)] = {
    ...(overrides[normalizeBatchId(batchId)] || {}),
    ...statusPatch,
    statusUpdatedAt: next.statusUpdatedAt,
  };
  writeStatusOverrides(overrides);

  return next;
}

applyStatusOverrides();

export default demoDataset;

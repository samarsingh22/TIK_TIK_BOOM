import { analyzeAllProducts } from "./globalAnalytics";
import { analyzeProduct } from "./analyzeProduct";
import { getUnifiedProductCatalog } from "./productCatalog";
import { buildPlatformChatContext } from "./chatbotPlatformContext";

function extractBatchId(input, catalog = []) {
  const text = String(input || "");
  const knownIds = new Set(catalog.map((item) => String(item.batchId || "").toLowerCase()));
  const candidates = text.match(/\b[A-Za-z0-9]{2,}(?:-[A-Za-z0-9]{2,})+\b/g) || [];

  const matchedKnown = candidates.find((candidate) => knownIds.has(String(candidate || "").toLowerCase()));
  if (matchedKnown) return matchedKnown.toUpperCase();

  return candidates[0] ? candidates[0].toUpperCase() : "";
}

function findProductFromText(input, catalog = []) {
  const text = String(input || "").trim().toLowerCase();
  if (!text) return null;

  const byBatch = catalog.find((item) => String(item.batchId || "").trim().toLowerCase() === text);
  if (byBatch) return byBatch;

  const byBatchMention = catalog.find((item) => text.includes(String(item.batchId || "").trim().toLowerCase()));
  if (byBatchMention) return byBatchMention;

  const byNameExact = catalog.find((item) => String(item.productName || "").trim().toLowerCase() === text);
  if (byNameExact) return byNameExact;

  const byNameMention = catalog.find((item) => text.includes(String(item.productName || "").trim().toLowerCase()));
  if (byNameMention) return byNameMention;

  // Supports short names like "qq" and "pp" used in custom products.
  const tokens = text.split(/\s+/).filter(Boolean);
  return catalog.find((item) => {
    const name = String(item.productName || "").trim().toLowerCase();
    return tokens.some((token) => token.length >= 2 && name === token);
  }) || null;
}

function summarizeGlobalAnalytics() {
  const analytics = analyzeAllProducts();
  const highestRisk = analytics.anomalyList[0];

  return [
    `Platform summary: ${analytics.totalProducts} products, ${analytics.totalScans} scans, ${analytics.totalAnomalies} detected anomalies, and global trust score ${analytics.globalTrustScore}.`,
    highestRisk
      ? `Top regulator signal: ${highestRisk.batchId} (${highestRisk.productName}) is marked ${highestRisk.threatLevel} because ${highestRisk.description}.`
      : "No active anomaly alerts are present in the current dataset.",
  ].join(" ");
}

function summarizeGlobalAnalyticsBrief() {
  const analytics = analyzeAllProducts();
  return `Right now the platform is tracking ${analytics.totalProducts} products with ${analytics.totalAnomalies} active anomaly signals and a global trust score of ${analytics.globalTrustScore}.`;
}

function summarizeQrGuide() {
  const context = buildPlatformChatContext();
  return [
    "QR flow in True Trace:",
    ...context.qrWorkflow.createQr.map((step, index) => `${index + 1}. ${step}`),
    "Verification flow:",
    ...context.qrWorkflow.verifyQr.map((step, index) => `${index + 1}. ${step}`),
  ].join(" ");
}

function summarizeLatestProducts(limit = 5) {
  const context = buildPlatformChatContext();
  const latest = context.products.slice(0, limit);
  if (latest.length === 0) {
    return "No product data is available in the current platform context.";
  }

  const lines = latest.map((product) => `${product.batchId} (${product.productName}) - ${product.status}, trust ${product.trustScore}, threat ${product.threatLevel}`);
  return `Latest tracked products: ${lines.join("; ")}.`;
}

function summarizeProduct(batchId) {
  try {
    const result = analyzeProduct(batchId);
    const anomalyText = result.anomalies.length
      ? result.anomalies.map((item) => `${item.type} (${item.risk})`).join(", ")
      : "no anomalies";

    return `${result.productName} (${result.batchId}) has threat level ${result.threatLevel}, trust score ${result.trustScore}, ${result.scans.length} scans, ${result.transfers.length} transfers, and ${anomalyText}.`;
  } catch {
    return `I could not find batch ${batchId} in the current dataset.`;
  }
}

function summarizeProductByInput(input, catalog) {
  const product = findProductFromText(input, catalog);
  if (!product?.batchId) {
    return "I could not find that product in current True Trace data. Share exact batch ID or product name.";
  }
  return summarizeProduct(product.batchId);
}

function resolveCurrentPage(pathname = "") {
  const path = String(pathname || "").toLowerCase();
  if (path.startsWith("/dashboard/manufacturer")) return "Manufacturer Dashboard";
  if (path.startsWith("/dashboard/distributor")) return "Distributor Dashboard";
  if (path.startsWith("/dashboard/retailer")) return "Retailer Dashboard";
  if (path.startsWith("/dashboard/consumer")) return "Consumer Dashboard";
  if (path.startsWith("/dashboard/regulator")) return "Regulator Dashboard";
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/analytics")) return "Platform Analytics";
  if (path.startsWith("/register-batch")) return "Register Batch";
  if (path.startsWith("/docs")) return "Docs";
  if (path.startsWith("/verify/")) return "Verify Page";
  if (path === "/") return "Landing Page";
  return "Unknown Page";
}

function summarizeCurrentPage(pathname = "") {
  const page = resolveCurrentPage(pathname);

  if (page === "Platform Analytics") {
    return `You are on ${page}. ${summarizeGlobalAnalyticsBrief()}`;
  }

  if (page.endsWith("Dashboard")) {
    return `You are on ${page}. You can review batches, trust scores, anomalies, and role-specific actions from current platform data.`;
  }

  if (page === "Register Batch") {
    return "You are on Register Batch. Create a new on-chain batch, then QR gets generated for download after transaction success.";
  }

  if (page === "Verify Page") {
    return "You are on Verify Page. This flow resolves batch ID from QR/URL and verifies product data on-chain.";
  }

  return `You are on ${page}.`;
}

function explainWalletConnect() {
  return "To connect wallet: open a protected page like Dashboard/Register Batch, click Connect Wallet, choose MetaMask, approve account access, then confirm the network/account prompt. If popup does not appear, open MetaMask extension and retry.";
}

function explainRules() {
  return "True Trace flags four main issues: location jumps across cities in a short time, scan floods in a tight window, unauthorized scans before distributor receipt, and scans after recall. Threat levels are mapped from those anomaly results into LOW, MEDIUM, HIGH, or CRITICAL.";
}

function summarizeLanding() {
  const catalog = getUnifiedProductCatalog();
  const hasRealData = catalog.some((item) => item.dataSource !== "demo");
  return `True Trace is a supply-chain traceability platform with ${catalog.length} total products (${hasRealData ? "demo + real blockchain" : "demo"} data). You can inspect product intelligence, scan activity, trust scores, anomaly detection, and regulator actions across the dashboards and analytics pages.`;
}

function generalHelp() {
  return "I can help with platform analytics, product batches, anomaly logic, trust scores, recalls, regulator actions, and QR workflow. I answer only from current True Trace platform data.";
}

function wantsDetailedAnswer(lower) {
  return ["detail", "detailed", "explain", "full", "deep", "why", "breakdown", "summarize", "summarise", "summary"].some((term) => lower.includes(term));
}

export function buildFallbackChatReply(userInput, pathname = "") {
  const text = String(userInput || "").trim();
  const lower = text.toLowerCase();
  const catalog = getUnifiedProductCatalog();
  const batchId = extractBatchId(text, catalog);
  const productMention = findProductFromText(text, catalog);
  const detailed = wantsDetailedAnswer(lower);

  if (lower.includes("current") && (lower.includes("dashboard") || lower.includes("page") || lower.includes("screen"))) {
    return summarizeCurrentPage(pathname);
  }

  if (lower.includes("summary") && (lower.includes("this page") || lower.includes("current page") || lower.includes("page"))) {
    return summarizeCurrentPage(pathname);
  }

  if (lower.includes("wallet") || lower.includes("wallat") || lower.includes("metamask") || lower.includes("connect wallet")) {
    return explainWalletConnect();
  }

  if (productMention && !batchId) {
    return summarizeProductByInput(text, catalog);
  }

  if (batchId) {
    return detailed
      ? `${summarizeProduct(batchId)} If you want, I can also explain the anomaly reason or threat logic for this batch.`
      : `I found ${batchId}. Ask me to explain or summarize it if you want the full product analysis.`;
  }

  if (lower.includes("analytics") || lower.includes("summary") || lower.includes("summarise") || lower.includes("summarize")) {
    return pathname.includes("analytics") || detailed ? summarizeGlobalAnalytics() : summarizeGlobalAnalyticsBrief();
  }

  if (lower.includes("threat") || lower.includes("anomaly") || lower.includes("risk")) {
    return detailed ? `${explainRules()} ${summarizeGlobalAnalytics()}` : "I can explain the anomaly and threat logic. Ask me something like 'explain anomaly rules' or 'show threat summary'.";
  }

  if (lower.includes("product") || lower.includes("batch") || lower.includes("trust")) {
    if (lower.includes("new") || lower.includes("latest") || lower.includes("recent")) {
      return summarizeLatestProducts(6);
    }

    const examples = catalog.slice(0, 4).map((item) => item.batchId).join(", ");
    return detailed
      ? `You can ask for a specific batch like ${examples || "MED-001"}. ${summarizeGlobalAnalytics()}`
      : `You can ask me about any specific batch like ${examples || "MED-001"}.`;
  }

  if (lower.includes("qr") || lower.includes("scan") || lower.includes("verify")) {
    return detailed ? summarizeQrGuide() : "I can guide you on QR creation and verification flow. Ask 'explain QR flow' for step-by-step details.";
  }

  if (pathname.includes("analytics") && !detailed) {
    return `${summarizeGlobalAnalyticsBrief()} Ask if you want a detailed analytics breakdown.`;
  }

  return `${generalHelp()} ${pathname === "/" ? summarizeLanding() : ""}`.trim();
}

export default buildFallbackChatReply;
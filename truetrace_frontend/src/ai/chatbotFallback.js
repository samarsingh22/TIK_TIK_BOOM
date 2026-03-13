import demoDataset from "./demoDataset";
import { analyzeAllProducts } from "./globalAnalytics";
import { analyzeProduct } from "./analyzeProduct";

function extractBatchId(input) {
  const match = String(input || "").match(/[A-Za-z]{3}-\d{3}/);
  return match ? match[0].toUpperCase() : "";
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

function explainRules() {
  return "True Trace flags four main issues: location jumps across cities in a short time, scan floods in a tight window, unauthorized scans before distributor receipt, and scans after recall. Threat levels are mapped from those anomaly results into LOW, MEDIUM, HIGH, or CRITICAL.";
}

function summarizeLanding() {
  return `True Trace is a supply-chain traceability platform with ${demoDataset.length} demo products. You can inspect product intelligence, scan activity, trust scores, anomaly detection, and regulator actions across the dashboards and analytics pages.`;
}

function generalHelp() {
  return "I can help with platform analytics, product batches, anomaly logic, trust scores, recalls, and regulator actions. Ask generally, or name a batch ID if you want a specific product summary.";
}

function wantsDetailedAnswer(lower) {
  return ["detail", "detailed", "explain", "full", "deep", "why", "breakdown", "summarize", "summarise", "summary"].some((term) => lower.includes(term));
}

export function buildFallbackChatReply(userInput, pathname = "") {
  const text = String(userInput || "").trim();
  const lower = text.toLowerCase();
  const batchId = extractBatchId(text);
  const detailed = wantsDetailedAnswer(lower);

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
    return detailed
      ? `You can ask for a specific batch like MED-001, MED-002, or MED-003. ${summarizeGlobalAnalytics()}`
      : "You can ask me about any specific batch like MED-001, MED-002, or MED-003.";
  }

  if (pathname.includes("analytics") && !detailed) {
    return `${summarizeGlobalAnalyticsBrief()} Ask if you want a detailed analytics breakdown.`;
  }

  return `${generalHelp()} ${pathname === "/" ? summarizeLanding() : ""}`.trim();
}

export default buildFallbackChatReply;
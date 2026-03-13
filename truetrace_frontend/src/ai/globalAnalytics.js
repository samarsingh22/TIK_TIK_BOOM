import demoDataset from "./demoDataset";
import { analyzeProduct } from "./analyzeProduct";

function roundToTwoDecimals(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function buildRegulatorAnomalyList(productAnalyses) {
  return productAnalyses.flatMap((analysis) => {
    const anomalies = Array.isArray(analysis.anomalies) ? analysis.anomalies : [];

    return anomalies.map((anomaly) => ({
      batchId: analysis.batchId,
      productName: analysis.productName,
      threatLevel: analysis.threatLevel,
      type: anomaly.type,
      risk: anomaly.risk,
      description: anomaly.description,
    }));
  });
}

export function analyzeAllProducts() {
  const productAnalyses = demoDataset.map((product) => analyzeProduct(product.batchId));

  const totalProducts = productAnalyses.length;
  const totalScans = productAnalyses.reduce((sum, product) => sum + (Array.isArray(product.scans) ? product.scans.length : 0), 0);
  const totalAnomalies = productAnalyses.reduce(
    (sum, product) => sum + (Array.isArray(product.anomalies) ? product.anomalies.length : 0),
    0,
  );

  const trustScoreSum = productAnalyses.reduce((sum, product) => sum + Number(product.trustScore || 0), 0);
  const globalTrustScore = totalProducts > 0 ? roundToTwoDecimals(trustScoreSum / totalProducts) : 0;

  return {
    totalProducts,
    totalScans,
    totalAnomalies,
    globalTrustScore,
    anomalyList: buildRegulatorAnomalyList(productAnalyses),
  };
}

export default analyzeAllProducts;
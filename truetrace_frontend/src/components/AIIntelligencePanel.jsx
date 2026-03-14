import { useEffect, useMemo, useState } from "react";
import { analyzeProduct } from "../ai/analyzeProduct";
import { analyzeAllProducts } from "../ai/globalAnalytics";
import { getUnifiedProductCatalog, getUnifiedProductByBatchId } from "../ai/productCatalog";

const OVERALL_VIEW = "overall";
const PRODUCT_VIEW = "product";

function formatTimestamp(value) {
  const time = Number(value || 0);
  if (!time) return "N/A";
  return new Date(time).toLocaleString();
}

export default function AIIntelligencePanel() {
  const [viewMode, setViewMode] = useState(OVERALL_VIEW);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const productCatalog = useMemo(() => getUnifiedProductCatalog(), [refreshKey]);

  const overallResult = useMemo(() => analyzeAllProducts(), [refreshKey]);
  const productResult = useMemo(() => {
    if (!selectedBatchId) return null;
    return analyzeProduct(selectedBatchId);
  }, [selectedBatchId, refreshKey]);

  const selectedProduct = useMemo(
    () => getUnifiedProductByBatchId(selectedBatchId),
    [selectedBatchId, refreshKey],
  );

  return (
    <section className="ai-intelligence-panel">
      <div className="ai-intelligence-head">
        <h3>AI Intelligence Panel</h3>
        <div className="ai-intelligence-toggle" role="tablist" aria-label="Intelligence mode toggle">
          <button
            type="button"
            className={viewMode === OVERALL_VIEW ? "active" : ""}
            onClick={() => setViewMode(OVERALL_VIEW)}
          >
            Overall Intelligence
          </button>
          <button
            type="button"
            className={viewMode === PRODUCT_VIEW ? "active" : ""}
            onClick={() => setViewMode(PRODUCT_VIEW)}
          >
            Product Intelligence
          </button>
        </div>
      </div>

      {viewMode === OVERALL_VIEW && (
        <div className="ai-overall-view">
          <div className="ai-metric-grid">
            <div className="ai-metric-card">
              <div className="label">Total Products</div>
              <div className="value">{overallResult.totalProducts}</div>
            </div>
            <div className="ai-metric-card">
              <div className="label">Total Scans</div>
              <div className="value">{overallResult.totalScans}</div>
            </div>
            <div className="ai-metric-card danger">
              <div className="label">Suspicious Events</div>
              <div className="value">{overallResult.totalAnomalies}</div>
            </div>
            <div className="ai-metric-card">
              <div className="label">Global Trust Score</div>
              <div className="value">{overallResult.globalTrustScore}</div>
            </div>
          </div>
        </div>
      )}

      {viewMode === PRODUCT_VIEW && (
        <div className="ai-product-view">
          <div className="ai-product-select-row">
            <label htmlFor="ai-product-selector">Select Product</label>
            <select id="ai-product-selector" value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)}>
              <option value="">Select Product</option>
              {productCatalog.map((product) => (
                <option key={product.batchId} value={product.batchId}>
                  {product.batchId}
                </option>
              ))}
            </select>
          </div>

          {!selectedBatchId && <p className="muted">Choose a batch ID to run product intelligence analysis.</p>}

          {productResult && selectedProduct && (
            <>
              <div className="ai-product-meta-grid">
                <div className="meta-item">
                  <div className="label">Product Name</div>
                  <div className="value">{productResult.productName}</div>
                </div>
                <div className="meta-item">
                  <div className="label">Batch ID</div>
                  <div className="value">{productResult.batchId}</div>
                </div>
                <div className="meta-item">
                  <div className="label">Manufacturer</div>
                  <div className="value wrap-text" title={selectedProduct.manufacturer || "Unknown"}>
                    {selectedProduct.manufacturer || "Unknown"}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="label">Trust Score</div>
                  <div className="value">{productResult.trustScore}</div>
                </div>
                <div className="meta-item full-width">
                  <div className="label">Threat Level</div>
                  <div className="value">{productResult.threatLevel}</div>
                </div>
              </div>

              <div className="ai-detail-sections">
                <div className="ai-detail-card">
                  <h4>AI Anomaly Results</h4>
                  {productResult.anomalies.length === 0 && <p className="muted">No anomalies detected.</p>}
                  {productResult.anomalies.map((anomaly, index) => (
                    <div className="ai-list-item" key={`${anomaly.type}-${index}`}>
                      <div>{anomaly.type}</div>
                      <div>{anomaly.risk}</div>
                      <div>{anomaly.description}</div>
                    </div>
                  ))}
                </div>

                <div className="ai-detail-card">
                  <h4>Scan History</h4>
                  {productResult.scans.length === 0 && <p className="muted">No scan history available.</p>}
                  {productResult.scans.map((scan, index) => (
                    <div className="ai-list-item" key={`${scan.timestamp}-${index}`}>
                      <div>{scan.location || "Unknown"}</div>
                      <div>{scan.role || "Unknown"}</div>
                      <div>{formatTimestamp(scan.timestamp)}</div>
                    </div>
                  ))}
                </div>

                <div className="ai-detail-card">
                  <h4>Supply Chain Transfers</h4>
                  {productResult.transfers.length === 0 && <p className="muted">No transfer history available.</p>}
                  {productResult.transfers.map((transfer, index) => (
                    <div className="ai-list-item" key={`${transfer.timestamp}-${index}`}>
                      <div>
                        {transfer.from} to {transfer.to}
                      </div>
                      <div>{transfer.location || "Unknown"}</div>
                      <div>{transfer.timestamp || "N/A"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
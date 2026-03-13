import { useMemo, useState } from "react";
import DashboardPage from "../features/dashboard/DashboardPage";
import { ROLES } from "../config/sentinelChain";
import demoDataset, { getProductByBatchId, updateProductStatus } from "../ai/demoDataset";
import { analyzeProduct } from "../ai/analyzeProduct";
import AIThreatCard from "../components/AIThreatCard";

function RegulatorThreatControls() {
  const [selectedBatchId, setSelectedBatchId] = useState(demoDataset[0]?.batchId || "");
  const [statusMessage, setStatusMessage] = useState("");

  const analysis = useMemo(() => {
    if (!selectedBatchId) return null;
    return analyzeProduct(selectedBatchId);
  }, [selectedBatchId]);

  const selectedProduct = useMemo(() => getProductByBatchId(selectedBatchId), [selectedBatchId, statusMessage]);
  const riskyThreat = analysis && ["HIGH", "CRITICAL"].includes(String(analysis.threatLevel || "").toUpperCase());
  const topAnomaly = analysis?.anomalies?.[0] || null;
  const latestScan = analysis?.scans?.[analysis.scans.length - 1] || null;

  const runAction = (actionType) => {
    if (!selectedBatchId) return;

    const actionPatches = {
      recall: {
        recalled: true,
        recallDate: new Date().toISOString(),
        regulatorAction: "Recall Product",
        productStatus: "RECALLED",
      },
      block: {
        distributionBlocked: true,
        regulatorAction: "Block Distribution",
        productStatus: "BLOCKED",
      },
      flag: {
        counterfeitFlagged: true,
        regulatorAction: "Flag Counterfeit",
        productStatus: "FLAGGED_COUNTERFEIT",
      },
    };

    const patch = actionPatches[actionType];
    if (!patch) return;

    const updated = updateProductStatus(selectedBatchId, patch);
    if (updated) {
      setStatusMessage(`${updated.batchId} updated: ${updated.regulatorAction}.`);
    }
  };

  return (
    <section className="regulator-threat-controls">
      <div className="regulator-controls-header">
        <h3>Regulator AI Threat Controls</h3>
        <select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)}>
          {demoDataset.map((product) => (
            <option key={product.batchId} value={product.batchId}>
              {product.batchId}
            </option>
          ))}
        </select>
      </div>

      {analysis && (
        <AIThreatCard
          batchId={analysis.batchId}
          threatLevel={analysis.threatLevel}
          reason={topAnomaly?.description || "No anomaly detected"}
          location={latestScan?.location || "Unknown"}
          timestamp={latestScan?.timestamp || Date.now()}
        />
      )}

      {selectedProduct && (
        <div className="regulator-status-strip">
          <span>Current Product Status: {selectedProduct.productStatus || "ACTIVE"}</span>
          <span>Recalled: {selectedProduct.recalled ? "Yes" : "No"}</span>
          <span>Distribution Blocked: {selectedProduct.distributionBlocked ? "Yes" : "No"}</span>
          <span>Counterfeit Flagged: {selectedProduct.counterfeitFlagged ? "Yes" : "No"}</span>
        </div>
      )}

      {riskyThreat && (
        <div className="regulator-action-buttons">
          <button type="button" className="btn-secondary" onClick={() => runAction("recall")}>
            Recall Product
          </button>
          <button type="button" className="btn-secondary" onClick={() => runAction("block")}>
            Block Distribution
          </button>
          <button type="button" className="btn-secondary" onClick={() => runAction("flag")}>
            Flag Counterfeit
          </button>
        </div>
      )}

      {!riskyThreat && analysis && <p className="muted">Threat level is below HIGH. Control actions stay disabled.</p>}
      {statusMessage && <p className="regulator-status-message">{statusMessage}</p>}
    </section>
  );
}

export default function RegulatorDashboard() {
  return <DashboardPage initialRole={ROLES.REGULATOR} lockRole bottomContent={<RegulatorThreatControls />} />;
}

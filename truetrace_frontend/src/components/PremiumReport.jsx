import React from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  MapPin,
  BarChart3,
  Package,
  Truck,
  Store,
  Factory,
} from "lucide-react";

/**
 * PremiumReport — renders advanced authenticity + risk analysis data.
 *
 * Props:
 *   report       — premium authenticity data object
 *   riskData     — optional counterfeit risk analysis data
 *   productName  — for display
 */
export default function PremiumReport({ report, riskData, productName }) {
  if (!report) return null;

  const scoreColor =
    report.authenticityScore >= 80
      ? "#16a34a"
      : report.authenticityScore >= 50
      ? "#ca8a04"
      : "#dc2626";

  const riskBadgeClass =
    report.fraudRisk === "Low"
      ? "safe"
      : report.fraudRisk === "Medium"
      ? "medium"
      : "high";

  const supplyIcons = {
    Manufacturer: Factory,
    Distributor: Truck,
    Retailer: Store,
  };

  return (
    <div className="premium-report">
      {/* ---- Header ---- */}
      <div className="premium-report-header">
        <Shield size={22} style={{ color: scoreColor }} />
        <h3>Advanced Authenticity Report</h3>
        <span className={`badge ${riskBadgeClass}`}>
          {report.fraudRisk} Risk
        </span>
      </div>

      {/* ---- Score + Quick Stats ---- */}
      <div className="premium-stats-row">
        <div className="premium-score-card">
          <svg viewBox="0 0 120 120" className="score-ring">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={`${(report.authenticityScore / 100) * 327} 327`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          </svg>
          <div className="score-ring-label">
            <span className="score-ring-number" style={{ color: scoreColor }}>
              {report.authenticityScore}
            </span>
            <span className="score-ring-text">Score</span>
          </div>
        </div>

        <div className="premium-quick-stats">
          <div className="premium-stat-item">
            <BarChart3 size={16} />
            <div>
              <span className="label">Total Scans</span>
              <span className="value">{report.scanCount}</span>
            </div>
          </div>
          <div className="premium-stat-item">
            <TrendingUp size={16} />
            <div>
              <span className="label">Fraud Risk</span>
              <span className="value">{report.fraudRisk}</span>
            </div>
          </div>
          <div className="premium-stat-item">
            <Package size={16} />
            <div>
              <span className="label">Product ID</span>
              <span className="value">{report.productId}</span>
            </div>
          </div>
          {productName && (
            <div className="premium-stat-item">
              <Store size={16} />
              <div>
                <span className="label">Product</span>
                <span className="value">{productName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Supply Chain Timeline ---- */}
      <div className="premium-section-block">
        <h4>Supply Chain Verification</h4>
        <div className="supply-chain-timeline">
          {report.supplyChain.map((step, i) => {
            const Icon = supplyIcons[step] || Package;
            return (
              <div className="timeline-step" key={i}>
                <div className="timeline-dot">
                  <Icon size={16} />
                </div>
                <div className="timeline-label">{step}</div>
                {i < report.supplyChain.length - 1 && (
                  <div className="timeline-line" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Distributor Verification ---- */}
      {report.distributorVerification && (
        <div className="premium-section-block">
          <h4>Distributor Verification</h4>
          <div className="premium-detail-grid">
            {report.distributorVerification.map((d, i) => (
              <div className="premium-detail-item" key={i}>
                <span className="label">{d.name}</span>
                <span className={`badge ${d.verified ? "safe" : "recalled"}`}>
                  {d.verified ? "Verified" : "Unverified"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Fraud Detection Signals ---- */}
      {report.fraudSignals && (
        <div className="premium-section-block">
          <h4>Fraud Detection Signals</h4>
          <div className="premium-detail-grid">
            {report.fraudSignals.map((sig, i) => (
              <div className="premium-detail-item" key={i}>
                {sig.flagged ? (
                  <AlertTriangle size={14} style={{ color: "#dc2626" }} />
                ) : (
                  <CheckCircle size={14} style={{ color: "#16a34a" }} />
                )}
                <span className="label">{sig.signal}</span>
                <span className="value">{sig.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Risk Analysis (optional, from separate endpoint) ---- */}
      {riskData && (
        <div className="premium-section-block risk-section">
          <h4>
            <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Counterfeit Risk Analysis
          </h4>
          <div className="premium-detail-grid">
            <div className="premium-detail-item">
              <span className="label">Risk Score</span>
              <span
                className="value"
                style={{
                  color: riskData.riskScore > 0.6 ? "#dc2626" : riskData.riskScore > 0.3 ? "#ca8a04" : "#16a34a",
                  fontWeight: 700,
                }}
              >
                {(riskData.riskScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="premium-detail-item">
              <span className="label">Suspicious Activity</span>
              <span className={`badge ${riskData.suspiciousActivity ? "recalled" : "safe"}`}>
                {riskData.suspiciousActivity ? "Detected" : "None"}
              </span>
            </div>
            {riskData.reason && (
              <div className="premium-detail-item" style={{ gridColumn: "1 / -1" }}>
                <MapPin size={14} style={{ color: "#ca8a04" }} />
                <span className="label">Reason</span>
                <span className="value">{riskData.reason}</span>
              </div>
            )}
            {riskData.duplicateScans !== undefined && (
              <div className="premium-detail-item">
                <span className="label">Duplicate Scans</span>
                <span className="value">{riskData.duplicateScans}</span>
              </div>
            )}
            {riskData.suspiciousLocations !== undefined && (
              <div className="premium-detail-item">
                <span className="label">Suspicious Locations</span>
                <span className="value">{riskData.suspiciousLocations}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

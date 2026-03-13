const THREAT_BADGE_CLASS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

function normalizeThreatLevel(value) {
  const level = String(value || "LOW").trim().toUpperCase();
  return THREAT_BADGE_CLASS[level] ? level : "LOW";
}

function toDisplayTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toLocaleString();
  }

  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : String(value || "N/A");
}

export default function AIThreatCard({ batchId, threatLevel, reason, location, timestamp }) {
  const normalizedLevel = normalizeThreatLevel(threatLevel);
  const badgeClass = THREAT_BADGE_CLASS[normalizedLevel];

  return (
    <article className="ai-threat-card">
      <header className="ai-threat-card-top">
        <h4>AI Threat Snapshot</h4>
        <span className={`threat-badge ${badgeClass}`}>{normalizedLevel}</span>
      </header>

      <div className="ai-threat-grid">
        <div className="ai-threat-row">
          <span className="label">Batch ID</span>
          <span className="value">{batchId || "N/A"}</span>
        </div>
        <div className="ai-threat-row">
          <span className="label">Threat Level</span>
          <span className="value">{normalizedLevel}</span>
        </div>
        <div className="ai-threat-row">
          <span className="label">Reason</span>
          <span className="value">{reason || "No anomaly detected"}</span>
        </div>
        <div className="ai-threat-row">
          <span className="label">Location</span>
          <span className="value">{location || "Unknown"}</span>
        </div>
        <div className="ai-threat-row">
          <span className="label">Timestamp</span>
          <span className="value">{toDisplayTimestamp(timestamp)}</span>
        </div>
      </div>
    </article>
  );
}
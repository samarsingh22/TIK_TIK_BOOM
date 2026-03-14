import { CheckCircle2, Circle } from "lucide-react";

function formatTimelineTime(value) {
  const ts = Number(value || 0);
  if (!ts) return "N/A";
  return new Date(ts).toLocaleString();
}

export default function SupplyChainTimeline({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="dpp-empty">No supply chain movement available yet.</p>;
  }

  return (
    <div className="supply-chain-timeline">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const completed = Boolean(item.completed);

        return (
          <div key={`${item.role}-${index}`} className="timeline-row">
            <div className="timeline-rail">
              <div className={`timeline-node ${completed ? "completed" : "pending"}`}>
                {completed ? <CheckCircle2 size={16} /> : <Circle size={14} />}
              </div>
              {!isLast && <div className={`timeline-line ${completed ? "completed" : "pending"}`} />}
            </div>

            <div className="timeline-card">
              <div className="timeline-role">{item.role}</div>
              <div className="timeline-wallet">Wallet: {item.wallet || "Unknown"}</div>
              <div className="timeline-time">Transfer Time: {formatTimelineTime(item.timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { CheckCircle2, Circle, Clock } from "lucide-react";

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
        const isCompleted = Boolean(item.completed);
        const isCurrent = Boolean(item.current);
        const isPending = !isCompleted && !isCurrent;

        const nodeClass = isCompleted ? "completed" : isCurrent ? "current" : "pending";
        const lineClass = isCompleted ? "completed" : "pending";

        return (
          <div key={`${item.role}-${index}`} className={`timeline-row${isCurrent ? " timeline-row--current" : ""}`}>
            <div className="timeline-rail">
              <div className={`timeline-node ${nodeClass}`}>
                {isCompleted ? <CheckCircle2 size={16} /> : isCurrent ? <Clock size={14} /> : <Circle size={14} />}
              </div>
              {!isLast && <div className={`timeline-line ${lineClass}`} />}
            </div>

            <div className={`timeline-card${isCurrent ? " timeline-card--current" : ""}${isPending ? " timeline-card--pending" : ""}`}>
              <div className="timeline-role">
                {item.role}
                {isCurrent && <span className="timeline-current-badge">Current</span>}
              </div>
              <div className="timeline-wallet">
                Wallet: {isPending ? "Pending" : (item.wallet || "Unknown")}
              </div>
              <div className="timeline-time">
                Transfer Time: {isPending ? "N/A" : formatTimelineTime(item.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

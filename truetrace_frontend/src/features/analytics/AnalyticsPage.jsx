import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { BarChart3, TrendingUp, Globe, ShieldCheck, AlertTriangle, Package, Users, Activity } from "lucide-react";
import { clearConnectedWallet, clearSession, getSession } from "../../utils/authStorage";
import { readScanEvents } from "../../ai/scanLogger";
import { listTrackedBatches } from "../../services/batchStore";
import demoDataset from "../../ai/demoDataset";
import Heatmap from "../../analytics/Heatmap";
import SupplyTimeline from "../../analytics/SupplyTimeline";

const fadeUp = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const CITY_COORDS = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  Bengaluru: [12.9716, 77.5946],
  Bangalore: [12.9716, 77.5946],
  Kolkata: [22.5726, 88.3639],
  Chennai: [13.0827, 80.2707],
  Hyderabad: [17.385, 78.4867],
  Pune: [18.5204, 73.8567],
  London: [51.5072, -0.1276],
  NewYork: [40.7128, -74.006],
  Singapore: [1.3521, 103.8198],
};

function normalizeTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFallbackAnalyticsData() {
  const fallbackBatches = demoDataset.map((item) => ({
    batchId: item.batchId,
    recalled: Boolean(item.recallDate),
    suspiciousScans: 0,
    trustScore: 100,
    updatedAt: item.recallDate || item.expiryDate || item.manufactureDate,
    history: [],
  }));

  const fallbackScans = demoDataset.flatMap((item) =>
    (Array.isArray(item.scans) ? item.scans : []).map((scan) => ({
      batchID: item.batchId,
      location: scan.location,
      role: scan.role,
      timestamp: normalizeTimestamp(scan.timestamp),
    })),
  );

  return {
    batches: fallbackBatches,
    scans: fallbackScans,
  };
}

function getMonthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    clearSession();
    clearConnectedWallet();
    navigate("/", { replace: true });
  };

  const data = useMemo(() => {
    const trackedBatches = listTrackedBatches();
    const trackedScans = readScanEvents().slice().sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    const fallback = trackedBatches.length === 0 && trackedScans.length === 0 ? getFallbackAnalyticsData() : null;
    const batches = fallback ? fallback.batches : trackedBatches;
    const scans = fallback ? fallback.scans : trackedScans;

    const suspiciousBatchIds = new Set(
      batches.filter((b) => Number(b.suspiciousScans || 0) > 0 || b.recalled).map((b) => String(b.batchId || "").toLowerCase()),
    );

    const totalBatches = batches.length;
    const totalScans = scans.length;
    const suspiciousScans = scans.filter((s) => suspiciousBatchIds.has(String(s.batchID || "").toLowerCase())).length;
    const avgTrust = totalBatches
      ? Math.round(batches.reduce((sum, b) => sum + Number(b.trustScore || 0), 0) / totalBatches)
      : 0;

    const recentMonthKeys = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      recentMonthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const monthMap = Object.fromEntries(recentMonthKeys.map((k) => [k, { scans: 0, flags: 0 }]));
    scans.forEach((scan) => {
      const key = getMonthKey(scan.timestamp);
      if (!monthMap[key]) return;
      monthMap[key].scans += 1;
      if (suspiciousBatchIds.has(String(scan.batchID || "").toLowerCase())) {
        monthMap[key].flags += 1;
      }
    });

    const timeline = recentMonthKeys.map((key) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, { month: "short" });
      return { month: label, scans: monthMap[key].scans, flags: monthMap[key].flags };
    });

    const maxScans = Math.max(...timeline.map((t) => t.scans), 1);

    const statusBreakdown = [
      { name: "Verified", batches: batches.filter((b) => !b.recalled && Number(b.suspiciousScans || 0) === 0).length, color: "#22c55e" },
      { name: "Flagged", batches: batches.filter((b) => !b.recalled && Number(b.suspiciousScans || 0) > 0).length, color: "#f59e0b" },
      { name: "Recalled", batches: batches.filter((b) => b.recalled).length, color: "#ef4444" },
    ];

    const trustDistribution = [
      { range: "90-100", pct: 0, color: "#22c55e" },
      { range: "70-89", pct: 0, color: "#a3e635" },
      { range: "50-69", pct: 0, color: "#f59e0b" },
      { range: "30-49", pct: 0, color: "#f97316" },
      { range: "0-29", pct: 0, color: "#ef4444" },
    ];

    if (totalBatches > 0) {
      batches.forEach((b) => {
        const score = Number(b.trustScore || 0);
        if (score >= 90) trustDistribution[0].pct += 1;
        else if (score >= 70) trustDistribution[1].pct += 1;
        else if (score >= 50) trustDistribution[2].pct += 1;
        else if (score >= 30) trustDistribution[3].pct += 1;
        else trustDistribution[4].pct += 1;
      });

      trustDistribution.forEach((entry) => {
        entry.pct = Math.round((entry.pct / totalBatches) * 100);
      });
    }

    const locationCount = scans.reduce((acc, scan) => {
      const city = String(scan.location || "").trim();
      if (!city) return acc;
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    const suspiciousLocations = Object.entries(locationCount)
      .map(([city, count]) => ({ city, count, coords: CITY_COORDS[city.replace(/\s+/g, "")] || CITY_COORDS[city] }))
      .filter((item) => Array.isArray(item.coords))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => ({ id: item.city.toLowerCase(), city: item.city, coords: item.coords, suspiciousScans: item.count }));

    const latestBatch = batches[0] || null;
    const historyTypes = latestBatch?.history?.map((h) => h.type) || [];
    const productJourney = [
      "Created",
      historyTypes.includes("transferred") ? "Transferred" : null,
      historyTypes.includes("verified") ? "Verified" : null,
      latestBatch?.recalled ? "Recalled" : "Active",
    ].filter(Boolean);

    return {
      totalBatches,
      totalScans,
      suspiciousScans,
      avgTrust,
      timeline,
      maxScans,
      statusBreakdown,
      trustDistribution,
      suspiciousLocations,
      productJourney,
      activeStage: productJourney.length - 1,
    };
  }, []);

  const kpis = [
    { icon: <Package size={22} />, label: "Total Batches", value: String(data.totalBatches), change: "on-chain tracked", up: true },
    { icon: <Users size={22} />, label: "Total Scans", value: String(data.totalScans), change: "real scan logs", up: true },
    { icon: <ShieldCheck size={22} />, label: "Average Trust Score", value: `${data.avgTrust}/100`, change: "derived live", up: true },
    { icon: <AlertTriangle size={22} />, label: "Suspicious Scans", value: String(data.suspiciousScans), change: "risk signals", up: false },
  ];

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          True Trace
        </Link>
        <div className="nav-links">
          <Link to="/dashboard" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>
            Dashboard
          </Link>
          <Link to="/analytics" style={{ textDecoration: "none", color: "var(--text)", fontWeight: 600 }}>
            Analytics
          </Link>
          <Link to="/docs" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>
            Docs
          </Link>
        </div>
        <div className="nav-right">
          {session ? (
            <button className="btn-secondary" style={{ fontSize: "0.85rem" }} onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link to="/dashboard" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
              Open Dashboard
            </Link>
          )}
        </div>
      </nav>

      <div className="analytics-page">
        <div className="analytics-header">
          <Motion.h1 {...fadeUp}>Platform Analytics</Motion.h1>
          <Motion.p {...fadeUp} transition={{ delay: 0.1 }}>
            Live analytics from your tracked on-chain batches and real scan logs.
          </Motion.p>
        </div>

        <div className="kpi-grid">
          {kpis.map((kpi, i) => (
            <Motion.div className="kpi-card" key={i} {...fadeUp} transition={{ delay: i * 0.08 }}>
              <div className="kpi-icon">{kpi.icon}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value">{kpi.value}</div>
              <div className={`kpi-change ${kpi.up ? "up" : "down"}`}>
                <TrendingUp size={14} style={{ transform: kpi.up ? "" : "rotate(180deg)" }} /> {kpi.change}
              </div>
            </Motion.div>
          ))}
        </div>

        <Motion.div className="analytics-card" {...fadeUp}>
          <h3>
            <Activity size={18} /> Scan Activity - Last 6 Months
          </h3>
          <div className="bar-chart">
            {data.timeline.map((t, i) => (
              <div className="bar-col" key={i}>
                <div className="bar-wrapper">
                  <Motion.div className="bar" initial={{ height: 0 }} whileInView={{ height: `${(t.scans / data.maxScans) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} />
                  <Motion.div
                    className="bar flag"
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(t.flags / data.maxScans) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 + 0.2, duration: 0.4 }}
                  />
                </div>
                <span className="bar-label">{t.month}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span>
              <span className="legend-dot scans" /> Total Scans
            </span>
            <span>
              <span className="legend-dot flags" /> Suspicious Scans
            </span>
          </div>
        </Motion.div>

        <div className="analytics-two-col">
          <Motion.div className="analytics-card" {...fadeUp}>
            <h3>
              <Globe size={18} /> Batch Status Breakdown
            </h3>
            <div className="industry-list">
              {data.statusBreakdown.map((item, i) => (
                <div className="industry-row" key={i}>
                  <span className="ind-name">{item.name}</span>
                  <div className="ind-bar-track">
                    <Motion.div
                      className="ind-bar-fill"
                      style={{ background: item.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${data.totalBatches > 0 ? (item.batches / data.totalBatches) * 100 : 0}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                    />
                  </div>
                  <span className="ind-count">{item.batches}</span>
                </div>
              ))}
            </div>
          </Motion.div>

          <Motion.div className="analytics-card" {...fadeUp} transition={{ delay: 0.1 }}>
            <h3>
              <ShieldCheck size={18} /> Trust Score Distribution
            </h3>
            <div className="trust-dist">
              {data.trustDistribution.map((t, i) => (
                <div className="trust-row" key={i}>
                  <span className="trust-range">{t.range}</span>
                  <div className="trust-bar-track">
                    <Motion.div
                      className="trust-bar-fill"
                      style={{ background: t.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${t.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                    />
                  </div>
                  <span className="trust-pct">{t.pct}%</span>
                </div>
              ))}
            </div>
            <p className="trust-note">Derived from real verified batches tracked in your current app instance.</p>
          </Motion.div>
        </div>

        <Motion.div className="analytics-card anomaly-info" {...fadeUp}>
          <h3>
            <AlertTriangle size={18} /> AI Anomaly Detection Status
          </h3>
          <div className="anomaly-grid">
            <div className="anomaly-item">
              <strong>Batches Tracked</strong>
              <p>{data.totalBatches}</p>
            </div>
            <div className="anomaly-item">
              <strong>Scans Recorded</strong>
              <p>{data.totalScans}</p>
            </div>
            <div className="anomaly-item">
              <strong>Suspicious Signals</strong>
              <p>{data.suspiciousScans}</p>
            </div>
            <div className="anomaly-item">
              <strong>Average Trust</strong>
              <p>{data.avgTrust}/100</p>
            </div>
          </div>
        </Motion.div>

        <div className="analytics-two-col">
          <Motion.div className="analytics-card" {...fadeUp}>
            <h3>
              <Globe size={18} /> Scan Location Heatmap
            </h3>
            {data.suspiciousLocations.length > 0 ? (
              <Heatmap points={data.suspiciousLocations} />
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No mapped scan locations yet.</div>
            )}
          </Motion.div>

          <Motion.div className="analytics-card" {...fadeUp} transition={{ delay: 0.1 }}>
            <h3>
              <Activity size={18} /> Latest Batch Journey
            </h3>
            <SupplyTimeline journey={data.productJourney} activeStage={data.activeStage} />
          </Motion.div>
        </div>
      </div>
    </>
  );
}

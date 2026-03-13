import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Plus, ArrowRight, Shield, Search, AlertTriangle, CheckCircle, BarChart3, PackageCheck, Truck, Warehouse, ScanSearch, ShieldAlert, Map } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadialBarChart, RadialBar } from "recharts";
import { APP_NAME, NETWORK_NAME, ROLE_OPTIONS, ROLES } from "../../config/sentinelChain";
import { buildQrPayload } from "../../services/qrVerification";
import { useSentinelDashboard } from "../../hooks/useSentinelDashboard";
import { clearConnectedWallet, clearSession, getSessionProfile } from "../../utils/authStorage";
import QRScanner from "../../components/QRScanner";
import BatchCard from "../../components/BatchCard";
import AIIntelligencePanel from "../../components/AIIntelligencePanel";

function DashboardPage({ initialRole = ROLES.CONSUMER, lockRole = false, bottomContent = null }) {
  const navigate = useNavigate();
  const [scannedBatchData, setScannedBatchData] = useState(null);

  const {
    account,
    role,
    form,
    loading,
    errorMsg,
    successMsg,
    createTxHash,
    transferTxHash,
    recallTxHash,
    lastCreatedBatch,
    batchData,
    trackedBatches,
    recentScanEvents,
    setField,
    handleRoleChange,
    refreshRecentScanEvents,
    clearRecentScanEvents,
    connectWallet,
    createBatch,
    transferBatch,
    recallBatch,
    verifyBatch,
  } = useSentinelDashboard({ initialRole });

  const consumerBatchData = scannedBatchData || batchData;
  const suspiciousSignals = Number(consumerBatchData?.anomalyFlags?.length || 0);
  const effectiveRole = role === "Pharmacy" ? ROLES.RETAILER : role;
  const hasKnownRole = Object.values(ROLES).includes(effectiveRole);
  const session = getSessionProfile();

  const trackedBatchIds = new Set(
    [
      ...trackedBatches.map((item) => item.batchId),
      ...recentScanEvents.map((event) => event.batchID),
      lastCreatedBatch?.batchId,
      consumerBatchData?.batchId,
    ].filter(Boolean),
  );

  const totalBatches = trackedBatchIds.size;
  const totalScans = recentScanEvents.length;
  const suspiciousScans = Number(consumerBatchData?.suspiciousScans ?? suspiciousSignals ?? 0);
  const trustScore = Math.max(0, Math.min(100, Number(consumerBatchData?.trustScore ?? 100 - suspiciousScans * 8)));

  const volumeChartData = [
    { name: "Batches", value: totalBatches },
    { name: "Scans", value: totalScans },
    { name: "Suspicious", value: suspiciousScans },
  ];

  const trustChartData = [{ name: "Trust", value: trustScore, fill: trustScore >= 75 ? "#22c55e" : trustScore >= 45 ? "#f59e0b" : "#ef4444" }];
  const recalledCount = trackedBatches.filter((item) => item.recalled).length;
  const avgTrust = trackedBatches.length
    ? Math.round(trackedBatches.reduce((sum, item) => sum + Number(item.trustScore || 0), 0) / trackedBatches.length)
    : 0;
  const suspiciousBatchCount = trackedBatches.filter((item) => Number(item.suspiciousScans || 0) > 0).length;
  const topLocations = Object.entries(
    recentScanEvents.reduce((acc, event) => {
      const key = String(event.location || "Unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const handleLogout = () => {
    clearSession();
    clearConnectedWallet();
    navigate("/", { replace: true });
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          {APP_NAME}
        </Link>
        <div className="nav-links">
          <Link to="/dashboard" style={{ textDecoration: "none", color: "var(--text)", fontWeight: 600 }}>
            Dashboard
          </Link>
          <Link to="/analytics" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>
            Analytics
          </Link>
          <Link to="/docs" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>
            Docs
          </Link>
        </div>
        <div className="nav-right">
          <button className="btn-primary" onClick={connectWallet} style={{ fontSize: "0.85rem" }}>
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
          </button>
          <button className="btn-secondary" onClick={handleLogout} style={{ fontSize: "0.85rem" }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-page">
        <AnimatePresence>
          {(errorMsg || successMsg) && (
            <Motion.div className="alert-container" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {errorMsg && (
                <div className="alert-box alert-error">
                  <AlertTriangle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="alert-box alert-success">
                  <CheckCircle size={18} />
                  <span>{successMsg}</span>
                </div>
              )}
            </Motion.div>
          )}
        </AnimatePresence>

        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Manage product batches, verify authenticity, and track chain-of-custody intelligence.</p>
          {session && (
            <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span className="network-badge" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                Name: {session.name}
              </span>
              <span className="network-badge" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                Role: {session.role}
              </span>
              <span className="network-badge" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                Organization: {session.organization}
              </span>
              {session.role === ROLES.MANUFACTURER && session.manufacturerCategory && (
                <span className="network-badge" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  Category: {session.manufacturerCategory}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-toolbar">
          <div className="toolbar-left">
            <select value={role} onChange={(e) => handleRoleChange(e.target.value)} disabled={lockRole}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <div className="network-badge">
              <span className={`network-dot ${account ? "active" : ""}`}></span>
              {NETWORK_NAME} {account ? "• Connected" : "• Disconnected"}
            </div>
          </div>
        </div>

        <div className="analytics-widgets">
          <Motion.div className="metric-widget" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="metric-label">Total Batches</div>
            <div className="metric-value">{totalBatches}</div>
          </Motion.div>
          <Motion.div className="metric-widget" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
            <div className="metric-label">Total Scans</div>
            <div className="metric-value">{totalScans}</div>
          </Motion.div>
          <Motion.div className="metric-widget danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="metric-label">Suspicious Scans</div>
            <div className="metric-value">{suspiciousScans}</div>
          </Motion.div>
          <Motion.div className="metric-widget" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <div className="metric-label">Trust Score</div>
            <div className="metric-value">{trustScore}</div>
          </Motion.div>
        </div>

        <div className="analytics-charts">
          <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-top">
              <h3>Operational Metrics</h3>
              <div className="card-icon">
                <BarChart3 size={18} />
              </div>
            </div>
            <div className="chart-frame">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChartData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fill: "#6B5B69", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#6B5B69", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(56, 25, 50, 0.05)" }} />
                  <Bar dataKey="value" fill="#381932" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Motion.div>

          <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <div className="card-top">
              <h3>Trust Visualization</h3>
              <div className="card-icon">
                <Shield size={18} />
              </div>
            </div>
            <div className="chart-frame radial">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="72%" outerRadius="100%" barSize={16} data={trustChartData} startAngle={90} endAngle={-270}>
                  <RadialBar background clockWise dataKey="value" cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="radial-score">
                <div className="score-number">{trustScore}</div>
                <div className="score-label">/ 100</div>
              </div>
            </div>
          </Motion.div>
        </div>

        <div className="action-grid">
          {effectiveRole === ROLES.MANUFACTURER && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-top">
                <h3>Register Product Batch</h3>
                <div className="card-icon">
                  <Plus size={18} />
                </div>
              </div>
              <div className="form-group">
                <div className="form-row">
                  <input placeholder="Batch ID" value={form.batchId} onChange={(e) => setField("batchId", e.target.value)} />
                  <input placeholder="Product Name" value={form.productName} onChange={(e) => setField("productName", e.target.value)} />
                </div>
                <div className="form-row">
                  <input placeholder="Manufacture Date" value={form.mfgDate} onChange={(e) => setField("mfgDate", e.target.value)} />
                  <input placeholder="Expiry Date" value={form.expDate} onChange={(e) => setField("expDate", e.target.value)} />
                </div>
              </div>
              <div className="card-footer">
                <button className="card-btn" onClick={createBatch} disabled={loading}>
                  {loading ? "Submitting..." : "Commit to Chain"} <ArrowRight size={14} />
                </button>
                {createTxHash && (
                  <span className="tx-link">
                    <a href={`https://sepolia.etherscan.io/tx/${createTxHash}`} target="_blank" rel="noreferrer">
                      View Tx ↗
                    </a>
                  </span>
                )}
              </div>

              {lastCreatedBatch && (
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--bg)",
                  }}
                >
                  <QRCodeCanvas value={buildQrPayload(lastCreatedBatch)} size={80} fgColor="#000" bgColor="#fff" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>QR Tag Generated</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {lastCreatedBatch.batchId} — {lastCreatedBatch.productName}
                    </div>
                  </div>
                </div>
              )}
            </Motion.div>
          )}

          {effectiveRole === ROLES.MANUFACTURER && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="card-top">
                <h3>Product Analytics</h3>
                <div className="card-icon">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="result-grid">
                <div className="result-item">
                  <div className="label">Batches Created</div>
                  <div className="value">{totalBatches}</div>
                </div>
                <div className="result-item">
                  <div className="label">Verified Scan Rate</div>
                  <div className="value">{totalScans > 0 ? `${Math.max(0, 100 - suspiciousScans * 10).toFixed(1)}%` : "0.0%"}</div>
                </div>
                <div className="result-item">
                  <div className="label">Active Recalls</div>
                  <div className="value">{recalledCount}</div>
                </div>
                <div className="result-item">
                  <div className="label">Trust Avg</div>
                  <div className="value">{avgTrust}/100</div>
                </div>
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.DISTRIBUTOR && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-top">
                <h3>Receive Batch</h3>
                <div className="card-icon">
                  <PackageCheck size={18} />
                </div>
              </div>
              <div className="form-group">
                <input placeholder="Batch ID" value={form.transferId} onChange={(e) => setField("transferId", e.target.value)} />
              </div>
              <div className="card-footer">
                <button className="card-btn" onClick={verifyBatch} disabled={loading}>
                  {loading ? "Confirming..." : "Confirm Receipt"} <PackageCheck size={14} />
                </button>
              </div>
            </Motion.div>
          )}

          {(effectiveRole === ROLES.MANUFACTURER || effectiveRole === ROLES.DISTRIBUTOR || effectiveRole === ROLES.RETAILER) && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="card-top">
                <h3>Transfer Custody</h3>
                <div className="card-icon">
                  <ArrowRight size={18} />
                </div>
              </div>
              <div className="form-group">
                <input placeholder="Batch ID" value={form.transferId} onChange={(e) => setField("transferId", e.target.value)} />
                <input placeholder="New Owner Address" value={form.newOwner} onChange={(e) => setField("newOwner", e.target.value)} />
              </div>
              <div className="card-footer">
                <button className="card-btn" onClick={transferBatch} disabled={loading}>
                  {loading ? "Transferring..." : "Handoff"} <ArrowRight size={14} />
                </button>
                {transferTxHash && (
                  <span className="tx-link">
                    <a href={`https://sepolia.etherscan.io/tx/${transferTxHash}`} target="_blank" rel="noreferrer">
                      Tx ↗
                    </a>
                  </span>
                )}
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.DISTRIBUTOR && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="card-top">
                <h3>Shipment Tracking</h3>
                <div className="card-icon">
                  <Truck size={18} />
                </div>
              </div>
              <div className="form-group">
                {trackedBatches.length === 0 && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No shipment records yet.</div>}
                {trackedBatches.slice(0, 6).map((batch) => (
                  <div key={batch.batchId} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", padding: "4px 0" }}>
                    • {batch.batchId} {batch.owner ? `→ ${batch.owner.slice(0, 6)}...${batch.owner.slice(-4)}` : ""}
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.RETAILER && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <div className="card-top">
                <h3>Inventory List</h3>
                <div className="card-icon">
                  <Warehouse size={18} />
                </div>
              </div>
              <div className="form-group">
                {trackedBatches.length === 0 && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No inventory batches yet.</div>}
                {trackedBatches.slice(0, 8).map((item) => (
                  <div key={item.batchId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)", padding: "2px 0" }}>
                    <span>{item.batchId}</span>
                    <span>{item.recalled ? "Recalled" : Number(item.suspiciousScans || 0) > 0 ? "Flagged" : "Verified"}</span>
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.RETAILER && (
            <Motion.div className="action-card danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="card-top">
                <h3 style={{ color: "#ef4444" }}>Detect Suspicious Products</h3>
                <div className="card-icon" style={{ borderColor: "#fecaca" }}>
                  <ShieldAlert size={18} color="#ef4444" />
                </div>
              </div>
              <div className="form-group">
                <div style={{ fontSize: "0.85rem", color: "#b91c1c" }}>Flagged items in store: {suspiciousSignals}</div>
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.CONSUMER && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="card-top">
                <h3>Scan QR / Verify Authenticity</h3>
                <div className="card-icon">
                  <ScanSearch size={18} />
                </div>
              </div>

              <QRScanner
                onVerified={(result) => setScannedBatchData(result)}
                onError={() => setScannedBatchData(null)}
                onScanLogged={refreshRecentScanEvents}
              />

              <div className="form-group">
                <input placeholder="Enter Batch ID or QR JSON" value={form.verifyId} onChange={(e) => setField("verifyId", e.target.value)} />
              </div>
              <div className="card-footer">
                <button className="card-btn" onClick={verifyBatch} disabled={loading}>
                  {loading ? "Scanning..." : "Verify"} <Shield size={14} />
                </button>
              </div>

              <AnimatePresence>
                {consumerBatchData && (
                  <Motion.div className="verify-result" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }}>
                    <BatchCard batch={consumerBatchData} />
                    {consumerBatchData.anomalyFlags?.length > 0 && (
                      <div
                        style={{
                          margin: "0 16px 16px",
                          padding: "10px 12px",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          background: "#fff4f4",
                          color: "#b91c1c",
                          fontSize: "0.82rem",
                        }}
                      >
                        {consumerBatchData.anomalyFlags.join(" • ")}
                      </div>
                    )}
                    {consumerBatchData.anomalyFlags?.length > 0 && (
                      <div style={{ margin: "0 16px 0", color: "#b91c1c", fontSize: "0.82rem" }}>Counterfeit Alert: Suspicious scan pattern detected.</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderTop: "1px solid var(--border)" }}>
                      <QRCodeCanvas value={buildQrPayload(consumerBatchData)} size={80} fgColor="#000" bgColor="transparent" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Verifiable QR Tag</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Scan for details</div>
                      </div>
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </Motion.div>
          )}

          {effectiveRole === ROLES.CONSUMER && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
              <div className="card-top">
                <h3>Recent Scan Events</h3>
                <div className="card-icon">
                  <Search size={18} />
                </div>
              </div>
              <div className="form-group">
                {recentScanEvents.length === 0 && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No scans recorded yet.</div>}
                {recentScanEvents.map((event, index) => (
                  <div key={`${event.batchID}-${event.timestamp}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", padding: "6px 0", fontSize: "0.82rem" }}>
                    <div style={{ color: "var(--text)" }}>{event.batchID}</div>
                    <div style={{ color: "var(--text-secondary)" }}>{event.location}</div>
                    <div style={{ gridColumn: "span 2", color: "var(--text-secondary)" }}>{new Date(event.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.REGULATOR && (
            <Motion.div className="action-card danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="card-top">
                <h3 style={{ color: "#ef4444" }}>Emergency Recall</h3>
                <div className="card-icon" style={{ borderColor: "#fecaca" }}>
                  <AlertTriangle size={18} color="#ef4444" />
                </div>
              </div>
              <div className="form-group">
                <input placeholder="Batch ID to recall" value={form.recallId} onChange={(e) => setField("recallId", e.target.value)} />
              </div>
              <div className="card-footer">
                <button className="card-btn danger" onClick={recallBatch} disabled={loading}>
                  {loading ? "Processing..." : "Execute Recall"} <AlertTriangle size={14} />
                </button>
                {recallTxHash && (
                  <span className="tx-link">
                    <a href={`https://sepolia.etherscan.io/tx/${recallTxHash}`} target="_blank" rel="noreferrer">
                      Tx ↗
                    </a>
                  </span>
                )}
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.REGULATOR && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
              <div className="card-top">
                <h3>Global Analytics</h3>
                <div className="card-icon">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="result-grid">
                <div className="result-item">
                  <div className="label">Regions Monitored</div>
                  <div className="value">{new Set(recentScanEvents.map((event) => event.location)).size}</div>
                </div>
                <div className="result-item">
                  <div className="label">Alerts This Week</div>
                  <div className="value">{suspiciousScans}</div>
                </div>
                <div className="result-item">
                  <div className="label">Counterfeit Cases</div>
                  <div className="value">{recalledCount}</div>
                </div>
                <div className="result-item">
                  <div className="label">Open Investigations</div>
                  <div className="value">{suspiciousBatchCount}</div>
                </div>
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.REGULATOR && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }}>
              <div className="card-top">
                <h3>Counterfeit Heatmap</h3>
                <div className="card-icon">
                  <Map size={18} />
                </div>
              </div>
              <div className="form-group">
                {topLocations.length === 0 && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No location scans yet.</div>}
                {topLocations.map(([location, count]) => (
                  <div key={location} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", padding: "2px 0" }}>
                    • {location}: {count} scans
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.REGULATOR && (
            <Motion.div className="action-card danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="card-top">
                <h3 style={{ color: "#ef4444" }}>Suspicious Activity Monitoring</h3>
                <div className="card-icon" style={{ borderColor: "#fecaca" }}>
                  <ShieldAlert size={18} color="#ef4444" />
                </div>
              </div>
              <div className="form-group">
                <div style={{ fontSize: "0.85rem", color: "#b91c1c" }}>Real-time monitoring active. {suspiciousBatchCount} batches currently flagged.</div>
              </div>
            </Motion.div>
          )}

          {effectiveRole === ROLES.REGULATOR && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.43 }}>
              <div className="card-top">
                <h3>Recent Scan Events</h3>
                <div className="card-icon">
                  <Search size={18} />
                </div>
              </div>
              <div className="form-group">
                {recentScanEvents.length === 0 && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No scans recorded yet.</div>}
                {recentScanEvents.map((event, index) => (
                  <div key={`${event.batchID}-${event.timestamp}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", padding: "6px 0", fontSize: "0.82rem" }}>
                    <div style={{ color: "var(--text)" }}>{event.batchID}</div>
                    <div style={{ color: "var(--text-secondary)" }}>{event.location}</div>
                    <div style={{ gridColumn: "span 2", color: "var(--text-secondary)" }}>{new Date(event.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="card-footer">
                <button className="btn-secondary" onClick={clearRecentScanEvents}>
                  Clear Scan Logs
                </button>
              </div>
            </Motion.div>
          )}
          {!hasKnownRole && (
            <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-top">
                <h3>Role Mapping Notice</h3>
                <div className="card-icon">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="form-group">
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Role <strong>{String(role || "Unknown")}</strong> is not recognized yet. Please logout and login again,
                  or change role from the selector.
                </div>
              </div>
            </Motion.div>
          )}

        </div>

        <AIIntelligencePanel />
        {bottomContent}
      </div>
    </>
  );
}

export default DashboardPage;

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ethers } from "ethers";
import {
  Activity,
  BadgeCheck,
  CalendarClock,
  Factory,
  Fingerprint,
  Globe,
  Network,
  Package,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { motion as Motion } from "framer-motion";
import { APP_NAME, CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI } from "../config/sentinelChain";
import { detectAnomalies } from "../ai/anomalyDetection";
import { calculateTrustScore } from "../ai/trustScore";
import { getBatchScanEvents, getCurrentLocation, getDeviceFingerprint, logScanEvent } from "../ai/scanLogger";
import { listTrackedBatches, upsertTrackedBatch } from "../services/batchStore";
import SupplyChainTimeline from "../components/SupplyChainTimeline";

const NETWORK_NAME = "Sepolia";

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortenWallet(value = "") {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  if (text.length <= 16) return text;
  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

function formatDate(value) {
  const ts = toTimestamp(value);
  if (!ts) return String(value || "N/A");
  return new Date(ts).toLocaleDateString();
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (value && typeof value === "object") continue;
    if (value === true || value === false) continue;
  }
  return "";
}

function getRiskLevel({ recalled, suspiciousScans, anomalyFlags }) {
  if (recalled) return "HIGH";
  if (Number(suspiciousScans || 0) >= 3) return "HIGH";
  if ((anomalyFlags || []).length > 0) return "MEDIUM";
  return "LOW";
}

function findTrackedBatch(batchId) {
  const key = String(batchId || "").trim().toLowerCase();
  if (!key) return null;
  return listTrackedBatches().find((item) => String(item.batchId || "").trim().toLowerCase() === key) || null;
}

function buildSupplyTimeline(batchData, trackedBatch) {
  const defaultRoles = ["Manufacturer", "Distributor", "Retailer", "Consumer"];
  const history = Array.isArray(trackedBatch?.history) ? trackedBatch.history : [];
  const transferEvents = history.filter((entry) => String(entry?.type || "").toLowerCase() === "transferred");

  if (transferEvents.length === 0) {
    return defaultRoles.map((role) => ({
      role,
      wallet: role === "Consumer" ? batchData.owner : "Pending",
      timestamp: role === "Manufacturer" ? toTimestamp(batchData.mfgDate) : role === "Consumer" ? Date.now() : 0,
      completed: role === "Manufacturer" || role === "Consumer",
    }));
  }

  const items = [
    {
      role: "Manufacturer",
      wallet: transferEvents[0]?.owner || batchData.owner,
      timestamp: toTimestamp(batchData.mfgDate),
      completed: true,
    },
  ];

  transferEvents.forEach((event, index) => {
    const mappedRole = defaultRoles[index + 1] || `Checkpoint ${index + 1}`;
    items.push({
      role: mappedRole,
      wallet: event.owner || "Unknown",
      timestamp: toTimestamp(event.at || event.timestamp),
      completed: true,
    });
  });

  items.push({
    role: "Current Owner",
    wallet: batchData.owner,
    timestamp: Date.now(),
    completed: true,
  });

  return items;
}

function buildScanChartData(totalScans, suspiciousScans) {
  const safeTotal = Math.max(Number(totalScans || 0), 1);
  const safeSuspicious = Math.min(Number(suspiciousScans || 0), safeTotal);
  const safeNormal = Math.max(safeTotal - safeSuspicious, 0);

  return [
    { label: "Total", value: safeTotal, color: "#2563eb" },
    { label: "Normal", value: safeNormal, color: "#22c55e" },
    { label: "Suspicious", value: safeSuspicious, color: "#ef4444" },
  ];
}

export default function ProductVerification() {
  const { batchId } = useParams();
  const locationPath = useLocation();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [batchData, setBatchData] = useState(null);

  useEffect(() => {
    async function fetchVerification() {
      try {
        setLoading(true);
        setErrorMessage("");
        if (!batchId) {
          setErrorMessage("No Batch ID provided.");
          return;
        }

        const trackedByRouteId = findTrackedBatch(batchId);

        const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const provider = new ethers.JsonRpcProvider(isLocalhost ? "http://127.0.0.1:8545" : "https://rpc2.sepolia.org");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI, provider);

        let chainData = null;
        try {
          chainData = await Promise.race([
            contract.verifyBatch(batchId),
            new Promise((_, reject) => setTimeout(() => reject(new Error("RPC Timeout")), 12000)),
          ]);
        } catch {
          chainData = null;
        }

        if (!chainData || (!chainData[0] && !chainData.batchId)) {
          const searchParams = new URLSearchParams(locationPath.search);
          const dataParam = searchParams.get("data");

          if (!dataParam && !trackedByRouteId) {
            setErrorMessage("Product not found on blockchain for this Batch ID.");
            return;
          }

          let decoded = null;
          if (dataParam) {
            try {
              decoded = JSON.parse(dataParam);
            } catch {
              decoded = JSON.parse(decodeURIComponent(dataParam));
            }
          }

          chainData = [
            decoded?.BatchID || decoded?.batchId || trackedByRouteId?.batchId || batchId,
            pickFirstNonEmpty(decoded?.Product, decoded?.productName, decoded?.drugName, trackedByRouteId?.productName) || "Unknown",
            pickFirstNonEmpty(decoded?.Mfg, decoded?.mfgDate, decoded?.manufactureDate, trackedByRouteId?.mfgDate) || "N/A",
            pickFirstNonEmpty(decoded?.Exp, decoded?.expDate, decoded?.expiryDate, trackedByRouteId?.expDate) || "N/A",
            pickFirstNonEmpty(decoded?.Owner, decoded?.owner, trackedByRouteId?.owner) || "Unknown",
            Boolean(decoded?.Status === "Recalled" || decoded?.status === "Recalled" || trackedByRouteId?.recalled),
          ];
        }

        const resolvedBatchId = pickFirstNonEmpty(chainData?.batchId, chainData?.[0], trackedByRouteId?.batchId, batchId) || batchId;
        const resolvedDrugName = pickFirstNonEmpty(
          chainData?.drugName,
          chainData?.productName,
          chainData?.[1],
          trackedByRouteId?.productName,
        ) || "Unknown";
        const resolvedMfgDate = pickFirstNonEmpty(
          chainData?.manufactureDate,
          chainData?.mfgDate,
          chainData?.[2],
          trackedByRouteId?.mfgDate,
        ) || "N/A";
        const resolvedExpDate = pickFirstNonEmpty(
          chainData?.expiryDate,
          chainData?.expDate,
          chainData?.[3],
          trackedByRouteId?.expDate,
        ) || "N/A";
        const resolvedOwner = pickFirstNonEmpty(chainData?.owner, chainData?.[4], trackedByRouteId?.owner) || "Unknown";
        const resolvedRecalled = Boolean(
          chainData?.recalled ?? chainData?.[5] ?? trackedByRouteId?.recalled ?? false,
        );

        const normalized = {
          batchId: resolvedBatchId,
          drugName: resolvedDrugName,
          manufactureDate: resolvedMfgDate,
          expiryDate: resolvedExpDate,
          owner: resolvedOwner,
          recalled: resolvedRecalled,
        };

        const scanLocation = getCurrentLocation();
        const deviceFingerprint = getDeviceFingerprint();
        logScanEvent({
          batchID: normalized.batchId,
          timestamp: Date.now(),
          location: scanLocation,
          scannerRole: "Consumer",
          deviceFingerprint,
        });

        const batchScans = getBatchScanEvents(normalized.batchId);
        const tracked = findTrackedBatch(normalized.batchId);
        const anomalyResult = detectAnomalies(batchScans, {
          batchId: normalized.batchId,
          createdAt: normalized.manufactureDate,
          recalled: normalized.recalled,
          recallDate: tracked?.recallDate,
          transfers: tracked?.history || [],
          owner: normalized.owner,
        });
        const trust = calculateTrustScore({ ...anomalyResult, recalled: normalized.recalled });

        const scansObserved = batchScans.length;
        const enhanced = {
          ...normalized,
          trustScore: trust.trustScore,
          anomalyFlags: anomalyResult.anomalies,
          detectedAnomalies: anomalyResult.anomalies,
          suspiciousScans: anomalyResult.suspiciousScans,
          scansObserved,
          lastScanLocation: scanLocation,
          riskLevel: trust.riskLevel || anomalyResult.riskLevel || getRiskLevel({
            recalled: normalized.recalled,
            suspiciousScans: anomalyResult.suspiciousScans,
            anomalyFlags: anomalyResult.anomalies,
          }),
          deviceFingerprint,
        };

        upsertTrackedBatch(
          {
            batchId: enhanced.batchId,
            productName: enhanced.drugName,
            mfgDate: enhanced.manufactureDate,
            expDate: enhanced.expiryDate,
            owner: enhanced.owner,
            recalled: enhanced.recalled,
            trustScore: enhanced.trustScore,
            suspiciousScans: enhanced.suspiciousScans,
            scansObserved: enhanced.scansObserved,
            lastLocation: enhanced.lastScanLocation,
          },
          { eventType: "verified" },
        );

        setBatchData(enhanced);
      } catch {
        setErrorMessage("Failed to fetch product verification details.");
      } finally {
        setLoading(false);
      }
    }

    fetchVerification();
  }, [batchId, locationPath.search]);

  const trackedBatch = useMemo(() => (batchData ? findTrackedBatch(batchData.batchId) : null), [batchData]);
  const manufacturerWallet = useMemo(() => {
    const history = Array.isArray(trackedBatch?.history) ? trackedBatch.history : [];
    const createdEvent = history.find((entry) => String(entry?.type || "").toLowerCase() === "created");
    return createdEvent?.owner || trackedBatch?.owner || batchData?.owner || "Unknown";
  }, [trackedBatch, batchData]);
  const timelineItems = useMemo(() => (batchData ? buildSupplyTimeline(batchData, trackedBatch) : []), [batchData, trackedBatch]);
  const scanChartData = useMemo(
    () => buildScanChartData(batchData?.scansObserved || 0, batchData?.suspiciousScans || 0),
    [batchData],
  );
  const maxChartValue = Math.max(...scanChartData.map((item) => item.value), 1);

  const txHash = useMemo(() => {
    const history = Array.isArray(trackedBatch?.history) ? trackedBatch.history : [];
    const latestWithHash = [...history].reverse().find((entry) => String(entry?.txHash || "").trim());
    return latestWithHash?.txHash || "";
  }, [trackedBatch]);

  const etherscanLink = txHash
    ? `https://sepolia.etherscan.io/tx/${txHash}`
    : `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;

  return (
    <div className="dpp-page">
      <nav className="navbar">
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          {APP_NAME}
        </Link>
        <div className="nav-right">
          <Link to="/login" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
            Login to Dashboard
          </Link>
        </div>
      </nav>

      <main className="dpp-container">
        {loading && (
          <Motion.div className="action-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="dpp-loader">Loading blockchain product proof for {batchId}...</div>
          </Motion.div>
        )}

        {!loading && errorMessage && (
          <Motion.div className="alert-box alert-error" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <ShieldAlert size={18} />
            <span>{errorMessage}</span>
          </Motion.div>
        )}

        {!loading && batchData && (
          <>
            <Motion.section className="action-card dpp-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <div className="dpp-headline-wrap">
                <p className="dpp-kicker">Product Verification</p>
                <h1>Digital Product Passport</h1>
                <p className="dpp-subtitle">Blockchain Verified Product</p>
              </div>
              <div className="dpp-badge verified">
                <BadgeCheck size={16} />
                <span>Verified on SentinelChain Blockchain</span>
              </div>
            </Motion.section>

            <Motion.section className="action-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="card-top">
                <h3>Product Identity</h3>
                <Fingerprint size={18} />
              </div>
              <div className="dpp-identity-grid">
                <div className="dpp-field"><Package size={16} /><span className="label">Product Name</span><span className="value">{batchData.drugName}</span></div>
                <div className="dpp-field"><QrCode size={16} /><span className="label">Batch ID</span><span className="value">{batchData.batchId}</span></div>
                <div className="dpp-field"><Factory size={16} /><span className="label">Manufacturer</span><span className="value">{shortenWallet(manufacturerWallet)}</span></div>
                <div className="dpp-field"><CalendarClock size={16} /><span className="label">Manufacture Date</span><span className="value">{formatDate(batchData.manufactureDate)}</span></div>
                <div className="dpp-field"><CalendarClock size={16} /><span className="label">Expiry Date</span><span className="value">{formatDate(batchData.expiryDate)}</span></div>
                <div className="dpp-field"><Wallet size={16} /><span className="label">Current Owner</span><span className="value wrap">{batchData.owner || "Unknown"}</span></div>
              </div>
            </Motion.section>

            <Motion.section className="action-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="card-top">
                <h3>Authenticity Intelligence</h3>
                <ShieldCheck size={18} />
              </div>

              <div className="dpp-intel-grid">
                <div className="dpp-intel-item">
                  <span className="label">Authenticity Status</span>
                  <span className={`dpp-pill ${batchData.recalled ? "high" : "low"}`}>{batchData.recalled ? "RECALLED" : "VERIFIED"}</span>
                  {batchData.recalled && <span className="dpp-recall-note">Recalled this product</span>}
                </div>
                <div className="dpp-intel-item">
                  <span className="label">Trust Score</span>
                  <span className="value">{batchData.trustScore} / 100</span>
                </div>
                <div className="dpp-intel-item">
                  <span className="label">Risk Level</span>
                  <span className={`dpp-pill ${String(batchData.riskLevel).toLowerCase()}`}>{batchData.riskLevel}</span>
                </div>
              </div>
            </Motion.section>

            <Motion.section className="action-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <div className="card-top">
                <h3>AI Counterfeit Risk Analysis</h3>
                <ShieldAlert size={18} />
              </div>

              <div className="dpp-risk-grid">
                <div className="dpp-intel-item">
                  <span className="label">AI Risk Level</span>
                  <span className={`dpp-pill ${String(batchData.riskLevel || "LOW").toLowerCase()}`}>{batchData.riskLevel || "LOW"}</span>
                </div>
                <div className="dpp-intel-item">
                  <span className="label">Trust Score</span>
                  <span className="value">{batchData.trustScore} / 100</span>
                </div>
              </div>

              <div className="dpp-anomaly-list-wrap">
                <div className="dpp-anomaly-title">Detected anomalies:</div>
                {Array.isArray(batchData.detectedAnomalies) && batchData.detectedAnomalies.length > 0 ? (
                  <ul className="dpp-anomaly-list">
                    {batchData.detectedAnomalies.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="dpp-empty">No counterfeit anomalies detected for this batch.</p>
                )}
              </div>
            </Motion.section>

            <Motion.section className="action-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="card-top">
                <h3>Supply Chain Timeline</h3>
                <Activity size={18} />
              </div>
              <SupplyChainTimeline items={timelineItems} />
            </Motion.section>

            <div className="dpp-two-col">
              <Motion.section className="action-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="card-top">
                  <h3>Blockchain Proof</h3>
                  <Network size={18} />
                </div>

                <div className="dpp-proof-grid">
                  <div className="proof-item">
                    <span className="label">Smart Contract Address</span>
                    <span className="value wrap">{CONTRACT_ADDRESS}</span>
                  </div>
                  <div className="proof-item">
                    <span className="label">Transaction Hash</span>
                    <span className="value wrap">{txHash || "Not available for this scan event"}</span>
                  </div>
                  <div className="proof-item">
                    <span className="label">Network</span>
                    <span className="value">{NETWORK_NAME}</span>
                  </div>
                </div>

                <div className="card-footer">
                  <a className="btn-secondary" href={etherscanLink} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                    View on Etherscan
                  </a>
                </div>
              </Motion.section>

              <Motion.section className="action-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="card-top">
                  <h3>Scan Intelligence</h3>
                  <Globe size={18} />
                </div>

                <div className="dpp-scan-kpis">
                  <div className="scan-kpi"><span className="label">Total Scans</span><span className="value">{batchData.scansObserved}</span></div>
                  <div className="scan-kpi"><span className="label">Suspicious Scans</span><span className="value">{batchData.suspiciousScans}</span></div>
                  <div className="scan-kpi"><span className="label">Last Scan Location</span><span className="value">{batchData.lastScanLocation || "Unknown"}</span></div>
                </div>

                <div className="scan-mini-chart">
                  {scanChartData.map((bar) => (
                    <div className="scan-bar-col" key={bar.label}>
                      <div className="scan-bar-track">
                        <div
                          className="scan-bar-fill"
                          style={{
                            height: `${(bar.value / maxChartValue) * 100}%`,
                            background: bar.color,
                          }}
                        />
                      </div>
                      <div className="scan-bar-label">{bar.label}</div>
                    </div>
                  ))}
                </div>
              </Motion.section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

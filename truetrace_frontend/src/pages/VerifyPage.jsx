import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ethers } from "ethers";
import { Shield, ShieldAlert, CheckCircle, PackageSearch, AlertTriangle } from "lucide-react";
import { CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI, APP_NAME } from "../config/sentinelChain";
import { detectAnomalies } from "../ai/anomalyDetection";
import { calculateTrustScore } from "../ai/trustScore";
import { getBatchScanEvents, getCurrentLocation, logScanEvent, readScanEvents } from "../ai/scanLogger";
import { upsertTrackedBatch } from "../services/batchStore";
import BatchCard from "../components/BatchCard";
import { motion as Motion } from "framer-motion";

export default function VerifyPage() {
  const { batchId } = useParams();
  const locationPath = useLocation();
  const [loading, setLoading] = useState(true);
  const [errorMSG, setErrorMSG] = useState("");
  const [batchData, setBatchData] = useState(null);

  useEffect(() => {
    async function fetchVerification() {
      try {
        setLoading(true);
        if (!batchId) {
          setErrorMSG("No Batch ID provided.");
          return;
        }

        const searchParams = new URLSearchParams(locationPath.search);
        const dataParam = searchParams.get("data");

        let batch = null;

        // 1. Try to load from URL if available (fast, UI-first)
        if (dataParam) {
          try {
            let decoded;
            try {
              decoded = JSON.parse(dataParam);
            } catch (e) {
              const decodedStr = decodeURIComponent(dataParam);
              decoded = JSON.parse(decodedStr);
            }

            if (decoded) {
              batch = {
                batchId: decoded.BatchID || batchId,
                productName: decoded.Product || "Unknown",
                mfgDate: decoded.Mfg || "N/A",
                expDate: decoded.Exp || "N/A",
                owner: "Unknown", // Can't know current owner from just the QR
                recalled: decoded.Status === "Recalled",
              };
            }
          } catch (e) {
            console.error("Failed to parse visual QR data", e);
          }
        }

        // 2. Fetch from blockchain (this might hang if RPC is rate-limited or local)
        if (!batch) {
          const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
          const provider = new ethers.JsonRpcProvider(isLocalhost ? "http://127.0.0.1:8545" : "https://rpc2.sepolia.org");
          const contract = new ethers.Contract(CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI, provider);

          // Timeout promise in case RPC hangs
          const data = await Promise.race([
            contract.verifyBatch(batchId),
            new Promise((_, reject) => setTimeout(() => reject(new Error("RPC Timeout")), 10000))
          ]);
          
          if (!data || !data[0]) {
            setErrorMSG("Product not found on the blockchain. It may be counterfeit.");
            return;
          }

          batch = {
            batchId: data[0],
            productName: data[1],
            mfgDate: data[2],
            expDate: data[3],
            owner: data[4],
            recalled: data[5],
          };
        }

        const location = getCurrentLocation();
        logScanEvent({ batchID: batch.batchId, timestamp: Date.now(), location });

        const scanEvents = readScanEvents();
        const anomaly = detectAnomalies(scanEvents, batch.batchId, location);
        let trustScore = calculateTrustScore({
          recalled: batch.recalled,
          suspiciousScans: anomaly.suspiciousScans,
        });

        const enhancedBatch = {
          ...batch,
          location,
          trustScore,
          anomalyFlags: anomaly.flags,
          suspiciousScans: anomaly.suspiciousScans,
          scansObserved: getBatchScanEvents(batch.batchId).length,
        };

        setBatchData(enhancedBatch);

        // Store internally if possible (local storage for the user's dashboard view if they log in later)
        upsertTrackedBatch(
          {
            ...enhancedBatch,
            lastLocation: location,
          },
          { eventType: "verified" },
        );

      } catch (err) {
        console.error(err);
        setErrorMSG("Failed to fetch product data from the blockchain. Please check your connection or try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchVerification();
  }, [batchId]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <nav className="navbar" style={{ padding: "0 24px" }}>
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          {APP_NAME}
        </Link>
        <div className="nav-right">
          <Link to="/login" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
            Login to Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "600px" }}>
          <Motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-top" style={{ justifyContent: "center", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <PackageSearch size={40} style={{ color: "var(--primary)" }} />
              <h2 style={{ margin: 0 }}>Public Product Verification</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
                Verifying Authenticity & Chain of Custody
              </p>
            </div>

            <div className="form-group" style={{ marginTop: "20px" }}>
              {loading && (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                  <div className="spinner" style={{ border: "3px solid rgba(0,0,0,0.1)", borderTop: "3px solid var(--primary)", borderRadius: "50%", width: "24px", height: "24px", animation: "spin 1s linear infinite", margin: "0 auto 10px" }}></div>
                  <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                  `}</style>
                  Fetching blockchain records for Batch {batchId}...
                </div>
              )}

              {!loading && errorMSG && (
                <div className="alert-box alert-error" style={{ marginBottom: 0 }}>
                  <AlertTriangle size={18} />
                  <span>{errorMSG}</span>
                </div>
              )}

              {!loading && batchData && (
                <div>
                  <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", padding: "12px", borderRadius: "8px", background: batchData.recalled ? "#fef2f2" : "#f0fdf4", color: batchData.recalled ? "#ef4444" : "#16a34a", border: `1px solid ${batchData.recalled ? "#fecaca" : "#bbf7d0"}` }}>
                    {batchData.recalled ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
                    <span style={{ fontWeight: 600 }}>
                      {batchData.recalled ? "WARNING: This product has been recalled." : "Blockchain Verified Authentic Product."}
                    </span>
                  </div>
                  
                  <BatchCard batch={batchData} />

                  {batchData.anomalyFlags?.length > 0 && (
                    <div style={{ marginTop: "16px", padding: "10px 12px", border: "1px solid #fecaca", borderRadius: "8px", background: "#fff4f4", color: "#b91c1c", fontSize: "0.82rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>AI Anomaly Warnings:</div>
                      {batchData.anomalyFlags.join(" • ")}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="card-footer" style={{ justifyContent: "center", marginTop: "16px" }}>
              <Link to="/docs" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>
                Learn more about True Trace
              </Link>
            </div>
          </Motion.div>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle, Download, PackagePlus } from "lucide-react";
import { APP_NAME } from "../config/sentinelChain";
import { createBatch } from "../blockchain/contract";
import { buildQrPayload } from "../services/qrVerification";
import { upsertTrackedBatch } from "../services/batchStore";
import { clearConnectedWallet, clearSession, getSession } from "../utils/authStorage";

const EMPTY = { batchId: "", productName: "", mfgDate: "", expDate: "" };

export default function RegisterBatch() {
  const navigate = useNavigate();
  const session = getSession();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [registeredBatch, setRegisteredBatch] = useState(null);
  const qrRef = useRef(null);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleLogout = () => {
    clearSession();
    clearConnectedWallet();
    navigate("/", { replace: true });
  };

  const validate = () => {
    if (!form.batchId.trim()) return "Batch ID is required.";
    if (!form.productName.trim()) return "Product Name is required.";
    if (!form.mfgDate.trim()) return "Manufacture Date is required.";
    if (!form.expDate.trim()) return "Expiry Date is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setErrorMsg(err);
      setSuccessMsg("");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setTxHash("");
    setRegisteredBatch(null);

    try {
      const hash = await createBatch(form.batchId, form.productName, form.mfgDate, form.expDate);
      upsertTrackedBatch(
        {
          batchId: form.batchId,
          productName: form.productName,
          mfgDate: form.mfgDate,
          expDate: form.expDate,
          recalled: false,
          trustScore: 100,
          suspiciousScans: 0,
          scansObserved: 0,
          productStatus: "ACTIVE",
        },
        { eventType: "created", txHash: hash },
      );
      setTxHash(hash);
      setRegisteredBatch({ ...form });
      setSuccessMsg("Batch registered on-chain successfully.");
      setForm(EMPTY);
    } catch (err) {
      setErrorMsg(err?.reason || err?.message || "Transaction failed. Check your wallet and try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${registeredBatch.batchId}-qr.png`;
    link.href = url;
    link.click();
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          {APP_NAME}
        </Link>
        <div className="nav-links">
          <Link to="/dashboard/manufacturer" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>
            Dashboard
          </Link>
        </div>
        <div className="nav-right">
          {session && (
            <span className="network-badge" style={{ background: "var(--white)", border: "1px solid var(--border)", padding: "6px 14px", borderRadius: "999px" }}>
              {session.name}
            </span>
          )}
          <button className="btn-secondary" onClick={handleLogout} style={{ fontSize: "0.85rem" }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-page">
        <AnimatePresence>
          {(errorMsg || successMsg) && (
            <Motion.div className="alert-container" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
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
          <h1>Register Batch</h1>
          <p>Commit a new product batch to the blockchain and generate a tamper-proof QR tag.</p>
        </div>

        <div className="action-grid">
          <Motion.div
            className="action-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="card-top">
              <h3>Batch Details</h3>
              <div className="card-icon">
                <PackagePlus size={18} />
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <div className="form-row">
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Batch ID
                    </label>
                    <input
                      placeholder="e.g. SC-2026-001"
                      value={form.batchId}
                      onChange={(e) => setField("batchId", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Product Name
                    </label>
                    <input
                      placeholder="e.g. Paracetamol 500mg"
                      value={form.productName}
                      onChange={(e) => setField("productName", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Manufacture Date
                    </label>
                    <input
                      type="date"
                      value={form.mfgDate}
                      onChange={(e) => setField("mfgDate", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={form.expDate}
                      onChange={(e) => setField("expDate", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <button className="card-btn" type="submit" disabled={loading}>
                  {loading ? "Submitting to chain..." : "Commit to Chain"}
                  {!loading && <ArrowRight size={14} />}
                </button>
                {txHash && (
                  <a
                    className="tx-link"
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Tx ↗
                  </a>
                )}
              </div>
            </form>
          </Motion.div>

          <AnimatePresence>
            {registeredBatch && (
              <Motion.div
                className="action-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
              >
                <div className="card-top">
                  <h3>QR Tag Generated</h3>
                  <div className="card-icon">
                    <CheckCircle size={18} color="#22c55e" />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    ref={qrRef}
                    style={{
                      padding: "16px",
                      background: "#fff",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      display: "inline-flex",
                    }}
                  >
                    <QRCodeCanvas
                      value={buildQrPayload(registeredBatch)}
                      size={140}
                      fgColor="#381932"
                      bgColor="#ffffff"
                      level="H"
                    />
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      ["Batch ID", registeredBatch.batchId],
                      ["Product", registeredBatch.productName],
                      ["Manufactured", registeredBatch.mfgDate],
                      ["Expires", registeredBatch.expDate],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>
                          {label}
                        </div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text)" }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-footer">
                  <button className="card-btn" onClick={downloadQr}>
                    <Download size={14} /> Download QR
                  </button>
                  {txHash && (
                    <a
                      className="tx-link"
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Etherscan ↗
                    </a>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

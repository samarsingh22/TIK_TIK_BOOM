import React, { useState } from "react";
import { DollarSign, Loader2, CheckCircle, X, Shield } from "lucide-react";
import { simulatePayment } from "../services/paymentService";

/**
 * PaymentModal — x402 micro-payment prompt.
 *
 * Props:
 *   isOpen       — boolean
 *   price        — string, e.g. "0.01 USDC"
 *   serviceName  — what the user is paying for
 *   onClose      — () => void
 *   onPaymentComplete — (txHash: string) => void
 */
export default function PaymentModal({ isOpen, price, serviceName, onClose, onPaymentComplete }) {
  const [status, setStatus] = useState("idle"); // idle | processing | success
  const [txHash, setTxHash] = useState("");

  if (!isOpen) return null;

  async function handlePay() {
    setStatus("processing");
    try {
      const hash = await simulatePayment(price);
      setTxHash(hash);
      setStatus("success");
      setTimeout(() => {
        onPaymentComplete(hash);
      }, 900);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div className="payment-modal-overlay" onClick={(e) => e.target === e.currentTarget && status === "idle" && onClose()}>
      <div className="payment-modal">
        {/* Close button */}
        {status === "idle" && (
          <button className="payment-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}

        {/* Header */}
        <div className="payment-modal-icon">
          {status === "success" ? (
            <CheckCircle size={40} style={{ color: "#16a34a" }} />
          ) : (
            <Shield size={40} style={{ color: "var(--text)" }} />
          )}
        </div>

        {status === "idle" && (
          <>
            <h3 className="payment-modal-title">Payment Required</h3>
            <p className="payment-modal-desc">
              <strong>{serviceName}</strong> is a premium service protected by the <em>x402</em> micro-payment protocol.
            </p>

            <div className="payment-modal-price-box">
              <DollarSign size={18} />
              <span className="payment-modal-price">{price}</span>
            </div>

            <p className="payment-modal-note">
              This is a simulated crypto payment for demo purposes. No real funds will be charged.
            </p>

            <button className="card-btn payment-modal-btn" onClick={handlePay}>
              <DollarSign size={16} />
              Simulate Payment
            </button>
          </>
        )}

        {status === "processing" && (
          <div className="payment-modal-processing">
            <Loader2 size={28} className="payment-spinner" />
            <p>Processing payment…</p>
            <span className="payment-modal-note">Confirming transaction on-chain</span>
          </div>
        )}

        {status === "success" && (
          <div className="payment-modal-success">
            <h3 className="payment-modal-title" style={{ color: "#16a34a" }}>Payment Confirmed</h3>
            <p className="payment-modal-desc">Transaction verified. Loading premium data…</p>
            <div className="payment-tx-hash">
              <span className="label">Tx Hash</span>
              <span className="value">{txHash.slice(0, 12)}…{txHash.slice(-8)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

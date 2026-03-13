import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { APP_NAME } from "../config/sentinelChain";
import { getConnectedWallet, getSession, setConnectedWallet } from "../utils/authStorage";

function getMetaMaskProvider() {
  const injected = window.ethereum;
  if (!injected) return null;

  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    return injected.providers.find((provider) => provider && provider.isMetaMask) || null;
  }

  return injected.isMetaMask ? injected : null;
}

export default function WalletConnectPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(getConnectedWallet());
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const session = getSession();
    if (session) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  async function connectWallet() {
    const provider = getMetaMaskProvider();
    if (!provider) {
      setErrorMsg("Please install MetaMask to continue.");
      setSuccessMsg("");
      return;
    }

    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const account = accounts[0];
      setConnectedWallet(account);
      setWallet(account);
      setSuccessMsg("Wallet connected. Redirecting to login.");
      setErrorMsg("");
      setTimeout(() => navigate("/auth"), 450);
    } catch (error) {
      const code = Number(error?.code || 0);
      if (code === 4001) {
        setErrorMsg("MetaMask connection request was rejected.");
      } else {
        setErrorMsg("Wallet connection failed. Make sure MetaMask is unlocked and selected as active wallet provider.");
      }
      setSuccessMsg("");
    }
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          {APP_NAME}
        </Link>
      </nav>

      <div className="dashboard-page">
        {(errorMsg || successMsg) && (
          <div className="alert-container" style={{ marginBottom: "16px" }}>
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
          </div>
        )}

        <div className="dashboard-header">
          <h1>Connect Wallet</h1>
          <p>Connect MetaMask to access True Trace authentication.</p>
        </div>

        <div className="action-grid">
          <div className="action-card" style={{ maxWidth: "520px" }}>
            <div className="card-top">
              <h3>MetaMask Verification</h3>
            </div>
            <div className="form-group">
              <input value={wallet || "No wallet connected"} readOnly />
            </div>
            <div className="card-footer">
              <button className="card-btn" onClick={connectWallet}>
                {wallet ? "Reconnect Wallet" : "Connect Wallet"}
              </button>
              {wallet && (
                <Link to="/auth" className="tx-link" style={{ textDecoration: "none" }}>
                  Continue ↗
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

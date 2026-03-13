import { useEffect, useState } from "react";
import { APP_NAME, ROLES } from "../config/sentinelChain";
import {
  connectWalletClient,
  createBatchTx,
  transferBatchTx,
  recallBatchTx,
  verifyBatchOnChain,
} from "../services/sentinelChainClient";
import { resolveBatchIdFromInput } from "../services/qrVerification";
import { detectAnomalies } from "../ai/anomalyDetection";
import { calculateTrustScore } from "../ai/trustScore";
import { clearScanEvents, getBatchScanEvents, getCurrentLocation, logScanEvent, readScanEvents } from "../ai/scanLogger";
import { listTrackedBatches, markBatchRecalled, markBatchTransferred, upsertTrackedBatch } from "../services/batchStore";

const EMPTY_FORM = {
  batchId: "",
  productName: "",
  mfgDate: "",
  expDate: "",
  transferId: "",
  newOwner: "",
  verifyId: "",
  recallId: "",
};

export function useSentinelDashboard(options = {}) {
  const { initialRole = ROLES.MANUFACTURER } = options;
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState(EMPTY_FORM);

  const [lastCreatedBatch, setLastCreatedBatch] = useState(null);
  const [createTxHash, setCreateTxHash] = useState("");
  const [transferTxHash, setTransferTxHash] = useState("");
  const [recallTxHash, setRecallTxHash] = useState("");
  const [batchData, setBatchData] = useState(null);
  const [trackedBatches, setTrackedBatches] = useState([]);
  const [recentScanEvents, setRecentScanEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const displayMessage = (msg, type = "error") => {
    if (type === "error") {
      setErrorMsg(msg);
      setSuccessMsg("");
    } else {
      setSuccessMsg(msg);
      setErrorMsg("");
    }

    setTimeout(() => {
      setErrorMsg("");
      setSuccessMsg("");
    }, 5000);
  };

  const resetFlows = () => {
    setForm(EMPTY_FORM);
    setLastCreatedBatch(null);
    setCreateTxHash("");
    setTransferTxHash("");
    setRecallTxHash("");
    setBatchData(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (value) => {
    setRole(value);
    resetFlows();
  };

  const refreshRecentScanEvents = () => {
    const next = readScanEvents()
      .slice()
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, 8);
    setRecentScanEvents(next);
  };

  const refreshTrackedBatches = () => {
    setTrackedBatches(listTrackedBatches());
  };

  const clearRecentScanEvents = () => {
    clearScanEvents();
    setRecentScanEvents([]);
    displayMessage("Scan logs cleared.", "success");
  };

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    refreshRecentScanEvents();
    refreshTrackedBatches();
  }, []);

  async function connectWallet() {
    try {
      const client = await connectWalletClient();
      setAccount(client.account);
      setContract(client.contract);
      displayMessage("Wallet connected successfully.", "success");
    } catch (error) {
      if (error?.message?.includes("MetaMask")) {
        displayMessage(`Please install MetaMask to use ${APP_NAME}.`, "error");
      } else {
        displayMessage("Failed to connect wallet.", "error");
      }
    }
  }

  function disconnectWallet() {
    setAccount(null);
    setContract(null);
    displayMessage("Wallet disconnected.", "success");
  }

  async function createBatch() {
    if (!contract) {
      displayMessage("Please Connect Wallet first.", "error");
      return;
    }

    const { batchId, productName, mfgDate, expDate } = form;
    if (!batchId || !productName || !mfgDate || !expDate) {
      displayMessage("Please fill all fields.", "error");
      return;
    }

    try {
      setLoading(true);
      const txHash = await createBatchTx(contract, { batchId, productName, mfgDate, expDate });
      setCreateTxHash(txHash);
      setLastCreatedBatch({ batchId, productName, mfgDate, expDate, recalled: false });
      upsertTrackedBatch(
        {
          batchId,
          productName,
          mfgDate,
          expDate,
          owner: account || "",
          recalled: false,
          trustScore: 100,
          suspiciousScans: 0,
          scansObserved: getBatchScanEvents(batchId).length,
        },
        { eventType: "created", txHash },
      );
      refreshTrackedBatches();
      setForm((prev) => ({ ...prev, batchId: "", productName: "", mfgDate: "", expDate: "" }));
      displayMessage("Product batch registered successfully on-chain.", "success");
    } catch {
      displayMessage("Transaction failed or was rejected.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function transferBatch() {
    if (!contract) {
      displayMessage("Please Connect Wallet first.", "error");
      return;
    }

    const { transferId, newOwner } = form;
    if (!transferId || !newOwner) {
      displayMessage("Provide Batch ID and new Owner address.", "error");
      return;
    }

    try {
      setLoading(true);
      const txHash = await transferBatchTx(contract, { batchId: transferId, newOwner });
      setTransferTxHash(txHash);
      markBatchTransferred(transferId, newOwner, txHash);
      refreshTrackedBatches();
      setForm((prev) => ({ ...prev, transferId: "", newOwner: "" }));
      displayMessage("Custody transferred successfully.", "success");
    } catch {
      displayMessage("Transfer failed. Please check inputs and authorization.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function recallBatch() {
    if (!contract) {
      displayMessage("Please Connect Wallet first.", "error");
      return;
    }

    const { recallId } = form;
    if (!recallId) {
      displayMessage("Provide Batch ID to recall.", "error");
      return;
    }

    try {
      setLoading(true);
      const txHash = await recallBatchTx(contract, recallId);
      setRecallTxHash(txHash);
      markBatchRecalled(recallId, txHash);
      refreshTrackedBatches();
      setForm((prev) => ({ ...prev, recallId: "" }));
      displayMessage(`Batch ${recallId} has been successfully recalled.`, "success");
    } catch {
      displayMessage("Recall failed. Ensure you have Regulator privileges.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function verifyBatch() {
    if (!contract) {
      displayMessage("Please Connect Wallet first.", "error");
      return;
    }

    const normalizedBatchId = resolveBatchIdFromInput(form.verifyId);
    if (!normalizedBatchId) {
      displayMessage("Provide a Batch ID or QR payload to verify.", "error");
      return;
    }

    try {
      setLoading(true);
      setBatchData(null);

      const batch = await verifyBatchOnChain(contract, normalizedBatchId);
      const location = getCurrentLocation();
      logScanEvent({ batchID: batch.batchId, timestamp: Date.now(), location });

      const scanEvents = readScanEvents();
      const anomaly = detectAnomalies(scanEvents, batch.batchId, location);
      const trustScore = calculateTrustScore({
        recalled: batch.recalled,
        suspiciousScans: anomaly.suspiciousScans,
      });

      setBatchData({
        ...batch,
        location,
        trustScore,
        anomalyFlags: anomaly.flags,
        suspiciousScans: anomaly.suspiciousScans,
        scansObserved: getBatchScanEvents(batch.batchId).length,
      });

      upsertTrackedBatch(
        {
          ...batch,
          lastLocation: location,
          trustScore,
          suspiciousScans: anomaly.suspiciousScans,
          scansObserved: getBatchScanEvents(batch.batchId).length,
        },
        { eventType: "verified" },
      );
      refreshTrackedBatches();
      refreshRecentScanEvents();

      setForm((prev) => ({ ...prev, verifyId: normalizedBatchId }));
      displayMessage("Batch found and verified.", "success");
    } catch {
      displayMessage("Product not found on the blockchain.", "error");
    } finally {
      setLoading(false);
    }
  }

  return {
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
    disconnectWallet,
    createBatch,
    transferBatch,
    recallBatch,
    verifyBatch,
  };
}

import { useEffect, useState } from "react";
import { APP_NAME, ROLES } from "../config/sentinelChain";
import {
  connectWalletClient,
  createBatchTx,
  transferBatchTx,
  recallBatchTx,
  getRegulatorAddress,
  verifyBatchOnChain,
} from "../services/sentinelChainClient";
import { resolveBatchIdFromInput } from "../services/qrVerification";
import { detectAnomalies } from "../ai/anomalyDetection";
import { calculateTrustScore } from "../ai/trustScore";
import { clearScanEvents, getBatchScanEvents, getCurrentLocation, getDeviceFingerprint, logScanEvent, readScanEvents } from "../ai/scanLogger";
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
  const [regulatorAddress, setRegulatorAddress] = useState("");

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

  const extractChainErrorMessage = (error) => {
    const candidates = [
      error?.shortMessage,
      error?.reason,
      error?.info?.error?.message,
      error?.message,
    ].filter(Boolean);

    const message = String(candidates[0] || "");
    if (message.includes("Only regulator can recall")) {
      return regulatorAddress
        ? `Recall failed. Connected wallet is not the on-chain regulator. Regulator address: ${regulatorAddress}`
        : "Recall failed. Connected wallet is not the on-chain regulator.";
    }

    if (message.includes("Batch does not exist")) {
      return "Recall failed. That batch does not exist on-chain.";
    }

    if (message.includes("user rejected") || message.includes("rejected")) {
      return "Recall transaction was rejected in the wallet.";
    }

    return message || "Recall failed on-chain.";
  };

  const walletIsRegulator = account && regulatorAddress
    ? String(account).toLowerCase() === String(regulatorAddress).toLowerCase()
    : false;

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
      const nextRegulatorAddress = await getRegulatorAddress(client.contract).catch(() => "");
      setAccount(client.account);
      setContract(client.contract);
      setRegulatorAddress(nextRegulatorAddress);

      if (nextRegulatorAddress && String(client.account).toLowerCase() === String(nextRegulatorAddress).toLowerCase()) {
        displayMessage("Wallet connected successfully. On-chain regulator detected.", "success");
      } else {
        displayMessage("Wallet connected successfully.", "success");
      }
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
    setRegulatorAddress("");
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

    if (regulatorAddress && !walletIsRegulator) {
      displayMessage(`Recall blocked. Connected wallet is not the on-chain regulator. Regulator: ${regulatorAddress}`, "error");
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
    } catch (error) {
      displayMessage(extractChainErrorMessage(error), "error");
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
      logScanEvent({
        batchID: batch.batchId,
        timestamp: Date.now(),
        location,
        scannerRole: role,
        deviceFingerprint: getDeviceFingerprint(),
      });

      const scanEvents = getBatchScanEvents(batch.batchId);
      const anomaly = detectAnomalies(scanEvents, {
        batchId: batch.batchId,
        createdAt: batch.mfgDate,
        recalled: batch.recalled,
      });
      const trust = calculateTrustScore({ ...anomaly, recalled: batch.recalled });

      setBatchData({
        ...batch,
        location,
        trustScore: trust.trustScore,
        anomalyFlags: anomaly.anomalies,
        suspiciousScans: anomaly.suspiciousScans,
        scansObserved: getBatchScanEvents(batch.batchId).length,
        riskLevel: trust.riskLevel,
      });

      upsertTrackedBatch(
        {
          ...batch,
          lastLocation: location,
          trustScore: trust.trustScore,
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
    regulatorAddress,
    walletIsRegulator,
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

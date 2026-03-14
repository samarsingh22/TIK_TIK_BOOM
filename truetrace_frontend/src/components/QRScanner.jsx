import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { verifyBatch } from "../blockchain/contract";
import { calculateTrustScore } from "../ai/trustScore";
import { detectAnomalies } from "../ai/anomalyDetection";
import { getBatchScanEvents, getCurrentLocation, getDeviceFingerprint, logScanEvent } from "../ai/scanLogger";
import { upsertTrackedBatch } from "../services/batchStore";
import { resolveBatchIdFromInput } from "../services/qrVerification";

function extractBatchId(rawValue) {
  return resolveBatchIdFromInput(rawValue);
}

export default function QRScanner({ onVerified, onError, onScanLogged }) {
  const readerId = useId().replace(/:/g, "_");
  const qrReaderRegionId = `truetrace_qr_reader_${readerId}`;
  const [scanMode, setScanMode] = useState("camera");
  const [lastBatchId, setLastBatchId] = useState("");
  const [message, setMessage] = useState("Scan a QR code to verify a batch.");
  const lastScanRef = useRef("");
  const scannerRef = useRef(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef(null);

  const onVerifiedRef = useRef(onVerified);
  const onErrorRef = useRef(onError);
  const onScanLoggedRef = useRef(onScanLogged);
  onVerifiedRef.current = onVerified;
  onErrorRef.current = onError;
  onScanLoggedRef.current = onScanLogged;
  async function processDecodedResult(rawText) {
    if (!rawText || scanningRef.current) return;

    const batchId = extractBatchId(rawText);
    if (!batchId || lastScanRef.current === batchId) return;

    lastScanRef.current = batchId;
    setLastBatchId(batchId);
    scanningRef.current = true;
    setMessage(`Verifying ${batchId} on-chain...`);

    try {
      const chainData = await verifyBatch(batchId);
      const location = getCurrentLocation();
      logScanEvent({
        batchID: chainData.batchId,
        timestamp: Date.now(),
        location,
        scannerRole: "Consumer",
        deviceFingerprint: getDeviceFingerprint(),
      });

      const scanHistory = getBatchScanEvents(chainData.batchId);
      const anomaly = detectAnomalies(scanHistory, {
        batchId: chainData.batchId,
        createdAt: chainData.mfgDate,
        recalled: chainData.recalled,
      });
      const trust = calculateTrustScore({ ...anomaly, recalled: chainData.recalled });

      const verifiedData = {
        ...chainData,
        location,
        trustScore: trust.trustScore,
        anomalyFlags: anomaly.anomalies,
        suspiciousScans: anomaly.suspiciousScans,
        scansObserved: getBatchScanEvents(chainData.batchId).length,
        riskLevel: trust.riskLevel,
      };

      upsertTrackedBatch(
        {
          ...chainData,
          lastLocation: location,
          trustScore: trust.trustScore,
          suspiciousScans: anomaly.suspiciousScans,
          scansObserved: getBatchScanEvents(chainData.batchId).length,
        },
        { eventType: "verified" },
      );

      setMessage(`Verification completed for ${batchId}.`);
      if (onVerifiedRef.current) onVerifiedRef.current(verifiedData);
      if (onScanLoggedRef.current) onScanLoggedRef.current();
    } catch (error) {
      setMessage(error?.message || "Verification failed.");
      if (onErrorRef.current) onErrorRef.current(error);
    } finally {
      scanningRef.current = false;
    }
  }

  useEffect(() => {
    if (scanMode !== "camera") {
      return undefined;
    }

    async function handleResult(rawText) {
      await processDecodedResult(rawText);
    }

    const host = document.getElementById(qrReaderRegionId);
    if (!host) return undefined;

    const qrCodeScanner = new Html5Qrcode(qrReaderRegionId);
    scannerRef.current = qrCodeScanner;

    async function startScanner() {
      try {
        const cameras = await Html5Qrcode.getCameras();
        const backCamera = cameras.find((camera) => /(back|rear|environment)/i.test(camera.label)) || cameras[cameras.length - 1];

        if (!backCamera) {
          setMessage("No camera detected on this device.");
          return;
        }

        await qrCodeScanner.start(
          { deviceId: { exact: backCamera.id } },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            handleResult(decodedText);
          },
          () => {},
        );
        setMessage(`Using camera: ${backCamera.label || "Integrated Camera"}`);
      } catch {
        try {
          await qrCodeScanner.start(
            { facingMode: { ideal: "environment" } },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (decodedText) => {
              handleResult(decodedText);
            },
            () => {},
          );
          setMessage("Using integrated camera.");
        } catch {
          setMessage("Unable to access integrated camera. Allow camera permission and open over localhost/https.");
        }
      }
    }

    startScanner();

    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;

      try {
        Promise.resolve(scanner.stop())
          .catch(() => {})
          .finally(() => {
            Promise.resolve(scanner.clear()).catch(() => {});
          });
      } catch {
        Promise.resolve(scanner.clear()).catch(() => {});
      }
    };
  }, [qrReaderRegionId, scanMode]);

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("Reading uploaded QR image...");
    const fileScanner = new Html5Qrcode(qrReaderRegionId);

    try {
      const decodedText = await fileScanner.scanFile(file, true);
      await processDecodedResult(decodedText);
    } catch {
      setMessage("No readable QR code found in uploaded image.");
    } finally {
      await fileScanner.clear().catch(() => {});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button type="button" className="btn-secondary" style={{ opacity: scanMode === "camera" ? 1 : 0.7 }} onClick={() => setScanMode("camera")}>Use Camera</button>
        <button type="button" className="btn-secondary" style={{ opacity: scanMode === "file" ? 1 : 0.7 }} onClick={() => setScanMode("file")}>Upload from Browser</button>
      </div>

      <div style={{ overflow: "hidden", borderRadius: "10px", border: "1px solid var(--border)", minHeight: "280px" }}>
        {scanMode === "camera" ? (
          <div id={qrReaderRegionId} />
        ) : (
          <div style={{ padding: "16px" }}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} />
            <div style={{ marginTop: "10px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              Upload an image containing a QR code to verify.
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "10px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        {message}
        {lastBatchId ? ` Last scan: ${lastBatchId}` : ""}
      </div>

      <div style={{ marginTop: "10px" }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            lastScanRef.current = "";
            setLastBatchId("");
            setMessage("Ready for next scan.");
          }}
        >
          Scan Another
        </button>
      </div>
    </div>
  );
}

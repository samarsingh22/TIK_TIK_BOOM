export function buildQrPayload(batch) {
  // Use the origin of the current window for the verification URL
  const origin = window.location.origin;
  const payloadStr = JSON.stringify({
    BatchID: batch.batchId,
    Product: batch.productName,
    Mfg: batch.mfgDate,
    Exp: batch.expDate,
    Status: batch.recalled ? "Recalled" : "Verified"
  });
  const encodedData = encodeURIComponent(payloadStr);
  return `${origin}/verify/${encodeURIComponent(batch.batchId)}?data=${encodedData}`;
}

export function resolveBatchIdFromInput(input) {
  if (!input) return "";
  const trimmed = input.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return String(parsed.BatchID || parsed.batchId || "").trim();
    }
  } catch {
    // Not JSON payload, treat as direct batch id.
  }

  // If it's a URL in our format, extract the batchId
  try {
    const url = new URL(trimmed);
    const pathParts = url.pathname.split('/');
    // Check if path is like /verify/:batchId
    const verifyIndex = pathParts.indexOf('verify');
    if (verifyIndex !== -1 && verifyIndex + 1 < pathParts.length) {
      return decodeURIComponent(pathParts[verifyIndex + 1]);
    }
  } catch {
    // Not a valid URL
  }

  return trimmed;
}

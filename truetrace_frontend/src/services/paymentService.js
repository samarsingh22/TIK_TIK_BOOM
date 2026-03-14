/**
 * paymentService.js — x402 micro-payment client helpers
 *
 * Each fetch wrapper:
 *  1. Calls the premium API (optionally with x-payment-proof header).
 *  2. If the response is 402, returns { requiresPayment: true, price }.
 *  3. Otherwise returns { requiresPayment: false, data }.
 */

async function premiumFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 402) {
    const body = await res.json();
    return { requiresPayment: true, price: body.price, message: body.message };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  const data = await res.json();
  return { requiresPayment: false, data };
}

function buildHeaders(paymentProof) {
  const headers = { "Content-Type": "application/json" };
  if (paymentProof) {
    headers["x-payment-proof"] = paymentProof;
  }
  return headers;
}

// ---- Public API -----------------------------------------------------------

export async function fetchPremiumReport(productId, paymentProof = null) {
  return premiumFetch(`/api/premium/authenticity/${encodeURIComponent(productId)}`, {
    headers: buildHeaders(paymentProof),
  });
}

export async function fetchBulkVerify(productIds, paymentProof = null) {
  return premiumFetch("/api/premium/bulkVerify", {
    method: "POST",
    headers: buildHeaders(paymentProof),
    body: JSON.stringify({ products: productIds }),
  });
}

export async function fetchRiskAnalysis(productId, paymentProof = null) {
  return premiumFetch(`/api/premium/riskAnalysis/${encodeURIComponent(productId)}`, {
    headers: buildHeaders(paymentProof),
  });
}

/**
 * Simulate a USDC micro-payment and return a fake transaction hash.
 * In production this would talk to a real wallet / payment gateway.
 */
export function simulatePayment(price) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const hash =
        "0x" +
        Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("");
      resolve(hash);
    }, 1500);
  });
}

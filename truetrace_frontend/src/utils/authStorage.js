const ACCOUNTS_KEY = "True Trace.accounts.v1";
const SESSION_KEY = "True Trace.session.v1";
const WALLET_KEY = "True Trace.connected.wallet.v1";
const CHAT_STORAGE_KEY = "truetrace.chatbot.messages.v1";
const SESSION_CHANGED_EVENT = "truetrace:session-changed";
const RESET_MARKER_KEY = "True Trace.local.reset.version";
const RESET_VERSION = 1;
const LEGACY_KEYS = [
  "sentinelchain.accounts.v1",
  "sentinelchain.session.v1",
  "sentinelchain.connected.wallet.v1",
  "True Trace.accounts.v1",
  "True Trace.session.v1",
  "True Trace.connected.wallet.v1",
];

const ROLE_ALIASES = Object.freeze({
  pharmacy: "Retailer",
  chemist: "Retailer",
  retailer: "Retailer",
  consumer: "Consumer",
  user: "Consumer",
  distributor: "Distributor",
  manufacturer: "Manufacturer",
  regulator: "Regulator",
});

export const ROLE_TO_PATH = Object.freeze({
  Manufacturer: "/dashboard/manufacturer",
  Distributor: "/dashboard/distributor",
  Retailer: "/dashboard/retailer",
  Pharmacy: "/dashboard/retailer",
  Consumer: "/dashboard/consumer",
  Regulator: "/dashboard/regulator",
});

export function normalizeRole(role) {
  if (!role) return "Consumer";

  const raw = String(role).trim();
  const mapped = ROLE_ALIASES[raw.toLowerCase()];
  if (mapped) return mapped;

  return raw;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function emitSessionChanged(action = "updated") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT, { detail: { action } }));
  }
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function runStorageCleanup() {
  try {
    const currentResetVersion = Number(localStorage.getItem(RESET_MARKER_KEY) || "0");
    if (currentResetVersion < RESET_VERSION) {
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(RESET_MARKER_KEY, String(RESET_VERSION));
    }

    const accounts = getAccounts();
    if (!Array.isArray(accounts)) {
      writeJson(ACCOUNTS_KEY, []);
    }

    const session = readJson(SESSION_KEY, null);
    if (session && typeof session === "object" && session.role) {
      writeJson(SESSION_KEY, {
        ...session,
        role: normalizeRole(session.role),
      });
    }
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getAccounts() {
  const accounts = readJson(ACCOUNTS_KEY, []);
  return Array.isArray(accounts) ? accounts : [];
}

export function createAccount(payload) {
  const accounts = getAccounts();
  const normalizedRole = normalizeRole(payload.role);
  const manufacturerCategory = String(payload.manufacturerCategory || "").trim();
  const normalized = {
    name: payload.name.trim(),
    role: normalizedRole,
    organization: payload.organization.trim(),
    manufacturerCategory: normalizedRole === "Manufacturer" ? manufacturerCategory : "",
    password: payload.password,
    walletAddress: payload.walletAddress,
    createdAt: new Date().toISOString(),
  };

  const exists = accounts.some(
    (account) =>
      normalizeText(account.walletAddress) === normalizeText(normalized.walletAddress) &&
      normalizeRole(account.role) === normalizeRole(normalized.role) &&
      normalizeText(account.name) === normalizeText(normalized.name),
  );

  if (exists) {
    throw new Error("Account already exists for this wallet, role, and name.");
  }

  accounts.push(normalized);
  writeJson(ACCOUNTS_KEY, accounts);

  return normalized;
}

export function loginAccount(payload) {
  const accounts = getAccounts();
  const inputRole = normalizeRole(payload.role);
  const inputCategory = String(payload.manufacturerCategory || "").trim().toLowerCase();
  const match = accounts.find(
    (account) =>
      normalizeText(account.walletAddress) === normalizeText(payload.walletAddress) &&
      normalizeRole(account.role) === inputRole &&
      (
        inputRole !== "Manufacturer" ||
        !String(account.manufacturerCategory || "").trim() ||
        String(account.manufacturerCategory || "").trim().toLowerCase() === inputCategory
      ) &&
      normalizeText(account.name) === normalizeText(payload.name) &&
      normalizeText(account.organization) === normalizeText(payload.organization) &&
      account.password === payload.password,
  );

  if (!match) {
    throw new Error("Invalid login credentials.");
  }

  const session = {
    name: match.name,
    role: normalizeRole(match.role),
    organization: match.organization,
    manufacturerCategory: String(match.manufacturerCategory || "").trim(),
    walletAddress: match.walletAddress,
    loggedInAt: new Date().toISOString(),
  };

  writeJson(SESSION_KEY, session);
  emitSessionChanged("login");
  return session;
}

export function getSession() {
  const session = readJson(SESSION_KEY, null);
  if (!session || typeof session !== "object") return null;
  return {
    ...session,
    role: normalizeRole(session.role),
  };
}

export function getSessionProfile() {
  const session = getSession();
  if (!session) return null;

  const currentCategory = String(session.manufacturerCategory || "").trim();
  if (currentCategory) return session;

  const accounts = getAccounts();
  const match = accounts.find((account) => {
    const sameWallet = String(account.walletAddress || "").toLowerCase() === String(session.walletAddress || "").toLowerCase();
    const sameName = String(account.name || "").trim().toLowerCase() === String(session.name || "").trim().toLowerCase();
    const sameOrg = String(account.organization || "").trim().toLowerCase() === String(session.organization || "").trim().toLowerCase();
    const sameRole = normalizeRole(account.role) === normalizeRole(session.role);
    return sameWallet && sameName && sameOrg && sameRole;
  });

  if (!match) return session;

  return {
    ...session,
    manufacturerCategory: String(match.manufacturerCategory || "").trim(),
  };
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(CHAT_STORAGE_KEY);
  emitSessionChanged("logout");
}

export function setConnectedWallet(address) {
  localStorage.setItem(WALLET_KEY, address);
}

export function getConnectedWallet() {
  return localStorage.getItem(WALLET_KEY);
}

export function clearConnectedWallet() {
  localStorage.removeItem(WALLET_KEY);
}

export function roleToDashboardPath(role) {
  const normalized = normalizeRole(role);
  return ROLE_TO_PATH[normalized] || "/dashboard/consumer";
}

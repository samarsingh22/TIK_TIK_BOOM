import { ethers } from "ethers";

export function getReadonlyProvider() {
  return new ethers.JsonRpcProvider("https://rpc.sepolia.org");
}

function getEthereum() {
  if (!window.ethereum) {
    throw new Error("MetaMask wallet was not detected.");
  }
  return window.ethereum;
}

export async function connectMetaMask() {
  const ethereum = getEthereum();
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  return accounts?.[0] ?? null;
}

export async function getWalletAddress() {
  const ethereum = getEthereum();
  const accounts = await ethereum.request({ method: "eth_accounts" });
  return accounts?.[0] ?? null;
}

export async function getProviderAndSigner() {
  const ethereum = getEthereum();
  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  return {
    provider,
    signer,
  };
}

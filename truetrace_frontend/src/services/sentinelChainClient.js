import { ethers } from "ethers";
import { CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI } from "../config/sentinelChain";

function getMetaMaskProvider() {
  const injected = window.ethereum;
  if (!injected) {
    throw new Error("MetaMask wallet was not detected.");
  }

  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    const metaMaskProvider = injected.providers.find((provider) => provider && provider.isMetaMask);
    if (metaMaskProvider) return metaMaskProvider;
  }

  if (injected.isMetaMask) {
    return injected;
  }

  throw new Error("MetaMask is not the active wallet provider. Please open MetaMask or disable other wallet extensions temporarily.");
}

export async function connectWalletClient() {
  const ethereum = getMetaMaskProvider();
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI, signer);

  return {
    account: accounts[0],
    contract,
    provider,
    signer,
  };
}

export async function getRegulatorAddress(contract) {
  if (!contract?.regulator) {
    throw new Error("Connected contract does not expose regulator().");
  }

  const regulator = await contract.regulator();
  return String(regulator || "");
}

export async function createBatchTx(contract, payload) {
  const { batchId, productName, mfgDate, expDate } = payload;
  const tx = await contract.createBatch(batchId, productName, mfgDate, expDate);
  await tx.wait();
  return tx.hash;
}

export async function transferBatchTx(contract, payload) {
  const { batchId, newOwner } = payload;
  const tx = await contract.transferBatch(batchId, newOwner);
  await tx.wait();
  return tx.hash;
}

export async function recallBatchTx(contract, batchId) {
  const tx = await contract.recallBatch(batchId);
  await tx.wait();
  return tx.hash;
}

export async function verifyBatchOnChain(contract, batchId) {
  const data = await contract.verifyBatch(batchId);
  return {
    batchId: data[0],
    productName: data[1],
    mfgDate: data[2],
    expDate: data[3],
    owner: data[4],
    recalled: data[5],
  };
}

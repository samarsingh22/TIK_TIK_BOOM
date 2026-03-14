import { ethers } from "ethers";
import { CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI } from "../config/sentinelChain";
import { getProviderAndSigner, getReadonlyProvider } from "./wallet";
export function getContractAbi() {
  return SENTINEL_CHAIN_ABI;
}

export async function getSentinelContract() {
  const { signer } = await getProviderAndSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI, signer);
}

export async function getReadonlyContract() {
  const provider = getReadonlyProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, SENTINEL_CHAIN_ABI, provider);
}

export async function createBatch(batchId, productName, mfgDate, expDate) {
  const contract = await getSentinelContract();
  const tx = await contract.createBatch(batchId, productName, mfgDate, expDate);
  await tx.wait();
  return tx.hash;
}

export async function transferBatch(batchId, newOwner) {
  const contract = await getSentinelContract();
  const tx = await contract.transferBatch(batchId, newOwner);
  await tx.wait();
  return tx.hash;
}

export async function verifyBatch(batchId) {
  const contract = await getReadonlyContract();
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

export async function recallBatch(batchId) {
  const contract = await getSentinelContract();
  const tx = await contract.recallBatch(batchId);
  await tx.wait();
  return tx.hash;
}

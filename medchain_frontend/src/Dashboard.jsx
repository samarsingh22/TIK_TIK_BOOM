import { useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import { Plus, ArrowRight, Shield, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const contractAddress = "0xbF144B079d290eaE62Ae97274D39DFa71E012Eb9";
const abi = [
    { "inputs": [{ "internalType": "string", "name": "_batchId", "type": "string" }, { "internalType": "string", "name": "_drugName", "type": "string" }, { "internalType": "string", "name": "_mfgDate", "type": "string" }, { "internalType": "string", "name": "_expDate", "type": "string" }], "name": "createBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "string", "name": "_batchId", "type": "string" }], "name": "recallBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "string", "name": "_batchId", "type": "string" }, { "internalType": "address", "name": "_newOwner", "type": "address" }], "name": "transferBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [{ "internalType": "string", "name": "", "type": "string" }], "name": "batches", "outputs": [{ "internalType": "string", "name": "batchId", "type": "string" }, { "internalType": "string", "name": "drugName", "type": "string" }, { "internalType": "string", "name": "manufactureDate", "type": "string" }, { "internalType": "string", "name": "expiryDate", "type": "string" }, { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "bool", "name": "recalled", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "regulator", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "string", "name": "_batchId", "type": "string" }], "name": "verifyBatch", "outputs": [{ "internalType": "string", "name": "batchId", "type": "string" }, { "internalType": "string", "name": "drugName", "type": "string" }, { "internalType": "string", "name": "manufactureDate", "type": "string" }, { "internalType": "string", "name": "expiryDate", "type": "string" }, { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "bool", "name": "recalled", "type": "bool" }], "stateMutability": "view", "type": "function" }
];

function Dashboard() {
    const [account, setAccount] = useState(null);
    const [role, setRole] = useState("Manufacturer");
    const [contract, setContract] = useState(null);

    const [batchId, setBatchId] = useState("");
    const [drugName, setDrugName] = useState("");
    const [mfgDate, setMfgDate] = useState("");
    const [expDate, setExpDate] = useState("");
    const [lastCreatedBatch, setLastCreatedBatch] = useState(null);
    const [createTxHash, setCreateTxHash] = useState("");

    const [transferId, setTransferId] = useState("");
    const [newOwner, setNewOwner] = useState("");
    const [transferTxHash, setTransferTxHash] = useState("");

    const [verifyId, setVerifyId] = useState("");
    const [batchData, setBatchData] = useState(null);

    const [recallId, setRecallId] = useState("");
    const [recallTxHash, setRecallTxHash] = useState("");
    const [loading, setLoading] = useState(false);

    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleRoleChange = (e) => {
        setRole(e.target.value);

        // Reset all form states
        setBatchId("");
        setDrugName("");
        setMfgDate("");
        setExpDate("");
        setLastCreatedBatch(null);
        setCreateTxHash("");

        setTransferId("");
        setNewOwner("");
        setTransferTxHash("");

        setVerifyId("");
        setBatchData(null);

        setRecallId("");
        setRecallTxHash("");

        setErrorMsg("");
        setSuccessMsg("");
    };

    const displayMessage = (msg, type = "error") => {
        if (type === "error") {
            setErrorMsg(msg);
            setSuccessMsg("");
        } else {
            setSuccessMsg(msg);
            setErrorMsg("");
        }
        setTimeout(() => { setErrorMsg(""); setSuccessMsg(""); }, 5000);
    };

    async function connectWallet() {
        if (!window.ethereum) { displayMessage("Please install MetaMask to use TrueTrace.", "error"); return; }
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(accounts[0]);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            setContract(new ethers.Contract(contractAddress, abi, signer));
            displayMessage("Wallet connected successfully.", "success");
        } catch (err) { console.error(err); displayMessage("Failed to connect wallet.", "error"); }
    }

    async function createBatch() {
        if (!contract) { displayMessage("Please Connect Wallet first.", "error"); return; }
        if (!batchId || !drugName || !mfgDate || !expDate) { displayMessage("Please fill all fields.", "error"); return; }
        try {
            setLoading(true); setCreateTxHash("");
            const tx = await contract.createBatch(batchId, drugName, mfgDate, expDate);
            setCreateTxHash(tx.hash);
            await tx.wait();
            setLastCreatedBatch({ batchId, drugName, mfgDate, expDate });
            setBatchId(""); setDrugName(""); setMfgDate(""); setExpDate("");
            displayMessage("Product batch registered successfully on chain.", "success");
        } catch (e) { console.error(e); displayMessage("Transaction failed or was rejected.", "error"); }
        finally { setLoading(false); }
    }

    async function transferBatch() {
        if (!contract) { displayMessage("Please Connect Wallet first.", "error"); return; }
        if (!transferId || !newOwner) { displayMessage("Provide Batch ID and new Owner address.", "error"); return; }
        try {
            setLoading(true); setTransferTxHash("");
            const tx = await contract.transferBatch(transferId, newOwner);
            setTransferTxHash(tx.hash);
            await tx.wait();
            setTransferId(""); setNewOwner("");
            displayMessage("Custody transferred successfully.", "success");
        } catch (e) { console.error(e); displayMessage("Transfer failed. Please check inputs and authorization.", "error"); }
        finally { setLoading(false); }
    }

    async function recallBatch() {
        if (!contract) { displayMessage("Please Connect Wallet first.", "error"); return; }
        if (!recallId) { displayMessage("Provide Batch ID to recall.", "error"); return; }
        try {
            setLoading(true); setRecallTxHash("");
            const tx = await contract.recallBatch(recallId);
            setRecallTxHash(tx.hash);
            await tx.wait();
            setRecallId("");
            displayMessage(`Batch ${recallId} has been successfully recalled.`, "success");
        } catch (e) { console.error(e); displayMessage("Recall failed. Ensure you have Regulator privileges.", "error"); }
        finally { setLoading(false); }
    }

    async function verifyBatch() {
        if (!contract) { displayMessage("Please Connect Wallet first.", "error"); return; }
        if (!verifyId) { displayMessage("Provide a Batch ID to verify.", "error"); return; }
        try {
            setLoading(true); setBatchData(null);
            const data = await contract.verifyBatch(verifyId);
            setBatchData({ batchId: data[0], drugName: data[1], mfgDate: data[2], expDate: data[3], owner: data[4], recalled: data[5] });
            displayMessage("Batch found and verified.", "success");
        } catch (e) { console.error(e); displayMessage("Product not found on the blockchain.", "error"); }
        finally { setLoading(false); }
    }



    return (
        <>
            {/* Nav */}
            <nav className="navbar">
                <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>TrueTrace</Link>
                <div className="nav-links">
                    <Link to="/app" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600 }}>Dashboard</Link>
                    <Link to="/analytics" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>Analytics</Link>
                    <Link to="/docs" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>Docs</Link>
                </div>
                <div className="nav-right">
                    <button
                        className="btn-primary"
                        onClick={connectWallet}
                        style={{ fontSize: '0.85rem' }}
                    >
                        {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
                    </button>
                </div>
            </nav>

            <div className="dashboard-page">
                {/* Global Alert Messages */}
                <AnimatePresence>
                    {(errorMsg || successMsg) && (
                        <motion.div
                            className="alert-container"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="dashboard-header">
                    <h1>Dashboard</h1>
                    <p>Manage product batches, verify authenticity, and track the supply chain.</p>
                </div>

                {/* Toolbar */}
                <div className="dashboard-toolbar">
                    <div className="toolbar-left">
                        <select value={role} onChange={handleRoleChange}>
                            <option>Manufacturer</option>
                            <option>Distributor</option>
                            <option>Pharmacy</option>
                            <option>Regulator</option>
                            <option>Consumer</option>
                        </select>
                        <div className="network-badge">
                            <span className={`network-dot ${account ? 'active' : ''}`}></span>
                            Sepolia {account ? '• Connected' : '• Disconnected'}
                        </div>
                    </div>
                </div>

                {/* Action Grid */}
                <div className="action-grid">

                    {/* Register Batch */}
                    {role === "Manufacturer" && (
                        <motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="card-top">
                                <h3>Register Product Batch</h3>
                                <div className="card-icon"><Plus size={18} /></div>
                            </div>
                            <div className="form-group">
                                <div className="form-row">
                                    <input placeholder="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
                                    <input placeholder="Product Name" value={drugName} onChange={(e) => setDrugName(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <input placeholder="Manufacture Date" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} />
                                    <input placeholder="Expiry Date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="card-footer">
                                <button className="card-btn" onClick={createBatch} disabled={loading}>
                                    {loading ? "Submitting..." : "Commit to Chain"} <ArrowRight size={14} />
                                </button>
                                {createTxHash && <span className="tx-link"><a href={`https://sepolia.etherscan.io/tx/${createTxHash}`} target="_blank" rel="noreferrer">View Tx ↗</a></span>}
                            </div>

                            {lastCreatedBatch && (
                                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                                    <QRCodeCanvas
                                        value={JSON.stringify({ BatchID: lastCreatedBatch.batchId, Product: lastCreatedBatch.drugName, Mfg: lastCreatedBatch.mfgDate, Exp: lastCreatedBatch.expDate }, null, 2)}
                                        size={80}
                                        fgColor="#000F08"
                                        bgColor="#FB3640"
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>QR Tag Generated</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{lastCreatedBatch.batchId} — {lastCreatedBatch.drugName}</div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Transfer */}
                    {(role === "Manufacturer" || role === "Distributor" || role === "Pharmacy") && (
                        <motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <div className="card-top">
                                <h3>Transfer Custody</h3>
                                <div className="card-icon"><ArrowRight size={18} /></div>
                            </div>
                            <div className="form-group">
                                <input placeholder="Batch ID" value={transferId} onChange={e => setTransferId(e.target.value)} />
                                <input placeholder="New Owner Address" value={newOwner} onChange={e => setNewOwner(e.target.value)} />
                            </div>
                            <div className="card-footer">
                                <button className="card-btn" onClick={transferBatch} disabled={loading}>
                                    {loading ? "Transferring..." : "Handoff"} <ArrowRight size={14} />
                                </button>
                                {transferTxHash && <span className="tx-link"><a href={`https://sepolia.etherscan.io/tx/${transferTxHash}`} target="_blank" rel="noreferrer">Tx ↗</a></span>}
                            </div>
                        </motion.div>
                    )}

                    {/* Verify */}
                    {role === "Consumer" && (
                        <motion.div className="action-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <div className="card-top">
                                <h3>Verify Authenticity</h3>
                                <div className="card-icon"><Search size={18} /></div>
                            </div>
                            <div className="form-group">
                                <input placeholder="Enter Batch ID" value={verifyId} onChange={e => setVerifyId(e.target.value)} />
                            </div>
                            <div className="card-footer">
                                <button className="card-btn" onClick={verifyBatch} disabled={loading}>
                                    {loading ? "Scanning..." : "Verify"} <Shield size={14} />
                                </button>
                            </div>

                            <AnimatePresence>
                                {batchData && (
                                    <motion.div className="verify-result" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }}>
                                        <div className="result-status">
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Result</span>
                                            <span className={`badge ${batchData.recalled ? 'recalled' : 'safe'}`}>
                                                {batchData.recalled ? "Recalled" : "Verified"}
                                            </span>
                                        </div>
                                        <div className="result-grid" style={{ marginBottom: "16px" }}>
                                            <div className="result-item"><div className="label">Batch ID</div><div className="value">{batchData.batchId}</div></div>
                                            <div className="result-item"><div className="label">Product</div><div className="value">{batchData.drugName}</div></div>
                                            <div className="result-item"><div className="label">Manufactured</div><div className="value">{batchData.mfgDate}</div></div>
                                            <div className="result-item"><div className="label">Expires</div><div className="value">{batchData.expDate}</div></div>
                                            <div className="result-item" style={{ gridColumn: 'span 2' }}><div className="label">Owner</div><div className="value">{batchData.owner}</div></div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderTop: '1px solid var(--border)' }}>
                                            <QRCodeCanvas
                                                value={JSON.stringify({ BatchID: batchData.batchId, Product: batchData.drugName, Mfg: batchData.mfgDate, Exp: batchData.expDate, Status: batchData.recalled ? 'Recalled' : 'Verified' }, null, 2)}
                                                size={80}
                                                fgColor="#000F08"
                                                bgColor="transparent"
                                            />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Verifiable QR Tag</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Scan for details</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* Recall */}
                    {role === "Regulator" && (
                        <motion.div className="action-card danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <div className="card-top">
                                <h3 style={{ color: '#ef4444' }}>Emergency Recall</h3>
                                <div className="card-icon" style={{ borderColor: '#fecaca' }}><AlertTriangle size={18} color="#ef4444" /></div>
                            </div>
                            <div className="form-group">
                                <input placeholder="Batch ID to recall" value={recallId} onChange={e => setRecallId(e.target.value)} />
                            </div>
                            <div className="card-footer">
                                <button className="card-btn danger" onClick={recallBatch} disabled={loading}>
                                    {loading ? "Processing..." : "Execute Recall"} <AlertTriangle size={14} />
                                </button>
                                {recallTxHash && <span className="tx-link"><a href={`https://sepolia.etherscan.io/tx/${recallTxHash}`} target="_blank" rel="noreferrer">Tx ↗</a></span>}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </>
    );
}

export default Dashboard;

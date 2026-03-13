import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    BookOpen, Shield, Layers, Box, QrCode, Cpu, BarChart3,
    Users, Globe, AlertTriangle, CheckCircle, ArrowRight
} from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

export default function Docs() {
    return (
        <>
            <nav className="navbar">
                <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>TrueTrace</Link>
                <div className="nav-links">
                    <Link to="/app" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>Dashboard</Link>
                    <Link to="/analytics" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>Analytics</Link>
                    <Link to="/docs" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600 }}>Docs</Link>
                </div>
                <div className="nav-right">
                    <Link to="/app" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
                        Open Dashboard
                    </Link>
                </div>
            </nav>

            <div className="docs-page">
                {/* Header */}
                <div className="docs-header">
                    <motion.h1 {...fadeUp}>Platform Documentation</motion.h1>
                    <motion.p {...fadeUp} transition={{ delay: 0.1 }}>
                        Everything you need to understand and use TrueTrace — a decentralized product authenticity platform built on blockchain.
                    </motion.p>
                </div>

                {/* Quick Nav */}
                <motion.div className="docs-quicknav" {...fadeUp}>
                    <a href="#what-is" onClick={e => { e.preventDefault(); document.getElementById('what-is')?.scrollIntoView({ behavior: 'smooth' }); }}>What is TrueTrace?</a>
                    <a href="#problem" onClick={e => { e.preventDefault(); document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' }); }}>The Problem</a>
                    <a href="#how-it-works" onClick={e => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>How It Works</a>
                    <a href="#features" onClick={e => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Key Features</a>
                    <a href="#roles" onClick={e => { e.preventDefault(); document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' }); }}>Who Uses It</a>
                    <a href="#industries" onClick={e => { e.preventDefault(); document.getElementById('industries')?.scrollIntoView({ behavior: 'smooth' }); }}>Industries</a>
                    <a href="#future" onClick={e => { e.preventDefault(); document.getElementById('future')?.scrollIntoView({ behavior: 'smooth' }); }}>Future Scope</a>
                </motion.div>

                {/* What is TrueTrace */}
                <motion.section className="docs-section" id="what-is" {...fadeUp}>
                    <div className="docs-section-icon"><BookOpen size={24} /></div>
                    <h2>What is TrueTrace?</h2>
                    <p>
                        TrueTrace is a <strong>decentralized anti-counterfeit intelligence platform</strong> that uses blockchain technology to guarantee the authenticity of products across global supply chains.
                    </p>
                    <p>
                        Every product registered on TrueTrace receives a unique, tamper-proof digital identity stored on the Ethereum blockchain. As the product moves from manufacturer to distributor to retailer to consumer, each step is permanently recorded and publicly verifiable.
                    </p>
                    <p>
                        Unlike traditional systems that rely on cloneable barcodes or centralized databases that can be hacked or manipulated, TrueTrace's records are immutable — once written, they cannot be altered by anyone.
                    </p>
                    <div className="docs-callout">
                        <strong>Core Promise:</strong> Any consumer, retailer, or regulator can verify the full history of a product in under 2 seconds by scanning its QR code — with complete confidence the data is genuine.
                    </div>
                </motion.section>

                {/* The Problem */}
                <motion.section className="docs-section" id="problem" {...fadeUp}>
                    <div className="docs-section-icon"><AlertTriangle size={24} color="#ef4444" /></div>
                    <h2>The Problem We're Solving</h2>
                    <p>
                        The global counterfeit trade is estimated at over <strong>$500 billion USD annually</strong>, affecting every major industry. Counterfeiting is not just an economic problem — it is a public safety crisis.
                    </p>

                    <div className="docs-problem-grid">
                        <div className="docs-problem-item">
                            <h4>Health Risks</h4>
                            <p>Fake medicines with incorrect dosages or toxic ingredients cause thousands of deaths every year in developing markets.</p>
                        </div>
                        <div className="docs-problem-item">
                            <h4>Safety Hazards</h4>
                            <p>Counterfeit automobile spare parts and electronics can fail catastrophically, putting lives at risk.</p>
                        </div>
                        <div className="docs-problem-item">
                            <h4>Financial Loss</h4>
                            <p>Brands lose billions in revenue while consumers pay full price for substandard or dangerous fakes.</p>
                        </div>
                        <div className="docs-problem-item">
                            <h4>Broken Trust</h4>
                            <p>Consumers cannot easily tell genuine products from counterfeits, eroding confidence in entire brands and industries.</p>
                        </div>
                    </div>

                    <p style={{ marginTop: '24px' }}>
                        Existing solutions — barcodes, holographic stickers, centralized databases — are all vulnerable. They can be cloned, faked, or tampered with. TrueTrace solves this by making the source of truth the blockchain itself, which no single actor controls.
                    </p>
                </motion.section>

                {/* How It Works */}
                <motion.section className="docs-section" id="how-it-works" {...fadeUp}>
                    <div className="docs-section-icon"><ArrowRight size={24} /></div>
                    <h2>How TrueTrace Works</h2>
                    <p>The entire lifecycle of a product is tracked in three simple stages:</p>

                    <div className="docs-flow-cards">
                        <div className="docs-flow-card">
                            <span className="flow-num">01</span>
                            <h4>Register</h4>
                            <p>A manufacturer registers a new product batch on the blockchain. The system records the Batch ID, product name, manufacture date, and expiry date permanently.</p>
                        </div>
                        <div className="docs-flow-arrow">→</div>
                        <div className="docs-flow-card">
                            <span className="flow-num">02</span>
                            <h4>Track</h4>
                            <p>As the product moves through the supply chain — distributor, retailer — each transfer of ownership is recorded on-chain, creating a complete, auditable chain of custody.</p>
                        </div>
                        <div className="docs-flow-arrow">→</div>
                        <div className="docs-flow-card">
                            <span className="flow-num">03</span>
                            <h4>Verify</h4>
                            <p>A consumer scans the product's QR code. TrueTrace instantly retrieves the blockchain record and displays the full product history along with a Trust Score.</p>
                        </div>
                    </div>

                    <p style={{ marginTop: '32px' }}>
                        At every step, TrueTrace's AI layer monitors scan behavior. If a product is scanned in multiple distant locations simultaneously, or if scan patterns look unusual, the system automatically flags it and adjusts the Trust Score downward.
                    </p>
                </motion.section>

                {/* Key Features */}
                <motion.section className="docs-section" id="features" {...fadeUp}>
                    <div className="docs-section-icon"><CheckCircle size={24} /></div>
                    <h2>Key Features</h2>

                    <div className="docs-feature-list">
                        <div className="docs-feature-row">
                            <div className="dfr-icon"><Box size={20} /></div>
                            <div>
                                <h4>Blockchain Product Identity</h4>
                                <p>Every product batch receives a permanent, tamper-proof record on the Ethereum blockchain. This record includes the batch ID, product name, manufacture date, expiry date, current owner, and recall status. No one can alter this record once it is created.</p>
                            </div>
                        </div>
                        <div className="docs-feature-row">
                            <div className="dfr-icon"><Layers size={20} /></div>
                            <div>
                                <h4>End-to-End Supply Chain Tracking</h4>
                                <p>Track the full journey of any product from the manufacturer all the way to the consumer. Every change of ownership — from factory to warehouse to pharmacy — is permanently timestamped and logged.</p>
                            </div>
                        </div>
                        <div className="docs-feature-row">
                            <div className="dfr-icon"><QrCode size={20} /></div>
                            <div>
                                <h4>QR Code Verification</h4>
                                <p>Each registered batch generates a unique QR code that contains verified product data. Consumers can scan this code with any smartphone camera to instantly retrieve the product's blockchain record and check its authenticity.</p>
                            </div>
                        </div>
                        <div className="docs-feature-row">
                            <div className="dfr-icon"><Users size={20} /></div>
                            <div>
                                <h4>Role-Based Dashboards</h4>
                                <p>Each participant in the supply chain gets a tailored dashboard. Manufacturers register batches. Distributors and pharmacies transfer ownership. Consumers verify products. Regulators can monitor anomalies and recall dangerous batches.</p>
                            </div>
                        </div>
                        <div className="docs-feature-row">
                            <div className="dfr-icon"><Cpu size={20} /></div>
                            <div>
                                <h4>AI Anomaly Detection</h4>
                                <p>TrueTrace's intelligence layer continuously monitors scan behavior. It flags suspicious activity such as a single product being scanned in two different cities within minutes — a strong signal of a cloned or counterfeit item.</p>
                            </div>
                        </div>
                        <div className="docs-feature-row">
                            <div className="dfr-icon"><BarChart3 size={20} /></div>
                            <div>
                                <h4>Dynamic Trust Score</h4>
                                <p>Every product batch carries a live Trust Score from 0 to 100, reflecting its authenticity confidence. The score starts at 100 and decreases when suspicious scans are detected. A high score means a clean, verified supply chain.</p>
                            </div>
                        </div>
                        <div className="docs-feature-row">
                            <div className="dfr-icon"><Shield size={20} /></div>
                            <div>
                                <h4>Emergency Recall System</h4>
                                <p>Authorized regulators can immediately flag any product batch as recalled on the blockchain. This update is instant and globally visible to anyone who scans the product's QR code, preventing further sale or use of dangerous items.</p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Who Uses It */}
                <motion.section className="docs-section" id="roles" {...fadeUp}>
                    <div className="docs-section-icon"><Users size={24} /></div>
                    <h2>Who Uses TrueTrace</h2>

                    <div className="roles-grid">
                        <div className="role-card">
                            <Box size={20} />
                            <h4>Manufacturers</h4>
                            <ul>
                                <li>Register new product batches</li>
                                <li>Generate QR codes for products</li>
                                <li>Transfer products to distributors</li>
                                <li>Monitor distribution analytics</li>
                            </ul>
                        </div>
                        <div className="role-card">
                            <Layers size={20} />
                            <h4>Distributors</h4>
                            <ul>
                                <li>Receive products from manufacturers</li>
                                <li>Transfer ownership down the chain</li>
                                <li>Track every shipment on-chain</li>
                            </ul>
                        </div>
                        <div className="role-card">
                            <Shield size={20} />
                            <h4>Pharmacies & Retailers</h4>
                            <ul>
                                <li>Verify product authenticity</li>
                                <li>Receive and pass on products</li>
                                <li>Detect suspicious batches before sale</li>
                            </ul>
                        </div>
                        <div className="role-card">
                            <QrCode size={20} />
                            <h4>Consumers</h4>
                            <ul>
                                <li>Scan product QR codes</li>
                                <li>View full product history</li>
                                <li>Check Trust Score before purchase</li>
                            </ul>
                        </div>
                        <div className="role-card danger">
                            <AlertTriangle size={20} color="#ef4444" />
                            <h4>Regulators</h4>
                            <ul>
                                <li>Issue emergency product recalls</li>
                                <li>Access global supply chain analytics</li>
                                <li>Investigate counterfeit hotspots</li>
                            </ul>
                        </div>
                    </div>
                </motion.section>

                {/* Industries */}
                <motion.section className="docs-section" id="industries" {...fadeUp}>
                    <div className="docs-section-icon"><Globe size={24} /></div>
                    <h2>Supported Industries</h2>
                    <p>
                        TrueTrace is designed to be <strong>industry-agnostic</strong>. Any supply chain where counterfeit goods pose a risk can benefit from the platform.
                    </p>

                    <div className="docs-industry-grid">
                        {[
                            { name: "Pharmaceuticals", desc: "Ensure medications are genuine and uncontaminated before reaching patients.", risk: "Critical" },
                            { name: "Electronics", desc: "Verify components are not counterfeit before installation in critical systems.", risk: "High" },
                            { name: "Luxury Goods", desc: "Protect brand reputation and confirm authenticity of high-value items.", risk: "High" },
                            { name: "Automobile Parts", desc: "Prevent dangerous fake spare parts from entering the repair supply chain.", risk: "Critical" },
                            { name: "Cosmetics", desc: "Protect consumers from skin-damaging counterfeit beauty products.", risk: "Medium" },
                            { name: "FMCG Products", desc: "Track fast-moving consumer goods at scale across global markets.", risk: "Medium" },
                            { name: "Agricultural Inputs", desc: "Verify seeds, fertilizers, and pesticides are authentic before crop use.", risk: "High" },
                            { name: "Any Supply Chain", desc: "Any industry where product integrity and consumer trust are paramount.", risk: "Variable" },
                        ].map((ind, i) => (
                            <motion.div className="docs-industry-card" key={i} {...fadeUp} transition={{ delay: i * 0.05 }}>
                                <div className="di-header">
                                    <h4>{ind.name}</h4>
                                    <span className={`di-risk ${ind.risk.toLowerCase()}`}>{ind.risk}</span>
                                </div>
                                <p>{ind.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Future Scope */}
                <motion.section className="docs-section" id="future" {...fadeUp}>
                    <div className="docs-section-icon"><BarChart3 size={24} /></div>
                    <h2>Future Scope</h2>
                    <p>TrueTrace is an evolving platform. The following capabilities are on the roadmap:</p>

                    <div className="docs-future-list">
                        <div className="docs-future-item">
                            <span className="future-num">01</span>
                            <div>
                                <h4>IoT Sensor Integration</h4>
                                <p>Physical sensors attached to shipments will automatically log temperature, location, and handling events directly to the blockchain in real time.</p>
                            </div>
                        </div>
                        <div className="docs-future-item">
                            <span className="future-num">02</span>
                            <div>
                                <h4>Machine Learning Prediction</h4>
                                <p>Advanced ML models will predict counterfeit risk scores before anomalies are detected by analyzing historical patterns in scan and transfer data.</p>
                            </div>
                        </div>
                        <div className="docs-future-item">
                            <span className="future-num">03</span>
                            <div>
                                <h4>Global Supply Chain Data Sharing</h4>
                                <p>Cross-organization data sharing will allow industry consortiums to collaborate on counterfeit intelligence without compromising competitive data.</p>
                            </div>
                        </div>
                        <div className="docs-future-item">
                            <span className="future-num">04</span>
                            <div>
                                <h4>Government Regulatory Integration</h4>
                                <p>Direct API connections with national drug regulatory authorities and customs agencies to enable real-time compliance checks at borders.</p>
                            </div>
                        </div>
                        <div className="docs-future-item">
                            <span className="future-num">05</span>
                            <div>
                                <h4>Native Mobile Application</h4>
                                <p>A dedicated mobile app for consumers to scan products, view history, and receive instant counterfeit alerts — no technical knowledge required.</p>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>
        </>
    );
}

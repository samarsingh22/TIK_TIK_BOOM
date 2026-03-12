import React, { useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Shield, Layers, Box, QrCode, Cpu, BarChart3, Database, Code2, Users, AlertTriangle } from 'lucide-react';

/* ---- Particle Globe ---- */
function ParticleGlobe() {
    const meshRef = useRef();
    const count = 4000;

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const y = 1 - (i / (count - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = ((Math.sqrt(5) - 1) / 2) * i * Math.PI * 2;
            pos[i * 3] = Math.cos(theta) * radius * 2.75;
            pos[i * 3 + 1] = y * 2.75;
            pos[i * 3 + 2] = Math.sin(theta) * radius * 2.75;
        }
        return pos;
    }, []);

    useFrame(({ clock }) => {
        if (meshRef.current) {
            const t = clock.getElapsedTime();
            meshRef.current.rotation.y = t * 0.08;
            meshRef.current.rotation.x = Math.sin(t * 0.05) * 0.15 + 0.15;
            meshRef.current.rotation.z = Math.sin(t * 0.03) * 0.08;
        }
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.03} color="#000F08" transparent opacity={0.6} sizeAttenuation />
        </points>
    );
}

function GlobeScene() {
    return (
        <>
            <ambientLight intensity={1} />
            <ParticleGlobe />
        </>
    );
}

/* ---- Smooth scroll helper ---- */
function scrollTo(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- Navbar ---- */
function Navbar() {
    return (
        <nav className="navbar">
            <div className="nav-logo">TrueTrace</div>
            <div className="nav-links">
                <a href="#overview" onClick={(e) => scrollTo(e, 'overview')}>Problem & Solution</a>
                <a href="#features" onClick={(e) => scrollTo(e, 'features')}>Core Features</a>
                <a href="#tech" onClick={(e) => scrollTo(e, 'tech')}>Architecture</a>
            </div>
            <div className="nav-right">
                <Link to="/app" className="btn-primary" style={{ textDecoration: 'none' }}>
                    Launch App <span>→</span>
                </Link>
            </div>
        </nav>
    );
}

/* ---- Metrics Row ---- */
function Metrics() {
    const stats = [
        { number: '$500B+', label: 'Global counterfeit market', brand: 'WHO Estimate' },
        { number: '7+', label: 'Industries protected', brand: 'Cross-Sector' },
        { number: '100%', label: 'Tamper-proof records', brand: 'Blockchain Verified' },
        { number: '<2s', label: 'Verification time', brand: 'Real-time Analytics' },
    ];

    return (
        <div className="metrics-row">
            {stats.map((s, i) => (
                <motion.div className="metric-item" key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                    <div className="metric-number">{s.number}</div>
                    <div className="metric-label">{s.label}</div>
                    <div className="metric-brand">{s.brand}</div>
                </motion.div>
            ))}
        </div>
    );
}

export default function Landing() {
    return (
        <div className="landing-wrapper">
            <Navbar />

            {/* HERO SECTION */}
            <section className="hero">
                <div className="hero-left">
                    <motion.span className="hero-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                        Universal Anti-Counterfeit Intelligence
                    </motion.span>

                    <motion.h1 className="hero-headline" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}>
                        True
                        <br />
                        Trace
                    </motion.h1>

                    <motion.p className="hero-paragraph" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}>
                        A decentralized platform ensuring product authenticity across global supply chains. We integrate blockchain verification with AI anomaly detection to protect brands and consumers.
                    </motion.p>

                    <motion.div className="hero-buttons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
                        <Link to="/app" className="btn-primary" style={{ textDecoration: 'none' }}>
                            Enter Dashboard <span>→</span>
                        </Link>
                        <a href="#overview" className="btn-secondary" style={{ textDecoration: 'none' }} onClick={(e) => scrollTo(e, 'overview')}>
                            Read Documentation
                        </a>
                    </motion.div>
                </div>
                <div className="hero-right">
                    <div className="globe-canvas">
                        <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                            <GlobeScene />
                        </Canvas>
                    </div>
                </div>
            </section>

            <Metrics />

            {/* PROBLEM & SOLUTION SECTION */}
            <section className="doc-section" id="overview">
                <div className="doc-container">
                    <div className="doc-header">
                        <h2>The Counterfeit Crisis</h2>
                        <p>Traditional verification systems rely on cloneable barcodes and centralized, manipulatable databases that leave supply chains vulnerable.</p>
                    </div>
                    <div className="problem-solution-grid">
                        <div className="ps-card problem">
                            <div className="ps-icon"><AlertTriangle size={28} color="#ef4444" /></div>
                            <h3>The Problem</h3>
                            <ul>
                                <li><strong>Global Impact:</strong> Over $500 billion USD lost annually to illicit trade.</li>
                                <li><strong>Severe Risks:</strong> Fake medicines and unsafe automobile parts endanger lives.</li>
                                <li><strong>Legacy Flaws:</strong> Highly vulnerable to QR code cloning and data tampering.</li>
                                <li><strong>Opaque Movement:</strong> Complete lack of transparency in standard supply chains.</li>
                            </ul>
                        </div>
                        <div className="ps-card solution">
                            <div className="ps-icon"><Shield size={28} color="#15803d" /></div>
                            <h3>The TrueTrace Solution</h3>
                            <ul>
                                <li><strong>Blockchain Security:</strong> Tamper-proof digital product identities stored on-chain.</li>
                                <li><strong>Intelligent Tracking:</strong> Full traceability across all supply chain actors.</li>
                                <li><strong>Anomaly Analytics:</strong> Trust scores actively adjust based on AI behavioral checks.</li>
                                <li><strong>Instant scanning:</strong> Live consumer verification through static or dynamic QR payload validation.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CORE FEATURES SECTION */}
            <section className="doc-section bg-alt" id="features">
                <div className="doc-container">
                    <div className="doc-header">
                        <h2>Core Features</h2>
                        <p>TrueTrace robustly pairs the unchangeable ledger of blockchain with modern statistical anomaly detection.</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <Box className="f-icon" />
                            <h4>Blockchain Product Identity</h4>
                            <p>Every product batch is registered on-chain with immutable metadata including Batch ID, expiry date, and live recall status.</p>
                        </div>
                        <div className="feature-card">
                            <Layers className="f-icon" />
                            <h4>Supply Chain Tracking</h4>
                            <p>Track product movement from Manufacturer to Distributor, Retailer, and Consumer. Each transfer definitively updates the immutable ledger.</p>
                        </div>
                        <div className="feature-card">
                            <QrCode className="f-icon" />
                            <h4>QR Code Verification</h4>
                            <p>Rich QR tags allow consumers and authorities to effortlessly scan and retrieve live product data directly from the Ethereum smart contract.</p>
                        </div>
                        <div className="feature-card">
                            <Cpu className="f-icon" />
                            <h4>AI Anomaly Detection</h4>
                            <p>Frontend analytics logic flags suspicious scan behaviors—like a single batch ID scanned in different cities just minutes apart.</p>
                        </div>
                        <div className="feature-card">
                            <BarChart3 className="f-icon" />
                            <h4>Dynamic Trust Score</h4>
                            <p>Products receive a dynamic authenticity score (0-100), depreciating immediately upon the detection of irregular scan vectors or geographical mismatches.</p>
                        </div>
                        <div className="feature-card">
                            <Users className="f-icon" />
                            <h4>Role-Based Access</h4>
                            <p>Unique DApp dashboards provide Manufacturers, Distributors, Retailers, Consumers, and Regulators with tailored operational capabilities.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ARCHITECTURE SECTION */}
            <section className="doc-section" id="tech">
                <div className="doc-container">
                    <div className="doc-header">
                        <h2>System Architecture</h2>
                        <p>A modernized, entirely decentralized stack running on the Ethereum Sepolia network.</p>
                    </div>
                    <div className="arch-flow">
                        <div className="arch-step">
                            <Code2 size={32} />
                            <span>React Frontend</span>
                            <small>Vite & Framer Motion</small>
                        </div>
                        <div className="arch-arrow">→</div>
                        <div className="arch-step">
                            <Shield size={32} />
                            <span>MetaMask Auth</span>
                            <small>Ethers.js Gateway</small>
                        </div>
                        <div className="arch-arrow">→</div>
                        <div className="arch-step">
                            <Database size={32} />
                            <span>Smart Contract</span>
                            <small>Solidity / EVM</small>
                        </div>
                        <div className="arch-arrow">→</div>
                        <div className="arch-step">
                            <BarChart3 size={32} />
                            <span>Intelligence</span>
                            <small>Log Analytics</small>
                        </div>
                    </div>

                    <div className="doc-header" style={{ marginTop: '80px', marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>The Future Scope</h3>
                    </div>
                    <div className="tech-tags">
                        <span className="tech-tag">IoT Sensor Integration</span>
                        <span className="tech-tag">Advanced Machine Learning Prediction</span>
                        <span className="tech-tag">Global Supply Chain Data Sharing</span>
                        <span className="tech-tag">Government Regulatory APIs</span>
                        <span className="tech-tag">Native Mobile Verifier App</span>
                    </div>
                </div>
            </section>

            {/* CTA FOOTER */}
            <section className="cta-footer">
                <h2>Secure Your Supply Chain Today</h2>
                <p>Join the decentralized network driving down counterfeit risks across global industries.</p>
                <div className="mt-8">
                    <Link to="/app" className="btn-primary" style={{ textDecoration: 'none' }}>
                        Enter TrueTrace
                    </Link>
                </div>
            </section>
        </div>
    );
}

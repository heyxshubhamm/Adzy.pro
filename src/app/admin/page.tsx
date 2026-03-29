"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import NeuralGrid from "@/components/Admin/NeuralGrid";
import TopologyMap from "@/components/Admin/TopologyMap";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [gridNodes, setGridNodes] = useState<any[]>([]);
  const [topology, setTopology] = useState<any>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsData, gridData, topologyData] = await Promise.all([
          api("/api/admin/stats"),
          api("/api/admin/neural-grid"),
          api("/api/admin/topology")
        ]);
        setStats(statsData);
        setGridNodes(gridData);
        setTopology(topologyData);
      } catch (error) {
        console.error("Mission Control Telemetry Offline:", error);
      }
    };
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // 30s heartbeat
    return () => clearInterval(interval);
  }, []);

  if (!stats || !topology) return <div className="p-8 text-[#00f0ff] font-mono pulse">INITIATING COMMAND CENTER...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Mission Control</h1>
          <div className={styles.pulseContainer}>
            <span className={styles.pulseDot} />
            <span className={styles.pulseLabel}>System Integrity: Nominal</span>
          </div>
        </div>
        <div className={styles.lastSync}>
          Last Telemetry: {new Date().toLocaleTimeString()}
        </div>
      </header>

      <div className={styles.mainGrid}>
        {/* TOPOLOGY SECTION */}
        <section className={styles.topologySection}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Domain Networking Topology</h2>
            <p className={styles.sectionSubtitle}>Mapping Seed-to-node hierarchies</p>
          </header>
          <TopologyMap nodes={topology.nodes} links={topology.links} />
        </section>

        {/* NEURAL GRID SECTION */}
        <section className={styles.neuralSection}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Intelligence Pulse (QA)</h2>
            <p className={styles.sectionSubtitle}>10x10 Neural Grid Monitor</p>
          </header>
          <NeuralGrid nodes={gridNodes} />
          
          <div className={styles.statsSummary}>
            <div className={styles.miniStat}>
              <label>Gross Volume</label>
              <span>${stats.total_revenue.toLocaleString()}</span>
            </div>
            <div className={styles.miniStat}>
              <label>Network DR</label>
              <span>Avg 42.5</span>
            </div>
          </div>
        </section>
      </div>

      <footer className={styles.bottomBar}>
        <div className={styles.marquee}>
          <span>ALERT: Incoming domain verify request for saas-outreach.com...</span>
          <span>SUCCESS: Ranking algorithm re-cached 42 listings...</span>
          <span>NOTICE: 12 new publishers joined the meritocracy...</span>
        </div>
      </footer>
    </div>
  );
}

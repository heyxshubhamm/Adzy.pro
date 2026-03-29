"use client";

import styles from "./NeuralGrid.module.css";

interface Node {
  id: number;
  feature: string;
  status: "healthy" | "warning" | "critical";
  pulse: number;
}

export default function NeuralGrid({ nodes }: { nodes: Node[] }) {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`${styles.node} ${styles[node.status]}`}
            title={`${node.feature} - ${node.status}`}
            style={{
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.5 + node.pulse * 0.5
            }}
          />
        ))}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.dotHealthy} /> Nominal</span>
        <span className={styles.legendItem}><span className={styles.dotWarning} /> Divergence</span>
        <span className={styles.legendItem}><span className={styles.dotCritical} /> Critical</span>
      </div>
    </div>
  );
}

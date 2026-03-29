"use client";

import { useEffect, useRef } from "react";
import styles from "./TopologyMap.module.css";

interface Node {
  id: string;
  label: string;
  type: string;
  health: number;
}

interface Link {
  source: string;
  target: string;
}

export default function TopologyMap({ nodes, links }: { nodes: Node[]; links: Link[] }) {
  const containerRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Simple circular layout calculation
    const svg = containerRef.current;
    if (!svg) return;
    
    // In a real high-fidelity app, we'd use d3-force or similar
    // For this implementation, we'll use a CSS-driven SVG topology
  }, [nodes, links]);

  return (
    <div className={styles.wrapper}>
      <svg ref={containerRef} viewBox="0 0 500 500" className={styles.svg}>
        {/* Core Connection Lines */}
        {nodes.map((node, i) => {
          if (node.id === "adzy-core") return null;
          const angle = (i / (nodes.length - 1)) * Math.PI * 2;
          const x = 250 + 180 * Math.cos(angle);
          const y = 250 + 180 * Math.sin(angle);
          return (
            <line
              key={`link-${node.id}`}
              x1="250" y1="250"
              x2={x} y2={y}
              className={styles.link}
            />
          );
        })}

        {/* Central Core */}
        <circle cx="250" cy="250" r="40" className={styles.core} />
        <text x="250" y="255" textAnchor="middle" className={styles.coreLabel}>CORE</text>

        {/* Satellite Nodes */}
        {nodes.map((node, i) => {
          if (node.id === "adzy-core") return null;
          const angle = (i / (nodes.length - 1)) * Math.PI * 2;
          const x = 250 + 180 * Math.cos(angle);
          const y = 250 + 180 * Math.sin(angle);
          
          return (
            <g key={node.id} className={styles.nodeGroup}>
              <circle
                cx={x} cy={y} r="12"
                className={`${styles.node} ${styles[node.type.toLowerCase()]}`}
              />
              <text x={x} y={y + 25} textAnchor="middle" className={styles.label}>
                {node.label.split('.')[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

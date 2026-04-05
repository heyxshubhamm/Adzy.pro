"use client";
import React, { useState, useRef, useEffect } from "react";

export function ExportButton({
  onExport,
  exporting,
}: {
  onExport: (type: "basic" | "full") => void;
  exporting: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex" }}>
        <button
          onClick={() => onExport("basic")}
          disabled={exporting}
          style={{
            padding:           "8px 14px",
            fontSize:          13,
            borderRadius:      "7px 0 0 7px",
            border:            "0.5px solid var(--border)",
            borderRight:       "none",
            background:        "var(--background)",
            color:             "var(--foreground)",
            cursor:            exporting ? "not-allowed" : "pointer",
            opacity:           exporting ? 0.6 : 1,
            fontFamily:        "inherit",
          }}
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            padding:     "8px 8px",
            fontSize:    11,
            borderRadius:"0 7px 7px 0",
            border:      "0.5px solid var(--border)",
            background:  "var(--background)",
            color:       "var(--text-muted)",
            cursor:      "pointer",
            fontFamily:  "inherit",
          }}
        >
          ▾
        </button>
      </div>

      {open && (
        <div style={{
          position:   "absolute",
          top:        "calc(100% + 4px)",
          right:      0,
          background: "var(--background)",
          border:     "0.5px solid var(--border)",
          borderRadius: 8,
          overflow:   "hidden",
          zIndex:     50,
          minWidth:   180,
          boxShadow:  "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {[
            { type: "basic" as const, label: "Basic export",
              sub: "ID, name, email, role, status" },
            { type: "full"  as const, label: "Full export",
              sub: "Includes orders & revenue" },
          ].map(opt => (
            <button
              key={opt.type}
              onClick={() => { onExport(opt.type); setOpen(false); }}
              style={{
                display:        "flex",
                flexDirection:  "column",
                gap:            2,
                width:          "100%",
                padding:        "10px 14px",
                border:         "none",
                background:     "transparent",
                cursor:         "pointer",
                textAlign:      "left",
                fontFamily:     "inherit",
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.background = "var(--secondary)")
              }
              onMouseLeave={e =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {opt.sub}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

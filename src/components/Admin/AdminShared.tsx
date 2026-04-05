"use client";
import React, { useState } from "react";

export function Pagination({ current, total, onChange }:
  { current:number; total:number; onChange:(p:number)=>void }) {
  if (total <= 1) return null;
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:16 }}>
      {Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{
            width:32, height:32, borderRadius:7, fontSize:13, cursor:"pointer",
            border:"0.5px solid var(--border)",
            background: p === current ? "var(--primary)" : "transparent",
            color:      p === current ? "#fff" : "var(--foreground)",
            fontWeight: p === current ? 600 : 400,
          }}>
          {p}
        </button>
      ))}
    </div>
  );
}

export function PromoteModal({ user, onConfirm, onCancel }:
  { user:any; onConfirm:(role:string)=>void; onCancel:()=>void }) {
  const [newRole, setNewRole] = useState(
    user.role === "buyer" ? "seller" : "admin"
  );
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"var(--background)", borderRadius:12,
        padding:24, width:320, border:"0.5px solid var(--border)" }}>
        <h2 style={{ fontSize:16, fontWeight:600, margin: "0 0 8px 0" }}>Change role</h2>
        <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>
          Change <strong>{user.username}</strong>'s role from{" "}
          <strong>{user.role}</strong> to:
        </p>
        <select value={newRole} onChange={e => setNewRole(e.target.value)}
          style={{ width:"100%", marginBottom:20, padding: "8px 12px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
          {["buyer","seller","admin"].filter(r => r !== user.role).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Cancel</button>
          <button onClick={() => onConfirm(newRole)}
            style={{ background:"var(--primary)", color:"#fff", border:"none",
              padding:"8px 16px", borderRadius:8, fontSize:13,
              fontWeight:500, cursor:"pointer" }}>
            Change role
          </button>
        </div>
      </div>
    </div>
  );
}

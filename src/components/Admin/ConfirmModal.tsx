import React from "react";

export function ConfirmModal({ 
  title, message, confirmLabel, danger, onConfirm, onCancel 
}: { 
  title:string; message:string; confirmLabel:string; danger?:boolean;
  onConfirm:()=>void; onCancel:()=>void 
}) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"var(--background)", borderRadius:12,
        padding:24, width:320, border:"0.5px solid var(--border)" }}>
        <h2 style={{ fontSize:16, fontWeight:600, margin: "0 0 8px 0" }}>{title}</h2>
        <p style={{ fontSize:13, color:"var(--text-muted)",
          marginBottom:20, lineHeight:1.6 }}>{message}</p>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ background: danger ? "#E24B4A" : "var(--primary)",
              color:"#fff", border:"none", padding:"8px 16px",
              borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

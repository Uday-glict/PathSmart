import React from "react";
import StepForm from "./StepForm.jsx";

export default function StepPanel({ steps, setSteps, onSave }) {
  function updateStep(id, patch) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeStep(id) {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, order: idx + 1 }))
    );
  }

  return (
    <aside
      style={{
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 10,
        padding: 12,
        background: "#0f1530",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
      }}
    >
      <h3 style={{ margin: "4px 0 8px", fontSize: 16, color: "#c7d2fe" }}>
        Steps ({steps.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
        {steps.map((s) => (
          <div
            key={s.id}
            style={{
              padding: 8,
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 8,
              background: "#0e1530",
            }}
          >
            <StepForm step={s} onChange={(patch) => updateStep(s.id, patch)} />
            <button
              onClick={() => removeStep(s.id)}
              style={{
                marginTop: 8,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                padding: "6px 8px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Delete Step
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onSave}
        style={{
          marginTop: "auto",
          padding: "10px 12px",
          borderRadius: 8,
          border: 0,
          background: "#10b981",
          color: "#071b15",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Save
      </button>
    </aside>
  );
}

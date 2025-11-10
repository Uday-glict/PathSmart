import React from "react";

export default function StepForm({ step, onChange }) {
  const { title, description, placement } = step;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <input
        style={inputStyle}
        value={title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Step title"
      />
      <textarea
        style={textAreaStyle}
        value={description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Describe what to do…"
      />
      <label style={{ fontSize: 12, color: "#aab3d9", display: "flex", alignItems: "center", gap: 6 }}>
        Placement
        <select
          style={selectStyle}
          value={placement}
          onChange={(e) => onChange({ placement: e.target.value })}
        >
          <option value="top">top</option>
          <option value="right">right</option>
          <option value="bottom">bottom</option>
          <option value="left">left</option>
        </select>
      </label>
    </div>
  );
}

const baseInput = {
  width: "100%",
  background: "#0b122b",
  color: "#e7ecff",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8,
  padding: "8px 10px",
};
const inputStyle = { ...baseInput };
const textAreaStyle = { ...baseInput, minHeight: 64, resize: "vertical" };
const selectStyle = { ...baseInput, padding: "6px 8px" };

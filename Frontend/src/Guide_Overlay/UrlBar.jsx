import React, { useState } from "react";

export default function UrlBar({ url, onChange, onPreview }) {
  const [local, setLocal] = useState(url);
  return (
    <>
      <input
        style={inputStyle}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="https://example.com"
      />
      <button
        style={{
          ...buttonStyle,
          background: "#5b8cff",
          borderColor: "transparent",
          color: "#fff",
        }}
        onClick={() => {
          onChange(local);
          onPreview?.();
        }}
      >
        Preview
      </button>
    </>
  );
}

const inputStyle = {
  flex: 1,
  minWidth: 280,
  padding: "10px",
  background: "#0e1530",
  color: "#e7ecff",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: "8px",
};
const buttonStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,.08)",
  background: "#0f1a3a",
  color: "#e7ecff",
  cursor: "pointer",
};

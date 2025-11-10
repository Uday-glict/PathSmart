import React from "react";

export default function Overlay({ onPick, steps }) {
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPick(e.clientX, e.clientY);
      }}
      style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}
      title="Click to add a step here"
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          background: "rgba(0,0,0,.5)",
          padding: "6px 8px",
          borderRadius: 6,
          fontSize: 12,
          color: "#e5e7eb",
        }}
      >
        Click anywhere to add a step
      </div>

      {steps?.map((s, i) => {
        const t = s.target;
        if (!t) return null;
        const style =
          t.type === "coords"
            ? { left: `${(t.xRel * 100).toFixed(2)}%`, top: `${(t.yRel * 100).toFixed(2)}%` }
            : { left: "4px", top: `${6 + i * 22}px` };
        return (
          <div
            key={s.id}
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              border: "2px solid white",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 0 2px rgba(0,0,0,.35)",
              ...style,
            }}
            title={`Step ${i + 1}`}
          />
        );
      })}
    </div>
  );
}

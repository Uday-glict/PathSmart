import React, { useEffect, useRef, useState } from "react";

export default function GuidePreview({ url, steps }) {
  const wrapRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [sameOrigin, setSameOrigin] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => setCurrent(0), [url, steps]);

  function onLoad() {
    try {
      const _ = iframeRef.current.contentDocument;
      setSameOrigin(true);
    } catch {
      setSameOrigin(false);
    }
  }

  const step = steps[current];
  const tooltip = step ? makeTooltipPosition(step, wrapRef, iframeRef, sameOrigin) : null;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <iframe ref={iframeRef} src={url} title="preview" style={iframeStyle} onLoad={onLoad} />
      {step && tooltip && (
        <div style={{ ...tooltipStyle, left: tooltip.left, top: tooltip.top }}>
          <div style={indexDot}>{current + 1}</div>
          <h4 style={{ margin: "2px 0 4px", fontSize: 14 }}>{step.title}</h4>
          <p style={{ margin: 0, fontSize: 12, color: "#cbd5e1" }}>{step.description}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={btn} disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
              Back
            </button>
            <button
              style={btn}
              onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
              disabled={current === steps.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function makeTooltipPosition(step, wrapRef, iframeRef, sameOrigin) {
  const wrapRect = wrapRef.current.getBoundingClientRect();
  let anchor = { x: wrapRect.left + wrapRect.width / 2, y: wrapRect.top + wrapRect.height / 2 };

  if (step.target?.type === "coords") {
    anchor = {
      x: wrapRect.left + step.target.xRel * wrapRect.width,
      y: wrapRect.top + step.target.yRel * wrapRect.height,
    };
  } else if (step.target?.type === "selector" && sameOrigin) {
    try {
      const doc = iframeRef.current.contentDocument;
      const el = doc.querySelector(step.target.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        const iframeRect = iframeRef.current.getBoundingClientRect();
        anchor = { x: iframeRect.left + r.left + r.width / 2, y: iframeRect.top + r.top + r.height / 2 };
      }
    } catch {}
  }

  const offset = 12;
  let left = anchor.x;
  let top = anchor.y;
  switch (step.placement) {
    case "top":
      top -= 60 + offset;
      left -= 110;
      break;
    case "right":
      left += offset;
      top -= 30;
      break;
    case "bottom":
      top += offset;
      left -= 110;
      break;
    case "left":
      left -= 220 + offset;
      top -= 30;
      break;
    default:
      top -= 60 + offset;
      left -= 110;
  }
  return { left, top };
}

const iframeStyle = { width: "100%", height: "100%", border: 0, background: "#fff" };
const tooltipStyle = {
  position: "fixed",
  padding: "10px 12px",
  background: "#111827",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8,
  maxWidth: 240,
  color: "#e5e7eb",
};
const indexDot = {
  position: "absolute",
  top: -9,
  left: -9,
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "#5b8cff",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  border: "2px solid #0b1020",
};
const btn = {
  background: "#0b122b",
  color: "#e7ecff",
  border: "1px solid rgba(255,255,255,.12)",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
};

import React, { useEffect, useRef, useState } from "react";
import Overlay from "./Overlay.jsx";

export default function IframeStage({ url, iframeRef, onPointPicked, steps }) {
  const wrapRef = useRef(null);
  const [sameOrigin, setSameOrigin] = useState(false);

  function onLoad() {
    try {
      const _ = iframeRef.current.contentDocument;
      setSameOrigin(true);
    } catch {
      setSameOrigin(false);
    }
  }

  function handlePick(clientX, clientY) {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const xRel = x / rect.width;
    const yRel = y / rect.height;

    let selector = null;
    if (sameOrigin) {
      try {
        const doc = iframeRef.current.contentDocument;
        const ex = xRel * doc.documentElement.clientWidth;
        const ey = yRel * doc.documentElement.clientHeight;
        const el = doc.elementFromPoint(ex, ey);
        if (el) selector = cssPath(el);
      } catch {}
    }
    onPointPicked({ xRel, yRel, selector });
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <iframe
        ref={iframeRef}
        src={url}
        title="preview"
        style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
        onLoad={onLoad}
      />
      <Overlay onPick={handlePick} steps={steps} />
    </div>
  );
}

function cssPath(el) {
  if (!(el instanceof Element)) return null;
  const path = [];
  let depth = 0;
  while (el && el.nodeType === 1 && depth < 6) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += `#${el.id}`;
      path.unshift(selector);
      break;
    } else {
      let sib = el,
        nth = 1;
      while ((sib = sib.previousElementSibling)) nth++;
      selector += `:nth-child(${nth})`;
    }
    path.unshift(selector);
    el = el.parentElement;
    depth++;
  }
  return path.join(" > ");
}

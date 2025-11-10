// src/guide_overlay/GuideOverlayMain.jsx
import React, { useMemo, useRef, useState } from "react";
import UrlBar from "./UrlBar.jsx";
import IframeStage from "./IframeStage.jsx";
import StepPanel from "./StepPanel.jsx";
import GuidePreview from "./GuidePreview.jsx";
import { createGuide, updateGuide } from "../api.js"; // keep api.js at src/api.js

export default function GuideOverlayMain() {
  const [url, setUrl] = useState("https://example.com");
  const [steps, setSteps] = useState([]);
  const [guideName, setGuideName] = useState("My First Guide");
  const [mode, setMode] = useState("build"); // 'build' | 'preview'
  const [savedGuideId, setSavedGuideId] = useState(null);
  const iframeRef = useRef(null);

  const orderedSteps = useMemo(
    () => steps.slice().sort((a, b) => a.order - b.order),
    [steps]
  );

  // Add step from overlay click
  function addStepFromPoint(pt) {
    const id = crypto.randomUUID();
    const order = steps.length + 1;
    const placement = "top";
    const target = pt.selector
      ? { type: "selector", selector: pt.selector }
      : { type: "coords", xRel: pt.xRel, yRel: pt.yRel };
    const next = {
      id,
      title: "New Step",
      description: "Describe this step…",
      placement,
      order,
      target,
    };
    setSteps((prev) => [...prev, next]);
  }

  // Save to backend
  async function handleSave() {
    const payload = { baseUrl: url, name: guideName, steps };
    if (!savedGuideId) {
      const saved = await createGuide(payload);
      setSavedGuideId(saved.id);
      alert(`Saved guide: ${saved.id}`);
    } else {
      await updateGuide(savedGuideId, payload);
      alert("Guide updated");
    }
  }

  return (
    <div className="app">
      <div style={headerStyle}>
        <input
          style={inputStyle}
          value={guideName}
          onChange={(e) => setGuideName(e.target.value)}
          placeholder="Guide name"
        />
        <UrlBar url={url} onChange={setUrl} onPreview={() => setUrl(url)} />
        <button style={buttonStyle} onClick={handleSave}>
          {savedGuideId ? "Update Guide" : "Save Guide"}
        </button>
        <button
          style={buttonStyle}
          onClick={() => setMode((m) => (m === "build" ? "preview" : "build"))}
        >
          {mode === "build" ? "Preview Guide" : "Back to Builder"}
        </button>
      </div>

      <div style={shellStyle}>
        <div style={stageWrapStyle}>
          {mode === "build" && (
            <IframeStage
              url={url}
              iframeRef={iframeRef}
              onPointPicked={addStepFromPoint}
              steps={orderedSteps}
            />
          )}
          {mode === "preview" && (
            <GuidePreview url={url} steps={orderedSteps} />
          )}
        </div>

        <StepPanel steps={orderedSteps} setSteps={setSteps} onSave={handleSave} />
      </div>
    </div>
  );
}

// 💅 basic inline styling
const headerStyle = {
  display: "flex",
  gap: "8px",
  padding: "10px",
  background: "#121935",
  position: "sticky",
  top: 0,
  zIndex: 5,
  borderBottom: "1px solid rgba(255,255,255,.06)",
};
const inputStyle = {
  flex: 1,
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
const shellStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: "12px",
  padding: "12px",
  height: "calc(100vh - 64px)",
};
const stageWrapStyle = {
  position: "relative",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: "10px",
  overflow: "hidden",
  background: "#0a0f22",
};

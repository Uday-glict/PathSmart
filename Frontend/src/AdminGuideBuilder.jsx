import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "https://path-smart.vercel.app/api/admin";

export default function AdminGuideBuilder() {
  const [guideId, setGuideId] = useState(null);
  const [meta, setMeta] = useState({ name: "", description: "", type: "global" });
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const createGuide = async () => {
    try {
      const res = await axios.post(`${API}/guides`, meta);
      setGuideId(res.data.guide_id);
      setStatus("✅ Guide created successfully! Add steps below.");
    } catch (err) {
      setStatus("❌ Failed to create guide.");
    }
  };

  const addStep = () =>
    setSteps([
      ...steps,
      {
        step_number: steps.length + 1,
        title: "",
        content: "",
        target_page_url: "",
        action_type: "tooltip",
      },
    ]);

  const updateStep = (index, field, value) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    );
  };

  const saveStep = async (index) => {
    try {
      const s = steps[index];
      await axios.post(`${API}/guides/${guideId}/step`, s);
      setStatus(`✅ Step ${s.step_number} saved successfully!`);
    } catch {
      setStatus("❌ Failed to save step.");
    }
  };

  const removeStep = (index) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const previewGuide = () => {
    setPreviewMode(true);
  };

  const moveStep = (index, direction) => {
    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    newSteps.forEach((s, i) => (s.step_number = i + 1));
    setSteps(newSteps);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🧭 Global Guide Builder</h1>

        {/* CREATE GUIDE FORM */}
        {!guideId && (
          <div className="flex flex-col gap-4 mb-6">
            <input
              className="border rounded-lg p-2 w-full"
              placeholder="Guide Name"
              value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
            />
            <textarea
              className="border rounded-lg p-2 w-full"
              placeholder="Description"
              rows={3}
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
            ></textarea>
            <button
              onClick={createGuide}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 w-fit"
            >
              Create Guide
            </button>
          </div>
        )}

        {/* STEP BUILDER */}
        {guideId && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Steps</h2>
              <div className="flex gap-2">
                <button
                  onClick={addStep}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  + Add Step
                </button>
                <button
                  onClick={previewGuide}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                >
                  👁️ Preview
                </button>
              </div>
            </div>

            {steps.length === 0 && (
              <p className="text-gray-500 italic mb-4">
                No steps yet — click "Add Step" to begin.
              </p>
            )}

            <div className="space-y-4">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 bg-gray-100 shadow-sm relative"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">
                      Step #{s.step_number}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveStep(i, "up")}
                        className="bg-gray-300 px-2 rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveStep(i, "down")}
                        className="bg-gray-300 px-2 rounded"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeStep(i)}
                        className="bg-red-500 text-white px-2 rounded"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <input
                      className="border rounded-lg p-2 w-full"
                      placeholder="Step Title"
                      value={s.title}
                      onChange={(e) =>
                        updateStep(i, "title", e.target.value)
                      }
                    />
                    <textarea
                      className="border rounded-lg p-2 w-full"
                      placeholder="Step Description"
                      rows={3}
                      value={s.content}
                      onChange={(e) =>
                        updateStep(i, "content", e.target.value)
                      }
                    ></textarea>
                    <input
                      className="border rounded-lg p-2 w-full"
                      placeholder="Target Page URL"
                      value={s.target_page_url}
                      onChange={(e) =>
                        updateStep(i, "target_page_url", e.target.value)
                      }
                    />
                    <select
                      className="border rounded-lg p-2 w-full"
                      value={s.action_type}
                      onChange={(e) =>
                        updateStep(i, "action_type", e.target.value)
                      }
                    >
                      <option value="tooltip">Tooltip</option>
                      <option value="modal">Modal</option>
                      <option value="highlight">Highlight</option>
                      <option value="carousel">Carousel</option>
                    </select>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => saveStep(i)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      💾 Save Step
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PREVIEW MODE */}
        {previewMode && steps.length > 0 && (
          <div className="mt-8 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Preview</h3>
            <div className="bg-gray-50 p-4 rounded-lg shadow-inner space-y-3">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="border-l-4 border-blue-500 bg-white p-3 rounded shadow-sm"
                >
                  <p className="font-semibold text-gray-800">{s.title}</p>
                  <p className="text-gray-600 text-sm">{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATUS MESSAGE */}
        {status && (
          <p className="mt-6 text-sm text-gray-700 bg-gray-100 rounded-lg p-3 border border-gray-300">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

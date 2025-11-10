import React, { useState, useCallback, useRef, memo } from "react";
// Note: axios is not needed, using native fetch for simplicity and consistency.

// --- Configuration ---
const BASE_URL = "http://localhost:3000/api/admin";
const MOCK_GUIDE_ID = 101; 
// AI reference viewport size (must match backend's assumption in server.js)
const IFRAME_WIDTH = 1000;
const IFRAME_HEIGHT = 500; 
// Default size for a single-click selection (AI will refine this)
const DEFAULT_W = 50; 
const DEFAULT_H = 50; 

// Utility function to ensure values are within bounds
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);


// Component to render the final AI coordinates highlight
const AiHighlightOverlay = memo(({ coordinates, iframeContainerRef }) => {
    if (!coordinates || !iframeContainerRef.current) return null;

    // Parse the AI's coordinate string "x:X,y:Y,w:W,h:H"
    const coords = coordinates.split(',').reduce((acc, part) => {
        const [key, value] = part.split(':');
        acc[key.trim()] = parseInt(value.trim(), 10);
        return acc;
    }, {});
    
    // Get the actual display dimensions of the iframe container
    const iframeRect = iframeContainerRef.current.getBoundingClientRect();
    
    // Calculate display coordinates by scaling AI's 1000x500 coordinates back to the actual iframe size
    const displayWidth = (coords.w / IFRAME_WIDTH) * iframeRect.width;
    const displayHeight = (coords.h / IFRAME_HEIGHT) * iframeRect.height;
    const displayLeftCenter = (coords.x / IFRAME_WIDTH) * iframeRect.width;
    const displayTopCenter = (coords.y / IFRAME_HEIGHT) * iframeRect.height;
    
    return (
        <div 
            style={{
                position: 'absolute',
                // Position the box based on the center point (x, y)
                left: `${displayLeftCenter}px`, 
                top: `${displayTopCenter}px`,
                transform: 'translate(-50%, -50%)', 

                // Dimensions
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                
                // Styling
                border: '4px solid #f97316', // Orange highlight
                borderRadius: '8px',
                backgroundColor: 'rgba(249, 115, 22, 0.3)',
                boxShadow: '0 0 10px rgba(249, 115, 22, 0.7)',
                zIndex: 16,
                pointerEvents: 'none',
                transition: 'all 0.3s ease-out',
            }}
        >
        </div>
    );
});


function AdminStepCreator() {
    const [stepData, setStepData] = useState({
        step_number: 1,
        target_page_url: "https://example.com", // Added a default URL for faster testing
        action_type: "tooltip",
        title: "Click the Save Button",
        content: "Press this button to finalize the data.",
        target_element_description: "The primary green save button in the top right corner.", // Required for AI
        selection_coords: "" // Scaled coordinate string for AI input (x:X,y:Y,w:W,h:H)
    });

    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(stepData.target_page_url);
    const [marker, setMarker] = useState(null); // { x: displayPx, y: displayPx } for visualization
    const [aiCoordinates, setAiCoordinates] = useState(""); // The final resilient coordinate string

    const iframeContainerRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setStepData((prev) => ({ ...prev, [name]: value }));
        
        // Clear AI coordinates if the description or URL changes
        if (name === 'target_element_description' || name === 'target_page_url') {
             setAiCoordinates("");
        }
    };

    const handlePreview = () => {
        if (!stepData.target_page_url) {
            setStatus("❌ Enter a valid URL first.");
            return;
        }
        setPreviewUrl(stepData.target_page_url);
        setMarker(null);
        setAiCoordinates("");
        setStepData(prev => ({ ...prev, selection_coords: "" }));
        setStatus(`Preview loaded for: ${stepData.target_page_url}. Click to mark target.`);
    };

    const handleOverlayClick = (e) => {
        const container = iframeContainerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        
        // 1. Calculate relative coordinates in display pixels
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;

        // 2. Clamp and Scale to the AI's reference frame (1000x500)
        const scaledX = Math.round((clamp(displayX, 0, rect.width) / rect.width) * IFRAME_WIDTH);
        const scaledY = Math.round((clamp(displayY, 0, rect.height) / rect.height) * IFRAME_HEIGHT);

        // 3. Set marker for visualization (using display pixels)
        setMarker({ x: displayX, y: displayY });

        // 4. Update selection_coords for API (using scaled pixels)
        // We use a small default W/H, which the AI will refine based on the description
        const coordsString = `x:${scaledX},y:${scaledY},w:${DEFAULT_W},h:${DEFAULT_H}`;
        setStepData(prev => ({ ...prev, selection_coords: coordsString }));
        setAiCoordinates(""); // Clear previous AI highlight
        setStatus(`📍 Marker set at (Scaled): ${coordsString}. Click '1. Get Resilient AI Coordinates' next.`);
    };

    const handleGetAICoordinates = useCallback(async () => {
        if (!stepData.selection_coords) {
            setStatus("❌ Click on the preview page to mark the target first!");
            return;
        }
        if (!stepData.target_element_description) {
            setStatus("❌ The Target Element Description is required for AI resilience.");
            return;
        }

        setIsLoading(true);
        setStatus("🧠 Sending selection and description to AI for resilient coordinates...");

        try {
            // New endpoint for analysis only (matches server.js)
            const response = await fetch(`${BASE_URL}/guide/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_page_url: stepData.target_page_url,
                    target_element_description: stepData.target_element_description,
                    selection_coords: stepData.selection_coords,
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setAiCoordinates(result.ai_coordinates);
                setStatus(`✅ AI analysis complete. Resilient coordinates found! Ready to '2. Create AI Step'.`);
            } else {
                setStatus(`❌ AI Error: ${result.error || 'Failed to process coordinates.'}`);
            }
        } catch (err) {
            console.error("API Error:", err);
            setStatus(`❌ Network Error: Could not reach the AI analysis server.`);
        } finally {
            setIsLoading(false);
        }
    }, [stepData.selection_coords, stepData.target_element_description, stepData.target_page_url]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!aiCoordinates) {
            setStatus("❌ Please get the resilient AI coordinates first using the blue button.");
            return;
        }
        
        setIsLoading(true);
        setStatus("💾 Saving final step data to database...");

        try {
            // Final data structure for saving
            const finalStepData = {
                ...stepData,
                ai_coordinates: aiCoordinates // Add the final coordinates
            };
            
            // Existing endpoint for database save (matches server.js)
            const response = await fetch(`${BASE_URL}/guide/${MOCK_GUIDE_ID}/step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalStepData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                 setStatus(`✅ Step created successfully (ID: ${MOCK_GUIDE_ID}) → Coords: ${result.coordinates}`);
            } else {
                 setStatus(`❌ Save Failed: ${result.error || 'Server error.'}`);
            }

        } catch (err) {
            console.error("Save Error:", err);
            setStatus("❌ Network Error: Failed to save step.");
        } finally {
            setIsLoading(false);
        }
    }, [stepData, aiCoordinates]);

    return (
        <div style={{ padding: 20, maxWidth: 900, margin: "auto", fontFamily: "sans-serif" }}>
            <h1>Admin: Create AI-Assisted Guide Step</h1>
            <form
                onSubmit={handleSubmit}
                style={{ border: "1px solid #007bff", padding: 20, borderRadius: 10 }}
            >
                {/* Step Number */}
                <label style={{ display: 'block', marginTop: 10 }}>Step Number:</label>
                <input
                    type="number"
                    name="step_number"
                    value={stepData.step_number}
                    onChange={handleChange}
                    style={{ width: "100%", padding: 8, border: '1px solid #ccc', borderRadius: 5 }}
                />

                {/* Page URL */}
                <label style={{ display: 'block', marginTop: 10 }}>Page URL:</label>
                <input
                    type="url"
                    name="target_page_url"
                    value={stepData.target_page_url}
                    onChange={handleChange}
                    required
                    style={{ width: "100%", padding: 8, border: '1px solid #ccc', borderRadius: 5 }}
                />
                
                {/* Preview Button */}
                <button
                    type="button"
                    onClick={handlePreview}
                    style={{
                        margin: "10px 0",
                        background: "#007bff",
                        color: "#fff",
                        padding: "8px 16px",
                        border: "none",
                        borderRadius: 5,
                        cursor: "pointer",
                    }}
                >
                    Preview Page
                </button>

                {/* Action Type */}
                <label style={{ display: 'block', marginTop: 10 }}>Action Type:</label>
                <select
                    name="action_type"
                    value={stepData.action_type}
                    onChange={handleChange}
                    style={{ width: "100%", padding: 8, border: '1px solid #ccc', borderRadius: 5 }}
                >
                    <option value="tooltip">Tooltip</option>
                    <option value="modal">Modal</option>
                </select>

                {/* Title */}
                <label style={{ display: 'block', marginTop: 10 }}>Title:</label>
                <input
                    type="text"
                    name="title"
                    value={stepData.title}
                    onChange={handleChange}
                    required
                    style={{ width: "100%", padding: 8, border: '1px solid #ccc', borderRadius: 5 }}
                />

                {/* Content */}
                <label style={{ display: 'block', marginTop: 10 }}>Content:</label>
                <textarea
                    name="content"
                    value={stepData.content}
                    onChange={handleChange}
                    rows={3}
                    style={{ width: "100%", padding: 8, border: '1px solid #ccc', borderRadius: 5 }}
                />

                {/* Target Element Description (CRITICAL FIELD) */}
                <div style={{ padding: 10, border: '1px dashed red', backgroundColor: '#fff0f0', borderRadius: 5, marginTop: 10 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', color: 'red' }}>Target Element Description (Required for Resilience):</label>
                    <textarea
                        name="target_element_description"
                        value={stepData.target_element_description}
                        onChange={handleChange}
                        required
                        placeholder="e.g. The blue Sign In button"
                        rows={2}
                        style={{ width: "100%", padding: 8, border: '1px solid red', borderRadius: 5 }}
                    />
                    <small style={{ color: 'red', display: 'block' }}>
                        **Keep this field!** This descriptive text is crucial for the AI to find the element reliably when the UI changes.
                    </small>
                </div>

                {/* 1. Get AI Coordinates Button */}
                <button
                    type="button"
                    onClick={handleGetAICoordinates}
                    disabled={isLoading || !stepData.selection_coords || !stepData.target_element_description}
                    style={{
                        width: "100%",
                        marginTop: 20,
                        padding: 10,
                        background: isLoading ? "#ccc" : "#17a2b8",
                        color: "#fff",
                        border: "none",
                        borderRadius: 5,
                        cursor: "pointer",
                        opacity: !stepData.selection_coords || !stepData.target_element_description ? 0.6 : 1,
                    }}
                >
                    {isLoading ? "Processing..." : "1. Get Resilient AI Coordinates"}
                </button>
                
                {/* 2. Submit/Save Button */}
                <button
                    type="submit"
                    disabled={isLoading || !aiCoordinates}
                    style={{
                        width: "100%",
                        marginTop: 10,
                        padding: 10,
                        background: isLoading ? "#ccc" : "#28a745",
                        color: "#fff",
                        border: "none",
                        borderRadius: 5,
                        cursor: "pointer",
                        opacity: !aiCoordinates ? 0.6 : 1,
                    }}
                >
                    {isLoading ? "Saving..." : "2. Create AI Step (Final Save)"}
                </button>
            </form>

            {/* Status & Coordinates Display */}
            <p
                style={{
                    marginTop: 10,
                    color: status.startsWith("❌") ? "red" : status.startsWith("✅") ? "green" : "inherit",
                    fontWeight: 500,
                }}
            >
                {status}
            </p>
            {aiCoordinates && (
                <p style={{ marginTop: 5, color: '#f97316', fontWeight: 'bold' }}>
                    AI Result (Visualized in Orange): {aiCoordinates}
                </p>
            )}

            {/* Preview Section */}
            {previewUrl && (
                <div style={{ marginTop: 20 }}>
                    <h3>Page Preview (Click to mark target)</h3>
                    <div
                        ref={iframeContainerRef}
                        style={{
                            position: "relative",
                            width: "100%",
                            height: `${IFRAME_HEIGHT}px`, // Fixed height for consistent scaling
                            border: "2px solid #007bff",
                            borderRadius: 10,
                            overflow: "hidden",
                        }}
                    >
                        {/* iframe below */}
                        <iframe
                            src={previewUrl}
                            title="Target Page"
                            style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                            }}
                            sandbox="allow-scripts allow-same-origin allow-popups"
                        ></iframe>

                        {/* transparent overlay on top */}
                        <div
                            onClick={handleOverlayClick}
                            style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 10,
                                cursor: "crosshair",
                                backgroundColor: "transparent",
                            }}
                        ></div>

                        {/* User's red marker */}
                        {marker && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: marker.y - 10,
                                    left: marker.x - 10,
                                    width: 20,
                                    height: 20,
                                    backgroundColor: "red",
                                    borderRadius: "50%",
                                    border: "2px solid white",
                                    boxShadow: "0 0 5px rgba(0,0,0,0.4)",
                                    zIndex: 15,
                                    pointerEvents: "none",
                                    transition: "all 0.1s ease-out",
                                }}
                            />
                        )}

                        {/* AI's final resilient highlight */}
                        {aiCoordinates && (
                            <AiHighlightOverlay coordinates={aiCoordinates} iframeContainerRef={iframeContainerRef} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminStepCreator;

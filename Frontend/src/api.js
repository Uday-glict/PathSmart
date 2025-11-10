// src/api.js

// Base URL for your backend API
// Make sure your backend (Express) runs on http://localhost:4000
// or update the port if different
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";

/**
 * Fetch all guides from the backend
 */
export async function listGuides() {
  try {
    const res = await fetch(`${API_BASE}/api/over_lay/guides`);
    if (!res.ok) throw new Error("Failed to fetch guides");
    return await res.json();
  } catch (err) {
    console.error("❌ Error fetching guides:", err);
    return [];
  }
}

/**
 * Create a new guide
 * @param {Object} payload - { baseUrl, name, steps }
 */
export async function createGuide(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/over_lay/guides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to create guide");
    return await res.json();
  } catch (err) {
    console.error("❌ Error creating guide:", err);
    throw err;
  }
}

/**
 * Update an existing guide
 * @param {string} id - guide ID
 * @param {Object} payload - updated guide data
 */
export async function updateGuide(id, payload) {
  try {
    const res = await fetch(`${API_BASE}/api/over_lay/guides/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to update guide");
    return await res.json();
  } catch (err) {
    console.error("❌ Error updating guide:", err);
    throw err;
  }
}

/**
 * Fetch a single guide by ID
 */
export async function getGuide(id) {
  try {
    const res = await fetch(`${API_BASE}/api/over_lay/guides/${id}`);
    if (!res.ok) throw new Error("Guide not found");
    return await res.json();
  } catch (err) {
    console.error("❌ Error fetching guide:", err);
    return null;
  }
}

/**
 * Delete a guide by ID
 */
export async function deleteGuide(id) {
  try {
    const res = await fetch(`${API_BASE}/api/over_lay/guides/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete guide");
    return await res.json();
  } catch (err) {
    console.error("❌ Error deleting guide:", err);
    throw err;
  }
}

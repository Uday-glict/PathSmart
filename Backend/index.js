require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { connectDB, pool } = require("./dbConfig");
const app = express();
const hostname = "127.0.0.1";
const port = 3000;
const { GoogleGenAI } = require("@google/genai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.use(bodyParser.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ✅ CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.1.100:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// ✅ Use CORS BEFORE any routes or static middleware
app.use(cors(corsOptions));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json());

/**
 * POST /api/admin/guide/analyze
 * Dedicated endpoint for AI analysis. Returns resilient coordinates, but does NOT save to DB.
 */
const SYSTEM_INSTRUCTION = `
You are an expert element locater tool. Your task is to analyze a webpage context, refine a user's initial selection, and provide the most resilient coordinates of the target element. The target page URL and the user's initial click coordinates (scaled to a 1000x500 viewport, format x:<center>,y:<center>,w:<width>,h:<height>) are provided.
You must use the textual description to find a resilient coordinate for the element.
You must ONLY respond with a single, unformatted string containing the coordinates in the format: "x:<number>,y:<number>,w:<number>,h:<number>".
DO NOT include any explanation, markdown, or any other text. ONLY the coordinate string.
`;

app.post("/api/admin/guide/analyze", async (req, res) => {
  const { target_page_url, target_element_description, selection_coords } =
    req.body;

  if (!target_page_url || !target_element_description || !selection_coords) {
    return res.status(400).json({
      error:
        "Missing required analysis data (URL, description, or selection coordinates).",
    });
  }
  if (!GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY not configured on the server." });
  }

  try {
    // --- Gemini Call: Using both selection and description for resilience ---
    const userPrompt = `
            The user is creating a guide step for the page: "${target_page_url}".
            The element they are targeting is SPECIFICALLY described as: "${target_element_description}".
            The user has visually selected an area on the page defined by the bounding box (relative to a 1000x500 view): "${selection_coords}".
            
            Based on the initial bounding box and the detailed textual description, determine the most resilient, final coordinates for this element.
        `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      },
    });

    // Extract and clean the coordinate string
    const textResponse = response.candidates[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("Gemini returned an empty response.");
    }
    const aiCoordinates = textResponse.trim().replace(/`/g, "");

    // Final sanity check for format
    if (!aiCoordinates.match(/^x:\d+,y:\d+,w:\d+,h:\d+$/)) {
      throw new Error(`AI returned invalid format: ${aiCoordinates}`);
    }

    res.json({
      success: true,
      ai_coordinates: aiCoordinates, // Send coordinates back to frontend for visualization
    });
  } catch (e) {
    console.error("Gemini Error:", e.message);
    return res.status(500).json({
      error: "Failed to generate AI coordinates. Details: " + e.message,
    });
  }
});

app.post("/api/admin/guide/:guideId/step", async (req, res) => {
  const { guideId } = req.params;
  const {
    step_number,
    title,
    content,
    target_page_url,
    action_type,
    ai_coordinates,
  } = req.body;

  if (!title || !content || !target_page_url || !ai_coordinates) {
    return res.status(400).json({
      error:
        "Missing required step data for saving (title, content, URL, or final AI coordinates).",
    });
  }

  // 4. Save Step to Database (using the mock pool)
  try {
    const sql = `
            INSERT INTO Guide_Step (guide_id, step_number, title, content, target_page_url, action_type, ai_coordinates)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
    const saveGuideId = parseInt(guideId, 10);

    await pool.execute(sql, [
      saveGuideId,
      step_number,
      title,
      content,
      target_page_url,
      action_type,
      ai_coordinates,
    ]);

    res.json({
      success: true,
      message: "Step successfully created and saved.",
      coordinates: ai_coordinates,
    });
  } catch (dbError) {
    console.error("Database Save Error:", dbError);
    res.status(500).json({ error: "Failed to save step to database." });
  }
});


app.get('/api/guides/:guideId', async (req, res) => {
    const { guideId } = req.params;

    console.log("Retrieving guide with ID:", guideId);
    try {
        // 1. Fetch the main Guide metadata (Title, Description, Product Name)
        const guideSql = `
            SELECT 
                G.guide_id, G.title, G.description, G.last_updated,
                P.product_name
            FROM Guide G
            JOIN Product P ON G.product_id = P.product_id
            WHERE G.guide_id = ?`;
        
        const [guideRows] = await pool.execute(guideSql, [guideId]);

        if (guideRows.length === 0) {
            return res.status(404).json({ error: 'Guide not found.' });
        }

        const guide = guideRows[0];

        // 2. Fetch all steps for that guide, ordered by step_number
        const stepsSql = `
            SELECT 
                step_id, 
                step_number, 
                title, 
                content, 
                target_page_url, 
                action_type, 
                ai_coordinates 
            FROM Guide_Step 
            WHERE guide_id = ? 
            ORDER BY step_number ASC`;
            
        const [steps] = await pool.execute(stepsSql, [guideId]);

        // 3. Combine and return the response
        res.json({ 
            ...guide, 
            steps 
        });

    } catch (e) {
        console.error("Error retrieving guide:", e);
        // Respond with a general 500 error for database/server failures
        res.status(500).json({ error: 'Failed to retrieve guide data from the server.' });
    }
});
// AI Helper Endpoint

// 1️⃣ Create a new Guide
app.post("/api/admin/guides", async (req, res) => {
  const { name, description, type, module_name, target_audience, created_by } =
    req.body;
  console.log(req.body);

  try {
    const [r] = await pool.execute(
      `INSERT INTO adminguide 
        (name, description, type, module_name, target_audience, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name ?? null,
        description ?? null,
        type ?? "global",
        module_name ?? null,
        target_audience ?? "all",
        created_by ?? 1,
      ]
    );

    res.json({ guide_id: r.insertId });
  } catch (err) {
    console.error("❌ Database Insert Error:", err);
    res.status(500).json({ error: "Failed to create guide." });
  }
});

app.post("/api/admin/guides/:guideId/step", async (req, res) => {
  const { guideId } = req.params;
  const {
    step_number,
    title,
    content,
    target_page_url,
    action_type,
    ai_coordinates,
    element_selector,
    reference_snapshot_url,
    trigger_condition,
    delay_ms,
  } = req.body;

  try {
    const [r] = await pool.execute(
      `INSERT INTO admin_guide_step 
       (guide_id, step_number, title, content, target_page_url, action_type, ai_coordinates, element_selector, reference_snapshot_url, trigger_condition, delay_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guideId ?? null,
        step_number ?? null,
        title ?? null,
        content ?? null,
        target_page_url ?? null,
        action_type ?? null,
        ai_coordinates ?? null,
        element_selector ?? null,
        reference_snapshot_url ?? null,
        trigger_condition ?? null,
        delay_ms ?? null,
      ]
    );
    res.json({ step_id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save step." });
  }
});

app.get("/api/admin/guides/:guideId", async (req, res) => {
  const { guideId } = req.params;
  try {
    const [guide] = await pool.execute(
      `SELECT * FROM adminguide WHERE guide_id = ?`,
      [guideId]
    );
    const [steps] = await pool.execute(
      `SELECT * FROM admin_guide_step WHERE guide_id = ? ORDER BY step_number ASC`,
      [guideId]
    );
    res.json({ ...guide[0], steps });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch guide." });
  }
});

app.put("/api/admin/guides/:guideId/reorder", async (req, res) => {
  const { guideId } = req.params;
  const { order } = req.body;
  try {
    for (const o of order) {
      await pool.execute(
        `UPDATE admin_guide_step SET step_number=? WHERE step_id=?`,
        [o.step_number, o.step_id]
      );
    }
    res.json({ message: "Reordered successfully." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to reorder steps." });
  }
});
app.post("/api/admin/guides/:guideId/preview", async (req, res) => {
  const { guideId } = req.params;
  try {
    const [steps] = await pool.execute(
      `SELECT * FROM admin_guide_step WHERE guide_id = ? ORDER BY step_number ASC`,
      [guideId]
    );
    await pool.execute(
      `INSERT INTO admin_guide_preview (guide_id, json_data) VALUES (?, ?)`,
      [guideId, JSON.stringify(steps)]
    );
    res.json({ message: "Preview generated.", steps });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to preview guide." });
  }
});

app.post("/api/admin/guides/:guideId/publish", async (req, res) => {
  const { guideId } = req.params;
  try {
    await pool.execute(
      `UPDATE adminguide SET status='published' WHERE guide_id=?`,
      [guideId]
    );
    await pool.execute(
      `INSERT INTO admin_guide_publish_log (guide_id, version, published_by) VALUES (?, ?, ?)`,
      [guideId, Date.now(), 1]
    );
    res.json({ message: "Guide published successfully." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to publish guide." });
  }
});

// 7️⃣ AI Assist: Gemini (analyze element or generate coordinates)
app.post("/api/admin/guides/:guideId/assist", async (req, res) => {
  const { guideId } = req.params;
  const { target_element_description } = req.body;
  try {
    const prompt = `
Analyze the element described: "${target_element_description}".
Return JSON: {"x": num, "y": num, "w": num, "h": num}
`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
    });
    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = rawText.match(/\{.*\}/s);
    const coords = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    res.json({ ai_coordinates: coords });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gemini assist failed." });
  }
});

app.post("/api/ai-helper/query", async (req, res) => {
  const { page_url, user_query } = req.body;

  if (!user_query) {
    return res.status(400).json({ error: "Query text is required." });
  }

  try {
    // 🔍 Step 1: Fetch relevant guide steps by URL match or keyword
    const [steps] = await pool.execute(
      `SELECT title, content, target_page_url FROM Guide_Step 
       WHERE target_page_url LIKE ? 
       ORDER BY step_number ASC`,
      [`%${page_url || ""}%`]
    );

    console.log("Fetched guide steps for AI context:", steps);
    // 🧩 Step 2: Create context for Gemini
    const contextText = steps.length
      ? steps
          .map(
            (s, i) =>
              `${i + 1}. ${s.title}: ${s.content} (URL: ${s.target_page_url})`
          )
          .join("\n")
      : "No guide data found for this page.";

    // 💬 Step 3: Build AI prompt
    const prompt = `
You are an in-app AI assistant helping users navigate a product.
User is currently on: ${page_url || "unknown page"}.
Below are relevant guide instructions from the admin:

${contextText}

User query: "${user_query}"

Respond like a friendly product assistant — give clear, step-by-step help.
If guide data matches the query, reference it. If not, suggest general steps.
`;

    // 🤖 Step 4: Query Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const answer =
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn’t find an exact match, but I can help you explore further.";

    res.json({ response: answer });
  } catch (err) {
    console.error("AI Helper Error:", err);
    res.status(500).json({ error: "Failed to process AI Helper query." });
  }
});


//code for overlay server test


// ✅ Create Guide with Steps
app.post("/api/over_lay/guides", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, baseUrl, steps } = req.body;
    if (!name || !baseUrl) {
      return res.status(400).json({ error: "name and baseUrl are required" });
    }

    // Insert guide
    const [result] = await conn.execute(
      "INSERT INTO overlay_guides (name, baseUrl) VALUES (?, ?)",
      [name, baseUrl]
    );

    const guideId = result.insertId;

    // Insert steps if any
    if (Array.isArray(steps)) {
      for (const s of steps) {
        const target = s.target || {};
        await conn.execute(
          `INSERT INTO overlay_steps 
           (guide_id, title, description, placement, order_no, target_type, target_selector, target_xRel, target_yRel)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            guideId,
            s.title || "",
            s.description || "",
            s.placement || "top",
            s.order || 1,
            target.type || "coords",
            target.selector || null,
            target.xRel || null,
            target.yRel || null,
          ]
        );
      }
    }

    const [newGuide] = await conn.execute(
      "SELECT * FROM overlay_guides WHERE id = ?",
      [guideId]
    );
    res.status(201).json(newGuide[0]);
  } catch (err) {
    console.error("❌ Error creating guide:", err);
    res.status(500).json({ error: "Failed to create guide" });
  } finally {
    conn.release();
  }
});


app.get("/api/over_lay/guides", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM overlay_guides ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching guides:", err);
    res.status(500).json({ error: "Failed to fetch guides" });
  }
});

app.get("/api/over_lay/guides/:id", async (req, res) => {
  try {
    const [guides] = await pool.execute("SELECT * FROM overlay_guides WHERE id = ?", [
      req.params.id,
    ]);
    if (!guides.length) return res.status(404).json({ error: "Guide not found" });

    const [steps] = await pool.execute("SELECT * FROM overlay_steps WHERE guide_id = ?", [
      req.params.id,
    ]);

    const guide = guides[0];
    guide.steps = steps;
    res.json(guide);
  } catch (err) {
    console.error("❌ Error fetching guide:", err);
    res.status(500).json({ error: "Failed to fetch guide" });
  }
});


app.put("/api/over_lay/guides/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, baseUrl, steps } = req.body;

    const [existing] = await conn.execute("SELECT * FROM overlay_guides WHERE id = ?", [
      req.params.id,
    ]);
    if (!existing.length)
      return res.status(404).json({ error: "Guide not found" });

    await conn.execute("UPDATE overlay_guides SET name=?, baseUrl=? WHERE id=?", [
      name,
      baseUrl,
      req.params.id,
    ]);

    // Delete old steps
    await conn.execute("DELETE FROM overlay_steps WHERE guide_id = ?", [req.params.id]);

    // Re-insert steps
    if (Array.isArray(steps)) {
      for (const s of steps) {
        const target = s.target || {};
        await conn.execute(
          `INSERT INTO overlay_steps 
           (guide_id, title, description, placement, order_no, target_type, target_selector, target_xRel, target_yRel)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.id,
            s.title || "",
            s.description || "",
            s.placement || "top",
            s.order || 1,
            target.type || "coords",
            target.selector || null,
            target.xRel || null,
            target.yRel || null,
          ]
        );
      }
    }

    const [updated] = await conn.execute("SELECT * FROM overlay_guides WHERE id = ?", [
      req.params.id,
    ]);
    res.json(updated[0]);
  } catch (err) {
    console.error("❌ Error updating guide:", err);
    res.status(500).json({ error: "Failed to update guide" });
  } finally {
    conn.release();
  }
});

// ✅ Delete Guide (Cascade steps)
app.delete("/api/over_lay/guides/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.execute("DELETE FROM steps WHERE overlay_guides = ?", [req.params.id]);
    const [result] = await conn.execute("DELETE FROM overlay_guides WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Guide not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting guide:", err);
    res.status(500).json({ error: "Failed to delete guide" });
  } finally {
    conn.release();
  }
});



app.get("/", (req, res) => {
  res.send("Server running and CORS enabled!");
});

app.listen(port, hostname, async () => {
  console.log(`🚀 Server running at http://${hostname}:${port}/`);
  await connectDB();
});

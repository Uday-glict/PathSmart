require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { connectDB, pool } = require("./dbConfig");
const { GoogleGenAI } = require("@google/genai");

const app = express();

// ✅ Environment Config
const hostname = "127.0.0.1";
const port = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ✅ Middleware Setup
app.use(bodyParser.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.1.100:3000",
    "https://path-smart-66y8.vercel.app",
    "https://path-smart-ui.vercel.app",
    "https://path-smart.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Ensure Upload Directory Exists
// const uploadDir = path.join(__dirname, "public/uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("✅ Server running and CORS enabled!");
});

// ✅ ============ AI Analyze Route ============
const SYSTEM_INSTRUCTION = `
You are an expert element locator tool. Your task is to analyze a webpage context, refine a user's initial selection, and provide the most resilient coordinates of the target element.
Respond ONLY with a single string: "x:<num>,y:<num>,w:<num>,h:<num>".
`;



// ✅ ============ Guide CRUD + AI Routes ============
// app.post("/api/admin/guide", async (req, res) => {
//   const { name, description, type, module_name, target_audience, created_by } = req.body;
//   try {
//     const [r] = await pool.execute(
//       `INSERT INTO adminguide 
//       (name, description, type, module_name, target_audience, created_by)
//       VALUES (?, ?, ?, ?, ?, ?)`,
//       [name ?? null, description ?? null, type ?? "global", module_name ?? null, target_audience ?? "all", created_by ?? 1]
//     );
//     res.json({ guide_id: r.insertId });
//   } catch (err) {
//     console.error("❌ Database Insert Error:", err);
//     res.status(500).json({ error: "Failed to create guide." });
//   }
// });

app.post("/api/admin/guides/:guideId/step", async (req, res) => {
  const { guideId } = req.params;
  const {
    step_number, title, content, target_page_url,
    action_type, ai_coordinates, element_selector,
    reference_snapshot_url, trigger_condition, delay_ms,
  } = req.body;

  try {
    const [r] = await pool.execute(
      `INSERT INTO admin_guide_step 
       (guide_id, step_number, title, content, target_page_url, action_type, ai_coordinates, element_selector, reference_snapshot_url, trigger_condition, delay_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guideId ?? null, step_number ?? null, title ?? null, content ?? null,
        target_page_url ?? null, action_type ?? null, ai_coordinates ?? null,
        element_selector ?? null, reference_snapshot_url ?? null,
        trigger_condition ?? null, delay_ms ?? null,
      ]
    );
    res.json({ step_id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save step." });
  }
});

app.post("/api/admin/guide/analyze", async (req, res) => {
  const { target_page_url, target_element_description, selection_coords } = req.body;
  if (!target_page_url || !target_element_description || !selection_coords)
    return res.status(400).json({ error: "Missing required analysis data." });

  try {
    const userPrompt = `
    Page: "${target_page_url}".
    Description: "${target_element_description}".
    User Selection: "${selection_coords}".
    Refine coordinates based on description.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: { systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] } },
    });

    const textResponse = response.candidates[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("Gemini returned an empty response.");

    const aiCoordinates = textResponse.trim().replace(/`/g, "");
    if (!aiCoordinates.match(/^x:\d+,y:\d+,w:\d+,h:\d+$/))
      throw new Error(`AI returned invalid format: ${aiCoordinates}`);

    res.json({ success: true, ai_coordinates: aiCoordinates });
  } catch (e) {
    console.error("Gemini Error:", e.message);
    res.status(500).json({ error: "AI coordinate generation failed." });
  }
});

app.get("/api/admin/guides/:guideId", async (req, res) => {
  const { guideId } = req.params;
  try {
    const [guide] = await pool.execute(`SELECT * FROM adminguide WHERE guide_id = ?`, [guideId]);
    const [steps] = await pool.execute(`SELECT * FROM admin_guide_step WHERE guide_id = ? ORDER BY step_number ASC`, [guideId]);
    res.json({ ...guide[0], steps });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch guide." });
  }
});

app.put("/api/admin/guides/:guideId/reorder", async (req, res) => {
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

app.post("/api/admin/guides/:guideId/publish", async (req, res) => {
  const { guideId } = req.params;
  try {
    await pool.execute(`UPDATE adminguide SET status='published' WHERE guide_id=?`, [guideId]);
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

// ✅ Overlay Guides (same as your previous setup)
app.get("/api/over_lay/guides", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM overlay_guides ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching guides:", err);
    res.status(500).json({ error: "Failed to fetch guides" });
  }
});

// ✅ Export app for Vercel serverless
module.exports = app;

// ✅ Local run only
if (require.main === module) {
  app.listen(port, hostname, async () => {
    console.log(`🚀 Server running locally at http://${hostname}:${port}/`);
    await connectDB();
  });
}

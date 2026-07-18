import express from "express";
import cors from "cors";
import { analyzeCodebase } from "./analyzer.js";
import { runAgent } from "./agent.js";

const app = express();

// Allow requests from your React dev server
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/metrics", async (req, res) => {
  const results = await analyzeCodebase("../src");
  res.json(results);
});

app.post("/agent", async (req, res) => {
  try {
    const advice = await runAgent();

    res.json({ advice });
  } catch (err) {
    console.error("Agent error:", err); // <-- see the real error in your terminal
    res.status(500).json({ error: err.message || "Agent failed" });
  }
});

app.listen(4000, () => console.log("Backend running on http://localhost:4000"));

const express = require("express");

/* ==============================
   CONFIG
================================ */
const API_KEY = "RDIO-DOWNSTREAM-KEY-ABC123";

/* ==============================
   DOWNSTREAM RECEIVER (3000)
================================ */
const downstream = express();
downstream.use(express.json());

const calls = [];

downstream.post("/downstream/call", (req, res) => {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  calls.push(req.body);
  res.json({ status: "ok" });
});

downstream.listen(3000, () => {
  console.log("Downstream receiver listening on port 3000");
});

/* ==============================
   UI + STATS API (3001)
================================ */
const ui = express();
ui.use(express.static("public"));

ui.get("/api/summary", (req, res) => {
  const totalCalls = calls.length;
  const totalSeconds = calls.reduce((s, c) => s + (c.duration || 0), 0);
  const talkgroups = new Set(calls.map(c => c.talkgroup));

  res.json({
    total_calls: totalCalls,
    total_audio_seconds: totalSeconds,
    unique_talkgroups: talkgroups.size
  });
});

ui.get("/api/hourly", (req, res) => {
  const hours = {};
  for (const c of calls) {
    const h = new Date(c.start_time * 1000).getHours();
    hours[h] = (hours[h] || 0) + 1;
  }

  res.json(
    Object.entries(hours).map(([hour, calls]) => ({
      hour,
      calls
    }))
  );
});

ui.listen(3001, () => {
  console.log("Web UI available on http://localhost:3001");
});

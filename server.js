import fs from "fs";
import express from "express";
import multer from "multer";
import sqlite3 from "sqlite3";

/* ================= LOAD TALKGROUP CSV ================= */
const TG_MAP = {};

fs.readFileSync("talkgroups.csv", "utf8")
  .split("\n")
  .filter(Boolean)
  .forEach(line => {
    const cols = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
    if (!cols || cols.length < 6) return;

    const tgId = cols[0];
    const description = cols[4].replace(/"/g, "");
    const service = cols[5].replace(/"/g, "");

    TG_MAP[tgId] = {
      name: description,
      tag: service
    };
  });

/* ================= DATABASE ================= */
const db = new sqlite3.Database("./stats.db");

db.run(`
  CREATE TABLE IF NOT EXISTS stats (
    key TEXT PRIMARY KEY,
    count INTEGER
  )
`);

function inc(key) {
  db.run(
    `INSERT INTO stats (key, count)
     VALUES (?,1)
     ON CONFLICT(key) DO UPDATE SET count = count + 1`,
    [key]
  );
}

function recordStats(tgName, tag) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.getHours();

  inc("ALL");
  inc(`TG:${tgName}`);
  inc(`DAY:${day}`);
  inc(`HOUR:${hour}`);
  inc(`TAG:${tag}`);
}

/* ================= SDRTRUNK UPLOAD SERVER (3000) ================= */
const uploadApp = express();
const upload = multer({ dest: "tmp/" });

uploadApp.post("/api/call-upload", upload.any(), (req, res) => {
  const tgId = req.body.talkgroup;

  if (!tgId) {
    return res.status(200).send("incomplete call data: no talkgroup");
  }

  const tg = TG_MAP[tgId] || {
    name: `TG ${tgId}`,
    tag: "Unknown"
  };

  recordStats(tg.name, tg.tag);

  console.log("CALL:", tg.name, "| TG:", tgId);

  if (req.files?.[0]) {
    try { fs.unlinkSync(req.files[0].path); } catch {}
  }

  res.send("ok");
});

uploadApp.listen(3000, () => {
  console.log("SDRTrunk upload listening on port 3000");
});

/* ================= STATS + UI SERVER (3001) ================= */
const uiApp = express();
uiApp.use(express.static("public"));

uiApp.get("/api/stats", (req, res) => {
  db.all("SELECT * FROM stats", [], (_, rows) => {
    const result = {
      total: 0,
      talkgroups: {},
      days: {},
      hours: Array(24).fill(0),
      tags: {}
    };

    rows.forEach(r => {
      if (r.key === "ALL") result.total = r.count;
      else if (r.key.startsWith("TG:"))
        result.talkgroups[r.key.slice(3)] = r.count;
      else if (r.key.startsWith("DAY:"))
        result.days[r.key.slice(4)] = r.count;
      else if (r.key.startsWith("HOUR:"))
        result.hours[parseInt(r.key.slice(5))] = r.count;
      else if (r.key.startsWith("TAG:"))
        result.tags[r.key.slice(4)] = r.count;
    });

    res.json(result);
  });
});

uiApp.listen(3001, () => {
  console.log("Stats dashboard available at http://localhost:3001");
});

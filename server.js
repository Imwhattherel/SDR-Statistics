import fs from "fs";
import express from "express";
import multer from "multer";
import sqlite3 from "sqlite3";
import config from "./config.js";

/* ================= LOAD TALKGROUP CSV ================= */
const TG_MAP = {};

fs.readFileSync(config.data.talkgroupsCsv, "utf8")
  .split("\n")
  .filter(line => line && !line.startsWith("Decimal"))
  .forEach(line => {
    const cols = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
    if (!cols || cols.length < 6) return;

    const decimal = cols[0];
    const alpha = cols[2].replace(/"/g, "");
    const description = cols[4].replace(/"/g, "");
    const tag = cols[5].replace(/"/g, "");

    TG_MAP[decimal] = {
      decimal,
      alpha,
      description,
      tag
    };
  });

console.log(`Loaded ${Object.keys(TG_MAP).length} talkgroups`);

/* ================= DATABASE ================= */
const db = new sqlite3.Database(config.data.database);

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

function recordStats(tgKey, tag) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.getHours();

  inc("ALL");
  inc(`TG:${tgKey}`);
  inc(`DAY:${day}`);
  inc(`HOUR:${hour}`);
  inc(`TAG:${tag}`);
}

/* ================= SDRTRUNK UPLOAD SERVER (3000) ================= */
const uploadApp = express();
const upload = multer({ dest: config.upload.tmpDir });

uploadApp.post("/api/call-upload", upload.any(), (req, res) => {
  const tgId = req.body?.talkgroup;

  if (!tgId) {
    return res.status(200).send("incomplete call data: no talkgroup");
  }

  const tg = TG_MAP[tgId] || {
    decimal: tgId,
    alpha: tgId,
    tag: "Unknown"
  };

  const tgKey = `${tg.alpha}|${tg.decimal}`;
  recordStats(tgKey, tg.tag);

  console.log(`CALL: ${tg.alpha} (${tg.decimal})`);

  if (req.files?.[0]) {
    try { fs.unlinkSync(req.files[0].path); } catch {}
  }

  res.send("ok");
});

uploadApp.listen(config.upload.port, config.upload.bind, () => {
  console.log(`SDRTrunk upload listening on port ${config.upload.port}`);
});

/* ================= STATS + UI SERVER (3001) ================= */
const uiApp = express();
uiApp.use(express.static(config.ui.publicDir));

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

/* 🔧 CONFIG ENDPOINT */
uiApp.get("/api/config", (req, res) => {
  res.json({
    notifyEnabled: config.notify.enabled
  });
});

uiApp.listen(config.ui.port, config.ui.bind, () => {
  console.log(
    `Stats dashboard available at http://<server-ip>:${config.ui.port}`
  );
});

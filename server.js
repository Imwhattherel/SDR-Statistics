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
    const tag = cols[5].replace(/"/g, "");

    TG_MAP[decimal] = { decimal, alpha, tag };
  });

console.log(`Loaded ${Object.keys(TG_MAP).length} talkgroups`);

/* ================= DATABASE ================= */
const db = new sqlite3.Database(config.data.database);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS stats (
      key TEXT PRIMARY KEY,
      count INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tgKey TEXT,
      ts INTEGER
    )
  `);
});

function inc(key) {
  db.run(
    `INSERT INTO stats (key, count)
     VALUES (?,1)
     ON CONFLICT(key) DO UPDATE SET count = count + 1`,
    [key]
  );
}

function getWeekStart(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0); // local midnight

  // JS: Sunday = 0, Monday = 1 ... Saturday = 6
  const day = date.getDay() || 7; // make Sunday = 7
  date.setDate(date.getDate() - day + 1); // go back to Monday

  return date.getTime();
}


function recordStats(tgKey, tag) {
  const now = new Date();
  const ts = now.getTime();
  const day = now.toISOString().slice(0, 10);
  const hour = now.getHours();
  const year = now.getFullYear();
  const week = getWeekStart(now);

  inc("ALL");
  inc(`TG:${tgKey}`);
  inc(`DAY:${day}`);
  inc(`HOUR:${hour}`);
  inc(`YEAR:${year}`);
  inc(`WEEK:${week}`);
  inc(`TAG:${tag}`);

  db.run(
    `INSERT INTO calls (tgKey, ts) VALUES (?, ?)`,
    [tgKey, ts]
  );
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
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const week = getWeekStart(new Date());
  const year = new Date().getFullYear();

  db.all("SELECT * FROM stats", [], (_, rows) => {
    const result = {
      total: 0,
      today: 0,
      week: 0,
      year: 0,
      talkgroups: {},
      hours: Array(24).fill(0),
      lastCall: null
    };

    rows.forEach(r => {
      if (r.key === "ALL") result.total = r.count;
      else if (r.key === `DAY:${today}`) result.today = r.count;
      else if (r.key === `WEEK:${week}`) result.week = r.count;
      else if (r.key === `YEAR:${year}`) result.year = r.count;
      else if (r.key.startsWith("TG:"))
        result.talkgroups[r.key.slice(3)] = r.count;
      else if (r.key.startsWith("HOUR:"))
        result.hours[parseInt(r.key.slice(5))] = r.count;
    });

    db.get(
      `SELECT tgKey, ts FROM calls ORDER BY ts DESC LIMIT 1`,
      [],
      (_, row) => {
        if (row) {
          const [alpha, decimal] = row.tgKey.split("|");
          result.lastCall = {
            alpha,
            decimal,
            time: row.ts
          };
        }
        res.json(result);
      }
    );
  });
});

/* CONFIG */
uiApp.get("/api/config", (req, res) => {
  res.json({
    notifyEnabled: config.notify.enabled
  });
});

uiApp.listen(config.ui.port, config.ui.bind, () => {
  console.log(`Stats dashboard available at http://<server-ip>:${config.ui.port}`);
});

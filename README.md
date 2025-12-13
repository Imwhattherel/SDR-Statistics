# SDRTrunk Statistics Dashboard

A lightweight Node.js server that receives **SDRTrunk call uploads**, tracks call statistics, and displays them in a clean web dashboard.

- 📡 SDRTrunk → HTTP upload (port 3000)
- 📊 Persistent stats (SQLite)
- 🧾 Talkgroup names loaded from RadioReference CSV
- 🌐 Web dashboard (port 3001)

---

## Requirements

- Node.js recommended
- SDRTrunk

---

## Talkgroup CSV Setup

1. Download a **Talkgroup CSV** from  
   👉 https://www.radioreference.com/

2. Place the file in the project root

3. Rename it to:

```text
talkgroups.csv

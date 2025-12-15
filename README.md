# SDRTrunk Statistics Dashboard

![Preview](images/sdrimg.png)


A lightweight Node.js server that receives **SDRTrunk call uploads**, tracks call statistics, and displays them in a clean web dashboard.

- 📡 SDRTrunk → HTTP upload (port 3000)
- 📊 Persistent stats (SQLite)
- 🧾 Talkgroup names loaded from RadioReference CSV
- 🌐 Web dashboard (port 3001)

---

- SDR Trunk uploads to the dashboard using the RDIO Scanner API 
- Days reset at 12am
- Weeks reset mondays at 12am
- When a talkgroup receives a call it is auto populated to the dasboard
- Top talkgroup is dispalyed at the top
- Displays last talkgroup with a call and the time of the call
- Talkgroups blink when they receive a call

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
```
4. Setup SDR Stream Using RDIO-SCANNER option (no api key needed yet)

# Planed Featues
- API Key
- Live Listen
- Hourly Heatmap


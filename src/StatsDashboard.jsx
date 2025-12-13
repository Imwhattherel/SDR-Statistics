
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Radio, Clock } from "lucide-react";

export default function StatsDashboard() {
  const [summary, setSummary] = useState(null);
  const [talkgroups, setTalkgroups] = useState([]);
  const [hourly, setHourly] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/stats/summary").then(r => r.json()).then(setSummary);
    fetch("http://localhost:3000/api/stats/talkgroups").then(r => r.json()).then(setTalkgroups);
    fetch("http://localhost:3000/api/stats/hourly").then(r => r.json()).then(setHourly);
  }, []);

  if (!summary) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">SDRTrunk Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Activity />} label="Total Calls" value={summary.total_calls} />
        <StatCard icon={<Clock />} label="Audio Hours" value={(summary.total_audio_seconds / 3600).toFixed(1)} />
        <StatCard icon={<Radio />} label="Talkgroups" value={summary.unique_talkgroups} />
      </div>

      <Card>
        <CardContent className="h-72">
          <h2 className="font-medium mb-2">Calls by Hour</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly}>
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-medium mb-2">Top Talkgroups</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th>Talkgroup</th>
                <th>Calls</th>
                <th>Minutes</th>
              </tr>
            </thead>
            <tbody>
              {talkgroups.map(tg => (
                <tr key={tg.talkgroup_id} className="border-b">
                  <td>{tg.talkgroup_id}</td>
                  <td>{tg.call_count}</td>
                  <td>{(tg.total_seconds / 60).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex gap-4 items-center">
        <div>{icon}</div>
        <div>
          <div className="text-sm opacity-70">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

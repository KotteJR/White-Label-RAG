"use client";

import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Summary = {
  documents: number;
  activeChats: number;
  recentDocs: { id: string; name: string; date: string }[];
  recentChats: { id: string; name: string; date: string }[];
  trends: { uploadsPerDay: number[]; queriesPerDay: number[] };
};

type RecentItem = { id: string; name: string; date: string };

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentItem[]>([]);
  const [recentChats, setRecentChats] = useState<RecentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: any;
    async function tick() {
      try {
        const s = await fetch("/api/summary").then((r) => r.json());
        setSummary(s);
        setRecentDocs(s.recentDocs || []);
        setRecentChats(s.recentChats || []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        timer = setTimeout(tick, 5000); // refresh every 5s
      }
    }
    tick();
    return () => clearTimeout(timer);
  }, []);

  const chartData = useMemo(() => {
    const labels = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
    const uploads = summary?.trends.uploadsPerDay || [];
    const queries = summary?.trends.queriesPerDay || [];
    return {
      labels,
      datasets: [
        { label: "Uploads per day", data: uploads, borderColor: "#111827", backgroundColor: "rgba(17,24,39,0.1)" },
        { label: "Queries per day", data: queries, borderColor: "#6b7280", backgroundColor: "rgba(107,114,128,0.15)" },
      ],
    };
  }, [summary?.trends]);

  if (loading) {
    return <div className="animate-pulse space-y-4">Loading dashboard...</div>;
  }
  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-red-600">Failed to load: {error}</div>
        <button className="rounded-md bg-gray-900 px-3 py-1 text-white text-sm hover:bg-gray-700" onClick={() => location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat title="Documents" value={summary?.documents ?? 0} />
        <Stat title="Active chats" value={summary?.activeChats ?? 0} />
        <Stat title="System status" value={summary?.systemStatus ?? "ok"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Usage">
          <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
        </Card>
        <div className="grid grid-cols-1 gap-6">
          <Card title="Recent Documents">
            <ul className="divide-y divide-gray-200/70">
              {recentDocs.map((d) => (
                <li key={d.id} className="py-2 text-sm flex justify-between">
                  <span>{d.name}</span>
                  <span className="text-gray-500">{new Date(d.date).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Recent Chats">
            <ul className="divide-y divide-gray-200/70">
              {recentChats.map((c) => (
                <li key={c.id} className="py-2 text-sm flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-gray-500">{new Date(c.date).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white">
      <div className="mb-2 text-sm font-medium text-gray-700">{title}</div>
      {children}
    </div>
  );
}



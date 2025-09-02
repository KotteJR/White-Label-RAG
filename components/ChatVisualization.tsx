"use client";

import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  title?: string;
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
  colors?: string[];
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#0088fe"];

export default function ChatVisualization({ chartData }: { chartData: ChartData }) {
  const { type, title, data, xKey = "name", yKey = "value", colors = COLORS } = chartData;

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart width={600} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={yKey} fill={colors[0]} />
          </BarChart>
        );

      case "line":
        return (
          <LineChart width={600} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2} />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart width={600} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={yKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart width={400} height={300}>
            <Pie
              data={data}
              cx={200}
              cy={150}
              labelLine={false}
              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="my-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      {title && <h4 className="text-lg font-semibold mb-3 text-gray-800">{title}</h4>}
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

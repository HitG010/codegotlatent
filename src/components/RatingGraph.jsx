import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const RatingTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-md border rounded-lg px-3 py-2 text-sm">
        <p className="text-gray-800 font-semibold">Contest #{label + 1}</p>
        <p className="text-indigo-600">Rating: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const RatingGraph = ({ ratings }) => {
  // Format data for chart
  const data = ratings.map((rating, index) => ({
    contest: index,
    rating,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
      <h2 className="text-xl font-semibold text-center mb-4 text-gray-800">Rating Progress</h2>
      <ResponsiveContainer height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="contest"
            tickFormatter={(value) => `#${value + 1}`}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            domain={["dataMin - 50", "dataMax + 50"]}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <Tooltip content={<RatingTooltip />} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#6366f1"
            strokeWidth={3}
            activeDot={{ r: 6, stroke: "#4f46e5", strokeWidth: 2, fill: "#a5b4fc" }}
            dot={{ r: 3, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RatingGraph;

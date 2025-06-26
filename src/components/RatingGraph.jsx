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
    <div className=" rounded-2xl shadow-lg w-full">
      {/* <h2 className="text-xl font-semibold text-center mb-4 text-gray-800">Rating Progress</h2> */}
      <ResponsiveContainer height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff25" />
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff25" />
          <XAxis
            dataKey="contest"
            tickFormatter={(value) => `#${value + 1}`}
            tick={{ fontSize: 0, fill: "#ffffff05" }}
            axisLine={{ stroke: "#ffffff05" }}
            tickLine={{ stroke: "#ffffff15" }}
          />
          <YAxis
            domain={["dataMin - 50", "dataMax + 50"]}
            tick={{ fontSize: 0, fill: "#ffffff05" }}
            axisLine={{ stroke: "#ffffff05" }}
            tickLine={{ stroke: "#ffffff15" }}
          />
          <Tooltip content={<RatingTooltip />} />
          <Line
            type="linear"
            dataKey="rating"
            stroke="#ffffff"
            strokeWidth={3}
            activeDot={{ r: 7, stroke: "#ffffff", strokeWidth: 3, fill: "#ffffff" }}
            dot={{ r: 4, fill: "#fff", stroke: "#000", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RatingGraph;

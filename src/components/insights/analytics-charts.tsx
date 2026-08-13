"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const spend = [
  { month: "Jan", amount: 8200 },
  { month: "Feb", amount: 9100 },
  { month: "Mar", amount: 10400 },
  { month: "Apr", amount: 7800 },
  { month: "May", amount: 9600 },
  { month: "Jun", amount: 8900 },
];

const compliance = [
  { name: "Compliant", value: 68, color: "#059669" },
  { name: "Exception", value: 24, color: "#d97706" },
  { name: "Out of policy", value: 8, color: "#dc2626" },
];

const destinations = [
  { city: "SF", trips: 12 },
  { city: "NYC", trips: 10 },
  { city: "SEA", trips: 6 },
  { city: "CHI", trips: 5 },
  { city: "AUS", trips: 4 },
  { city: "LAS", trips: 3 },
];

const airlines = [
  { name: "United", value: 42 },
  { name: "Alaska", value: 22 },
  { name: "Delta", value: 18 },
  { name: "American", value: 12 },
  { name: "Other", value: 6 },
];

const distance = [
  { bucket: "0–0.3", count: 14 },
  { bucket: "0.3–0.7", count: 18 },
  { bucket: "0.7–1.0", count: 9 },
  { bucket: ">1.0", count: 5 },
];

export function AnalyticsCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Travel spend">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={spend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d6" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#0f766e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Policy compliance">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={compliance} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
              {compliance.map((c) => (
                <Cell key={c.name} fill={c.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top destinations">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={destinations}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d6" />
            <XAxis dataKey="city" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="trips" fill="#1c1917" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Hotel distance from meeting">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={distance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d6" />
            <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#b45309" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Preferred airline usage">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={airlines}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d6" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Avg flight cost" value="$348" />
        <Stat label="Avg hotel cost" value="$262/night" />
        <Stat label="Exception rate" value="24%" />
        <Stat label="Traveler satisfaction" value="4.6 / 5" />
        <Stat label="Savings from optimized bookings" value="$41,200" />
        <Stat label="Policy friction topics" value="SF · NYC hotels" />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

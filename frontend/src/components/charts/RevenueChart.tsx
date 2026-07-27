import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { month: "Jan", receita: 2200, times: 18 },
  { month: "Fev", receita: 3100, times: 24 },
  { month: "Mar", receita: 4600, times: 38 },
  { month: "Abr", receita: 5200, times: 44 },
  { month: "Mai", receita: 7800, times: 61 },
  { month: "Jun", receita: 9400, times: 78 }
];

export function RevenueChart() {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="receita" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#20283a" strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke="#9aa6b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#9aa6b8" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#0b0f18",
              border: "1px solid #20283a",
              borderRadius: 8,
              color: "#f7fbff"
            }}
          />
          <Area type="monotone" dataKey="receita" stroke="#22d3ee" fill="url(#receita)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

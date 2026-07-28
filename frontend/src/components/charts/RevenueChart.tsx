import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RevenuePoint = { month: string; receita: number; inscricoes: number };

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const hasActivity = data.some((item) => item.receita > 0 || item.inscricoes > 0);
  if (!hasActivity) return <div className="flex h-72 flex-col items-center justify-center border border-dashed border-arena-line bg-black/10 px-6 text-center"><p className="font-semibold">Sem movimentacao no periodo</p><p className="mt-2 max-w-md text-sm text-arena-muted">O grafico sera construido com pagamentos aprovados e inscricoes reais dos ultimos seis meses.</p></div>;
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
          <YAxis yAxisId="money" stroke="#9aa6b8" tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
          <YAxis yAxisId="entries" orientation="right" allowDecimals={false} stroke="#9aa6b8" tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value, name) => name === "receita" ? [new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(Number(value)), "Receita aprovada"] : [value, "Inscricoes"]}
            contentStyle={{
              background: "#0b0f18",
              border: "1px solid #20283a",
              borderRadius: 8,
              color: "#f7fbff"
            }}
          />
          <Legend formatter={(value) => value === "receita" ? "Receita aprovada" : "Inscricoes"} />
          <Area yAxisId="money" type="monotone" dataKey="receita" stroke="#22d3ee" fill="url(#receita)" strokeWidth={2} />
          <Area yAxisId="entries" type="monotone" dataKey="inscricoes" stroke="#34d399" fill="transparent" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { formatBRL, formatPercent } from "@/lib/format";

interface FatigueChartPoint {
  date: string;
  cpa: number;
  hookRate: number | null;
  ctr: number | null;
  spend: number;
  sales: number;
  hookRateSum: number;
  hookRateCount: number;
  ctrSum: number;
  ctrCount: number;
}

export default function FatiguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data } = useQuery({
    queryKey: ["metrics", id, "fatigue"],
    queryFn: () => api.listMetrics(id),
    refetchInterval: 60_000,
  });

  const chartData = useMemo(() => {
    const metrics = data?.metrics ?? [];
    const byDate = new Map<string, FatigueChartPoint>();

    for (const metric of metrics) {
      const date = new Date(metric.date).toISOString().slice(0, 10);
      const row = byDate.get(date) ?? {
        date,
        cpa: 0,
        hookRate: null,
        ctr: null,
        spend: 0,
        sales: 0,
        hookRateSum: 0,
        hookRateCount: 0,
        ctrSum: 0,
        ctrCount: 0,
      };

      row.spend += metric.investment || 0;
      row.sales += metric.sales || 0;

      if (metric.hookRate !== null) {
        row.hookRateSum += metric.hookRate;
        row.hookRateCount += 1;
      }

      if (metric.impressions > 0) {
        const ctr = (metric.clicks / metric.impressions) * 100;
        row.ctrSum += ctr;
        row.ctrCount += 1;
      }

      byDate.set(date, row);
    }

    return Array.from(byDate.values())
      .map(row => ({
        ...row,
        cpa: row.sales > 0 ? row.spend / row.sales : 0,
        hookRate: row.hookRateCount > 0 ? row.hookRateSum / row.hookRateCount : null,
        ctr: row.ctrCount > 0 ? row.ctrSum / row.ctrCount : null,
      }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [data]);

  return (
    <div className="p-8 space-y-6">
      <header>
        <h2 className="text-xl font-heading font-semibold">Fadiga de criativos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          CPA e hook rate ao longo do tempo — procure inflexões.
        </p>
      </header>

      <ChartCard title="CPA diário">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="date" stroke="#666" style={{ fontSize: 11 }} />
            <YAxis stroke="#666" style={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={value => formatBRL(Number(value))}
            />
            <Line
              type="monotone"
              dataKey="cpa"
              stroke="#e89b6a"
              strokeWidth={2}
              dot={{ fill: "#e89b6a", r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Hook rate & CTR">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="date" stroke="#666" style={{ fontSize: 11 }} />
            <YAxis stroke="#666" style={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={value => formatPercent(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="hookRate"
              name="Hook rate %"
              stroke="#50c878"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ctr"
              name="CTR %"
              stroke="#5b9bd5"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Gasto vs Vendas">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="date" stroke="#666" style={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#666" style={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#666"
              style={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="Gasto (R$)"
              stroke="#e89b6a"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sales"
              name="Vendas"
              stroke="#50c878"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
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
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
        {title}
      </h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

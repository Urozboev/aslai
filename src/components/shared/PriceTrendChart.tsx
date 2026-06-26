import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceTrendChartProps {
  data: { date: string; price: number }[];
  trend?: { change: number; avg: number };
  height?: number;
  productName?: string;
}

export default function PriceTrendChart({
  data,
  trend,
  height = 200,
  productName,
}: PriceTrendChartProps) {
  const isUp = (trend?.change || 0) > 0;

  return (
    <div className="space-y-3">
      {productName && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">{productName} - Narx tarixi</h4>
          {trend && (
            <div className="flex items-center gap-1.5">
              {isUp ? (
                <TrendingUp size={14} className="text-red-400" />
              ) : (
                <TrendingDown size={14} className="text-emerald-400" />
              )}
              <span
                className={`text-xs font-mono-data font-medium ${
                  isUp ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {isUp ? "+" : ""}
                {trend.change}%
              </span>
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0EA5A4" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0EA5A4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#8A8F98", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fill: "#8A8F98", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10, 10, 11, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#8A8F98" }}
            itemStyle={{ color: "#0EA5A4", fontFamily: "JetBrains Mono" }}
            formatter={(value: number) => [`${value.toLocaleString()} so'm`, "Narx"]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#0EA5A4"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {trend && (
        <div className="flex items-center justify-between text-xs text-[#8A8F98]">
          <span>O'rtacha narx: <span className="text-white font-mono-data">{trend.avg.toLocaleString()}</span> so'm</span>
          <span className={isUp ? "text-amber-400" : "text-emerald-400"}>
            {isUp
              ? "Narx oshish tendensiyasi"
              : "Narx pasayish tendensiyasi"}
          </span>
        </div>
      )}
    </div>
  );
}

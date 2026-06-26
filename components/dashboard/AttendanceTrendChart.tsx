"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";
import type { DayTrend } from "@/types";

interface AttendanceTrendChartProps {
  data: DayTrend[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { presentCount: number; totalCount: number } }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const rawData = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-800 text-white p-3.5 rounded-xl shadow-xl text-xs space-y-1 select-none">
        <p className="font-bold text-slate-200">{label}</p>
        <div className="h-px bg-slate-800 my-1" />
        <p className="text-emerald-450">
          Attendance Rate: <span className="font-extrabold text-white">{Number(payload[0].value).toFixed(1)}%</span>
        </p>
        <p className="text-slate-400">
          Students Present: <span className="font-semibold text-slate-200">{rawData.presentCount} / {rawData.totalCount}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  // Map dates to weekday abbreviations (e.g. Mon, Tue, etc.)
  const formattedData = data.map((d) => {
    let dayName = d.date;
    try {
      const parsedDate = parseISO(d.date);
      dayName = format(parsedDate, "EEE");
    } catch {
      // fallback to original date string
    }
    return {
      ...d,
      dayLabel: dayName,
    };
  });

  return (
    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50 select-none">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          <h4 className="font-bold text-slate-800 text-sm md:text-base">Attendance Trend (7 Days)</h4>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-0 min-w-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="dayLabel"
              stroke="#94A3B8"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="attendanceRate"
              stroke="#10B981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#emeraldAreaGradient)"
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

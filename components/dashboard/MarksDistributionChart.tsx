"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { SubjectStat } from "@/types";

interface MarksDistributionChartProps {
  data: SubjectStat[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: unknown }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 text-white p-3.5 rounded-xl shadow-xl text-xs space-y-1 select-none">
        <p className="font-bold text-slate-200">{label}</p>
        <div className="h-px bg-slate-800 my-1" />
        <p className="text-indigo-400">
          Average Marks: <span className="font-extrabold text-white">{Number(payload[0].value).toFixed(1)}%</span>
        </p>
        <p className="text-slate-400">
          Max Potential: <span className="font-semibold text-slate-200">100.0</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function MarksDistributionChart({ data }: MarksDistributionChartProps) {
  return (
    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50 select-none">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <h4 className="font-bold text-slate-800 text-sm md:text-base">Marks Distribution</h4>
        </div>
        <Link
          href="/dashboard/admin/marks"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
        >
          View All
        </Link>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-0 min-w-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="indigoBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="subject"
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC", radius: 8 }} />
            <Bar
              dataKey="avgMarks"
              fill="url(#indigoBarGradient)"
              radius={[8, 8, 0, 0]}
              barSize={32}
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

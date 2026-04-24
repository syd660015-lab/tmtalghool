import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { TestResult } from '../types';

interface StatsChartProps {
  results: TestResult[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ results }) => {
  const chartData = [...results].reverse().map(res => ({
    name: res.timestamp?.toDate().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    time: res.timeInSeconds,
    errors: res.errors,
    type: res.testType
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8">
      <div className="h-[300px] w-full bg-white p-4 rounded-xl border border-border">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full" />
          تطور زمن الأداء (ثانية)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#64748b' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Line 
              type="monotone" 
              dataKey="time" 
              stroke="var(--primary)" 
              strokeWidth={3} 
              dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-[250px] bg-white p-4 rounded-xl border border-border">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-destructive rounded-full" />
            توزيع الأخطاء
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} hide />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="errors" radius={[4, 4, 0, 0]}>
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col justify-center">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">ملخص التحسن</div>
          {results.length > 1 ? (
            <>
              <div className="text-3xl font-bold flex items-baseline gap-2">
                {Math.abs(((results[0].timeInSeconds - results[results.length - 1].timeInSeconds) / results[results.length - 1].timeInSeconds) * 100).toFixed(1)}%
                <span className="text-xs font-normal text-slate-400">تحسن في في السرعة</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                بناءً على أول {results.length} محاولات، تظهر البيانات {results[0].timeInSeconds < results[results.length-1].timeInSeconds ? 'انخفاضاً' : 'ارتفاعاً'} في سرعة الاستجابة.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">قم بأداء المزيد من الاختبارات لتتبع التحسن.</p>
          )}
        </div>
      </div>
    </div>
  );
};

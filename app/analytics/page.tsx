'use client';

import React from 'react';
import { 
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  UploadCloud
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  BarChart, 
  Bar 
} from 'recharts';
import { useRouter } from 'next/navigation';

const monthlyData = [
  { name: 'May 2025', Total: 150000 },
  { name: 'Dec 2025', Total: 120000 },
  { name: 'Jan 2026', Total: 280000 },
  { name: 'Feb 2026', Total: 140000 },
  { name: 'Jun 2026', Total: 290000 },
];

const categoryData = [
  { name: 'Shopping', value: 45, amount: 'Rs 957,250', color: '#f59e0b' },
  { name: 'Groceries', value: 25, amount: 'Rs 536,648', color: '#10b981' },
  { name: 'Utilities', value: 14, amount: 'Rs 297,039', color: '#8b5cf6' },
  { name: 'Other', value: 5, amount: 'Rs 115,772', color: '#6b7280' },
  { name: 'Fuel', value: 3.1, amount: 'Rs 66,356', color: '#3b82f6' },
  { name: 'Dining', value: 2.6, amount: 'Rs 55,524', color: '#ef4444' },
];

const merchantData = [
  { name: 'Amazon', value: 850000 },
  { name: 'Walmart', value: 260000 },
  { name: 'Target', value: 220000 },
  { name: 'Costco', value: 150000 },
  { name: 'Home Depot', value: 110000 },
  { name: 'Best Buy', value: 50000 },
  { name: 'Apple', value: 30000 },
  { name: 'Uber', value: 20000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-xl">
        <p className="text-slate-300 mb-1">{label}</p>
        <p className="font-bold text-lg text-white">
          {payload[0].name === 'Total' || payload[0].name === 'value' ? 'Rs ' : ''}
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      <main className="max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-500">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-white">Financial Dashboard</h2>
            <p className="text-slate-400">AI-extracted insights and metrics from your recent documents.</p>
          </div>
          <button 
            onClick={() => router.push('/?view=upload')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)]"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Analyze New File
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Monthly Trends Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl col-span-1 lg:col-span-2 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-100">Monthly Spending Trends</h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#475569" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#475569" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(value) => `Rs ${value / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="Total" 
                    stroke="#818cf8" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    activeDot={{ r: 6, fill: '#818cf8', stroke: '#1e1b4b', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown Donut */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-6">
              <PieChartIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-slate-100">Overall Category Breakdown</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center h-[300px]">
              <div className="h-full w-full sm:w-1/2 -ml-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <div className="w-full sm:w-1/2 space-y-3 mt-4 sm:mt-0">
                {categoryData.map((category, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full shadow-lg transition-transform group-hover:scale-125" style={{ backgroundColor: category.color, boxShadow: `0 0 10px ${category.color}80` }}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{category.name}</p>
                        <p className="text-xs text-slate-500">{category.value}%</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-300">{category.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Merchants Bar Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-6">
              <BarChart3 className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-slate-100">Top Merchants (All Time)</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#475569" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <RechartsTooltip cursor={{fill: '#1e293b', opacity: 0.4}} content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {merchantData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#60a5fa'} opacity={1 - (index * 0.1)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

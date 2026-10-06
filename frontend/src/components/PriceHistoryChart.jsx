import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function PriceHistoryChart({ priceSignal }) {
  if (!priceSignal || !priceSignal.price_history) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-[#e8e5dc] flex items-center justify-center h-48 mt-4">
        <p className="text-forest-900/40 text-xs font-mono uppercase tracking-wider">Price history not available</p>
      </div>
    );
  }

  const { price_history, all_time_low, msrp, signal, signal_reason, estimated_next_sale, estimated_savings } = priceSignal;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-forest-900 text-white p-3 rounded-xl text-xs font-mono shadow-lg">
          <p className="opacity-70 mb-1">{label}</p>
          <p className="font-bold text-sm">₹{payload[0].value.toLocaleString('en-IN')}</p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (tickItem) => {
    if (tickItem >= 1000) {
      return `₹${tickItem / 1000}k`;
    }
    return `₹${tickItem}`;
  };

  const getSignalConfig = (sig) => {
    switch(sig) {
      case 'STRONG_BUY': return { color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-300', text: '🟢 STRONG BUY' };
      case 'FAIR_VALUE': return { color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-300', text: '🟡 FAIR VALUE' };
      case 'WAIT_FOR_SALE': return { color: 'text-rose-800', bg: 'bg-rose-50', border: 'border-rose-300', text: '🔴 WAIT FOR SALE' };
      default: return { color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300', text: sig };
    }
  };

  const sigConfig = getSignalConfig(signal);

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e8e5dc] mt-4">
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={price_history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#699978" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#699978" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8f8c85' }} minTickGap={30} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8f8c85' }} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0e2117', strokeWidth: 1, strokeDasharray: '4 4' }} />
            {all_time_low && <ReferenceLine y={all_time_low} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'All-Time Low', fill: '#10b981', fontSize: 10 }} />}
            {msrp && <ReferenceLine y={msrp} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: 'MSRP', fill: '#f43f5e', fontSize: 10 }} />}
            <Area type="monotone" dataKey="price" stroke="#4a7c59" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border ${sigConfig.bg} ${sigConfig.color} ${sigConfig.border}`}>
            {sigConfig.text}
          </span>
        </div>
        <p className="text-xs text-forest-900/80">{signal_reason}</p>
        
        <div className="flex gap-2 mt-1">
          {estimated_next_sale && (
            <span className="bg-porcelain-100 text-forest-900 px-2.5 py-1 rounded-md text-[10px] font-mono border border-porcelain-200">
              Next Sale: {estimated_next_sale}
            </span>
          )}
          {estimated_savings > 0 && (
            <span className="bg-porcelain-100 text-forest-900 px-2.5 py-1 rounded-md text-[10px] font-mono border border-porcelain-200">
              Est. Savings: ₹{estimated_savings.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

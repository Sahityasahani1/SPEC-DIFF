import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Benchmark3DVisualizer from './Benchmark3DVisualizer';

export default function BenchmarkVisualizer({ benchmarks }) {
  const [activeView, setActiveView] = useState('cpu');

  if (!benchmarks) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-[#e8e5dc] flex items-center justify-center h-48">
        <p className="text-forest-900/40 text-xs font-mono uppercase tracking-wider">Benchmark data not available for this product category</p>
      </div>
    );
  }

  const views = [
    { id: 'cpu', label: 'CPU Power' },
    { id: 'gaming', label: 'Gaming FPS' },
    { id: 'efficiency', label: 'Efficiency' },
    { id: '3d-die', label: '⚡ 3D Die' }
  ];

  const cpuData = [
    { name: 'GB6 Single', value: benchmarks.geekbench_single, max: 4000 },
    { name: 'GB6 Multi', value: benchmarks.geekbench_multi, max: 20000 },
    { name: 'Cinebench R23', value: benchmarks.cinebench_r23_multi, max: 25000 }
  ];

  const gamingData = benchmarks.gaming_fps ? [
    { subject: 'CS2', A: benchmarks.gaming_fps.CS2, fullMark: 400 },
    { subject: 'Valorant', A: benchmarks.gaming_fps.Valorant, fullMark: 600 },
    { subject: 'GTA V', A: benchmarks.gaming_fps.GTA_V, fullMark: 200 },
    { subject: 'Cyberpunk', A: benchmarks.gaming_fps.Cyberpunk_2077, fullMark: 150 }
  ] : [];

  const efficiencyData = [
    { name: 'Battery Index', value: benchmarks.battery_index },
    { name: 'Thermal Stability', value: benchmarks.thermal_stability }
  ];

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e8e5dc] mt-4">
      <div className="flex gap-2 mb-4">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`px-3 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wider transition-colors ${
              activeView === view.id 
                ? 'bg-forest-900 text-white' 
                : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="h-48 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {activeView === 'cpu' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cpuData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#0e2117' }} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#4a7c59" background={{ fill: '#f5f3ee' }} radius={[0, 4, 4, 0]} barSize={24}>
                    <LabelList dataKey="value" position="insideRight" fill="#fff" fontSize={10} fontFamily="monospace" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeView === 'gaming' && gamingData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={gamingData}>
                  <PolarGrid stroke="#e8e5dc" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#0e2117', fontSize: 10, fontFamily: 'monospace' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                  <Radar name="FPS" dataKey="A" stroke="#0e2117" fill="#699978" fillOpacity={0.3} dot={{ r: 3, fill: '#0e2117' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
            
            {activeView === 'gaming' && gamingData.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-forest-900/40 text-xs font-mono uppercase tracking-wider">No gaming data</p>
              </div>
            )}

            {activeView === 'efficiency' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#0e2117' }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#0e2117" radius={[4, 4, 0, 0]} barSize={32}>
                    <LabelList dataKey="value" position="top" fill="#0e2117" fontSize={10} fontFamily="monospace" formatter={(val) => `${val}/100`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeView === '3d-die' && (
              <Benchmark3DVisualizer benchmarks={benchmarks} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

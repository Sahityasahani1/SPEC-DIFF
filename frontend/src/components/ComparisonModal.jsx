import React from 'react';
import { X, Trophy, ExternalLink, Check, Minus } from 'lucide-react';
import { formatINR } from '../utils/formatters';
import { getOutboundDealUrl, openDealUrl } from '../utils/dealUrl';

export default function ComparisonModal({ comparisonData, onClose }) {
  if (!comparisonData || !comparisonData.products) return null;

  const { products, priority, winner_reason, priority_winner_id } = comparisonData;

  const specRows = [
    { label: 'Verified Street Price', key: 'formatted_price', highlight: true },
    { label: 'Category Leader Status', render: (p) => p.is_winner ? (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
        <Trophy className="w-3.5 h-3.5 text-amber-400" />
        Top Match for {priority.toUpperCase()}
      </span>
    ) : <span className="text-slate-600 font-mono text-xs">—</span> },
    { label: 'Customer Rating', render: (p) => <span className="font-mono text-amber-300 font-bold">{p.rating} / 5.0 ★</span> },
    { label: 'Processor (CPU)', key: 'processor' },
    { label: 'Graphics (GPU)', key: 'gpu' },
    { label: 'RAM Capacity', render: (p) => <span className="font-mono font-bold text-slate-200">{p.ram_gb} GB RAM</span> },
    { label: 'RAM Expandability', key: 'ram_expandability', highlightBadge: true },
    { label: 'SSD Storage', render: (p) => <span className="font-mono font-bold text-slate-200">{p.storage_gb >= 1024 ? `${p.storage_gb / 1024} TB` : `${p.storage_gb} GB`} SSD</span> },
    { label: 'Battery Life', render: (p) => <span className="font-mono text-emerald-300 font-bold">{p.battery_hours} Hours</span> },
    { label: 'Weight', render: (p) => <span className="font-mono text-slate-300 font-medium">{p.weight_kg} kg</span> },
    { label: 'Bundled Software', key: 'bundled_software' },
    { label: 'Display Panel', key: 'display_tech' },
    { label: 'Verified Retailer', key: 'retail_source' },
    { label: 'Key Strengths', render: (p) => (
      <ul className="text-xs space-y-1 text-slate-300">
        {p.pros?.map((pro, i) => (
          <li key={i} className="flex items-start gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{pro}</span>
          </li>
        ))}
      </ul>
    )},
    { label: 'Trade-offs / Limitations', render: (p) => (
      <ul className="text-xs space-y-1 text-slate-400">
        {p.cons?.map((con, i) => (
          <li key={i} className="flex items-start gap-1 text-amber-300/80">
            <Minus className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>{con}</span>
          </li>
        ))}
      </ul>
    )},
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="glass-panel rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-white/10 bg-dark-900/95 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-dark-950/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-black text-white tracking-tight">
                Spec-Diff Matrix
              </h3>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Priority: {priority.toUpperCase()}
              </span>
            </div>
            {winner_reason && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 flex items-center gap-2 font-medium">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{winner_reason}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Table */}
        <div className="p-6 overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-1/4">
                  Hardware Feature
                </th>
                {products.map((p) => (
                  <th
                    key={p.id}
                    className={`py-3.5 px-4 text-sm font-black ${
                      p.is_winner 
                        ? 'bg-indigo-950/40 border-t-2 border-indigo-500 text-white' 
                        : 'text-slate-200'
                    }`}
                  >
                    <div className="leading-snug">{p.name}</div>
                    <div className="text-xs font-mono font-normal text-cyan-400 mt-0.5">{p.brand} &bull; {p.formatted_price}</div>
                    <div className="mt-2.5">
                      <a
                        href={getOutboundDealUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => openDealUrl(p, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-900 hover:bg-forest-850 text-sage-300 border border-sage-500/30 text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-xs cursor-pointer"
                      >
                        <span>View Deal</span>
                        <ExternalLink className="w-3 h-3 text-sage-400" />
                      </a>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {specRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-400 text-xs">
                    {row.label}
                  </td>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      className={`py-3 px-4 text-xs ${
                        p.is_winner ? 'bg-indigo-950/20' : ''
                      } ${row.highlight ? 'font-mono font-black text-cyan-300 text-sm' : 'text-slate-200'}`}
                    >
                      {row.render ? row.render(p) : p[row.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-white/5 bg-dark-950/80 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
          >
            Close Matrix
          </button>
        </div>

      </div>
    </div>
  );
}

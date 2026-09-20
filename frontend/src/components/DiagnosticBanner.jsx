import React from 'react';
import { AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function DiagnosticBanner({ noMatchData }) {
  if (!noMatchData) return null;

  const { message, unmet_filters, possible_adjustments } = noMatchData;

  return (
    <div className="glass-panel rounded-3xl border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden bg-dark-900/90 animate-fadeIn">
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="flex items-start gap-4">
        
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-black text-white tracking-tight">
            No Matching Laptops Found (Bottleneck Detected)
          </h3>
          <p className="text-sm text-slate-300 mt-1">
            {message || 'Your combination of budget and mandatory hardware floors eliminated all candidate models in our Indian catalog.'}
          </p>

          {/* Diagnostic Unmet Filters */}
          {unmet_filters && unmet_filters.length > 0 && (
            <div className="mt-4 p-4 bg-dark-950/80 rounded-2xl border border-white/5 text-xs space-y-2.5 font-mono">
              <span className="font-bold text-amber-400 uppercase tracking-widest block text-[10px]">
                Bottleneck Breakdown:
              </span>
              {unmet_filters.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 gap-1 pb-1 border-b border-white/5 last:border-0">
                  <div>
                    <span className="text-slate-500">{item.filter}: </span>
                    <span className="line-through text-rose-400">{item.requested_value}</span>
                  </div>
                  <span className="font-bold text-emerald-400">
                    {item.available_alternative}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actionable Adjustments */}
          {possible_adjustments && possible_adjustments.length > 0 && (
            <div className="mt-5 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Recommended Quick Relaxations:
              </h4>
              <div className="flex flex-col gap-2">
                {possible_adjustments.map((adj, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-dark-950/60 border border-white/5 hover:border-cyan-500/40 rounded-xl flex items-center justify-between transition-all"
                  >
                    <div className="text-xs text-slate-200 font-medium flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{adj}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-4 font-mono">
            Tip: Adjust your budget slider or lower your minimum RAM/storage in the form to recalculate.
          </p>
        </div>

      </div>
    </div>
  );
}
